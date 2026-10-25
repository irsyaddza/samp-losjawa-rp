import { redirect } from 'next/navigation';
import Link from 'next/link';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { RowDataPacket } from 'mysql2';
import { ArrowLeft, Flag, LayoutDashboard, Map as MapIcon, Radio, Users } from 'lucide-react';
import Navbar from '@/components/Navbar';
import RadioManagerClient from './RadioManagerClient';

async function getRadioStations() {
  try {
    // Ensure table exists
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS radio_station (
        id INT AUTO_INCREMENT PRIMARY KEY,
        genres_id INT NOT NULL DEFAULT 1,
        subgenres_id INT NOT NULL DEFAULT 1,
        station_name VARCHAR(64) NOT NULL,
        station_url VARCHAR(255) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, genres_id, subgenres_id, station_name, station_url FROM radio_station ORDER BY genres_id ASC, id ASC'
    );
    return rows as unknown as {
      id: number;
      genres_id: number;
      subgenres_id: number;
      station_name: string;
      station_url: string;
    }[];
  } catch (error) {
    console.error('Error fetching radio stations for page:', error);
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

export default async function AdminRadioManagerPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  // Access Control: Minimum Admin Level 1 (Staff+)
  if (session.adminLevel < 1) {
    redirect('/dashboard');
  }

  const email = await getUserEmail(session.username);
  const stations = await getRadioStations();

  return (
    <div className="min-h-screen bg-[#09090b] pt-20 pb-12">
      <Navbar session={session ? { username: session.username, email, adminLevel: session.adminLevel } : null} />

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
          <span className="text-zinc-600 text-xs">/</span>
          <Link
            href="/dashboard/admin"
            className="text-xs text-zinc-400 hover:text-white transition"
          >
            Admin Portal
          </Link>
          <span className="text-zinc-600 text-xs">/</span>
          <span className="text-xs font-bold text-zinc-500">Radio Manager</span>
        </div>

        <section className="relative mb-6 overflow-hidden rounded-3xl border border-zinc-800/80 bg-gradient-to-br from-amber-500/10 via-zinc-950 to-zinc-950 p-5 sm:p-7">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                <Radio className="h-3 w-3" />
                Broadcast control · Staff level 1+
              </span>
              <h1 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">
                Radio Station Manager
              </h1>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400 sm:text-sm">
                Manage in-game radio streams for <span className="font-mono text-zinc-300">/setstation</span> and
                vehicle boomboxes. Test a stream in the browser before players tune in.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/dashboard/admin"
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/80 px-4 text-xs font-bold text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                Admin Portal
              </Link>
              <Link
                href="/dashboard/admin/mapping"
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/80 px-4 text-xs font-bold text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
              >
                <MapIcon className="h-3.5 w-3.5" />
                Mappings
              </Link>
              <Link
                href="/dashboard/admin/users"
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/80 px-4 text-xs font-bold text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
              >
                <Users className="h-3.5 w-3.5" />
                Player Directory
              </Link>
              <Link
                href="/dashboard/admin/reports"
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/80 px-4 text-xs font-bold text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
              >
                <Flag className="h-3.5 w-3.5" />
                Player Reports
              </Link>
            </div>
          </div>
        </section>

        {/* Client Component */}
        <RadioManagerClient initialStations={stations} />
      </main>
    </div>
  );
}
