import { redirect } from 'next/navigation';
import Link from 'next/link';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { RowDataPacket } from 'mysql2';
import { Bell } from 'lucide-react';
import Navbar from '@/components/Navbar';
import NotificationsClient from './NotificationsClient';
import type { SystemNotificationRecord } from '@/lib/system-notifications';

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

export default async function NotificationsPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT id, type, title, body, link, is_read,
            DATE_FORMAT(created_at, '%b %e, %Y %H:%i') AS created_at
     FROM ucp_notifications
     WHERE account_id = ?
     ORDER BY id DESC
     LIMIT 100`,
    [session.userId]
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
        <div className="mb-6 flex items-center gap-2 text-xs">
          <Link href="/dashboard" className="text-zinc-400 transition hover:text-white">
            Dashboard
          </Link>
          <span className="text-zinc-700">/</span>
          <span className="font-medium text-zinc-500">Notifications</span>
        </div>

        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-black text-white">
            <Bell className="h-6 w-6 text-amber-500" />
            Notifications
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Updates about your tickets, applications, and account. Player messages are in your Inbox.
          </p>
        </div>

        <NotificationsClient initialNotifications={rows as SystemNotificationRecord[]} />
      </main>
    </div>
  );
}
