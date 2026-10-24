import { notFound, redirect } from 'next/navigation';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { RowDataPacket } from 'mysql2';
import Navbar from '@/components/Navbar';
import TicketThread from '@/components/TicketThread';
import type { TicketMessageRecord, TicketRecord } from '@/lib/tickets';

async function getUserEmail(username: string) {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT Email FROM accounts WHERE Username = ? LIMIT 1',
      [username]
    );
    return rows[0]?.Email || '';
  } catch {
    return '';
  }
}

export default async function SupportTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const { id } = await params;
  const ticketId = parseInt(id, 10);

  if (!ticketId) {
    notFound();
  }

  const [ticketRows] = await pool.execute<RowDataPacket[]>(
    `SELECT id, username, category, subject, status, priority, assigned_username,
            DATE_FORMAT(created_at, '%b %e, %Y %H:%i') AS created_at,
            DATE_FORMAT(updated_at, '%b %e, %Y %H:%i') AS updated_at,
            DATE_FORMAT(last_reply_at, '%b %e, %Y %H:%i') AS last_reply_at
     FROM ucp_tickets
     WHERE id = ? AND account_id = ?
     LIMIT 1`,
    [ticketId, session.userId]
  );

  if (ticketRows.length === 0) {
    notFound();
  }

  const [messageRows] = await pool.execute<RowDataPacket[]>(
    `SELECT id, author_username, is_staff, body,
            DATE_FORMAT(created_at, '%b %e, %Y %H:%i') AS created_at
     FROM ucp_ticket_messages
     WHERE ticket_id = ?
     ORDER BY id ASC`,
    [ticketId]
  );

  const email = await getUserEmail(session.username);

  return (
    <div className="min-h-screen bg-[#09090b] pb-16 pt-20">
      <Navbar
        session={{
          username: session.username,
          email,
          adminLevel: session.adminLevel,
        }}
      />

      <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <TicketThread
          key={`${ticketRows[0].status}-${ticketRows[0].priority}-${messageRows.length}`}
          ticket={ticketRows[0] as TicketRecord}
          messages={messageRows as TicketMessageRecord[]}
          currentUsername={session.username}
          isAdmin={false}
          backHref="/dashboard/support"
          backLabel="Back to Support Center"
        />
      </main>
    </div>
  );
}
