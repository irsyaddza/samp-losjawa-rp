import Image from 'next/image';
import Link from 'next/link';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { RowDataPacket } from 'mysql2';
import {
  Server,
  Users,
  User,
  Shield,
  Compass,
  Sparkles,
  Play,
  FileText,
  ArrowRight,
  BadgeCheck,
  MessageSquare,
  Clock3,
} from 'lucide-react';

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
    <div className="min-h-screen bg-[#05070c] text-zinc-100">
      <Navbar session={session ? { username: session.username, email } : null} />

      <main className="pt-24 sm:pt-28">
        <section className="relative isolate overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.18),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(251,191,36,0.16),_transparent_30%)]" />
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
            <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="max-w-2xl">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-sm font-medium text-amber-300">
                  <Sparkles className="h-4 w-4" />
                  Modern roleplay with a polished community experience
                </div>

                <h1 className="text-4xl font-black leading-[0.95] tracking-[-0.03em] text-white sm:text-5xl lg:text-7xl">
                  A fresh city, a better roleplay journey.
                </h1>

                <p className="mt-5 max-w-xl text-base leading-8 text-zinc-400 sm:text-lg">
                  Join Los Jawa Roleplay to build a life, run a business, grow friendships and experience one of the most immersive SA-MP communities in the region.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href={session ? '/dashboard' : '/register'}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-amber-500 px-6 py-3.5 text-sm font-semibold text-black transition hover:bg-amber-400"
                  >
                    {session ? 'Open UCP dashboard' : 'Create your account'}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <a
                    href="samp://77.80.80.80:7777"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    <Play className="h-4 w-4" />
                    Connect to server
                  </a>
                  <Link
                    href="/changelog"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    <FileText className="h-4 w-4" />
                    Changelog
                  </Link>
                </div>

                <div className="mt-8 flex flex-wrap gap-3 text-sm text-zinc-400">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2">
                    <BadgeCheck className="h-4 w-4 text-amber-400" />
                    Verified account access
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2">
                    <Clock3 className="h-4 w-4 text-amber-400" />
                    Active community events
                  </span>
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-zinc-950/75 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-7">
                <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/25 bg-amber-500/10">
                    <Image src="/logo.png" alt="Los Jawa RP logo" width={36} height={36} priority />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Los Jawa Roleplay</p>
                    <p className="text-sm text-zinc-400">SA-MP server portal</p>
                  </div>
                </div>

                <div className="mt-6 grid gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-400">Server status</span>
                      <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                        Online
                      </span>
                    </div>
                    <p className="mt-3 text-3xl font-black text-white">{stats.onlinePlayers} / {stats.maxPlayers}</p>
                    <p className="text-sm text-zinc-400">Players currently in-world</p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4">
                      <p className="text-sm text-zinc-400">Registered accounts</p>
                      <p className="mt-2 text-2xl font-black text-white">{stats.totalAccounts}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4">
                      <p className="text-sm text-zinc-400">Characters created</p>
                      <p className="mt-2 text-2xl font-black text-white">{stats.totalCharacters}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="stats" className="border-y border-white/10 bg-zinc-950/70 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-6">
                <Users className="mb-3 h-8 w-8 text-amber-400" />
                <p className="text-3xl font-black text-white">{stats.onlinePlayers} / {stats.maxPlayers}</p>
                <p className="mt-1 text-sm text-zinc-400">Players currently online</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-6">
                <User className="mb-3 h-8 w-8 text-amber-400" />
                <p className="text-3xl font-black text-white">{stats.totalAccounts}</p>
                <p className="mt-1 text-sm text-zinc-400">Accounts registered</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-6">
                <Server className="mb-3 h-8 w-8 text-amber-400" />
                <p className="text-3xl font-black text-white">{stats.totalCharacters}</p>
                <p className="mt-1 text-sm text-zinc-400">Characters created</p>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-400">Why players stay</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.02em] text-white sm:text-4xl">
                Designed for immersive roleplay and smooth daily play.
              </h2>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 p-7 sm:p-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/12 text-amber-400">
                  <Shield className="h-6 w-6" />
                </div>
                <h3 className="mt-6 text-2xl font-bold text-white">Reliable systems, modern tools, and safe access</h3>
                <p className="mt-3 text-base leading-8 text-zinc-400">
                  From secure UCP access to polished account tools and responsive support, every part of the experience is built to feel clean and dependable.
                </p>
                <ul className="mt-6 space-y-3 text-sm text-zinc-300">
                  <li className="flex items-start gap-2"><BadgeCheck className="mt-0.5 h-4 w-4 text-amber-400" /> Secure login and account management flow</li>
                  <li className="flex items-start gap-2"><BadgeCheck className="mt-0.5 h-4 w-4 text-amber-400" /> Roleplay-friendly systems for factions and progression</li>
                  <li className="flex items-start gap-2"><BadgeCheck className="mt-0.5 h-4 w-4 text-amber-400" /> Smooth experience across desktop and mobile devices</li>
                </ul>
              </div>

              <div className="grid gap-6">
                <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6">
                  <Compass className="h-8 w-8 text-amber-400" />
                  <h3 className="mt-4 text-xl font-semibold text-white">Vivid city life</h3>
                  <p className="mt-2 text-sm leading-7 text-zinc-400">
                    Explore locations, uncover stories, and interact with a city that feels active and alive.
                  </p>
                </div>
                <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6">
                  <MessageSquare className="h-8 w-8 text-amber-400" />
                  <h3 className="mt-4 text-xl font-semibold text-white">Strong social layer</h3>
                  <p className="mt-2 text-sm leading-7 text-zinc-400">
                    Built for conversation, community activities, and roleplay that grows naturally over time.
                  </p>
                </div>
                <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6">
                  <Sparkles className="h-8 w-8 text-amber-400" />
                  <h3 className="mt-4 text-xl font-semibold text-white">A more refined economy</h3>
                  <p className="mt-2 text-sm leading-7 text-zinc-400">
                    Create opportunities, manage property, and shape your path through a responsive economy.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="community" className="pb-20 sm:pb-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-[2rem] border border-amber-500/20 bg-[linear-gradient(135deg,rgba(245,158,11,0.2),rgba(3,7,18,0.92))] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.3)] sm:p-10">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl">
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">Ready to step in</p>
                  <h2 className="mt-3 text-3xl font-black tracking-[-0.02em] text-white sm:text-4xl">
                    Start your story in Los Jawa today.
                  </h2>
                  <p className="mt-4 text-base leading-8 text-zinc-300">
                    Whether you are joining for the first time or returning to the city, the experience is polished for both new players and long-term roleplayers.
                  </p>
                </div>
                <Link
                  href={session ? '/dashboard' : '/register'}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100"
                >
                  {session ? 'Continue to dashboard' : 'Join the server'}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-zinc-950/80 py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-zinc-500 sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} Los Jawa Roleplay. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
