'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Play } from 'lucide-react';
import { m } from 'motion/react';

interface HomeHeroProps {
  stats: {
    totalAccounts: number;
    totalCharacters: number;
    onlinePlayers: number;
    maxPlayers: number;
  };
  isLoggedIn: boolean;
}

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function HomeHero({ stats, isLoggedIn }: HomeHeroProps) {
  const container = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.05,
      },
    },
  };

  const item = {
    hidden: { y: 18 },
    show: { y: 0, transition: { duration: 0.6, ease } },
  };

  return (
    <section className="relative isolate overflow-hidden border-b border-white/5">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-20rem] h-[38rem] w-[64rem] -translate-x-1/2 rounded-full bg-amber-500/[0.07] blur-[140px]" />
        <div className="absolute -right-40 top-24 h-[28rem] w-[28rem] rounded-full bg-orange-500/[0.05] blur-[120px]" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#05070c] to-transparent" />
      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-10 sm:px-6 sm:py-16 lg:grid-cols-[1.02fr_0.98fr] lg:gap-8 lg:px-8 lg:py-16">
        <m.div
          variants={container}
          initial="hidden"
          animate="show"
          className="max-w-2xl"
        >
          <m.div variants={item} data-reveal className="inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.24em] text-amber-300">
            <span className="h-px w-8 bg-amber-400/60" />
            A living SA-MP city
          </m.div>

          <m.h1
            variants={item}
            data-reveal
            className="mt-5 max-w-[13ch] text-balance text-4xl font-black leading-[0.95] tracking-[-0.045em] text-white sm:text-6xl lg:text-[4.5rem]"
          >
            Build a life worth remembering.
          </m.h1>

          <m.p
            variants={item}
            data-reveal
            className="mt-6 max-w-xl text-base leading-7 text-zinc-400 sm:text-lg sm:leading-8"
          >
            An immersive SA-MP roleplay city with real jobs, factions, and a community that keeps the story moving.
          </m.p>

          <m.div variants={item} data-reveal className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={isLoggedIn ? '/dashboard' : '/register'}
              className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-amber-400 px-6 py-3.5 text-sm font-bold text-black shadow-[0_16px_40px_rgba(245,158,11,0.18)] transition hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05070c]"
            >
              {isLoggedIn ? 'Open your dashboard' : 'Create your account'}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="samp://77.80.80.80:7777"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-6 py-3.5 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05070c]"
            >
              <Play className="h-4 w-4" />
              Connect to server
            </a>
          </m.div>
        </m.div>

        <m.div
          variants={item}
          data-reveal
          initial="hidden"
          animate="show"
          className="relative mx-auto w-full max-w-[560px]"
        >
          <div aria-hidden="true" className="absolute inset-x-4 bottom-10 h-28 rounded-[50%] bg-amber-500/15 blur-3xl" />

          <div className="relative flex items-end justify-center">
            <div className="relative z-10 w-[32%] -rotate-3 sm:w-[30%]">
              <Image
                src="/skins/copgrl3-380-600.png"
                alt=""
                width={380}
                height={600}
                sizes="(max-width: 640px) 28vw, 160px"
                className="h-auto w-full drop-shadow-[0_18px_30px_rgba(0,0,0,0.45)]"
              />
            </div>
            <div className="relative z-20 -mx-4 w-[40%] sm:-mx-5">
              <Image
                src="/skins/mafboss-380-600.png"
                alt=""
                width={380}
                height={600}
                loading="eager"
                sizes="(max-width: 640px) 36vw, 220px"
                className="h-auto w-full drop-shadow-[0_24px_40px_rgba(0,0,0,0.55)]"
              />
            </div>
            <div className="relative z-10 w-[32%] rotate-3 sm:w-[30%]">
              <Image
                src="/skins/ballas1-380-600.png"
                alt=""
                width={380}
                height={600}
                sizes="(max-width: 640px) 28vw, 160px"
                className="h-auto w-full drop-shadow-[0_18px_30px_rgba(0,0,0,0.45)]"
              />
            </div>
          </div>

          <div className="relative z-30 mt-4 hidden grid-cols-3 gap-3 rounded-2xl border border-white/10 bg-zinc-950/80 p-4 shadow-2xl backdrop-blur-md sm:grid">
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                Online
              </div>
              <p className="mt-2 text-2xl font-black tracking-[-0.04em] text-white">
                {stats.onlinePlayers.toLocaleString('en-US')}
                <span className="ml-1 text-xs font-semibold tracking-normal text-zinc-500">/ {stats.maxPlayers}</span>
              </p>
            </div>
            <div className="border-l border-white/10 pl-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Accounts</p>
              <p className="mt-2 text-2xl font-black tracking-[-0.04em] text-white">
                {stats.totalAccounts.toLocaleString('en-US')}
              </p>
            </div>
            <div className="border-l border-white/10 pl-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Characters</p>
              <p className="mt-2 text-2xl font-black tracking-[-0.04em] text-white">
                {stats.totalCharacters.toLocaleString('en-US')}
              </p>
            </div>
          </div>
        </m.div>
      </div>
    </section>
  );
}
