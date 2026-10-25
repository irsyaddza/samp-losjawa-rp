import type { Metadata } from 'next';
import Link from 'next/link';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';
import { ArrowLeft } from 'lucide-react';
import { getSession } from '@/lib/auth';
import Navbar from '@/components/Navbar';
import ChangelogTimeline, { type ChangelogGroupView } from '@/components/landing/ChangelogTimeline';
import { MotionProvider } from '@/components/motion/LandingMotion';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Changelog | Los Jawa Roleplay',
  description: 'Release notes for the systems, features, and fixes that keep Los Jawa Roleplay moving.',
};

interface ChangelogEntry {
  id: number;
  version: string;
  entry: string;
  added_by: string;
  added_date: string;
  created_at: string | Date;
}

interface Section {
  label: string;
  cls: string;
  order: number;
  items: string[];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const SECTION_STYLES: Record<string, { label: string; cls: string; order: number }> = {
  ADD:      { label: 'Added',    cls: 'text-emerald-300', order: 0 },
  SECURITY: { label: 'Security', cls: 'text-red-400',     order: 1 },
  CHANGE:   { label: 'Changed',  cls: 'text-amber-300',   order: 2 },
  QOL:      { label: 'Improved', cls: 'text-amber-200',   order: 3 },
  FIX:      { label: 'Bugfixes', cls: 'text-rose-400',    order: 4 },
  TECH:     { label: 'Technical',cls: 'text-zinc-300',    order: 5 },
  OTHER:    { label: 'Other',    cls: 'text-zinc-400',    order: 6 },
};

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

function fmtDate(date: Date): string {
  if (isNaN(date.getTime())) return '-';
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function parseEntry(entry: string) {
  const match = entry.match(/^\[([A-Z]+)\]\s*(.*)$/);
  if (!match) return { key: 'OTHER', text: entry };
  return { key: match[1], text: match[2] };
}

function versionBadge(version: string): string {
  const match = version.match(/(\d+\.\d+)/);
  return match ? match[1] : version.slice(0, 3);
}

function buildSections(entries: ChangelogEntry[]): Section[] {
  const map = new Map<string, Section>();

  for (const entry of entries) {
    const { key, text } = parseEntry(entry.entry);
    const style = SECTION_STYLES[key] ?? SECTION_STYLES.OTHER;

    let section = map.get(style.label);
    if (!section) {
      section = { label: style.label, cls: style.cls, order: style.order, items: [] };
      map.set(style.label, section);
    }
    section.items.push(text);
  }

  return [...map.values()].sort((a, b) => a.order - b.order);
}

async function getEntries() {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, version, entry, added_by, added_date, created_at
       FROM server_changelogs
       ORDER BY id DESC`
    );
    return rows as unknown as ChangelogEntry[];
  } catch (error) {
    console.error('Error fetching changelog:', error);
    return [];
  }
}

function groupByVersion(entries: ChangelogEntry[]) {
  const grouped: { version: string; date: Date; entries: ChangelogEntry[] }[] = [];

  for (const entry of entries) {
    const date = toDate(entry.created_at);

    let group = grouped.find((item) => item.version === entry.version);
    if (!group) {
      group = { version: entry.version, date, entries: [] };
      grouped.push(group);
    } else if (date > group.date) {
      group.date = date;
    }
    group.entries.push(entry);
  }

  grouped.sort((a, b) => b.date.getTime() - a.date.getTime());
  return grouped;
}

export default async function ChangelogPage() {
  const session = await getSession();
  const emailRow = session
    ? ((await pool.execute<RowDataPacket[]>('SELECT Email FROM accounts WHERE Username = ? LIMIT 1', [session.username]))[0][0] as { Email?: string } | undefined)
    : undefined;
  const navSession = session ? { username: session.username, email: emailRow?.Email ?? '' } : null;

  const entries = await getEntries();
  const grouped = groupByVersion(entries);
  const latest = grouped[0];

  const groups: ChangelogGroupView[] = grouped.map((group, index) => ({
    version: group.version,
    dateLabel: fmtDate(group.date),
    badge: versionBadge(group.version),
    entryCount: group.entries.length,
    isLatest: index === 0,
    sections: buildSections(group.entries).map(({ label, cls, items }) => ({ label, cls, items })),
  }));

  return (
    <MotionProvider>
      <div className="relative isolate min-h-screen bg-[#05070c] text-zinc-100">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[32rem] bg-[radial-gradient(circle_at_50%_0%,rgba(245,158,11,0.07),transparent_60%)]"
        />
        <Navbar session={navSession} />

        <main className="mx-auto max-w-5xl px-4 pb-20 pt-24 sm:px-6 sm:pt-28 lg:px-8">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-zinc-500 transition hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Home
            </Link>
            <span className="text-xs text-zinc-700">/</span>
            <span className="text-xs font-medium text-zinc-400">Changelog</span>
          </div>

          <header className="mt-8">
            <h1 className="max-w-3xl text-balance text-4xl font-black leading-[1.02] tracking-[-0.045em] text-white sm:text-6xl">
              Every change, on the record.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-400">
              Release notes for the systems, features, and fixes that keep Los Jawa moving.
            </p>

            <div className="mt-10 grid gap-6 border-y border-white/5 py-6 sm:grid-cols-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Releases</p>
                <p className="mt-2 text-2xl font-black text-white">{grouped.length}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Updates</p>
                <p className="mt-2 text-2xl font-black text-white">{entries.length}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Latest</p>
                <p className="mt-2 truncate text-2xl font-black text-white">{latest ? latest.version : 'No releases'}</p>
              </div>
            </div>
          </header>

          <ChangelogTimeline groups={groups} />
        </main>
      </div>
    </MotionProvider>
  );
}
