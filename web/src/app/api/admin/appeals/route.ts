import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { logAdminAction } from '@/lib/audit';
import { createSystemNotification } from '@/lib/system-notifications';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.adminLevel <= 0) {
    return NextResponse.json({ error: 'Forbidden. Staff access required.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const appealId = Number(body?.appealId);
    const action = body?.action;
    const response = typeof body?.response === 'string' ? body.response.trim() : '';

    if (!Number.isInteger(appealId) || appealId <= 0) {
      return NextResponse.json({ error: 'Please choose a valid appeal.' }, { status: 400 });
    }

    if (action !== 'accept' && action !== 'reject') {
      return NextResponse.json({ error: 'Invalid appeal action.' }, { status: 400 });
    }

    if (response.length > 1000) {
      return NextResponse.json({ error: 'Response must be 1000 characters or fewer.' }, { status: 400 });
    }

    if (action === 'reject' && response.length < 5) {
      return NextResponse.json({ error: 'Please explain why the appeal is rejected.' }, { status: 400 });
    }

    const [appealRows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, ban_id, account_id, username, ban_reason, status
       FROM ucp_ban_appeals
       WHERE id = ?
       LIMIT 1`,
      [appealId]
    );

    if (appealRows.length === 0) {
      return NextResponse.json({ error: 'Appeal not found.' }, { status: 404 });
    }

    const appeal = appealRows[0];

    if (appeal.status !== 'open') {
      return NextResponse.json({ error: 'This appeal has already been reviewed.' }, { status: 409 });
    }

    const [accountRows] = await pool.execute<RowDataPacket[]>(
      'SELECT ID, Username, Admin FROM accounts WHERE ID = ? LIMIT 1',
      [appeal.account_id]
    );

    const target = accountRows[0];

    if (target && Number(target.Admin) >= session.adminLevel) {
      return NextResponse.json(
        { error: 'You cannot review an appeal for an administrator with the same or a higher level.' },
        { status: 403 }
      );
    }

    const [banRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM bans WHERE id = ? AND (perm = 1 OR expire > NOW()) LIMIT 1',
      [appeal.ban_id]
    );

    const finalResponse =
      action === 'accept'
        ? response || 'Your appeal has been accepted. Please review the server rules before playing again.'
        : response;

    const [claimed] = await pool.execute<ResultSetHeader>(
      `UPDATE ucp_ban_appeals
       SET status = ?, admin_id = ?, admin_username = ?, response = ?, reviewed_at = NOW()
       WHERE id = ? AND status = 'open'`,
      [action === 'accept' ? 'accepted' : 'rejected', session.userId, session.username, finalResponse, appealId]
    );

    if (claimed.affectedRows === 0) {
      return NextResponse.json({ error: 'This appeal has already been reviewed.' }, { status: 409 });
    }

    let banRemoved = false;

    if (action === 'accept' && banRows.length > 0) {
      const [deleted] = await pool.execute<ResultSetHeader>('DELETE FROM bans WHERE id = ?', [appeal.ban_id]);
      banRemoved = deleted.affectedRows > 0;
    }

    if (action === 'accept') {
      await createSystemNotification({
        accountId: Number(appeal.account_id),
        type: 'moderation',
        title: banRemoved ? 'Ban appeal accepted' : 'Ban appeal closed',
        body: banRemoved
          ? `Your ban was lifted by ${session.username}. ${finalResponse}`
          : `Your appeal was accepted by ${session.username}. The ban was already inactive. ${finalResponse}`,
        link: '/dashboard/appeal',
      });
    } else {
      await createSystemNotification({
        accountId: Number(appeal.account_id),
        type: 'moderation',
        title: 'Ban appeal rejected',
        body: finalResponse,
        link: '/dashboard/appeal',
      });
    }

    await logAdminAction({
      adminId: session.userId,
      adminUsername: session.username,
      action: action === 'accept' ? 'appeal.accept' : 'appeal.reject',
      targetType: 'ban_appeal',
      targetId: appealId,
      details: `${action === 'accept' ? 'Accepted' : 'Rejected'} the ban appeal from ${appeal.username} (ban #${appeal.ban_id}). ${finalResponse}`,
      request,
    });

    return NextResponse.json({
      success: true,
      message:
        action === 'accept'
          ? banRemoved
            ? `${appeal.username} has been unbanned.`
            : 'Appeal accepted. The ban was already inactive.'
          : 'Appeal rejected.',
    });
  } catch (error) {
    console.error('Review ban appeal error:', error);
    return NextResponse.json({ error: 'Failed to review the appeal.' }, { status: 500 });
  }
}
