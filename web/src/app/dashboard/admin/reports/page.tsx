import { redirect } from 'next/navigation';
import Link from 'next/link';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { RowDataPacket } from 'mysql2';
import { ArrowLeft, ArrowRight, Flag, Search } from 'lucide-react';
import Navbar from '@/components/Navbar';
import ReportsClient, { type ReportRecord } from './ReportsClient';

type Filter = 'open' | 'investigating' | 'resolved' | 'rejected' | 'all';
type Assignee = 'all' | 'me' | 'unassigned';
type Sort = 'newest' | 'oldest';

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

async function getReportStats() {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
         SUM(status = 'open') AS open_count,
         SUM(status = 'investigating') AS investigating_count,
         SUM(status = 'resolved') AS resolved_count,
         SUM(status = 'rejected') AS rejected_count,
         COUNT(*) AS total_count
       FROM ucp_player_reports`
    );
    const row = rows[0];
    return {
      open: Number(row?.open_count || 0),
      investigating: Number(row?.investigating_count || 0),
      resolved: Number(row?.resolved_count || 0),
      rejected: Number(row?.rejected_count || 0),
      total: Number(row?.total_count || 0),
    };
  } catch (error) {
    console.error('Error fetching report stats:', error);
    return { open: 0, investigating: 0, resolved: 0, rejected: 0, total: 0 };
  }
}

async function getReports(
  filter: Filter,
  query: string,
  assignee: Assignee,
  sort: Sort,
  currentUserId: number
) {
  const conditions: string[] = [];
  const values: (string | number)[] = [];

  if (filter !== 'all') {
    conditions.push('r.status = ?');
    values.push(filter);
  }

  if (assignee === 'me') {
    conditions.push('r.assigned_to = ?');
    values.push(currentUserId);
  } else if (assignee === 'unassigned') {
    conditions.push('r.assigned_to IS NULL');
  }

  if (query) {
    conditions.push(
      '(r.subject LIKE ? OR r.reporter_username LIKE ? OR r.reported_username LIKE ? OR r.reported_character_name LIKE ?)'
    );
    values.push(`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderBy =
    sort === 'oldest'
      ? "FIELD(r.status, 'open', 'investigating', 'resolved', 'rejected'), r.created_at ASC, r.id ASC"
      : "FIELD(r.status, 'open', 'investigating', 'resolved', 'rejected'), r.id DESC";

  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT r.id, r.reporter_account_id, r.reporter_username, r.reporter_character_name,
              r.reported_account_id, r.reported_username, r.reported_character_id,
              r.reported_character_name, r.category, r.subject, r.description, r.evidence,
              r.status, r.ban_id, r.assigned_username, r.staff_notes, r.resolution,
              (SELECT b.id FROM bans b
               WHERE b.name = r.reported_username AND (b.perm = 1 OR b.expire > NOW())
               ORDER BY b.id DESC LIMIT 1) AS active_ban_id,
              DATE_FORMAT(r.created_at, '%b %e, %Y %H:%i') AS created_at,
              DATE_FORMAT(r.reviewed_at, '%b %e, %Y %H:%i') AS reviewed_at,
              DATE_FORMAT(r.updated_at, '%b %e, %Y %H:%i') AS updated_at,
              TIMESTAMPDIFF(HOUR, r.created_at, NOW()) AS age_hours,
              TIMESTAMPDIFF(HOUR, r.updated_at, NOW()) AS idle_hours
       FROM ucp_player_reports r
       ${where}
       ORDER BY ${orderBy}
       LIMIT 100`,
      values
    );
    return rows;
  } catch (error) {
    console.error('Error fetching player reports:', error);
    return [];
  }
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string | string[];
    q?: string | string[];
    assignee?: string | string[];
    sort?: string | string[];
  }>;
}) {
  const session = await getSession();

  if (!session || session.adminLevel <= 0) {
    redirect('/dashboard');
  }

  const params = await searchParams;
  const rawStatus = typeof params.status === 'string' ? params.status : '';
  const filter: Filter =
    rawStatus === 'all' ||
    rawStatus === 'investigating' ||
    rawStatus === 'resolved' ||
    rawStatus === 'rejected'
      ? rawStatus
      : 'open';
  const query = typeof params.q === 'string' ? params.q.trim().slice(0, 64) : '';
  const rawAssignee = typeof params.assignee === 'string' ? params.assignee : '';
  const assignee: Assignee = rawAssignee === 'me' || rawAssignee === 'unassigned' ? rawAssignee : 'all';
  const rawSort = typeof params.sort === 'string' ? params.sort : '';
  const sort: Sort = rawSort === 'oldest' ? 'oldest' : 'newest';

  const [email, stats, reports] = await Promise.all([
    getUserEmail(session.username),
    getReportStats(),
    getReports(filter, query, assignee, sort, session.userId),
  ]);

  function queueHref(next: { status?: Filter; assignee?: Assignee; sort?: Sort }) {
    const nextParams = new URLSearchParams();
    nextParams.set('status', next.status ?? filter);
    if (query) nextParams.set('q', query);
    const nextAssignee = next.assignee ?? assignee;
    if (nextAssignee !== 'all') nextParams.set('assignee', nextAssignee);
    if ((next.sort ?? sort) === 'oldest') nextParams.set('sort', 'oldest');
    return `/dashboard/admin/reports?${nextParams.toString()}`;
  }

  const tabs: { value: Filter; label: string; count: number }[] = [
    { value: 'open', label: 'Open', count: stats.open },
    { value: 'investigating', label: 'Investigating', count: stats.investigating },
    { value: 'resolved', label: 'Resolved', count: stats.resolved },
    { value: 'rejected', label: 'Rejected', count: stats.rejected },
    { value: 'all', label: 'All', count: stats.total },
  ];

  const statCards = [
    { label: 'Open', value: stats.open, className: 'border-amber-500/15 bg-amber-500/[0.03] text-amber-500' },
    { label: 'Investigating', value: stats.investigating, className: 'border-sky-500/15 bg-sky-500/[0.03] text-sky-400' },
    { label: 'Resolved', value: stats.resolved, className: 'border-emerald-500/15 bg-emerald-500/[0.03] text-emerald-400' },
    { label: 'Rejected', value: stats.rejected, className: 'border-red-500/15 bg-red-500/[0.03] text-red-400' },
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
          <span className="font-medium text-zinc-500">Player Reports</span>
        </div>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-black text-white">
              <Flag className="h-6 w-6 text-amber-500" />
              Player Reports
            </h1>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-zinc-400">
              Review player reports, keep internal notes, and record the outcome. Active reports with no activity for 24 hours are highlighted for follow-up.
            </p>
          </div>

          <Link
            href="/dashboard/admin/moderation"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 text-xs font-bold text-zinc-300 transition hover:border-amber-500/30 hover:text-white"
          >
            Moderation Center
            <ArrowRight className="h-3.5 w-3.5 text-amber-500" />
          </Link>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {statCards.map((card) => (
            <div key={card.label} className={`rounded-2xl border p-4 ${card.className}`}>
              <p className="text-[10px] font-bold uppercase tracking-wider">{card.label}</p>
              <p className="mt-2 text-2xl font-black text-white">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const active = filter === tab.value;
            return (
              <Link
                key={tab.value}
                href={queueHref({ status: tab.value })}
                className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-[11px] font-bold transition ${
                  active
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                    : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700 hover:text-white'
                }`}
              >
                {tab.label}
                <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${active ? 'bg-amber-500/15 text-amber-400' : 'bg-zinc-900 text-zinc-500'}`}>
                  {tab.count}
                </span>
              </Link>
            );
          })}
        </div>

        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-zinc-800/80 bg-zinc-950/40 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-zinc-600">Assignee</span>
            {([
              { value: 'all' as const, label: 'All' },
              { value: 'me' as const, label: 'Assigned to me' },
              { value: 'unassigned' as const, label: 'Unassigned' },
            ]).map((item) => {
              const active = assignee === item.value;
              return (
                <Link
                  key={item.value}
                  href={queueHref({ assignee: item.value })}
                  className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-bold transition ${
                    active
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                      : 'border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-zinc-600">Sort</span>
            {([
              { value: 'newest' as const, label: 'Newest' },
              { value: 'oldest' as const, label: 'Oldest first' },
            ]).map((item) => {
              const active = sort === item.value;
              return (
                <Link
                  key={item.value}
                  href={queueHref({ sort: item.value })}
                  className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-bold transition ${
                    active
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                      : 'border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        <form method="get" action="/dashboard/admin/reports" className="mb-5 flex flex-col gap-2 sm:flex-row">
          <input type="hidden" name="status" value={filter} />
          {assignee !== 'all' ? <input type="hidden" name="assignee" value={assignee} /> : null}
          {sort === 'oldest' ? <input type="hidden" name="sort" value="oldest" /> : null}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              name="q"
              defaultValue={query}
              placeholder="Search subject, reporter, or reported player..."
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

        <ReportsClient
          reports={reports as unknown as ReportRecord[]}
          currentUsername={session.username}
        />
      </main>
    </div>
  );
}
