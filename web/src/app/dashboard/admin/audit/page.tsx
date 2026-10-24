import { redirect } from 'next/navigation';
import Link from 'next/link';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { RowDataPacket } from 'mysql2';
import { ArrowLeft, ChevronLeft, ChevronRight, FileText, Search, Shield } from 'lucide-react';
import Navbar from '@/components/Navbar';

const PAGE_SIZE = 50;

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

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ src?: string | string[]; q?: string | string[]; page?: string | string[] }>;
}) {
  const session = await getSession();

  if (!session || session.adminLevel < 4) {
    redirect('/dashboard');
  }

  const params = await searchParams;
  const rawSource = typeof params.src === 'string' ? params.src : 'all';
  const source = rawSource === 'web' || rawSource === 'game' ? rawSource : 'all';
  const query = typeof params.q === 'string' ? params.q.trim().slice(0, 64) : '';
  const rawPage = typeof params.page === 'string' ? Number.parseInt(params.page, 10) : 1;
  const requestedPage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const conditions: string[] = [];
  const values: string[] = [];

  if (source === 'game') {
    conditions.push("action LIKE 'game.%'");
  } else if (source === 'web') {
    conditions.push("action NOT LIKE 'game.%'");
  }

  if (query) {
    conditions.push(
      "(admin_username LIKE ? OR action LIKE ? OR COALESCE(details, '') LIKE ? OR COALESCE(target_id, '') LIKE ?)"
    );
    values.push(`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [countRows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM ucp_admin_audit ${where}`,
    values
  );

  const total = Number(countRows[0]?.total || 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const offset = (page - 1) * PAGE_SIZE;

  const [logs] = await pool.execute<RowDataPacket[]>(
    `SELECT id, admin_username, action, target_type, target_id, details, ip,
            CASE WHEN action LIKE 'game.%' THEN 'In-Game' ELSE 'Web' END AS source,
            DATE_FORMAT(created_at, '%b %e, %Y %H:%i') AS created_at
     FROM ucp_admin_audit
     ${where}
     ORDER BY id DESC
     LIMIT ${PAGE_SIZE} OFFSET ${offset}`,
    values
  );

  const email = await getUserEmail(session.username);

  function pageHref(targetPage: number) {
    const nextParams = new URLSearchParams();
    if (source !== 'all') nextParams.set('src', source);
    if (query) nextParams.set('q', query);
    if (targetPage > 1) nextParams.set('page', String(targetPage));
    const suffix = nextParams.toString();
    return `/dashboard/admin/audit${suffix ? `?${suffix}` : ''}`;
  }

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
          <span className="font-medium text-zinc-500">Audit Log</span>
        </div>

        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-black text-white">
            <Shield className="h-6 w-6 text-amber-500" />
            Admin Audit Log
          </h1>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-zinc-400">
            Staff actions from the UCP and the game, newest first. Use the filters to narrow down bans, appeals, reports, tickets, applications, mappings, donators, roster, changelog, and radio changes.
          </p>
        </div>

        <form method="get" action="/dashboard/admin/audit" className="mb-4 flex flex-col gap-2 sm:flex-row">
          <select
            name="src"
            defaultValue={source}
            aria-label="Audit source"
            className="h-11 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 text-xs text-white outline-none focus:border-amber-500/50 sm:w-40"
          >
            <option value="all">All sources</option>
            <option value="web">Web</option>
            <option value="game">In-Game</option>
          </select>
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Search admin, action, target, or details..."
              className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900/60 pl-10 pr-3 text-sm text-white placeholder:text-zinc-600 focus:border-amber-500/50 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="h-11 rounded-xl bg-amber-500 px-5 text-xs font-bold text-black transition hover:bg-amber-400"
          >
            Filter
          </button>
          {source !== 'all' || query ? (
            <Link
              href="/dashboard/admin/audit"
              className="flex h-11 items-center justify-center rounded-xl border border-zinc-800 px-4 text-xs font-bold text-zinc-400 transition hover:text-white"
            >
              Clear
            </Link>
          ) : null}
        </form>

        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-500">
          <span>
            {total} entr{total === 1 ? 'y' : 'ies'}
            {source !== 'all' ? ` · ${source === 'game' ? 'In-Game' : 'Web'}` : ''}
            {query ? ` · "${query}"` : ''}
          </span>
          <span>
            Page {page} of {totalPages}
          </span>
        </div>

        {logs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 px-6 py-14 text-center">
            <FileText className="mx-auto mb-3 h-10 w-10 text-zinc-700" />
            <h2 className="text-sm font-bold text-white">No audit entries found</h2>
            <p className="mt-1 text-xs text-zinc-500">Try a different filter or search keyword.</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/60 md:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left text-xs">
                  <thead className="border-b border-zinc-800 bg-zinc-900/50 text-[10px] uppercase tracking-wider text-zinc-500">
                    <tr>
                      <th className="px-4 py-3 font-bold">Time</th>
                      <th className="px-4 py-3 font-bold">Admin</th>
                      <th className="px-4 py-3 font-bold">Source</th>
                      <th className="px-4 py-3 font-bold">Action</th>
                      <th className="px-4 py-3 font-bold">Target</th>
                      <th className="px-4 py-3 font-bold">Details</th>
                      <th className="px-4 py-3 font-bold">IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {logs.map((log) => (
                      <tr key={log.id} className="align-top transition hover:bg-zinc-900/30">
                        <td className="whitespace-nowrap px-4 py-3 text-zinc-500">{log.created_at}</td>
                        <td className="whitespace-nowrap px-4 py-3 font-semibold text-white">{log.admin_username}</td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span
                            className={`rounded-md border px-2 py-1 text-[10px] font-bold ${
                              log.source === 'In-Game'
                                ? 'border-amber-500/20 bg-amber-500/10 text-amber-400'
                                : 'border-blue-500/20 bg-blue-500/10 text-blue-400'
                            }`}
                          >
                            {log.source}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className="rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-1 font-mono text-[10px] text-amber-400">
                            {log.action}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-zinc-400">
                          {log.target_type ? `${log.target_type}${log.target_id ? ` #${log.target_id}` : ''}` : '—'}
                        </td>
                        <td className="max-w-md px-4 py-3 text-zinc-300">{log.details || '—'}</td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-[10px] text-zinc-600">{log.ip || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-3 md:hidden">
              {logs.map((log) => (
                <div key={log.id} className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-1 font-mono text-[10px] text-amber-400">
                      {log.action}
                    </span>
                    <span className="text-[10px] text-zinc-600">{log.created_at}</span>
                  </div>
                  <span
                    className={`mt-2 inline-block rounded-md border px-2 py-0.5 text-[9px] font-bold ${
                      log.source === 'In-Game'
                        ? 'border-amber-500/20 bg-amber-500/10 text-amber-400'
                        : 'border-blue-500/20 bg-blue-500/10 text-blue-400'
                    }`}
                  >
                    {log.source}
                  </span>
                  <p className="mt-2 text-xs font-semibold text-white">{log.admin_username}</p>
                  <p className="mt-1 text-[11px] text-zinc-400">
                    {log.target_type ? `${log.target_type}${log.target_id ? ` #${log.target_id}` : ''}` : 'No target'}
                  </p>
                  {log.details ? <p className="mt-2 text-xs leading-relaxed text-zinc-300">{log.details}</p> : null}
                  <p className="mt-2 font-mono text-[10px] text-zinc-600">IP: {log.ip || '—'}</p>
                </div>
              ))}
            </div>

            {totalPages > 1 ? (
              <div className="mt-5 flex items-center justify-between gap-3">
                {page > 1 ? (
                  <Link
                    href={pageHref(page - 1)}
                    className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950 px-4 text-xs font-bold text-zinc-300 transition hover:border-amber-500/30 hover:text-white"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Link>
                ) : (
                  <span className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-zinc-900 px-4 text-xs font-bold text-zinc-700">
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </span>
                )}

                <span className="text-[11px] text-zinc-500">
                  Page {page} of {totalPages}
                </span>

                {page < totalPages ? (
                  <Link
                    href={pageHref(page + 1)}
                    className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950 px-4 text-xs font-bold text-zinc-300 transition hover:border-amber-500/30 hover:text-white"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <span className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-zinc-900 px-4 text-xs font-bold text-zinc-700">
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </span>
                )}
              </div>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}
