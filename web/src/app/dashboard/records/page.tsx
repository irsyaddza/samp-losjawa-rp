import { redirect } from 'next/navigation';
import Link from 'next/link';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { RowDataPacket } from 'mysql2';
import { ArrowLeft, ShieldAlert, Clock, Info, ShieldX } from 'lucide-react';
import Navbar from '@/components/Navbar';

async function getBans(userId: number) {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM logs_ban WHERE user_id = ? ORDER BY id DESC',
      [userId]
    );
    return rows;
  } catch (error) {
    console.error('Error fetching ban logs:', error);
    return [];
  }
}

async function getJails(userId: number) {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM logs_jail WHERE user_id = ? ORDER BY id DESC',
      [userId]
    );
    return rows;
  } catch (error) {
    console.error('Error fetching jail logs:', error);
    return [];
  }
}

async function getKicks(userId: number) {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM logs_kick WHERE user_id = ? ORDER BY id DESC',
      [userId]
    );
    return rows;
  } catch (error) {
    console.error('Error fetching kick logs:', error);
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

export default async function AdminRecordsPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const email = await getUserEmail(session.username);
  const bans = await getBans(session.userId);
  const jails = await getJails(session.userId);
  const kicks = await getKicks(session.userId);

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
          <span className="text-xs text-zinc-500 font-medium">Admin Record</span>
        </div>

        {/* Heading */}
        <div className="mb-8">
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-red-500" />
            Catatan Pelanggaran (Admin Record)
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Riwayat hukuman administrasi (Bans, Jails, dan Kicks) yang tercatat pada seluruh karakter di UCP ini.
          </p>
        </div>

        <div className="space-y-8">
          
          {/* Section 1: Bans */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2 text-red-500">
              <ShieldX className="h-4.5 w-4.5" />
              Pemblokiran (Bans)
            </h3>
            {bans.length === 0 ? (
              <p className="text-xs text-zinc-500 py-2">Tidak ada catatan pemblokiran aktif/lampau.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-900 text-zinc-500 font-semibold uppercase tracking-wider">
                      <th className="pb-3 pr-4">Karakter</th>
                      <th className="pb-3 px-4">Administrator</th>
                      <th className="pb-3 px-4">Alasan</th>
                      <th className="pb-3 pl-4 text-right">Tanggal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {bans.map((ban: any) => (
                      <tr key={ban.id} className="hover:bg-zinc-900/10">
                        <td className="py-3 pr-4 font-bold text-white">{ban.Character.replace('_', ' ')}</td>
                        <td className="py-3 px-4 text-zinc-450">{ban.BannedBy}</td>
                        <td className="py-3 px-4 text-zinc-400 font-medium">{ban.Reason}</td>
                        <td className="py-3 pl-4 text-right text-zinc-550">
                          {new Date(ban.Date).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 2: Jails */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2 text-amber-500">
              <Clock className="h-4.5 w-4.5" />
              Penjara Admin (Jails)
            </h3>
            {jails.length === 0 ? (
              <p className="text-xs text-zinc-500 py-2">Tidak ada catatan penahanan administrasi.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-900 text-zinc-500 font-semibold uppercase tracking-wider">
                      <th className="pb-3 pr-4">Karakter</th>
                      <th className="pb-3 px-4">Administrator</th>
                      <th className="pb-3 px-4">Alasan</th>
                      <th className="pb-3 px-4">Durasi</th>
                      <th className="pb-3 pl-4 text-right">Tanggal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {jails.map((jail: any) => (
                      <tr key={jail.id} className="hover:bg-zinc-900/10">
                        <td className="py-3 pr-4 font-bold text-white">{jail.Character.replace('_', ' ')}</td>
                        <td className="py-3 px-4 text-zinc-450">{jail.JailedBy}</td>
                        <td className="py-3 px-4 text-zinc-400 font-medium">{jail.Reason}</td>
                        <td className="py-3 px-4 text-amber-500 font-bold">{jail.Minutes} Menit</td>
                        <td className="py-3 pl-4 text-right text-zinc-550">
                          {new Date(jail.Date).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 3: Kicks */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2 text-zinc-400">
              <Info className="h-4.5 w-4.5" />
              Tendangan (Kicks)
            </h3>
            {kicks.length === 0 ? (
              <p className="text-xs text-zinc-500 py-2">Tidak ada catatan pengeluaran paksa (kicks).</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-900 text-zinc-500 font-semibold uppercase tracking-wider">
                      <th className="pb-3 pr-4">Karakter</th>
                      <th className="pb-3 px-4">Administrator</th>
                      <th className="pb-3 px-4">Alasan</th>
                      <th className="pb-3 pl-4 text-right">Tanggal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {kicks.map((kick: any) => (
                      <tr key={kick.id} className="hover:bg-zinc-900/10">
                        <td className="py-3 pr-4 font-bold text-white">{kick.Character.replace('_', ' ')}</td>
                        <td className="py-3 px-4 text-zinc-450">{kick.KickedBy}</td>
                        <td className="py-3 px-4 text-zinc-400 font-medium">{kick.Reason}</td>
                        <td className="py-3 pl-4 text-right text-zinc-550">
                          {new Date(kick.Date).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
