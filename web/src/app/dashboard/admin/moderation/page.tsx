import { redirect } from 'next/navigation';
import Link from 'next/link';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { RowDataPacket } from 'mysql2';
import { ArrowLeft, Gavel } from 'lucide-react';
import Navbar from '@/components/Navbar';
import ModerationClient from './ModerationClient';

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

async function getActiveBans() {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT b.id, b.name, b.bannedby, b.reason, b.playerIP, b.perm, b.serial,
              COALESCE(b.source, 'game') AS source,
              DATE_FORMAT(b.date, '%b %e, %Y %H:%i') AS created_at,
              DATE_FORMAT(b.expire, '%b %e, %Y %H:%i') AS expires_at,
              (SELECT a.Admin FROM accounts a WHERE a.Username = b.name LIMIT 1) AS target_admin
       FROM bans b
       WHERE b.perm = 1 OR b.expire > NOW()
       ORDER BY b.id DESC
       LIMIT 100`
    );
    return rows;
  } catch (error) {
    console.error('Error fetching active bans:', error);
    return [];
  }
}

async function searchAccounts(query: string) {
  if (query.length < 2) return [];

  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT a.ID, a.Username, a.Admin, a.Online, a.LastIP,
              DATE_FORMAT(a.RegisterDate, '%b %e, %Y') AS registered_at,
              DATE_FORMAT(FROM_UNIXTIME(NULLIF(a.LoginDate, 0)), '%b %e, %Y %H:%i') AS last_login,
              (SELECT GROUP_CONCAT(c.char_name SEPARATOR ', ')
               FROM characters c WHERE c.master = a.ID) AS characters,
              (SELECT COUNT(*) FROM bans b
               WHERE b.name = a.Username AND (b.perm = 1 OR b.expire > NOW())) AS active_bans
       FROM accounts a
       WHERE a.Username LIKE ?
          OR EXISTS (
            SELECT 1 FROM characters c
            WHERE c.master = a.ID AND c.char_name LIKE ?
          )
       ORDER BY a.Online DESC, a.Username ASC
       LIMIT 20`,
      [`%${query}%`, `%${query}%`]
    );
    return rows;
  } catch (error) {
    console.error('Error searching accounts for moderation:', error);
    return [];
  }
}

export default async function ModerationPage({
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
  const [email, bans, accounts] = await Promise.all([
    getUserEmail(session.username),
    getActiveBans(),
    searchAccounts(query),
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
          <span className="font-medium text-zinc-500">Moderation Center</span>
        </div>

        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-black text-white">
            <Gavel className="h-6 w-6 text-amber-500" />
            Moderation Center
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Ban or unban accounts from the UCP. Bans are written to the same table the game checks at login, and in-game bans appear in the audit log.
          </p>
        </div>

        <ModerationClient
          initialBans={bans as unknown as {
            id: number;
            name: string | null;
            bannedby: string;
            reason: string | null;
            playerIP: string | null;
            perm: number;
            serial: string;
            source: string;
            created_at: string;
            expires_at: string;
            target_admin: number | null;
          }[]}
          accounts={accounts as unknown as {
            ID: number;
            Username: string;
            Admin: number;
            Online: number;
            LastIP: string | null;
            registered_at: string;
            last_login: string | null;
            characters: string | null;
            active_bans: number;
          }[]}
          query={query}
          currentAdminLevel={session.adminLevel}
          currentUsername={session.username}
        />
      </main>
    </div>
  );
}
