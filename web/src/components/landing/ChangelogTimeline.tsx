'use client';

import { AnimatePresence, m, useReducedMotion } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

import { Reveal } from '@/components/motion/LandingMotion';

export interface ChangelogSection {
  label: string;
  cls: string;
  items: string[];
}

export interface ChangelogGroupView {
  version: string;
  dateLabel: string;
  badge: string;
  entryCount: number;
  isLatest: boolean;
  sections: ChangelogSection[];
}

function SectionList({ sections }: { sections: ChangelogSection[] }) {
  return (
    <div className="mt-5 grid gap-5 sm:grid-cols-2">
      {sections.map((section) => (
        <div key={section.label}>
          <h4 className={`text-xs font-bold uppercase tracking-[0.16em] ${section.cls}`}>
            {section.label}
          </h4>
          <ul className="mt-2.5 space-y-2">
            {section.items.map((item, index) => (
              <li key={index} className="flex gap-2.5 text-sm leading-6 text-zinc-300">
                <span
                  className={`mt-[9px] h-1 w-1 shrink-0 rounded-full bg-current ${section.cls}`}
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function LatestCard({ group }: { group: ChangelogGroupView }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-amber-500/25 bg-white/[0.04] p-6 sm:p-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-6 top-3 select-none text-7xl font-black text-white/[0.03]"
      >
        {group.badge}
      </span>
      <div className="relative">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-black tracking-[-0.02em] text-white">{group.version}</h2>
          <span className="rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-black">
            Latest
          </span>
        </div>
        <SectionList sections={group.sections} />
      </div>
    </div>
  );
}

function AccordionItem({ group }: { group: ChangelogGroupView }) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const panelId = `changelog-${group.version.replace(/[^a-z0-9]+/gi, '-') || 'version'}`;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-400/60"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="truncate text-sm font-bold text-zinc-200">{group.version}</span>
          <span className="shrink-0 text-xs text-zinc-500">
            {group.entryCount} update{group.entryCount > 1 ? 's' : ''}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <div id={panelId}>
        <AnimatePresence initial={false}>
          {open && (
            <m.div
              key="content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{
                duration: reduce ? 0 : 0.25,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="overflow-hidden"
            >
              <div className="border-t border-white/5 px-5 pb-5">
                <SectionList sections={group.sections} />
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function ChangelogTimeline({ groups }: { groups: ChangelogGroupView[] }) {
  if (groups.length === 0) {
    return (
      <div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.02] p-8 text-sm text-zinc-500">
        No changelog entries published yet.
      </div>
    );
  }

  return (
    <div className="relative mt-12">
      <span
        aria-hidden="true"
        className="absolute bottom-8 left-[120px] top-2 hidden w-px bg-white/10 sm:block"
      />

      <div className="space-y-8">
        {groups.map((group, index) => (
          <Reveal
            key={group.version}
            className="relative grid gap-3 sm:grid-cols-[120px_1fr] sm:gap-8"
            delay={Math.min(index * 0.04, 0.2)}
          >
            <div className="relative flex items-center gap-2 text-xs text-zinc-500 sm:block sm:pr-8 sm:pt-2 sm:text-right">
              <span className="h-2 w-2 rounded-full bg-amber-400 ring-4 ring-amber-400/10 sm:absolute sm:-right-[4px] sm:top-3" />
              <span>{group.dateLabel}</span>
            </div>

            {group.isLatest ? <LatestCard group={group} /> : <AccordionItem group={group} />}
          </Reveal>
        ))}
      </div>
    </div>
  );
}
