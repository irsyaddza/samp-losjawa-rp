import { redirect } from 'next/navigation';
import Link from 'next/link';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { RowDataPacket } from 'mysql2';
import { ArrowLeft, Settings } from 'lucide-react';
import Navbar from '@/components/Navbar';
import SettingsForm from './SettingsForm';

async function getUserData(username: string) {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT Email, SecretWord, SecretHint FROM accounts WHERE Username = ? LIMIT 1',
      [username]
    );
    return rows[0] || null;
  } catch (error) {
    console.error('Error fetching user account details in settings:', error);
    return null;
  }
}

export default async function SettingsPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const account = await getUserData(session.username);
  if (!account) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-[#09090b] pt-20">
      <Navbar session={session ? { username: session.username, email: account.Email } : null} />

      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 max-w-4xl">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 mb-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Dashboard
          </Link>
          <span className="text-zinc-650 text-xs">/</span>
          <span className="text-xs text-zinc-500 font-medium">Account Settings</span>
        </div>

        {/* Heading */}
        <div className="mb-8">
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <Settings className="h-6 w-6 text-amber-500" />
            UCP Account Settings
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Manage your password, recovery email, and account security credentials.
          </p>
        </div>

        {/* Main Settings Form */}
        <SettingsForm
          initialEmail={account.Email || ''}
          initialSecretWord={account.SecretWord || ''}
          initialSecretHint={account.SecretHint || ''}
        />
      </main>
    </div>
  );
}
