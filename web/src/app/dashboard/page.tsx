import { redirect } from 'next/navigation';
import Link from 'next/link';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { RowDataPacket } from 'mysql2';
import { User, Shield, Calendar, Landmark, Coins, LogOut, ArrowLeft, Gamepad2, Settings, UserPlus, ShieldAlert, CheckCircle2, Clock, Users, Mail, Home } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { getSkinImageUrl } from '@/lib/assets';

async function getUserData(username: string) {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT ID, Username, Email, Admin, DonateRank, RegisterDate FROM accounts WHERE Username = ? LIMIT 1',
      [username]
    );
    return rows[0] || null;
  } catch (error) {
    console.error('Error fetching user account details:', error);
    return null;
  }
}

async function getUserCharacters(userId: number) {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT ID, char_name, Level, Model, Online, Cash, BankAccount, Faction, playerJob FROM characters WHERE master = ?',
      [userId]
    );
    return rows;
  } catch (error) {
    console.error('Error fetching user characters:', error);
    return [];
  }
}

async function getUserApplications(userId: number) {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, char_name, status, accepted, reason, date_of_submit FROM application WHERE master = ? ORDER BY date_of_submit DESC',
      [userId]
    );
    return rows;
  } catch (error) {
    console.error('Error fetching user applications:', error);
    return [];
  }
}

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const account = await getUserData(session.username);
  if (!account) {
    redirect('/login');
  }

  const characters = await getUserCharacters(session.userId);
  const applications = await getUserApplications(session.userId);

  return (
    <div className="min-h-screen bg-[#09090b] pt-20 pb-12">
      <Navbar session={session ? { username: session.username, email: account.Email } : null} />

      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 max-w-7xl">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          
          {/* Left Column - Account Info & Quick Actions */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Account Info Card */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none">
                <User className="h-32 w-32 text-white" />
              </div>

              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <User className="h-5 w-5 text-amber-500" />
                Informasi UCP
              </h3>

              <div className="space-y-4">
                <div>
                  <span className="text-xs text-zinc-500 block">Username</span>
                  <span className="text-sm font-semibold text-white">{account.Username}</span>
                </div>
                <div>
                  <span className="text-xs text-zinc-500 block">Email Pemulihan</span>
                  <span className="text-sm font-semibold text-white">{account.Email || 'Belum diatur'}</span>
                </div>
                <div>
                  <span className="text-xs text-zinc-500 block">Level Administrator</span>
                  <span className="text-sm font-semibold text-white flex items-center gap-1.5 mt-0.5">
                    <Shield className="h-4 w-4 text-amber-500" />
                    {account.Admin > 0 ? `Level ${account.Admin}` : 'Pemain Biasa'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-zinc-500 block">Status Donator</span>
                  <span className="text-sm font-semibold text-amber-400">
                    {account.DonateRank > 0 ? `Donator Level ${account.DonateRank}` : 'Tidak Aktif'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-zinc-500 block">Tanggal Pendaftaran</span>
                  <span className="text-sm font-semibold text-white flex items-center gap-1.5 mt-0.5">
                    <Calendar className="h-4 w-4 text-zinc-500" />
                    {account.RegisterDate ? new Date(account.RegisterDate).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    }) : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
              <h3 className="text-base font-bold text-white mb-4">Menu UCP</h3>
              <div className="space-y-2">
                <Link
                  href="/dashboard/apply"
                  className="flex items-center gap-2.5 w-full rounded-xl bg-amber-500 hover:bg-amber-400 text-black px-4 py-3 text-xs font-bold transition shadow-sm"
                >
                  <UserPlus className="h-4 w-4" />
                  Buat Karakter Baru
                </Link>
                <Link
                  href="/dashboard/settings"
                  className="flex items-center gap-2.5 w-full rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-white px-4 py-3 text-xs font-semibold transition"
                >
                  <Settings className="h-4 w-4 text-zinc-400" />
                  Pengaturan Keamanan
                </Link>
                <Link
                  href="/dashboard/mapping"
                  className="flex items-center gap-2.5 w-full rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-white px-4 py-3 text-xs font-semibold transition"
                >
                  <Home className="h-4 w-4 text-amber-500" />
                  Request Mapping Rumah
                </Link>
                <Link
                  href="/dashboard/online"
                  className="flex items-center gap-2.5 w-full rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-white px-4 py-3 text-xs font-semibold transition"
                >
                  <Users className="h-4 w-4 text-amber-500" />
                  Pemain Online
                </Link>
                <Link
                  href="/dashboard/inbox"
                  className="flex items-center gap-2.5 w-full rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-white px-4 py-3 text-xs font-semibold transition"
                >
                  <Mail className="h-4 w-4 text-amber-500" />
                  Kotak Pesan
                </Link>
                <Link
                  href="/dashboard/records"
                  className="flex items-center gap-2.5 w-full rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-white px-4 py-3 text-xs font-semibold transition"
                >
                  <ShieldAlert className="h-4 w-4 text-red-500" />
                  Catatan Pelanggaran
                </Link>
                {account.Admin > 0 && (
                  <Link
                    href="/dashboard/admin"
                    className="flex items-center gap-2.5 w-full rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 px-4 py-3 text-xs font-semibold transition"
                  >
                    <Shield className="h-4 w-4" />
                    Admin Review Portal
                  </Link>
                )}
              </div>
            </div>

          </div>

          {/* Right Column - Characters & Applications */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Characters Card */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Gamepad2 className="h-5 w-5 text-amber-500" />
                Daftar Karakter Aktif ({characters.length})
              </h3>

              {characters.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-zinc-800 rounded-xl bg-zinc-950/20">
                  <Gamepad2 className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                  <h4 className="text-white font-bold mb-1">Belum Ada Karakter Aktif</h4>
                  <p className="text-zinc-400 text-sm max-w-md mx-auto mb-6">
                    Anda belum memiliki karakter yang siap dimainkan. Silakan ajukan pembuatan karakter baru terlebih dahulu.
                  </p>
                  <Link
                    href="/dashboard/apply"
                    className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-black hover:bg-amber-400 transition"
                  >
                    <UserPlus className="h-4 w-4" />
                    Ajukan Karakter Pertama
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {characters.map((char) => (
                    <Link
                      key={char.ID}
                      href={`/dashboard/character/${char.ID}`}
                      className="flex gap-4 rounded-xl border border-zinc-800 bg-zinc-900/20 p-5 hover:border-amber-500/20 hover:scale-[1.01] transition duration-200 group"
                    >
                      {/* Left: Info */}
                      <div className="flex-1 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-white text-base">
                              {char.char_name.replace('_', ' ')}
                            </h4>
                            <span className="text-[10px] text-zinc-500">UCP ID: {char.ID}</span>
                          </div>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold ${
                              char.Online
                                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                : 'bg-zinc-800 text-zinc-500'
                            }`}
                          >
                            {char.Online ? 'Online' : 'Offline'}
                          </span>
                        </div>

                        <div className="space-y-2 pt-2.5 border-t border-zinc-850">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-zinc-500">Level Karakter</span>
                            <span className="font-semibold text-white">Level {char.Level}</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-zinc-500">Uang Tunai</span>
                            <span className="font-semibold text-white flex items-center gap-0.5">
                              <Coins className="h-3 w-3 text-amber-500" />
                              ${char.Cash.toLocaleString('en-US')}
                            </span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-zinc-500">Saldo Bank</span>
                            <span className="font-semibold text-white flex items-center gap-0.5">
                              <Landmark className="h-3 w-3 text-amber-500" />
                              ${char.BankAccount.toLocaleString('en-US')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Skin Preview */}
                      <div className="w-16 h-28 flex-shrink-0 bg-zinc-950/40 rounded-lg border border-zinc-850 flex items-center justify-center overflow-hidden relative group-hover:border-zinc-700 transition">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getSkinImageUrl(char.Model, true)}
                          alt={`Skin ${char.Model}`}
                          className="h-24 w-auto object-contain drop-shadow-[0_4px_6px_rgba(245,158,11,0.25)] group-hover:scale-105 transition"
                          style={{ filter: 'brightness(1.35) contrast(1.05)' }}
                          loading="lazy"
                        />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Applications Card */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                Riwayat Pengajuan Karakter ({applications.length})
              </h3>

              {applications.length === 0 ? (
                <div className="text-center py-8 text-xs text-zinc-500">
                  Tidak ada riwayat pengajuan aplikasi karakter.
                </div>
              ) : (
                <div className="space-y-4">
                  {applications.map((app) => (
                    <div
                      key={app.id}
                      className="rounded-xl border border-zinc-800 bg-zinc-900/10 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                    >
                      <div>
                        <h4 className="font-bold text-white text-sm">
                          {app.char_name.replace('_', ' ')}
                        </h4>
                        <span className="text-[10px] text-zinc-500 block">
                          Diajukan: {app.date_of_submit ? new Date(app.date_of_submit).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          }) : 'N/A'}
                        </span>
                      </div>

                      <div className="flex flex-col sm:items-end gap-1.5">
                        {app.status === 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 text-[10px] font-bold">
                            <Clock className="h-3 w-3" />
                            Menunggu Review
                          </span>
                        ) : app.accepted === 1 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 text-[10px] font-bold">
                            <CheckCircle2 className="h-3 w-3" />
                            Diterima
                          </span>
                        ) : (
                          <div className="space-y-1 sm:text-right">
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 text-[10px] font-bold">
                              <ShieldAlert className="h-3 w-3" />
                              Ditolak / Denied
                            </span>
                            {app.reason && (
                              <p className="text-[10px] text-red-400 max-w-xs leading-relaxed italic bg-red-500/5 border border-red-500/10 p-1.5 rounded-lg mt-1">
                                Alasan: {app.reason}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}
