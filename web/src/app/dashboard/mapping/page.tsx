import { redirect } from 'next/navigation';
import Link from 'next/link';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { RowDataPacket } from 'mysql2';
import { ArrowLeft, Home, Briefcase, Building, AlertCircle, History, UploadCloud, CheckCircle2, XCircle, Clock, FileCode } from 'lucide-react';
import Navbar from '@/components/Navbar';
import MappingForm from './MappingForm';

async function getUserDonatorStatus(userId: number) {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT DonateRank, Email FROM accounts WHERE ID = ? LIMIT 1',
      [userId]
    );
    return rows[0] || null;
  } catch (error) {
    console.error('Error fetching user donator status:', error);
    return null;
  }
}

async function getMappingRequests(username: string) {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, property_type, property_id, status, admin_note, created_at, custom_title FROM property_mappings WHERE ucp_name = ? ORDER BY created_at DESC',
      [username]
    );
    return rows;
  } catch (error) {
    console.error('Error fetching mapping requests:', error);
    return [];
  }
}

export default async function MappingPortalPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const accountInfo = await getUserDonatorStatus(session.userId);
  if (!accountInfo) {
    redirect('/login');
  }

  const isDonator = accountInfo.DonateRank >= 2;
  const requests = await getMappingRequests(session.username);

  return (
    <div className="min-h-screen bg-[#09090b] pt-20 pb-12">
      <Navbar session={session ? { username: session.username, email: accountInfo.Email } : null} />

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
          <span className="text-zinc-700 text-xs">/</span>
          <span className="text-xs text-zinc-500 font-medium">Request Mapping Properti</span>
        </div>

        {/* Heading */}
        <div className="mb-8">
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <Home className="h-6 w-6 text-amber-500" />
            Request Mapping Properti
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Kustomisasi interior/eksterior rumah, bisnis, atau apartemen Anda dengan menempelkan kode MTA/Texture Studio.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Submission Form Column */}
          <div className="lg:col-span-2">
            {isDonator ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-xl">
                <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <UploadCloud className="h-5 w-5 text-amber-500" />
                  Kirim Request Baru
                </h3>
                <MappingForm />
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 border-dashed flex flex-col items-center text-center">
                <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
                <h3 className="text-base font-bold text-white mb-2">Akses Terbatas Donator</h3>
                <p className="text-xs text-zinc-400 max-w-md leading-relaxed">
                  Mohon maaf, fitur request mapping properti kustom hanya dapat diakses oleh akun dengan status donatur minimal **Silver (Level 2)**. Silakan lakukan donasi atau klaim donasi Anda di menu Donatur.
                </p>
                <Link
                  href="/donator"
                  className="mt-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-black px-5 py-2.5 text-xs font-bold transition shadow-sm"
                >
                  Lihat Donasi
                </Link>
              </div>
            )}
          </div>

          {/* Request History Column */}
          <div className="lg:col-span-1 space-y-6">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-xl">
              <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2">
                <History className="h-5 w-5 text-zinc-400" />
                Riwayat Pengajuan
              </h3>

              {requests.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-xs text-zinc-500">Belum ada pengajuan mapping.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                  {requests.map((req) => (
                    <div
                      key={req.id}
                      className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-white flex items-center gap-1.5">
                          {req.property_type === 1 && <Home className="h-3.5 w-3.5 text-amber-400" />}
                          {req.property_type === 2 && <Briefcase className="h-3.5 w-3.5 text-amber-400" />}
                          {req.property_type === 3 && <Building className="h-3.5 w-3.5 text-amber-400" />}
                          {req.property_type === 4 && <FileCode className="h-3.5 w-3.5 text-amber-400" />}
                          {req.property_type === 4
                            ? `Kustom: ${req.custom_title || 'Tanpa Judul'}`
                            : `${req.property_type === 1 ? 'Rumah' : req.property_type === 2 ? 'Bisnis' : 'Apartemen'} #${req.property_id}`}
                        </span>

                        {req.status === 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                            <Clock className="h-3 w-3" />
                            Pending
                          </span>
                        )}
                        {req.status === 1 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-400">
                            <CheckCircle2 className="h-3 w-3" />
                            Approved
                          </span>
                        )}
                        {req.status === 2 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-400">
                            <XCircle className="h-3 w-3" />
                            Rejected
                          </span>
                        )}
                      </div>

                      <div className="text-[10px] text-zinc-500">
                        Diajukan: {new Date(req.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </div>

                      {req.admin_note && (
                        <div className="text-xs p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 leading-relaxed">
                          <span className="font-bold text-zinc-300 block mb-0.5">Catatan Admin:</span>
                          {req.admin_note}
                        </div>
                      )}
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
