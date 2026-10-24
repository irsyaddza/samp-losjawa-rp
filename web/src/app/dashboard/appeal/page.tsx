import { redirect } from 'next/navigation';
import Link from 'next/link';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { RowDataPacket } from 'mysql2';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileText,
  Scale,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import AppealForm from './AppealForm';
import { getAppealStatus } from '@/lib/appeals';

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

async function getActiveBans(username: string) {
  try {
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
  } catch (error) {
    console.error('Error fetching active bans for appeal page:', error);
    return [];
  }
}

async function getAppeals(accountId: number) {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, ban_id, ban_reason, ban_bannedby, ban_player_ip, ban_perm,
              COALESCE(ban_source, 'game') AS ban_source,
              DATE_FORMAT(ban_expire, '%b %e, %Y %H:%i') AS ban_expires_at,
              DATE_FORMAT(ban_created_at, '%b %e, %Y %H:%i') AS ban_created_at,
              message, status, admin_username, response,
              DATE_FORMAT(created_at, '%b %e, %Y %H:%i') AS created_at,
              DATE_FORMAT(reviewed_at, '%b %e, %Y %H:%i') AS reviewed_at
       FROM ucp_ban_appeals
       WHERE account_id = ?
       ORDER BY id DESC`,
      [accountId]
    );
    return rows;
  } catch (error) {
    console.error('Error fetching ban appeals:', error);
    return [];
  }
}

export default async function BanAppealPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const [email, activeBans, appeals] = await Promise.all([
    getUserEmail(session.username),
    getActiveBans(session.username),
    getAppeals(session.userId),
  ]);

  const appealedBanIds = new Set(appeals.map((appeal) => Number(appeal.ban_id)));
  const bansWithoutAppeal = activeBans.filter((ban) => !appealedBanIds.has(Number(ban.id)));
  const openAppeals = appeals.filter((appeal) => appeal.status === 'open');
  const resolvedAppeals = appeals.filter((appeal) => appeal.status !== 'open');

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
        <div className="mb-6 flex items-center gap-2 text-xs">
          <Link href="/dashboard" className="flex items-center gap-1 text-zinc-400 transition hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5" />
            Dashboard
          </Link>
          <span className="text-zinc-700">/</span>
          <span className="font-medium text-zinc-500">Ban Appeal</span>
        </div>

        <div className="mb-8">
          <h1 className="flex items-center gap-2 text-2xl font-black text-white">
            <Scale className="h-6 w-6 text-amber-500" />
            Ban Appeal
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-zinc-400">
            If your account is banned, you can submit one appeal for each active ban. Staff decisions are sent to your notifications.
          </p>
        </div>

        {activeBans.length === 0 ? (
          <section className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.03] p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
              <div>
                <h2 className="text-sm font-bold text-white">No active ban</h2>
                <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                  This account can log into the game. If you believe a ban was applied by mistake, contact staff through the Support Center.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href="/dashboard/records"
                    className="rounded-lg border border-zinc-800 px-3 py-1.5 text-[11px] font-bold text-zinc-300 transition hover:text-white"
                  >
                    View sanction records
                  </Link>
                  <Link
                    href="/dashboard/support"
                    className="rounded-lg bg-amber-500 px-3 py-1.5 text-[11px] font-bold text-black transition hover:bg-amber-400"
                  >
                    Open Support Center
                  </Link>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {bansWithoutAppeal.length > 0 ? (
          <section className="mt-6">
            <div className="mb-3 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-red-400" />
              <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-zinc-300">
                Active bans
              </h2>
            </div>
            <div className="space-y-3">
              {bansWithoutAppeal.map((ban) => (
                <article key={ban.id} className="rounded-2xl border border-red-500/15 bg-zinc-950/60 p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-white">{ban.reason || 'No reason recorded'}</p>
                      <p className="mt-1 text-[11px] text-zinc-500">
                        By {ban.bannedby} · {ban.created_at}
                      </p>
                    </div>
                    <span className="rounded-md border border-red-500/20 bg-red-500/10 px-2 py-1 text-[10px] font-bold text-red-400">
                      {ban.perm === 1 ? 'Permanent' : `Expires ${ban.expires_at}`}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-zinc-500">
                    <span className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-0.5 font-bold uppercase tracking-wider text-zinc-400">
                      {ban.source === 'web' ? 'UCP ban' : 'In-game ban'}
                    </span>
                    {ban.playerIP ? <span className="font-mono">{ban.playerIP}</span> : null}
                  </div>
                  <AppealForm banId={Number(ban.id)} />
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {openAppeals.length > 0 ? (
          <section className="mt-6">
            <div className="mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-zinc-300">
                Appeals under review
              </h2>
            </div>
            <div className="space-y-3">
              {openAppeals.map((appeal) => {
                const status = getAppealStatus(appeal.status);
                return (
                  <article key={appeal.id} className="rounded-2xl border border-amber-500/15 bg-zinc-950/60 p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-white">
                          {appeal.ban_reason || 'Ban appeal'}
                        </p>
                        <p className="mt-1 text-[11px] text-zinc-500">
                          Submitted {appeal.created_at} · ban #{appeal.ban_id}
                        </p>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${status.className}`}>
                        {status.label}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-1 text-[11px] text-zinc-500 sm:grid-cols-2">
                      <p>Banned by: <span className="text-zinc-300">{appeal.ban_bannedby || 'Unknown'}</span></p>
                      <p>
                        Length:{' '}
                        <span className="text-zinc-300">
                          {appeal.ban_perm === 1 ? 'Permanent' : `Until ${appeal.ban_expires_at || 'unknown'}`}
                        </span>
                      </p>
                    </div>
                    <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">Your appeal</p>
                      <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-zinc-300">
                        {appeal.message}
                      </p>
                    </div>
                    <p className="mt-3 text-[11px] text-zinc-500">
                      Staff will review this appeal and notify you. No further action is needed.
                    </p>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        {resolvedAppeals.length > 0 ? (
          <section className="mt-6">
            <div className="mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-zinc-500" />
              <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-zinc-300">
                Appeal history
              </h2>
            </div>
            <div className="space-y-3">
              {resolvedAppeals.map((appeal) => {
                const status = getAppealStatus(appeal.status);
                const accepted = appeal.status === 'accepted';
                return (
                  <article key={appeal.id} className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-white">
                          {appeal.ban_reason || 'Ban appeal'}
                        </p>
                        <p className="mt-1 text-[11px] text-zinc-500">
                          Submitted {appeal.created_at} · reviewed {appeal.reviewed_at || '—'}
                        </p>
                      </div>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold ${status.className}`}>
                        {accepted ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {status.label}
                      </span>
                    </div>
                    <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">Your appeal</p>
                      <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-zinc-400">
                        {appeal.message}
                      </p>
                    </div>
                    <div className="mt-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                        Staff decision{appeal.admin_username ? ` · ${appeal.admin_username}` : ''}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-zinc-300">
                        {appeal.response || 'No response provided.'}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        {activeBans.length > 0 && bansWithoutAppeal.length === 0 && openAppeals.length === 0 ? (
          <section className="mt-6 rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-5">
            <p className="text-xs leading-relaxed text-zinc-400">
              All active bans on this account already have an appeal or a final decision. If you need to add information, contact staff through the Support Center.
            </p>
            <Link
              href="/dashboard/support"
              className="mt-3 inline-flex rounded-lg bg-amber-500 px-3 py-1.5 text-[11px] font-bold text-black transition hover:bg-amber-400"
            >
              Open Support Center
            </Link>
          </section>
        ) : null}
      </main>
    </div>
  );
}
