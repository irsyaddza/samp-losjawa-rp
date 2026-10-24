import { redirect } from 'next/navigation';
import Link from 'next/link';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { RowDataPacket } from 'mysql2';
import { ArrowLeft, Scale } from 'lucide-react';
import Navbar from '@/components/Navbar';
import AppealsClient, { type AppealRecord } from './AppealsClient';

type Filter = 'open' | 'resolved' | 'all';

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

async function getAppealStats() {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
         SUM(status = 'open') AS open_count,
         SUM(status = 'accepted') AS accepted_count,
         SUM(status = 'rejected') AS rejected_count,
         COUNT(*) AS total_count
       FROM ucp_ban_appeals`
    );
    const row = rows[0];
    return {
      open: Number(row?.open_count || 0),
      accepted: Number(row?.accepted_count || 0),
      rejected: Number(row?.rejected_count || 0),
      total: Number(row?.total_count || 0),
    };
  } catch (error) {
    console.error('Error fetching appeal stats:', error);
    return { open: 0, accepted: 0, rejected: 0, total: 0 };
  }
}

async function getAppeals(filter: Filter) {
  const where =
    filter === 'open'
      ? "ap.status = 'open'"
      : filter === 'resolved'
        ? "ap.status IN ('accepted', 'rejected')"
        : '1 = 1';

  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT ap.id, ap.ban_id, ap.account_id, ap.username, ap.ban_reason,
              ap.ban_bannedby, ap.ban_player_ip, ap.ban_perm,
              COALESCE(ap.ban_source, 'game') AS ban_source,
              DATE_FORMAT(ap.ban_expire, '%b %e, %Y %H:%i') AS ban_expires_at,
              DATE_FORMAT(ap.ban_created_at, '%b %e, %Y %H:%i') AS ban_created_at,
              ap.message, ap.status, ap.admin_username, ap.response,
              DATE_FORMAT(ap.created_at, '%b %e, %Y %H:%i') AS created_at,
              DATE_FORMAT(ap.reviewed_at, '%b %e, %Y %H:%i') AS reviewed_at,
              (SELECT COUNT(*) FROM bans b
               WHERE b.id = ap.ban_id AND (b.perm = 1 OR b.expire > NOW())) AS ban_active,
              (SELECT a.Admin FROM accounts a WHERE a.ID = ap.account_id LIMIT 1) AS target_admin
       FROM ucp_ban_appeals ap
       WHERE ${where}
       ORDER BY CASE ap.status WHEN 'open' THEN 0 ELSE 1 END, ap.id DESC
       LIMIT 100`
    );
    return rows;
  } catch (error) {
    console.error('Error fetching ban appeals:', error);
    return [];
  }
}

export default async function AdminAppealsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  const session = await getSession();

  if (!session || session.adminLevel <= 0) {
    redirect('/dashboard');
  }

  const params = await searchParams;
  const requested = typeof params.status === 'string' ? params.status : 'open';
  const filter: Filter = requested === 'resolved' || requested === 'all' ? requested : 'open';

  const [email, stats, appeals] = await Promise.all([
    getUserEmail(session.username),
    getAppealStats(),
    getAppeals(filter),
  ]);

  const tabs: { value: Filter; label: string; count: number }[] = [
    { value: 'open', label: 'Open', count: stats.open },
    { value: 'resolved', label: 'Resolved', count: stats.accepted + stats.rejected },
    { value: 'all', label: 'All', count: stats.total },
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
          <Link href="/dashboard/admin/moderation" className="text-zinc-400 transition hover:text-white">
            Moderation
          </Link>
          <span className="text-zinc-700">/</span>
          <span className="font-medium text-zinc-500">Ban Appeals</span>
        </div>

        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-black text-white">
            <Scale className="h-6 w-6 text-amber-500" />
            Ban Appeals
          </h1>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-zinc-400">
            Review player appeals, unban accepted appeals, or reject with a clear reason. Every decision is recorded in the staff audit log and sent to the player.
          </p>
        </div>

        <div className="mb-6 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.03] p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Open</p>
            <p className="mt-2 text-2xl font-black text-white">{stats.open}</p>
          </div>
          <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.03] p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Accepted</p>
            <p className="mt-2 text-2xl font-black text-white">{stats.accepted}</p>
          </div>
          <div className="rounded-2xl border border-red-500/15 bg-red-500/[0.03] p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-red-500">Rejected</p>
            <p className="mt-2 text-2xl font-black text-white">{stats.rejected}</p>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const active = filter === tab.value;
            return (
              <Link
                key={tab.value}
                href={`/dashboard/admin/appeals?status=${tab.value}`}
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

        <AppealsClient
          appeals={appeals as unknown as AppealRecord[]}
          currentAdminLevel={session.adminLevel}
        />
      </main>
    </div>
  );
}
