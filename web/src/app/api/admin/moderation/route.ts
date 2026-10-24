import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { logAdminAction } from '@/lib/audit';
import { createSystemNotification } from '@/lib/system-notifications';

function isAuthorizedAdmin(adminLevel?: number): boolean {
  return typeof adminLevel === 'number' && adminLevel > 0;
}

function isValidIPv4(value: unknown): value is string {
  return typeof value === 'string' && /^\d{1,3}(\.\d{1,3}){3}$/.test(value);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !isAuthorizedAdmin(session.adminLevel)) {
    return NextResponse.json({ error: 'Forbidden. Staff access required.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const action = body?.action;

    if (action === 'ban') {
      return await banAccount(body, session, request);
    }

    if (action === 'unban') {
      return await unbanAccount(body, session, request);
    }

    return NextResponse.json({ error: 'Invalid moderation action.' }, { status: 400 });
  } catch (error) {
    console.error('Moderation action error:', error);
    return NextResponse.json({ error: 'Failed to process moderation action.' }, { status: 500 });
  }
}

async function banAccount(
  body: { accountId?: unknown; reason?: unknown; durationDays?: unknown },
  session: { userId: number; username: string; adminLevel: number },
  request: Request
) {
  const accountId = Number(body.accountId);
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  const durationDays = Number(body.durationDays || 0);

  if (!Number.isInteger(accountId) || accountId <= 0) {
    return NextResponse.json({ error: 'Please choose a valid account.' }, { status: 400 });
  }

  if (reason.length < 3 || reason.length > 100) {
    return NextResponse.json({ error: 'Ban reason must be between 3 and 100 characters.' }, { status: 400 });
  }

  if (!Number.isInteger(durationDays) || durationDays < 0 || durationDays > 3650) {
    return NextResponse.json({ error: 'Ban duration must be between 0 and 3650 days.' }, { status: 400 });
  }

  const [accountRows] = await pool.execute<RowDataPacket[]>(
    'SELECT ID, Username, Admin, LastIP, Serial FROM accounts WHERE ID = ? LIMIT 1',
    [accountId]
  );

  if (accountRows.length === 0) {
    return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
  }

  const target = accountRows[0];

  if (target.ID === session.userId) {
    return NextResponse.json({ error: 'You cannot ban your own account.' }, { status: 400 });
  }

  if (Number(target.Admin) >= session.adminLevel) {
    return NextResponse.json(
      { error: 'You cannot ban an administrator with the same or a higher level.' },
      { status: 403 }
    );
  }

  const [activeRows] = await pool.execute<RowDataPacket[]>(
    'SELECT id FROM bans WHERE name = ? AND (perm = 1 OR expire > NOW()) LIMIT 1',
    [target.Username]
  );

  if (activeRows.length > 0) {
    return NextResponse.json({ error: `${target.Username} already has an active ban.` }, { status: 409 });
  }

  const [characterRows] = await pool.execute<RowDataPacket[]>(
    'SELECT ID, char_name FROM characters WHERE master = ? ORDER BY Online DESC, LastLogin DESC, ID ASC LIMIT 1',
    [target.ID]
  );

  const character = characterRows[0];
  const playerIp = isValidIPv4(target.LastIP) ? target.LastIP : null;
  const permanent = durationDays === 0;
  const expireSql = permanent
    ? 'DATE_ADD(NOW(), INTERVAL 100 YEAR)'
    : `DATE_ADD(NOW(), INTERVAL ${durationDays} DAY)`;

  const [banResult] = await pool.execute<ResultSetHeader>(
    `INSERT INTO bans (name, bannedby, reason, playerIP, perm, expire, serial, source)
     VALUES (?, ?, ?, ?, ?, ${expireSql}, ?, 'web')`,
    [target.Username, session.username, reason, playerIp, permanent ? 1 : 0, target.Serial || '']
  );

  await pool.execute(
    `INSERT INTO logs_ban (\`Character\`, BannedBy, Reason, IP, character_id, user_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      character?.char_name || target.Username,
      session.username,
      reason,
      playerIp || '0.0.0.0',
      character?.ID || -1,
      target.ID,
    ]
  );

  await createSystemNotification({
    accountId: target.ID,
    type: 'moderation',
    title: permanent ? 'Account permanently banned' : `Account banned for ${durationDays} day${durationDays === 1 ? '' : 's'}`,
    body: `${reason} - banned by ${session.username}.`,
    link: '/dashboard/support',
  });

  await logAdminAction({
    adminId: session.userId,
    adminUsername: session.username,
    action: 'moderation.ban',
    targetType: 'account',
    targetId: target.ID,
    details: `Banned ${target.Username}${permanent ? ' permanently' : ` for ${durationDays} day${durationDays === 1 ? '' : 's'}`}. Reason: ${reason}`,
    request,
  });

  return NextResponse.json({
    success: true,
    banId: banResult.insertId,
    message: `${target.Username} has been banned and will be blocked at the next game login.`,
  });
}

async function unbanAccount(
  body: { banId?: unknown },
  session: { userId: number; username: string; adminLevel: number },
  request: Request
) {
  const banId = Number(body.banId);

  if (!Number.isInteger(banId) || banId <= 0) {
    return NextResponse.json({ error: 'Please choose a valid ban record.' }, { status: 400 });
  }

  const [banRows] = await pool.execute<RowDataPacket[]>(
    'SELECT id, name, playerIP, reason FROM bans WHERE id = ? LIMIT 1',
    [banId]
  );

  if (banRows.length === 0) {
    return NextResponse.json({ error: 'Ban record not found.' }, { status: 404 });
  }

  const ban = banRows[0];
  let targetAccount: RowDataPacket | undefined;

  if (ban.name) {
    const [accountRows] = await pool.execute<RowDataPacket[]>(
      'SELECT ID, Username, Admin FROM accounts WHERE Username = ? LIMIT 1',
      [ban.name]
    );
    targetAccount = accountRows[0];

    if (targetAccount && Number(targetAccount.Admin) >= session.adminLevel) {
      return NextResponse.json(
        { error: 'You cannot unban an administrator with the same or a higher level.' },
        { status: 403 }
      );
    }
  }

  await pool.execute('DELETE FROM bans WHERE id = ?', [banId]);

  if (targetAccount) {
    await createSystemNotification({
      accountId: targetAccount.ID,
      type: 'moderation',
      title: 'Ban lifted',
      body: `Your account ban has been removed by ${session.username}.`,
      link: '/dashboard',
    });
  }

  await logAdminAction({
    adminId: session.userId,
    adminUsername: session.username,
    action: 'moderation.unban',
    targetType: ban.name ? 'account' : 'ip',
    targetId: ban.name || ban.playerIP,
    details: `Removed ${ban.name ? `the ban on ${ban.name}` : `the IP ban on ${ban.playerIP}`}. Original reason: ${ban.reason || 'n/a'}`,
    request,
  });

  return NextResponse.json({
    success: true,
    message: ban.name ? `${ban.name} has been unbanned.` : `IP ban on ${ban.playerIP} has been removed.`,
  });
}
