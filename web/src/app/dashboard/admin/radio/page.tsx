import { redirect } from 'next/navigation';
import Link from 'next/link';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { RowDataPacket } from 'mysql2';
import { ArrowLeft, Radio } from 'lucide-react';
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
    return rows as any[];
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
          <span className="text-zinc-650 text-xs">/</span>
          <Link
            href="/dashboard/admin"
            className="text-xs text-zinc-400 hover:text-white transition"
          >
            Admin Portal
          </Link>
          <span className="text-zinc-650 text-xs">/</span>
          <span className="text-xs text-zinc-500 font-medium font-bold">Radio Manager</span>
        </div>

        {/* Header & Quick Navigation */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-2">
              <Radio className="h-6 w-6 text-amber-500" />
              In-Game Radio Station Manager
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Manage in-game radio stations and audio stream links for /setstation and vehicle boomboxes. (Staff Level 1+ Access Only)
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
              Radio Manager
            </span>
          </div>
        </div>

        {/* Client Component */}
        <RadioManagerClient initialStations={stations} />
      </main>
    </div>
  );
}
