import { redirect } from 'next/navigation';
import Link from 'next/link';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { RowDataPacket } from 'mysql2';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import Navbar from '@/components/Navbar';
import RosterClient from './RosterClient';

async function getAdminRoster() {
  try {
    const [admins] = await pool.execute<RowDataPacket[]>(
      `SELECT ID, Username, Email, Admin, RegisterDate 
       FROM accounts 
       WHERE Admin != 0 
       ORDER BY 
         CASE 
           WHEN Admin = 1337 THEN 1 
           WHEN Admin = 4 THEN 2 
           WHEN Admin = 3 THEN 3 
           WHEN Admin = 2 THEN 4 
           WHEN Admin = 1 THEN 5 
           ELSE 6 
         END, 
         Admin DESC, 
         Username ASC`
    );
    return admins as unknown as {
      ID: number;
      Username: string;
      Email: string;
      Admin: number;
      RegisterDate: string;
    }[];
  } catch (error) {
    console.error('Error fetching admin roster page data:', error);
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

export default async function AdminRosterPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  // Access Control: Only Deputy Head Admin (Level >= 4) and Head Admin (Level 1337)
  if (session.adminLevel < 4) {
    redirect('/dashboard');
  }

  const email = await getUserEmail(session.username);
  const admins = await getAdminRoster();

  return (
    <div className="min-h-screen bg-[#09090b] pt-20 pb-12">
      <Navbar session={session ? { username: session.username, email } : null} />

      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 max-w-6xl">
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
          <Link
            href="/dashboard/admin"
            className="text-xs text-zinc-400 hover:text-white transition"
          >
            Admin Portal
          </Link>
          <span className="text-zinc-650 text-xs">/</span>
          <span className="text-xs text-zinc-500 font-medium font-bold">Admin Roster</span>
        </div>

        {/* Header & Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-amber-500" />
              Administrator Roster Management
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Manage staff team member ranks, appoint new administrators, or modify staff permissions. (Deputy Head Admin+ Access Only)
            </p>
          </div>

          {/* Quick Nav Links */}
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/admin"
              className="h-10 px-4 rounded-xl border border-zinc-800 bg-zinc-950 text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-900 transition flex items-center gap-2"
            >
              Applications
            </Link>
            <Link
              href="/dashboard/admin/mapping"
              className="h-10 px-4 rounded-xl border border-zinc-800 bg-zinc-950 text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-900 transition flex items-center gap-2"
            >
              Mappings
            </Link>
            <span className="h-10 px-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs font-bold text-amber-400 flex items-center gap-2">
              Staff Roster
            </span>
          </div>
        </div>

        {/* Client Roster Management UI */}
        <RosterClient initialAdmins={admins} currentAdminLevel={session.adminLevel} />
      </main>
    </div>
  );
}
