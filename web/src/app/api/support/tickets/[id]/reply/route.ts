import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { createSystemNotification } from '@/lib/system-notifications';
import { logAdminAction } from '@/lib/audit';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const ticketId = parseInt(id, 10);
    if (!ticketId) {
      return NextResponse.json({ error: 'Invalid ticket.' }, { status: 400 });
    }

    const { body } = await request.json();

    if (typeof body !== 'string') {
      return NextResponse.json({ error: 'Invalid message.' }, { status: 400 });
    }

    const cleanBody = body.trim();

    if (cleanBody.length < 1 || cleanBody.length > 5000) {
      return NextResponse.json({ error: 'Message must be between 1 and 5000 characters.' }, { status: 400 });
    }

    const [ticketRows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, account_id, username, subject, status, assigned_to, assigned_username
       FROM ucp_tickets WHERE id = ? LIMIT 1`,
      [ticketId]
    );

    if (ticketRows.length === 0) {
      return NextResponse.json({ error: 'Ticket not found.' }, { status: 404 });
    }

    const ticket = ticketRows[0];
    const isOwner = Number(ticket.account_id) === session.userId;
    const isStaff = session.adminLevel > 0;

    if (!isOwner && !isStaff) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (isOwner && ticket.status === 'closed') {
      return NextResponse.json(
        { error: 'This ticket is closed. Please create a new ticket if you need more help.' },
        { status: 400 }
      );
    }

    const staffReply = isStaff && !isOwner;
    let nextStatus = String(ticket.status);

    if (isOwner && (nextStatus === 'resolved' || nextStatus === 'closed')) {
      nextStatus = 'open';
    }
    if (staffReply) {
      nextStatus = 'in_progress';
    }

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO ucp_ticket_messages (ticket_id, author_id, author_username, is_staff, body)
       VALUES (?, ?, ?, ?, ?)`,
      [ticketId, session.userId, session.username, staffReply ? 1 : 0, cleanBody]
    );

    await pool.execute(
      `UPDATE ucp_tickets
       SET status = ?, last_reply_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [nextStatus, ticketId]
    );

    if (staffReply) {
      await createSystemNotification({
        accountId: Number(ticket.account_id),
        type: 'ticket',
        title: `Staff replied to ticket #${ticketId}`,
        body: cleanBody.slice(0, 200),
        link: `/dashboard/support/${ticketId}`,
      });

      await logAdminAction({
        adminId: session.userId,
        adminUsername: session.username,
        action: 'ticket.reply',
        targetType: 'ticket',
        targetId: ticketId,
        details: `Replied to "${ticket.subject}" (${ticket.username}).`,
        request,
      });
    } else if (ticket.assigned_to) {
      await createSystemNotification({
        accountId: Number(ticket.assigned_to),
        type: 'ticket',
        title: `New reply on ticket #${ticketId}`,
        body: `${session.username}: ${cleanBody.slice(0, 180)}`,
        link: `/dashboard/admin/tickets/${ticketId}`,
      });
    }

    return NextResponse.json({
      success: true,
      messageId: result.insertId,
      status: nextStatus,
    });
  } catch (error) {
    console.error('Reply ticket error:', error);
    return NextResponse.json({ error: 'Failed to send reply.' }, { status: 500 });
  }
}
