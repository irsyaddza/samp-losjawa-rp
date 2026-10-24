import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { RowDataPacket } from 'mysql2';
import {
  ArrowLeft,
  Ban,
  Clock,
  Fingerprint,
  Gavel,
  Globe,
  Mail,
  Shield,
  UserRound,
  Users,
} from 'lucide-react';
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

async function getAccount(id: number) {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT ID, Username, Email, Admin, DonateRank, Online, LastIP, Serial,
            DATE_FORMAT(RegisterDate, '%b %e, %Y %H:%i') AS registered_at,
            DATE_FORMAT(FROM_UNIXTIME(NULLIF(LoginDate, 0)), '%b %e, %Y %H:%i') AS last_login
     FROM accounts
     WHERE ID = ?
     LIMIT 1`,
    [id]
  );
  return rows[0];
}

async function getCharacters(accountId: number) {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT c.ID, c.char_name, c.Level, c.Online, c.Cash, c.BankAccount,
            DATE_FORMAT(FROM_UNIXTIME(NULLIF(c.LastLogin, 0)), '%b %e, %Y') AS last_login,
            f.factionName, f.factionShort
     FROM characters c
     LEFT JOIN factions f ON c.Faction = f.factionID
     WHERE c.master = ?
     ORDER BY c.Online DESC, c.Level DESC, c.ID ASC`,
    [accountId]
  );
  return rows;
}

async function getActiveBans(username: string) {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT id, bannedby, reason, playerIP, perm, COALESCE(source, 'game') AS source,
            DATE_FORMAT(date, '%b %e, %Y %H:%i') AS created_at,
            DATE_FORMAT(expire, '%b %e, %Y %H:%i') AS expires_at
     FROM bans
     WHERE name = ? AND (perm = 1 OR expire > NOW())
     ORDER BY id DESC`,
    [username]
  );
  return rows;
}

async function getBanHistory(accountId: number) {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT id, \`Character\`, BannedBy, Reason, IP,
            DATE_FORMAT(Date, '%b %e, %Y %H:%i') AS created_at
     FROM logs_ban
     WHERE user_id = ?
     ORDER BY id DESC
     LIMIT 10`,
    [accountId]
  );
  return rows;
}

