import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { FORUM_URL } from '@/lib/site';
import { RowDataPacket } from 'mysql2';
import {
  ArrowUpRight,
  BadgeCheck,
  Clock3,
  Server,
  User,
  Users,
} from 'lucide-react';

import Navbar from '@/components/Navbar';
import HomeHero from '@/components/landing/HomeHero';
import { CountUp, MotionProvider, Reveal } from '@/components/motion/LandingMotion';

export const metadata: Metadata = {
  title: 'Los Jawa Roleplay | SA-MP Roleplay City',
  description: 'Join Los Jawa Roleplay, an immersive SA-MP roleplay city with real jobs, factions, and a community that keeps the story moving.',
};

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

function ChapterHeader({ number, label }: { number: string; label: string }) {
  return (
    <div className="flex items-center gap-4">
      <span className="font-mono text-xs font-semibold tracking-[0.24em] text-amber-400">
        {number}
      </span>
      <span aria-hidden="true" className="h-px flex-1 bg-white/10" />
      <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-400">
        {label}
      </span>
    </div>
  );
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

  const capacity = Math.min(100, (stats.onlinePlayers / stats.maxPlayers) * 100);

  return (
    <MotionProvider>
      <div className="min-h-screen bg-[#05070c] text-zinc-100">
        <Navbar session={session ? { username: session.username, email } : null} />

        <main className="pt-24 sm:pt-28">
          <HomeHero stats={stats} isLoggedIn={Boolean(session)} />

          <section id="stats" className="scroll-mt-24 border-b border-white/5 bg-white/[0.015] py-16 sm:py-20">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <Reveal>
                <div className="max-w-xl">
                  <h2 className="text-2xl font-black tracking-[-0.03em] text-white sm:text-3xl">
                    The city, right now.
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">
                    Live numbers from the server and the people building stories inside it.
                  </p>
                </div>
              </Reveal>

              <Reveal delay={0.08}>
                <div className="mt-8 grid gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
                  <div className="bg-[#070a10] p-6 sm:col-span-2 sm:p-8 lg:col-span-1">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                      <Users className="h-4 w-4 text-amber-400" />
                      Players online
                    </div>
                    <p className="mt-5 text-5xl font-black tracking-[-0.04em] text-white sm:text-6xl">
                      <CountUp value={stats.onlinePlayers} />
                      <span className="ml-2 text-xl font-semibold tracking-normal text-zinc-500">
                        / {stats.maxPlayers}
                      </span>
                    </p>
                    <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-amber-400" style={{ width: `${capacity}%` }} />
                    </div>
                    <p className="mt-3 text-sm text-zinc-500">Live capacity across the city.</p>
                  </div>

                  <div className="bg-[#070a10] p-6 sm:p-8">
                    <User className="h-5 w-5 text-amber-400" />
                    <p className="mt-6 text-4xl font-black tracking-[-0.04em] text-white">
                      <CountUp value={stats.totalAccounts} />
                    </p>
                    <p className="mt-2 text-sm text-zinc-400">Registered accounts</p>
                    <p className="mt-3 text-xs text-zinc-600">People with a User Control Panel account.</p>
                  </div>

                  <div className="bg-[#070a10] p-6 sm:p-8">
                    <Server className="h-5 w-5 text-amber-400" />
                    <p className="mt-6 text-4xl font-black tracking-[-0.04em] text-white">
                      <CountUp value={stats.totalCharacters} />
                    </p>
                    <p className="mt-2 text-sm text-zinc-400">Characters created</p>
                    <p className="mt-3 text-xs text-zinc-600">Stories already in motion.</p>
                  </div>
                </div>
              </Reveal>
            </div>
          </section>

          <section id="features" className="relative isolate scroll-mt-24 overflow-hidden py-20 sm:py-28">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-24 -z-10 h-[34rem] bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.07),transparent_65%)]"
            />
            <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <Reveal>
                <div className="grid gap-6 lg:grid-cols-[1fr_0.7fr] lg:items-end">
                  <div>
                    <span aria-hidden="true" className="block h-px w-12 bg-amber-500" />
                    <h2 className="mt-5 max-w-2xl text-balance text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
                      Designed for stories that last.
                    </h2>
                  </div>
                  <p className="max-w-xl text-base leading-7 text-zinc-400 lg:pb-1">
                    A persistent city where factions, businesses, and street life react to every choice. The systems below keep it moving.
                  </p>
                </div>
              </Reveal>

              <div className="mt-16 space-y-20 sm:mt-20 sm:space-y-28">
                <div>
                  <Reveal>
                    <ChapterHeader number="01" label="Factions" />
                  </Reveal>
                  <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
                    <Reveal delay={0.05}>
                      <div className="max-w-lg">
                        <h3 className="text-3xl font-black tracking-[-0.03em] text-white sm:text-4xl">
                          Factions with real weight
                        </h3>
                        <p className="mt-4 text-base leading-7 text-zinc-400">
                          Law, streets, and business each have their own rhythm. Find the one that fits your character, then live with the consequences.
                        </p>
                        <ul className="mt-8 space-y-0">
                          {[
                            ['Law', 'Patrol the city and keep the peace.'],
                            ['Streets', 'Build influence where the rules run thin.'],
                            ['Business', 'Turn a legitimate front into real power.'],
                          ].map(([label, copy]) => (
                            <li key={label} className="flex gap-4 border-t border-white/10 py-4 last:border-b">
                              <BadgeCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                              <div>
                                <p className="text-sm font-semibold text-white">{label}</p>
                                <p className="mt-1 text-sm leading-6 text-zinc-400">{copy}</p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </Reveal>

                    <Reveal delay={0.12}>
                      <div className="relative mx-auto flex min-h-[300px] w-full max-w-[560px] items-end justify-center pb-8 sm:min-h-[440px]">
                        <div
                          aria-hidden="true"
                          className="absolute inset-x-12 bottom-4 h-40 rounded-full bg-amber-500/10 blur-3xl"
                        />
                        <Image
                          src="/skins/ballas2-380-600.png"
                          alt="Los Jawa Roleplay street faction character"
                          width={380}
                          height={600}
                          sizes="(max-width: 640px) 40vw, 200px"
                          className="relative z-0 w-[44%] max-w-[210px] opacity-80 drop-shadow-[0_24px_40px_rgba(0,0,0,0.5)]"
                        />
                        <Image
                          src="/skins/csher-380-600.png"
                          alt="Los Jawa Roleplay law faction character"
                          width={380}
                          height={600}
                          sizes="(max-width: 640px) 50vw, 250px"
                          className="relative z-10 -ml-8 w-[52%] max-w-[260px] drop-shadow-[0_30px_50px_rgba(0,0,0,0.55)]"
                        />
                        <p className="absolute inset-x-0 bottom-0 text-center text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                          Law and streets, one city
                        </p>
                      </div>
                    </Reveal>
                  </div>
                </div>

                <div>
                  <Reveal>
                    <ChapterHeader number="02" label="Economy" />
                  </Reveal>
                  <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
                    <Reveal delay={0.05} className="lg:order-2">
                      <div className="max-w-lg">
                        <h3 className="text-3xl font-black tracking-[-0.03em] text-white sm:text-4xl">
                          An economy you can shape
                        </h3>
                        <p className="mt-4 text-base leading-7 text-zinc-400">
                          Build a business, manage property, and turn a steady income into a story worth telling.
                        </p>
                        <ul className="mt-8 space-y-0">
                          {[
                            ['Businesses', 'Open a front and give the city somewhere to gather.'],
                            ['Property', 'Own the places other characters want to be.'],
                            ['Income', 'Turn steady work into long-term leverage.'],
                          ].map(([label, copy]) => (
                            <li key={label} className="flex gap-4 border-t border-white/10 py-4 last:border-b">
                              <BadgeCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                              <div>
                                <p className="text-sm font-semibold text-white">{label}</p>
                                <p className="mt-1 text-sm leading-6 text-zinc-400">{copy}</p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </Reveal>

                    <Reveal delay={0.12} className="lg:order-1">
                      <div className="relative mx-auto flex min-h-[240px] w-full max-w-[560px] items-end justify-center pb-8 sm:min-h-[360px]">
                        <div
                          aria-hidden="true"
                          className="absolute inset-x-10 bottom-10 h-36 rounded-full bg-amber-500/10 blur-3xl"
                        />
                        <Image
                          src="/skins/bmybu-380-600.png"
                          alt="Los Jawa Roleplay business character"
                          width={380}
                          height={600}
                          sizes="(max-width: 640px) 30vw, 160px"
                          className="relative z-0 w-[30%] max-w-[160px] opacity-70 drop-shadow-[0_24px_40px_rgba(0,0,0,0.5)]"
                        />
                        <Image
                          src="/vehicles/411.png"
                          alt="Los Jawa Roleplay sports car"
                          width={600}
                          height={380}
                          sizes="(max-width: 640px) 78vw, 420px"
                          className="relative z-10 -ml-10 w-[78%] max-w-[430px] drop-shadow-[0_30px_50px_rgba(0,0,0,0.55)]"
                        />
                        <p className="absolute inset-x-0 bottom-0 text-center text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                          Business and property
                        </p>
                      </div>
                    </Reveal>
                  </div>
                </div>

                <div>
                  <Reveal>
                    <ChapterHeader number="03" label="Tools" />
                  </Reveal>
                  <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:items-start lg:gap-16">
                    <Reveal delay={0.05}>
                      <div className="max-w-lg">
                        <h3 className="text-3xl font-black tracking-[-0.03em] text-white sm:text-4xl">
                          Tools that stay out of the way
                        </h3>
                        <p className="mt-4 text-base leading-7 text-zinc-400">
                          A clean User Control Panel for account, character, and support tasks. Fast on desktop, readable on a phone, and quiet enough to let the city stay the main thing.
                        </p>
                      </div>
                    </Reveal>

                    <Reveal delay={0.12}>
                      <div className="relative border-l border-white/10 pl-6 sm:pl-8">
                        <span
                          aria-hidden="true"
                          className="absolute left-0 top-0 h-16 w-px bg-amber-500"
                        />
                        <p className="text-2xl font-black tracking-[-0.03em] text-white sm:text-4xl lg:text-5xl">
                          User Control Panel
                        </p>
                        <ul className="mt-6 space-y-0">
                          {[
                            ['Account and characters', 'Keep every identity in one place.'],
                            ['Support and appeals', 'Reach the team without leaving the flow.'],
                            ['Responsive by default', 'The same tools on every screen.'],
                          ].map(([label, copy]) => (
                            <li key={label} className="flex gap-4 border-t border-white/10 py-4 last:border-b">
                              <BadgeCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                              <div>
                                <p className="text-sm font-semibold text-white">{label}</p>
                                <p className="mt-1 text-sm leading-6 text-zinc-400">{copy}</p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </Reveal>
                  </div>
                </div>
              </div>

              <Reveal>
                <div className="mt-20 flex flex-col gap-4 border-t border-white/10 pt-8 sm:flex-row sm:items-start sm:gap-8">
                  <div className="flex items-start gap-3">
                    <Clock3 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
                    <p className="max-w-2xl text-sm leading-7 text-zinc-400">
                      <span className="font-semibold text-white">Built for the long run.</span> Stable systems, thoughtful limits, and room for the city to grow without losing what makes it feel alive.
                    </p>
                  </div>
                </div>
              </Reveal>
            </div>
          </section>

          <section id="community" className="scroll-mt-24 pb-20 sm:pb-28">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <Reveal>
                <div className="relative overflow-hidden rounded-[2.5rem] border border-amber-500/20 bg-[#0a0c11]">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(245,158,11,0.16),transparent_34%),linear-gradient(135deg,rgba(245,158,11,0.07),rgba(5,7,12,0.9))]"
                  />
                  <div className="relative grid gap-8 p-8 sm:p-10 lg:grid-cols-[1fr_0.8fr] lg:items-end lg:p-12">
                    <div className="max-w-xl">
                      <h2 className="text-balance text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
                        The city is waiting.
                      </h2>
                      <p className="mt-4 text-base leading-8 text-zinc-300">
                        Create your character, find your people, and start a story that is yours to keep.
                      </p>
                      <a
                        href={FORUM_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-bold text-zinc-950 transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0c11]"
                      >
                        Visit the forum
                        <ArrowUpRight className="h-4 w-4" />
                      </a>
                    </div>
                    <div className="relative hidden justify-end lg:flex">
                      <Image
                        src="/skins/bmyri-380-600.png"
                        alt=""
                        width={380}
                        height={600}
                        sizes="220px"
                        className="h-auto w-[220px] opacity-80 drop-shadow-[0_24px_50px_rgba(0,0,0,0.55)]"
                      />
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </section>
        </main>

        <footer className="border-t border-white/5 py-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <p>© {new Date().getFullYear()} Los Jawa Roleplay. All rights reserved.</p>
            <div className="flex flex-wrap gap-4 text-xs">
              <Link href="/changelog" className="transition hover:text-white">
                Changelog
              </Link>
              <Link href="/donator" className="transition hover:text-white">
                Donator
              </Link>
              <a
                href={FORUM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="transition hover:text-white"
              >
                Forum
              </a>
            </div>
          </div>
        </footer>
      </div>
    </MotionProvider>
  );
}
