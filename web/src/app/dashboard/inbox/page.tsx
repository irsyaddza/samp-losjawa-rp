import { redirect } from 'next/navigation';
import Link from 'next/link';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { listMailbox } from '@/lib/mailbox';
import { RowDataPacket } from 'mysql2';
import { Mail } from 'lucide-react';
import Navbar from '@/components/Navbar';
import MailboxClient from './MailboxClient';

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

export default async function InboxPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const [email, initialData] = await Promise.all([
    getUserEmail(session.username),
    listMailbox(session.userId, { box: 'inbox', page: 1 }),
  ]);

  return (
    <div className="min-h-screen bg-[#09090b] pb-12 pt-20">
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
          <span className="font-medium text-zinc-500">Inbox</span>
        </div>

        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-black text-white">
            <Mail className="h-6 w-6 text-amber-500" />
            Mailbox
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Private messages between UCP accounts. Direct image links are shown as previews.
          </p>
        </div>

        <MailboxClient initialData={initialData} currentUsername={session.username} />
      </main>
    </div>
  );
}
