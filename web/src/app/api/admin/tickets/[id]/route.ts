import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { RowDataPacket } from 'mysql2';
import { TICKET_PRIORITIES, TICKET_STATUSES } from '@/lib/tickets';
import { createSystemNotification } from '@/lib/system-notifications';
import { logAdminAction } from '@/lib/audit';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.adminLevel <= 0) {
    return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const ticketId = parseInt(id, 10);
    if (!ticketId) {
      return NextResponse.json({ error: 'Invalid ticket.' }, { status: 400 });
    }

    const { action, value } = await request.json();

    if (typeof action !== 'string') {
      return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
    }

    const [ticketRows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, account_id, username, subject, status, priority, assigned_to, assigned_username
       FROM ucp_tickets WHERE id = ? LIMIT 1`,
      [ticketId]
    );

    if (ticketRows.length === 0) {
      return NextResponse.json({ error: 'Ticket not found.' }, { status: 404 });
    }

    const ticket = ticketRows[0];

    if (action === 'status') {
      if (!TICKET_STATUSES.some((status) => status.value === value)) {
        return NextResponse.json({ error: 'Invalid ticket status.' }, { status: 400 });
      }

      await pool.execute('UPDATE ucp_tickets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
        value,
        ticketId,
      ]);

      if (value !== ticket.status) {
        await createSystemNotification({
          accountId: Number(ticket.account_id),
          type: 'ticket',
          title: `Ticket #${ticketId} is now ${String(value).replace('_', ' ')}`,
          body: ticket.subject,
          link: `/dashboard/support/${ticketId}`,
        });
      }

      await logAdminAction({
        adminId: session.userId,
        adminUsername: session.username,
        action: 'ticket.status',
        targetType: 'ticket',
        targetId: ticketId,
        details: `Changed status from ${ticket.status} to ${value} for "${ticket.subject}" (${ticket.username}).`,
        request,
      });

      return NextResponse.json({ success: true });
    }

    if (action === 'priority') {
      if (!TICKET_PRIORITIES.some((priority) => priority.value === value)) {
        return NextResponse.json({ error: 'Invalid ticket priority.' }, { status: 400 });
      }

      await pool.execute('UPDATE ucp_tickets SET priority = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
        value,
        ticketId,
      ]);

      await logAdminAction({
        adminId: session.userId,
        adminUsername: session.username,
        action: 'ticket.priority',
        targetType: 'ticket',
        targetId: ticketId,
        details: `Changed priority from ${ticket.priority} to ${value} for "${ticket.subject}".`,
        request,
      });

      return NextResponse.json({ success: true });
    }

    if (action === 'assign') {
      await pool.execute(
        `UPDATE ucp_tickets
         SET assigned_to = ?, assigned_username = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [session.userId, session.username, ticketId]
      );

      await logAdminAction({
        adminId: session.userId,
        adminUsername: session.username,
        action: 'ticket.assign',
        targetType: 'ticket',
        targetId: ticketId,
        details: `Assigned ticket "${ticket.subject}" to themselves.`,
        request,
      });

      return NextResponse.json({ success: true });
    }

    if (action === 'unassign') {
      await pool.execute(
        'UPDATE ucp_tickets SET assigned_to = NULL, assigned_username = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [ticketId]
      );

      await logAdminAction({
        adminId: session.userId,
        adminUsername: session.username,
        action: 'ticket.unassign',
        targetType: 'ticket',
        targetId: ticketId,
        details: `Unassigned ticket "${ticket.subject}".`,
        request,
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (error) {
    console.error('Admin ticket update error:', error);
    return NextResponse.json({ error: 'Failed to update ticket.' }, { status: 500 });
  }
}
