import Link from 'next/link';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { RowDataPacket } from 'mysql2';
import { Server, Users, User, Shield, Compass, Sparkles, LogOut, LayoutDashboard } from 'lucide-react';

import Navbar from '@/components/Navbar';

async function getStats() {
  try {
    const [accountsRows] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM accounts'
    );
    const [charactersRows] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM characters'
    );
    const [onlineRows] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM accounts WHERE Online = 1'
    );

    return {
      totalAccounts: accountsRows[0]?.count || 0,
      totalCharacters: charactersRows[0]?.count || 0,
      onlinePlayers: onlineRows[0]?.count || 0,
      maxPlayers: 200,
    };
  } catch (error) {
    console.error('Failed to fetch server stats in SSR:', error);
    return {
      totalAccounts: 0,
      totalCharacters: 0,
      onlinePlayers: 0,
      maxPlayers: 200,
    };
  }
}

export default async function Home() {
  const session = await getSession();
  const stats = await getStats();

  let email: string | undefined = undefined;
  if (session) {
    try {
      const [rows] = await pool.execute<RowDataPacket[]>(
        'SELECT Email FROM accounts WHERE ID = ? LIMIT 1',
        [session.userId]
      );
      email = rows[0]?.Email || undefined;
    } catch (error) {
      console.error('Failed to fetch user email in home page:', error);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#09090b] pt-16">
      <Navbar session={session ? { username: session.username, email } : null} />


      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center overflow-hidden py-24 md:py-32">
        {/* Glow accent */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/5 px-3 py-1 text-xs text-amber-400 font-medium mb-6">
            <Sparkles className="h-3 w-3" />
            Server Roleplay SA-MP Paling Asik & Modern
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-3xl mx-auto leading-none mb-6">
            Petualangan Baru Menantimu di{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">
              Los Jawa Roleplay
            </span>
          </h1>

          <p className="text-zinc-400 max-w-xl mx-auto mb-10 text-base sm:text-lg">
            Bergabunglah dengan ratusan pemain lainnya di kota Los Jawa. Wujudkan mimpimu, bangun bisnismu, cari relasimu, dan nikmati fitur roleplay berkualitas tinggi.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={session ? "/dashboard" : "/register"}
              className="w-full sm:w-auto rounded-xl bg-amber-500 px-8 py-3.5 font-bold text-black hover:bg-amber-400 shadow-lg shadow-amber-500/10 transition text-center"
            >
              {session ? "Buka Dashboard UCP" : "Daftar Akun UCP Sekarang"}
            </Link>
            <a
              href="samp://77.80.80.80:7777" // Mocked link, user can replace with their actual IP
              className="w-full sm:w-auto rounded-xl border border-zinc-800 bg-zinc-950 px-8 py-3.5 font-bold text-white hover:bg-zinc-900 transition text-center"
            >
              Main Langsung (SA-MP)
            </a>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section id="stats" className="border-t border-b border-zinc-800/80 bg-zinc-950/40 py-16">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 text-center">
            <div className="flex flex-col items-center p-6 rounded-2xl border border-zinc-800/60 bg-zinc-950/20">
              <Users className="h-8 w-8 text-amber-500 mb-3" />
              <span className="text-3xl font-black text-white">{stats.onlinePlayers} / {stats.maxPlayers}</span>
              <span className="text-zinc-500 text-sm mt-1">Pemain Online</span>
            </div>
            <div className="flex flex-col items-center p-6 rounded-2xl border border-zinc-800/60 bg-zinc-950/20">
              <User className="h-8 w-8 text-amber-500 mb-3" />
              <span className="text-3xl font-black text-white">{stats.totalAccounts}</span>
              <span className="text-zinc-500 text-sm mt-1">Akun Terdaftar</span>
            </div>
            <div className="flex flex-col items-center p-6 rounded-2xl border border-zinc-800/60 bg-zinc-950/20">
              <Server className="h-8 w-8 text-amber-500 mb-3" />
              <span className="text-3xl font-black text-white">{stats.totalCharacters}</span>
              <span className="text-zinc-500 text-sm mt-1">Karakter Dibuat</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center max-w-xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">Fitur Unggulan Kami</h2>
            <p className="text-zinc-400">Kami menawarkan kenyamanan bermain dengan fitur script modern dan performa optimal.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl border border-zinc-800 bg-zinc-950/50 hover:border-amber-500/20 hover:bg-zinc-950/80 transition duration-300">
              <Shield className="h-10 w-10 text-amber-500 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Sistem Keamanan UCP</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Akun dilindungi dengan integrasi verifikasi email dan enkripsi Whirlpool untuk menjamin data Anda tetap aman.
              </p>
            </div>

            <div className="p-8 rounded-2xl border border-zinc-800 bg-zinc-950/50 hover:border-amber-500/20 hover:bg-zinc-950/80 transition duration-300">
              <Compass className="h-10 w-10 text-amber-500 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Peta Menarik & Unik</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Pemetaan lokasi yang detail dan eksklusif membuat suasana bermain terasa hidup, realistik, dan berkesan.
              </p>
            </div>

            <div className="p-8 rounded-2xl border border-zinc-800 bg-zinc-950/50 hover:border-amber-500/20 hover:bg-zinc-950/80 transition duration-300">
              <Sparkles className="h-10 w-10 text-amber-500 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Ekonomi Realistik</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Simulasi perekonomian seimbang dengan berbagai pilihan pekerjaan legal maupun ilegal, kepemilikan bisnis, properti, dan kendaraan pribadi.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-zinc-900 bg-zinc-950 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-zinc-500">
          <p>© {new Date().getFullYear()} Los Jawa Roleplay. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
