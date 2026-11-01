'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

const SLIDES = [
  { src: '/login_artwork.webp', alt: 'Nightclub interior in Los Jawa RP' },
  { src: '/login_artwork2.webp', alt: 'Lounge seating in Los Jawa RP' },
  { src: '/login_artwork3.webp', alt: 'Bar counter in Los Jawa RP' },
];

interface AuthShellProps {
  headline: string;
  description: string;
  actionLabel: string;
  actionHref: string;
  children: ReactNode;
}

export function AuthShell({ headline, description, actionLabel, actionHref, children }: AuthShellProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  // Manual navigation stops the auto-slide, so the artwork never moves away from a slide the user picked.
  const select = useCallback((next: number) => {
    setPaused(true);
    setIndex(next);
  }, []);

  useEffect(() => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % SLIDES.length), 6000);
    return () => window.clearInterval(timer);
  }, [paused]);

  return (
    <div className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-[#070709] p-3 font-sans selection:bg-amber-500 selection:text-black sm:p-5 md:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 top-[-18%] h-[460px] w-[460px] rounded-full bg-amber-500/10 blur-[130px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 bottom-[-18%] h-[460px] w-[460px] rounded-full bg-amber-600/10 blur-[130px]"
      />

      <div className="auth-rise relative z-10 flex w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-zinc-800/80 bg-zinc-950/70 shadow-[0_30px_80px_rgba(0,0,0,0.65)] backdrop-blur-xl lg:h-[680px] lg:flex-row lg:rounded-[32px]">
        <aside
          className="relative h-44 shrink-0 overflow-hidden sm:h-52 lg:m-3 lg:h-auto lg:w-1/2 lg:rounded-[24px]"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {SLIDES.map((slide, i) => (
            <Image
              key={slide.src}
              src={slide.src}
              alt={slide.alt}
              fill
              preload={i === 0}
              sizes="(max-width: 1024px) 100vw, 560px"
              className={`object-cover transition-opacity duration-700 ease-out ${
                i === index ? 'opacity-100' : 'opacity-0'
              }`}
            />
          ))}

          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-[#070709] via-[#070709]/20 via-30% to-[#070709]/35 lg:via-[#070709]/25 lg:via-40% lg:to-[#070709]/75"
          />

          <div className="relative z-10 flex h-full flex-col justify-between gap-4 p-5 sm:p-6 lg:p-9">
            <div className="flex items-center justify-between gap-4">
              <Link
                href="/"
                className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-500 transition-colors hover:text-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070709]"
              >
                Los Jawa RP
              </Link>
              <Link
                href={actionHref}
                className="hidden h-9 shrink-0 items-center gap-1.5 lg:inline-flex rounded-full border border-white/15 bg-white/5 px-4 text-[11px] font-bold text-white backdrop-blur-sm transition duration-300 hover:border-amber-500 hover:bg-amber-500 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070709] active:scale-[0.98]"
              >
                {actionLabel}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="hidden max-w-sm space-y-3 lg:block">
              <span className="inline-block rounded-md border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-400">
                UCP Portal
              </span>
              <h2 className="text-2xl font-black leading-tight tracking-tight text-white text-balance">
                {headline}
              </h2>
              <p className="text-xs font-medium leading-relaxed text-zinc-300">{description}</p>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2" aria-label="Artwork slides">
                {SLIDES.map((slide, i) => (
                  <button
                    key={slide.src}
                    type="button"
                    aria-label={`Show artwork ${i + 1}`}
                    aria-pressed={i === index}
                    onClick={() => select(i)}
                    className={`h-1.5 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070709] ${
                      i === index ? 'w-7 bg-amber-500' : 'w-1.5 bg-white/40 hover:bg-white/70'
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => select((index - 1 + SLIDES.length) % SLIDES.length)}
                  aria-label="Previous artwork"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white backdrop-blur-sm transition duration-300 hover:border-amber-500 hover:bg-amber-500 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070709] active:scale-95"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => select((index + 1) % SLIDES.length)}
                  aria-label="Next artwork"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white backdrop-blur-sm transition duration-300 hover:border-amber-500 hover:bg-amber-500 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070709] active:scale-95"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex w-full flex-col justify-between p-6 sm:p-8 lg:w-1/2 lg:overflow-y-auto lg:p-10">
          {children}
        </div>
      </div>
    </div>
  );
}
