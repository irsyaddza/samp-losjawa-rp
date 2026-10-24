import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const banId = Number(body?.banId);
    const message = typeof body?.message === 'string' ? body.message.trim() : '';

    if (!Number.isInteger(banId) || banId <= 0) {
      return NextResponse.json({ error: 'Please choose a valid ban record.' }, { status: 400 });
    }

    if (message.length < 20 || message.length > 3000) {
      return NextResponse.json({ error: 'Appeal must be between 20 and 3000 characters.' }, { status: 400 });
    }

    const [banRows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, name, bannedby, reason, playerIP, perm, date, expire, source
       FROM bans
       WHERE id = ? AND name = ? AND (perm = 1 OR expire > NOW())
       LIMIT 1`,
      [banId, session.username]
    );

    if (banRows.length === 0) {
      return NextResponse.json({ error: 'This ban is no longer active.' }, { status: 404 });
    }

    const ban = banRows[0];

    const [existingRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, status FROM ucp_ban_appeals WHERE ban_id = ? LIMIT 1',
      [banId]
    );

    if (existingRows.length > 0) {
      return NextResponse.json({ error: 'You have already appealed this ban.' }, { status: 409 });
    }

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO ucp_ban_appeals
         (ban_id, account_id, username, ban_reason, ban_bannedby, ban_player_ip,
          ban_perm, ban_expire, ban_created_at, ban_source, message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ban.id,
        session.userId,
        session.username,
        ban.reason,
        ban.bannedby,
        ban.playerIP,
        ban.perm,
        ban.expire,
        ban.date,
        ban.source || 'game',
        message,
      ]
    );

    return NextResponse.json({
      success: true,
      appealId: result.insertId,
      message: 'Your appeal has been submitted. Staff will review it and notify you.',
    });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'You have already appealed this ban.' }, { status: 409 });
    }

    console.error('Submit ban appeal error:', error);
    return NextResponse.json({ error: 'Failed to submit your appeal.' }, { status: 500 });
  }
}
