import { redirect } from 'next/navigation';
import Link from 'next/link';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { RowDataPacket } from 'mysql2';
import {
  ArrowLeft,
  ArrowRight,
  MessageSquare,
  Search,
  Shield,
  Ticket,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import {
  TICKET_STATUSES,
  getTicketCategory,
  getTicketPriority,
  getTicketStatus,
} from '@/lib/tickets';

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

export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[]; q?: string | string[] }>;
}) {
  const session = await getSession();

  if (!session || session.adminLevel <= 0) {
    redirect('/dashboard');
  }

  const params = await searchParams;
  const rawStatus = typeof params.status === 'string' ? params.status : '';
  const status =
    rawStatus === 'all' || TICKET_STATUSES.some((item) => item.value === rawStatus)
      ? rawStatus
      : 'all';
  const query = typeof params.q === 'string' ? params.q.trim() : '';

  const [countRows] = await pool.execute<RowDataPacket[]>(
    'SELECT status, COUNT(*) AS total FROM ucp_tickets GROUP BY status'
  );

  const counts = countRows.reduce<Record<string, number>>((accumulator, row) => {
    accumulator[String(row.status)] = Number(row.total);
    return accumulator;
  }, {});

  const totalTickets = countRows.reduce((sum, row) => sum + Number(row.total), 0);
  const activeTickets = (counts.open || 0) + (counts.in_progress || 0);

  const conditions: string[] = [];
  const values: string[] = [];

  if (status !== 'all') {
    conditions.push('t.status = ?');
    values.push(status);
  }

  if (query) {
    conditions.push('(t.subject LIKE ? OR t.username LIKE ?)');
    values.push(`%${query}%`, `%${query}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [tickets] = await pool.execute<RowDataPacket[]>(
    `SELECT t.id, t.username, t.subject, t.category, t.status, t.priority,
            t.assigned_username,
            DATE_FORMAT(COALESCE(t.last_reply_at, t.updated_at), '%b %e, %Y %H:%i') AS last_activity,
            (SELECT COUNT(*) FROM ucp_ticket_messages m WHERE m.ticket_id = t.id) AS message_count
     FROM ucp_tickets t
     ${where}
     ORDER BY
       FIELD(t.status, 'open', 'in_progress', 'resolved', 'closed'),
       COALESCE(t.last_reply_at, t.updated_at) DESC
     LIMIT 100`,
    values
  );

  const email = await getUserEmail(session.username);
  const filterLinks = [
    { value: 'all', label: `All (${totalTickets})` },
    { value: 'open', label: `Open (${counts.open || 0})` },
    { value: 'in_progress', label: `In Progress (${counts.in_progress || 0})` },
    { value: 'resolved', label: `Resolved (${counts.resolved || 0})` },
    { value: 'closed', label: `Closed (${counts.closed || 0})` },
  ];

  return (
    <div className="min-h-screen bg-[#09090b] pb-16 pt-20">
      <Navbar
        session={{
          username: session.username,
          email,
          adminLevel: session.adminLevel,
        }}
      />

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center gap-2 text-xs">
          <Link href="/dashboard/admin" className="flex items-center gap-1 text-zinc-400 transition hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5" />
            Admin Portal
          </Link>
          <span className="text-zinc-700">/</span>
          <span className="font-medium text-zinc-500">Support Tickets</span>
        </div>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-black text-white">
              <Ticket className="h-6 w-6 text-amber-500" />
              Support Tickets
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              {activeTickets} active ticket{activeTickets === 1 ? '' : 's'} waiting for staff.
            </p>
          </div>

          {session.adminLevel >= 4 ? (
            <Link
              href="/dashboard/admin/audit"
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 text-xs font-bold text-zinc-300 transition hover:border-amber-500/30 hover:text-white"
            >
              <Shield className="h-4 w-4 text-amber-500" />
              Audit Log
            </Link>
          ) : null}
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {filterLinks.map((filter) => (
            <Link
              key={filter.value}
              href={`/dashboard/admin/tickets${filter.value === 'all' ? '' : `?status=${filter.value}`}`}
              className={`rounded-xl border px-3 py-2 text-[11px] font-bold transition ${
                status === filter.value
                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                  : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700 hover:text-white'
              }`}
            >
              {filter.label}
            </Link>
          ))}
        </div>

        <form method="get" action="/dashboard/admin/tickets" className="mb-5 flex flex-col gap-2 sm:flex-row">
          <input type="hidden" name="status" value={status} />
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              name="q"
              defaultValue={query}
              placeholder="Search subject or player..."
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 py-2.5 pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-amber-500/50"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-black transition hover:bg-amber-400"
          >
            Search
          </button>
        </form>

        {tickets.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 px-6 py-14 text-center">
            <Ticket className="mx-auto mb-3 h-10 w-10 text-zinc-700" />
            <h2 className="text-sm font-bold text-white">No tickets found</h2>
            <p className="mt-1 text-xs text-zinc-500">Try a different filter or search keyword.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tickets.map((ticket) => {
              const ticketStatus = getTicketStatus(ticket.status);
              const priority = getTicketPriority(ticket.priority);
              const category = getTicketCategory(ticket.category);

              return (
                <Link
                  key={ticket.id}
                  href={`/dashboard/admin/tickets/${ticket.id}`}
                  className="group flex flex-col gap-3 rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4 transition hover:border-amber-500/30 hover:bg-zinc-900/50 sm:flex-row sm:items-center"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-500">
                    <MessageSquare className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-white group-hover:text-amber-400">
                        {ticket.subject}
                      </p>
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold ${ticketStatus.className}`}>
                        {ticketStatus.label}
                      </span>
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold ${priority.className}`}>
                        {priority.label}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      #{ticket.id} · {ticket.username} · {category.label} · {ticket.message_count} message
                      {Number(ticket.message_count) === 1 ? '' : 's'} · {ticket.last_activity}
                      {ticket.assigned_username ? ` · Assigned to ${ticket.assigned_username}` : ''}
                    </p>
                  </div>

                  <ArrowRight className="hidden h-4 w-4 shrink-0 text-zinc-600 transition group-hover:text-amber-400 sm:block" />
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
