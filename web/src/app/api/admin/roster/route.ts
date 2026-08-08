import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// Helper to verify if user is Deputy Head Admin (Level >= 4) or Head Admin (Level 1337)
function isAuthorizedAdmin(adminLevel: number): boolean {
  return adminLevel >= 4;
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
      const level = parseInt(newAdminLevel, 10);

      if (isNaN(level) || level === 0) {
        return NextResponse.json({ error: 'Please select a valid admin rank level.' }, { status: 400 });
      }

      // Check if target user cannot be assigned higher rank than requester unless requester is Head Admin (1337)
      if (level >= 1337 && session.adminLevel < 1337) {
        return NextResponse.json({ error: 'Only Head Admin (1337) can assign Head Admin rank.' }, { status: 403 });
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

      return NextResponse.json({
        success: true,
        message: `Successfully appointed ${targetAccount.Username} as Administrator (Level ${level}).`,
      });
    }

    // 2. UPDATE EXISTING ADMIN LEVEL
    if (action === 'update') {
      if (!targetUserId) {
        return NextResponse.json({ error: 'Invalid target user ID.' }, { status: 400 });
      }

      const level = parseInt(newAdminLevel, 10);
      if (isNaN(level)) {
        return NextResponse.json({ error: 'Invalid admin level.' }, { status: 400 });
      }

      // Fetch target account
      const [targetRows] = await pool.execute<RowDataPacket[]>(
        'SELECT ID, Username, Admin FROM accounts WHERE ID = ? LIMIT 1',
        [targetUserId]
      );

      if (targetRows.length === 0) {
        return NextResponse.json({ error: 'Target admin account not found.' }, { status: 404 });
      }

      const targetAccount = targetRows[0];

      // Prevent editing Head Admin unless requester is Head Admin (1337)
      if (targetAccount.Admin === 1337 && session.adminLevel < 1337) {
        return NextResponse.json({ error: 'Only Head Admin (1337) can modify Head Admin accounts.' }, { status: 403 });
      }

      if (level >= 1337 && session.adminLevel < 1337) {
        return NextResponse.json({ error: 'Only Head Admin (1337) can assign Head Admin rank.' }, { status: 403 });
      }

      await pool.execute<ResultSetHeader>(
        'UPDATE accounts SET Admin = ? WHERE ID = ?',
        [level, targetUserId]
      );

      return NextResponse.json({
        success: true,
        message: `Successfully updated ${targetAccount.Username}'s rank level to ${level}.`,
      });
    }

    // 3. REMOVE / DEMOTE ADMIN
    if (action === 'remove') {
      if (!targetUserId) {
        return NextResponse.json({ error: 'Invalid target user ID.' }, { status: 400 });
      }

      // Fetch target account
      const [targetRows] = await pool.execute<RowDataPacket[]>(
        'SELECT ID, Username, Admin FROM accounts WHERE ID = ? LIMIT 1',
        [targetUserId]
      );

      if (targetRows.length === 0) {
        return NextResponse.json({ error: 'Target admin account not found.' }, { status: 404 });
      }

      const targetAccount = targetRows[0];

      if (targetAccount.Admin === 1337 && session.adminLevel < 1337) {
        return NextResponse.json({ error: 'Only Head Admin (1337) can demote Head Admin accounts.' }, { status: 403 });
      }

      await pool.execute<ResultSetHeader>(
        'UPDATE accounts SET Admin = 0 WHERE ID = ?',
        [targetUserId]
      );

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
