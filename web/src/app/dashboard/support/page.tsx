import { redirect } from 'next/navigation';
import Link from 'next/link';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { RowDataPacket } from 'mysql2';
import { ArrowRight, Flag, LifeBuoy, MessageSquare } from 'lucide-react';
import Navbar from '@/components/Navbar';
import NewTicketForm from './NewTicketForm';
import { getTicketCategory, getTicketStatus } from '@/lib/tickets';

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

async function getTickets(userId: number) {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT t.id, t.subject, t.category, t.status,
              DATE_FORMAT(COALESCE(t.last_reply_at, t.updated_at), '%b %e, %Y %H:%i') AS last_activity,
              (SELECT COUNT(*) FROM ucp_ticket_messages m WHERE m.ticket_id = t.id) AS message_count
       FROM ucp_tickets t
       WHERE t.account_id = ?
       ORDER BY t.updated_at DESC
       LIMIT 100`,
      [userId]
    );
    return rows;
  } catch (error) {
    console.error('Error fetching support tickets:', error);
    return [];
  }
}

export default async function SupportPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const email = await getUserEmail(session.username);
  const tickets = await getTickets(session.userId);

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
          <Link href="/dashboard" className="text-zinc-400 transition hover:text-white">
            Dashboard
          </Link>
          <span className="text-zinc-700">/</span>
          <span className="font-medium text-zinc-500">Support Center</span>
        </div>

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-black text-white">
              <LifeBuoy className="h-6 w-6 text-amber-500" />
              Support Center
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Report a player, report a bug, appeal a sanction, or ask staff for help.
            </p>
          </div>

          <Link
            href="/dashboard/reports"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 text-xs font-bold text-zinc-300 transition hover:border-amber-500/30 hover:text-white"
          >
            <Flag className="h-4 w-4 text-amber-500" />
            Player Reports
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <NewTicketForm />
          </div>

          <div className="lg:col-span-2">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-zinc-300">
                Your Tickets
              </h2>
              <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-[10px] font-bold text-zinc-500">
                {tickets.length} total
              </span>
            </div>

            {tickets.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 px-6 py-12 text-center">
                <LifeBuoy className="mx-auto mb-3 h-10 w-10 text-zinc-700" />
                <h3 className="text-sm font-bold text-white">No tickets yet</h3>
                <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-zinc-500">
                  When you need staff assistance, submit a ticket using the form.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {tickets.map((ticket) => {
                  const status = getTicketStatus(ticket.status);
                  const category = getTicketCategory(ticket.category);

                  return (
                    <Link
                      key={ticket.id}
                      href={`/dashboard/support/${ticket.id}`}
                      className="group flex items-center gap-4 rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4 transition hover:border-amber-500/30 hover:bg-zinc-900/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-500">
                        <MessageSquare className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-white group-hover:text-amber-400">
                            {ticket.subject}
                          </p>
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold ${status.className}`}>
                            {status.label}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-zinc-500">
                          {category.label} · #{ticket.id} · {ticket.message_count} message
                          {Number(ticket.message_count) === 1 ? '' : 's'} · Updated {ticket.last_activity}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-zinc-600 transition group-hover:text-amber-400" />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
