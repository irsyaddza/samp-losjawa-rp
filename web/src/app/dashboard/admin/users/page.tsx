import { redirect } from 'next/navigation';
import Link from 'next/link';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { RowDataPacket } from 'mysql2';
import { ArrowLeft, ArrowRight, Search, Shield, Users } from 'lucide-react';
import Navbar from '@/components/Navbar';

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

async function getStats() {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
         (SELECT COUNT(*) FROM accounts) AS total_accounts,
         (SELECT COUNT(*) FROM accounts WHERE Online = 1) AS online_accounts,
         (SELECT COUNT(*) FROM characters) AS total_characters,
         (SELECT COUNT(DISTINCT name) FROM bans WHERE name IS NOT NULL AND (perm = 1 OR expire > NOW())) AS banned_accounts`
    );
    return {
      totalAccounts: Number(rows[0]?.total_accounts || 0),
      onlineAccounts: Number(rows[0]?.online_accounts || 0),
      totalCharacters: Number(rows[0]?.total_characters || 0),
      bannedAccounts: Number(rows[0]?.banned_accounts || 0),
    };
  } catch (error) {
    console.error('Error fetching player directory stats:', error);
    return { totalAccounts: 0, onlineAccounts: 0, totalCharacters: 0, bannedAccounts: 0 };
  }
}

async function getAccounts(query: string) {
  try {
    const hasQuery = query.length >= 2;
    const values = hasQuery ? [`%${query}%`, `%${query}%`] : [];

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT a.ID, a.Username, a.Admin, a.Online, a.LastIP,
              DATE_FORMAT(a.RegisterDate, '%b %e, %Y') AS registered_at,
              DATE_FORMAT(FROM_UNIXTIME(NULLIF(a.LoginDate, 0)), '%b %e, %Y %H:%i') AS last_login,
              (SELECT COUNT(*) FROM characters c WHERE c.master = a.ID) AS character_count,
              (SELECT COUNT(*) FROM bans b
               WHERE b.name = a.Username AND (b.perm = 1 OR b.expire > NOW())) AS active_bans
       FROM accounts a
       ${hasQuery ? 'WHERE a.Username LIKE ? OR EXISTS (SELECT 1 FROM characters c WHERE c.master = a.ID AND c.char_name LIKE ?)' : ''}
       ORDER BY a.Online DESC, a.ID DESC
       LIMIT 100`,
      values
    );
    return rows;
  } catch (error) {
    console.error('Error fetching player directory:', error);
    return [];
  }
}

export default async function PlayerDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const session = await getSession();

  if (!session || session.adminLevel <= 0) {
    redirect('/dashboard');
  }

  const params = await searchParams;
  const query = typeof params.q === 'string' ? params.q.trim().slice(0, 64) : '';
  const [email, stats, accounts] = await Promise.all([
    getUserEmail(session.username),
    getStats(),
    getAccounts(query),
  ]);

  const statCards = [
    { label: 'Accounts', value: stats.totalAccounts },
    { label: 'Online', value: stats.onlineAccounts },
    { label: 'Characters', value: stats.totalCharacters },
    { label: 'Banned', value: stats.bannedAccounts },
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
          <span className="font-medium text-zinc-500">Player Directory</span>
        </div>

        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-black text-white">
            <Users className="h-6 w-6 text-amber-500" />
            Player Directory
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Read-only account and character lookup, including recent connection activity.
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {statCards.map((card) => (
            <div key={card.label} className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{card.label}</p>
              <p className="mt-2 text-2xl font-black text-white">{card.value}</p>
            </div>
          ))}
        </div>

        <form action="/dashboard/admin/users" method="get" className="mb-4 flex flex-col gap-2 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Search username or character name..."
              className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900/60 pl-10 pr-3 text-sm text-white placeholder:text-zinc-600 focus:border-amber-500/50 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="h-11 rounded-xl bg-amber-500 px-5 text-xs font-bold text-black transition hover:bg-amber-400"
          >
            Search
          </button>
        </form>

        {accounts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 px-6 py-14 text-center">
            <Users className="mx-auto mb-3 h-10 w-10 text-zinc-700" />
            <h2 className="text-sm font-bold text-white">No accounts found</h2>
            <p className="mt-1 text-xs text-zinc-500">Try a different username or character name.</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/60 md:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left text-xs">
                  <thead className="border-b border-zinc-800 bg-zinc-900/50 text-[10px] uppercase tracking-wider text-zinc-500">
                    <tr>
                      <th className="px-4 py-3 font-bold">Account</th>
                      <th className="px-4 py-3 font-bold">Status</th>
                      <th className="px-4 py-3 font-bold">Characters</th>
                      <th className="px-4 py-3 font-bold">Last login</th>
                      <th className="px-4 py-3 font-bold">Registered</th>
                      <th className="px-4 py-3 text-right font-bold">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {accounts.map((account) => (
                      <tr key={account.ID} className="transition hover:bg-zinc-900/30">
                        <td className="px-4 py-3">
                          <p className="font-bold text-white">{account.Username}</p>
                          <p className="mt-0.5 font-mono text-[10px] text-zinc-600">
                            #{account.ID}{account.LastIP ? ` · ${account.LastIP}` : ''}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            <span
                              className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${
                                account.Online
                                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                                  : 'border-zinc-800 bg-zinc-900 text-zinc-500'
                              }`}
                            >
                              {account.Online ? 'Online' : 'Offline'}
                            </span>
                            {Number(account.Admin) > 0 ? (
                              <span className="rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                                <Shield className="mr-1 inline h-2.5 w-2.5" />
                                Admin {account.Admin}
                              </span>
                            ) : null}
                            {Number(account.active_bans) > 0 ? (
                              <span className="rounded-md border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-400">
                                Banned
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-zinc-400">{account.character_count}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-zinc-500">{account.last_login || 'Never'}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-zinc-500">{account.registered_at}</td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/dashboard/admin/users/${account.ID}`}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 transition hover:text-amber-300"
                          >
                            Open
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-3 md:hidden">
              {accounts.map((account) => (
                <Link
                  key={account.ID}
                  href={`/dashboard/admin/users/${account.ID}`}
                  className="block rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4 transition hover:border-amber-500/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">{account.Username}</p>
                      <p className="mt-0.5 font-mono text-[10px] text-zinc-600">
                        #{account.ID}{account.LastIP ? ` · ${account.LastIP}` : ''}
                      </p>
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-zinc-600" />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span
                      className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${
                        account.Online
                          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-500'
                      }`}
                    >
                      {account.Online ? 'Online' : 'Offline'}
                    </span>
                    {Number(account.Admin) > 0 ? (
                      <span className="rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                        Admin {account.Admin}
                      </span>
                    ) : null}
                    {Number(account.active_bans) > 0 ? (
                      <span className="rounded-md border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-400">
                        Banned
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-[10px] text-zinc-500">
                    {account.character_count} character{Number(account.character_count) === 1 ? '' : 's'} · Last login {account.last_login || 'never'}
                  </p>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
