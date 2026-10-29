import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { logAdminAction } from '@/lib/audit';

const HEAD_ADMIN = 1337;
const DEPUTY_HEAD_ADMIN = 1336;
const ADMIN_LEVELS = [-1, 1, 2, 3, 4, DEPUTY_HEAD_ADMIN, HEAD_ADMIN];
const VALID_ADMIN_LEVELS = new Set(ADMIN_LEVELS);

// Roster management is limited to Deputy Head Admin (1336) and Head Admin (1337).
function isAuthorizedAdmin(adminLevel: number): boolean {
  return adminLevel === DEPUTY_HEAD_ADMIN || adminLevel === HEAD_ADMIN;
}

// Deputy Head Admin can manage regular staff, but only Head Admin can manage Deputy/Head Admins.
function canManageAdminLevel(actorLevel: number, level: number): boolean {
  return actorLevel === HEAD_ADMIN || level < DEPUTY_HEAD_ADMIN;
}

export async function GET() {
  const session = await getSession();
  if (!session || !isAuthorizedAdmin(session.adminLevel)) {
    return NextResponse.json({ error: 'Forbidden. Access restricted to Deputy Head Admin & Head Admin.' }, { status: 403 });
  }

  try {
    const [admins] = await pool.execute<RowDataPacket[]>(
      `SELECT ID, Username, Email, Admin, RegisterDate 
       FROM accounts 
       WHERE Admin != 0 
       ORDER BY 
         CASE 
           WHEN Admin = 1337 THEN 1 
           WHEN Admin = 1336 THEN 2 
           WHEN Admin = 4 THEN 3 
           WHEN Admin = 3 THEN 4 
           WHEN Admin = 2 THEN 5 
           WHEN Admin = 1 THEN 6 
           ELSE 7 
         END, 
         Admin DESC, 
         Username ASC`
    );

    return NextResponse.json({ admins });
  } catch (error) {
    console.error('Error fetching admin roster:', error);
    return NextResponse.json({ error: 'Failed to fetch admin roster' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !isAuthorizedAdmin(session.adminLevel)) {
    return NextResponse.json({ error: 'Forbidden. Access restricted to Deputy Head Admin & Head Admin.' }, { status: 403 });
  }

  try {
    const { action, username, targetUserId, newAdminLevel } = await req.json();

    // 1. ADD NEW ADMIN by Username
    if (action === 'add') {
      if (!username || typeof username !== 'string') {
        return NextResponse.json({ error: 'Please enter a valid UCP username.' }, { status: 400 });
      }

      const cleanUsername = username.trim();
      const level = Number(newAdminLevel);

      if (!Number.isInteger(level) || !VALID_ADMIN_LEVELS.has(level)) {
        return NextResponse.json({ error: 'Please select a valid admin rank level.' }, { status: 400 });
      }

      if (!canManageAdminLevel(session.adminLevel, level)) {
        return NextResponse.json(
          { error: 'Only Head Admin (1337) can assign Deputy Head Admin or Head Admin ranks.' },
          { status: 403 }
        );
      }

      // Check if account exists
      const [userRows] = await pool.execute<RowDataPacket[]>(
        'SELECT ID, Username, Admin FROM accounts WHERE Username = ? LIMIT 1',
        [cleanUsername]
      );

      if (userRows.length === 0) {
        return NextResponse.json({ error: `UCP Account "${cleanUsername}" was not found.` }, { status: 404 });
      }

      const targetAccount = userRows[0];

      if (targetAccount.Admin !== 0) {
        return NextResponse.json(
          { error: `${targetAccount.Username} is already an administrator (Level ${targetAccount.Admin}). Use Update to change level.` },
          { status: 400 }
        );
      }

      await pool.execute<ResultSetHeader>(
        'UPDATE accounts SET Admin = ? WHERE ID = ?',
        [level, targetAccount.ID]
      );

      await logAdminAction({
        adminId: session.userId,
        adminUsername: session.username,
        action: 'roster.add',
        targetType: 'account',
        targetId: targetAccount.ID,
        details: `Appointed ${targetAccount.Username} as administrator level ${level}.`,
        request: req,
      });

      return NextResponse.json({
        success: true,
        message: `Successfully appointed ${targetAccount.Username} as Administrator (Level ${level}).`,
      });
    }

    // 2. UPDATE EXISTING ADMIN LEVEL
    if (action === 'update') {
      const targetId = Number(targetUserId);
      if (!Number.isInteger(targetId) || targetId <= 0) {
        return NextResponse.json({ error: 'Invalid target user ID.' }, { status: 400 });
      }

      const level = Number(newAdminLevel);
      if (!Number.isInteger(level) || !VALID_ADMIN_LEVELS.has(level)) {
        return NextResponse.json({ error: 'Invalid admin level.' }, { status: 400 });
      }

      if (!canManageAdminLevel(session.adminLevel, level)) {
        return NextResponse.json(
          { error: 'Only Head Admin (1337) can assign Deputy Head Admin or Head Admin ranks.' },
          { status: 403 }
        );
      }

      // Fetch target account
      const [targetRows] = await pool.execute<RowDataPacket[]>(
        'SELECT ID, Username, Admin FROM accounts WHERE ID = ? LIMIT 1',
        [targetId]
      );

      if (targetRows.length === 0) {
        return NextResponse.json({ error: 'Target admin account not found.' }, { status: 404 });
      }

      const targetAccount = targetRows[0];

      if (!canManageAdminLevel(session.adminLevel, Number(targetAccount.Admin))) {
        return NextResponse.json(
          { error: 'Only Head Admin (1337) can modify Deputy Head Admin or Head Admin accounts.' },
          { status: 403 }
        );
      }

      await pool.execute<ResultSetHeader>(
        'UPDATE accounts SET Admin = ? WHERE ID = ?',
        [level, targetId]
      );

      await logAdminAction({
        adminId: session.userId,
        adminUsername: session.username,
        action: 'roster.update',
        targetType: 'account',
        targetId: targetAccount.ID,
        details: `Changed ${targetAccount.Username}'s admin level from ${targetAccount.Admin} to ${level}.`,
        request: req,
      });

      return NextResponse.json({
        success: true,
        message: `Successfully updated ${targetAccount.Username}'s rank level to ${level}.`,
      });
    }

    // 3. REMOVE / DEMOTE ADMIN
    if (action === 'remove') {
      const targetId = Number(targetUserId);
      if (!Number.isInteger(targetId) || targetId <= 0) {
        return NextResponse.json({ error: 'Invalid target user ID.' }, { status: 400 });
      }

      // Fetch target account
      const [targetRows] = await pool.execute<RowDataPacket[]>(
        'SELECT ID, Username, Admin FROM accounts WHERE ID = ? LIMIT 1',
        [targetId]
      );

      if (targetRows.length === 0) {
        return NextResponse.json({ error: 'Target admin account not found.' }, { status: 404 });
      }

      const targetAccount = targetRows[0];

      if (!canManageAdminLevel(session.adminLevel, Number(targetAccount.Admin))) {
        return NextResponse.json(
          { error: 'Only Head Admin (1337) can demote Deputy Head Admin or Head Admin accounts.' },
          { status: 403 }
        );
      }

      await pool.execute<ResultSetHeader>(
        'UPDATE accounts SET Admin = 0 WHERE ID = ?',
        [targetId]
      );

      await logAdminAction({
        adminId: session.userId,
        adminUsername: session.username,
        action: 'roster.remove',
        targetType: 'account',
        targetId: targetAccount.ID,
        details: `Demoted ${targetAccount.Username} (level ${targetAccount.Admin}) to regular player.`,
        request: req,
      });

      return NextResponse.json({
        success: true,
        message: `Successfully demoted ${targetAccount.Username} to Regular Player.`,
      });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (error) {
    console.error('Error handling admin roster action:', error);
    return NextResponse.json({ error: 'Failed to process request.' }, { status: 500 });
  }
}
