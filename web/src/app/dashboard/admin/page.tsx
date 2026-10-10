import { redirect } from 'next/navigation';
import Link from 'next/link';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { RowDataPacket } from 'mysql2';
import { ArrowLeft, Shield, FileText, ArrowRight } from 'lucide-react';
import Navbar from '@/components/Navbar';
import AdminPanel from './AdminPanel';

async function getPendingApplications() {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        a.id, 
        a.master, 
        a.char_name, 
        a.story, 
        a.origin, 
        a.gender, 
        a.age, 
        a.date_of_submit, 
        u.Username, 
        u.answer1, 
        u.answer2 
      FROM application a 
      JOIN accounts u ON a.master = u.ID 
      WHERE a.status = 0 
      ORDER BY a.date_of_submit ASC`
    );
    return rows;
  } catch (error) {
    console.error('Error fetching pending applications for admin:', error);
    return [];
  }
}

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

export default async function AdminPortalPage() {
  const session = await getSession();

  if (!session || session.adminLevel <= 0) {
    redirect('/dashboard');
  }

  const email = await getUserEmail(session.username);
  const pendingApps = await getPendingApplications();

  return (
    <div className="min-h-screen bg-[#09090b] pt-20 pb-12">
      <Navbar session={session ? { username: session.username, email } : null} />

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
          <span className="text-xs text-zinc-500 font-medium font-bold">Admin Portal</span>
        </div>

        {/* Heading */}
        <div className="mb-8">
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <Shield className="h-6 w-6 text-amber-500" />
            Administrator Portal
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Review new character applications and manage player donator statuses.
          </p>
        </div>

        {session.adminLevel === 1337 && (
          <Link
            href="/dashboard/admin/changelog"
            className="mb-8 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-5 py-4 transition hover:border-amber-500/50"
          >
            <div>
              <p className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="h-4 w-4 text-amber-500" />
                Changelog Manager
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">Publish server updates to /changelog and the website.</p>
            </div>
            <ArrowRight className="h-4 w-4 text-zinc-600" />
          </Link>
        )}

        {/* Admin Applications Review List */}
        <AdminPanel initialApps={pendingApps as any[]} currentAdminLevel={session.adminLevel} />
      </main>
    </div>
  );
}