async function getConnections(username: string) {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT id, ip, char_name, serial,
            DATE_FORMAT(stamp, '%b %e, %Y %H:%i') AS connected_at,
            DATE_FORMAT(NULLIF(disconnected, '0000-00-00 00:00:00'), '%b %e, %Y %H:%i') AS disconnected_at
     FROM logs_connection
     WHERE master = ?
     ORDER BY stamp DESC
     LIMIT 12`,
    [username]
  );
  return rows;
}

export default async function PlayerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();

  if (!session || session.adminLevel <= 0) {
    redirect('/dashboard');
  }

  const routeParams = await params;
  const accountId = Number(routeParams.id);

  if (!Number.isInteger(accountId) || accountId <= 0) {
    notFound();
  }

  const account = await getAccount(accountId);
  if (!account) {
    notFound();
  }

  const [email, characters, activeBans, banHistory, connections] = await Promise.all([
    getUserEmail(session.username),
    getCharacters(accountId),
    getActiveBans(account.Username),
    getBanHistory(accountId),
    getConnections(account.Username),
  ]);

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
          <Link href="/dashboard/admin/users" className="text-zinc-400 transition hover:text-white">
            Player Directory
          </Link>
          <span className="text-zinc-700">/</span>
          <span className="font-medium text-zinc-500">{account.Username}</span>
        </div>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-black text-white">
              <UserRound className="h-6 w-6 text-amber-500" />
              {account.Username}
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Account #{account.ID} · {account.Online ? 'Online in game' : 'Offline'}
            </p>
          </div>

          <Link
            href={`/dashboard/admin/moderation?q=${encodeURIComponent(account.Username)}`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-4 text-xs font-bold text-zinc-300 transition hover:border-red-500/30 hover:text-white"
          >
            <Gavel className="h-4 w-4 text-amber-500" />
            Open in Moderation
          </Link>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <section className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-5">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-zinc-400">Account</h2>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-zinc-600">Email</dt>
                <dd className="mt-1 flex items-center gap-1.5 break-all text-xs text-zinc-300">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
                  {account.Email || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-zinc-600">Admin level</dt>
                <dd className="mt-1 flex items-center gap-1.5 text-xs text-zinc-300">
                  <Shield className="h-3.5 w-3.5 text-amber-500" />
                  {Number(account.Admin) > 0 ? account.Admin : 'Regular player'}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-zinc-600">Donator rank</dt>
                <dd className="mt-1 text-xs text-zinc-300">{account.DonateRank || 0}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-zinc-600">Registered</dt>
                <dd className="mt-1 text-xs text-zinc-300">{account.registered_at}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-zinc-600">Last login</dt>
                <dd className="mt-1 text-xs text-zinc-300">{account.last_login || 'Never'}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-zinc-600">Last IP</dt>
                <dd className="mt-1 font-mono text-xs text-zinc-300">{account.LastIP || '—'}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[10px] uppercase tracking-wider text-zinc-600">Serial</dt>
                <dd className="mt-1 break-all font-mono text-[10px] text-zinc-500">{account.Serial || '—'}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-5">
            <h2 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-zinc-400">
              <Ban className="h-3.5 w-3.5 text-red-400" />
              Active bans
            </h2>
            {activeBans.length === 0 ? (
              <p className="text-xs text-zinc-500">This account is not banned.</p>
            ) : (
              <div className="space-y-3">
                {activeBans.map((ban) => (
                  <div key={ban.id} className="rounded-xl border border-red-500/15 bg-red-500/[0.03] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-red-400">
                        {ban.perm === 1 ? 'Permanent' : `Until ${ban.expires_at}`}
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-600">
                        {ban.source === 'web' ? 'UCP' : 'In-game'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-300">{ban.reason || 'No reason recorded'}</p>
                    <p className="mt-1 text-[10px] text-zinc-600">
                      By {ban.bannedby} · {ban.created_at}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="mt-4 rounded-2xl border border-zinc-800/80 bg-zinc-950/60">
          <div className="border-b border-zinc-800 px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-bold text-white">
              <Users className="h-4 w-4 text-amber-500" />
              Characters
            </h2>
          </div>
          {characters.length === 0 ? (
            <p className="px-5 py-8 text-xs text-zinc-500">No characters on this account.</p>
          ) : (
            <div className="divide-y divide-zinc-900">
              {characters.map((character) => (
                <div key={character.ID} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-white">
                      {String(character.char_name).replace(/_/g, ' ')}
                    </p>
                    <p className="mt-0.5 text-[10px] text-zinc-600">
                      #{character.ID} · Level {character.Level} · Last login {character.last_login || 'never'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[10px]">
                    <span
                      className={`rounded-md border px-2 py-0.5 font-bold ${
                        character.Online
                          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-500'
                      }`}
                    >
                      {character.Online ? 'Online' : 'Offline'}
                    </span>
                    {character.factionShort ? (
                      <span className="rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 font-bold text-amber-400">
                        {character.factionShort}
                      </span>
                    ) : null}
                    <span className="font-mono text-zinc-500">
                      ${Number(character.Cash).toLocaleString('en-US')} cash · ${Number(character.BankAccount).toLocaleString('en-US')} bank
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60">
            <div className="flex items-center justify-between gap-3 border-b border-zinc-800 px-5 py-4">
              <h2 className="flex items-center gap-2 text-sm font-bold text-white">
                <Globe className="h-4 w-4 text-amber-500" />
                Recent connections
              </h2>
              <span className="text-[10px] text-zinc-600">logs_connection</span>
            </div>

            {connections.length === 0 ? (
              <p className="px-5 py-8 text-xs text-zinc-500">No connection history recorded.</p>
            ) : (
              <div className="divide-y divide-zinc-900">
                {connections.map((connection) => (
                  <div key={connection.id} className="px-5 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-white">
                        {connection.char_name ? String(connection.char_name).replace(/_/g, ' ') : 'No character selected'}
                      </p>
                      <p className="font-mono text-[10px] text-zinc-500">{connection.ip}</p>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-zinc-600">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {connection.connected_at}
                      </span>
                      <span>→ {connection.disconnected_at || 'still connected / no clean disconnect'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60">
            <div className="flex items-center justify-between gap-3 border-b border-zinc-800 px-5 py-4">
              <h2 className="flex items-center gap-2 text-sm font-bold text-white">
                <Fingerprint className="h-4 w-4 text-amber-500" />
                Ban history
              </h2>
              <span className="text-[10px] text-zinc-600">logs_ban</span>
            </div>

            {banHistory.length === 0 ? (
              <p className="px-5 py-8 text-xs text-zinc-500">No past bans recorded for this account.</p>
            ) : (
              <div className="divide-y divide-zinc-900">
                {banHistory.map((ban) => (
                  <div key={ban.id} className="px-5 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-white">
                        {String(ban.Character).replace(/_/g, ' ')}
                      </p>
                      <p className="text-[10px] text-zinc-600">{ban.created_at}</p>
                    </div>
                    <p className="mt-1 text-[11px] text-zinc-400">{ban.Reason || 'No reason recorded'}</p>
                    <p className="mt-0.5 text-[10px] text-zinc-600">
                      By {ban.BannedBy} · {ban.IP}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
