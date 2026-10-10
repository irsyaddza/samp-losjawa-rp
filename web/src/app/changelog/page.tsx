import Link from 'next/link';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';
import { ArrowLeft, Info, ChevronDown } from 'lucide-react';
import { getSession } from '@/lib/auth';
import Navbar from '@/components/Navbar';

export const dynamic = 'force-dynamic';

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

function toDate(v: string | Date): Date {
  return v instanceof Date ? v : new Date(v);
}

function fmtDate(d: Date): string {
  if (isNaN(d.getTime())) return '-';
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function parseEntry(entry: string) {
  const m = entry.match(/^\[([A-Z]+)\]\s*(.*)$/);
  if (!m) return { key: 'OTHER', text: entry };
  return { key: m[1], text: m[2] };
}

function versionBadge(version: string): string {
  const m = version.match(/(\d+\.\d+)/);
  return m ? m[1] : version.slice(0, 3);
}

function buildSections(entries: ChangelogEntry[]): Section[] {
  const map = new Map<string, Section>();

  for (const e of entries) {
    const { key, text } = parseEntry(e.entry);
    const style = SECTION_STYLES[key] ?? SECTION_STYLES.OTHER;

    let sec = map.get(style.label);
    if (!sec) {
      sec = { label: style.label, cls: style.cls, order: style.order, items: [] };
      map.set(style.label, sec);
    }
    sec.items.push(text);
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

  for (const e of entries) {
    const d = toDate(e.created_at);

    let g = grouped.find((x) => x.version === e.version);
    if (!g) {
      g = { version: e.version, date: d, entries: [] };
      grouped.push(g);
    } else if (d > g.date) {
      g.date = d;   // version release date = newest entry of that version
    }
    g.entries.push(e);
  }

  // Order versions by release date, newest first - not insertion order.
  grouped.sort((a, b) => b.date.getTime() - a.date.getTime());
  return grouped;
}

function SectionList({ sections }: { sections: Section[] }) {
  return (
    <div className="mt-5 space-y-5">
      {sections.map((sec) => (
        <div key={sec.label}>
          <h4 className={`text-sm font-bold ${sec.cls}`}>{sec.label}</h4>
          <ul className="mt-2 space-y-1.5">
            {sec.items.map((item, i) => (
              <li key={i} className="flex gap-2.5 text-sm leading-6 text-zinc-300">
                <span className={`mt-[9px] h-1 w-1 shrink-0 rounded-full ${sec.cls.replace('text-', 'bg-')}`} />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default async function ChangelogPage() {
  const session = await getSession();
  const emailRow = session
    ? ((await pool.execute<RowDataPacket[]>('SELECT Email FROM accounts WHERE Username = ? LIMIT 1', [session.username]))[0][0] as { Email?: string } | undefined)
    : undefined;
  const navSession = session ? { username: session.username, email: emailRow?.Email ?? '' } : null;

  const entries = await getEntries();
  const grouped = groupByVersion(entries);

  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-[#09090b] pt-20 pb-16">
      <Navbar session={navSession} />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 mb-6">
          <Link
            href="/"
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Home
          </Link>
          <span className="text-zinc-650 text-xs">/</span>
          <span className="text-xs text-zinc-500 font-medium font-bold">Changelog</span>
        </div>

        {/* Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600">
          <div className="absolute -left-12 -top-20 h-56 w-56 rounded-full bg-white/25 blur-3xl" />
          <div className="absolute right-8 -top-14 h-44 w-44 rounded-full bg-orange-300/40 blur-3xl" />
          <div className="absolute bottom-[-70px] left-1/3 h-52 w-52 rounded-full bg-red-400/25 blur-3xl" />
          <h1 className="relative py-12 text-center text-3xl sm:text-4xl font-black text-black">
            What&apos;s new?
          </h1>
        </div>

        {/* Info bar */}
        <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-5 py-3">
          <p className="flex items-center gap-2 text-xs text-zinc-400">
            <Info className="h-3.5 w-3.5 shrink-0" />
            A changelog of the latest <span className="font-bold text-zinc-300">Los Jawa RP</span> releases, updates and important fixes
          </p>
          <span className="hidden sm:inline-flex shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
            Changelog in {year}
          </span>
        </div>

        {/* Timeline */}
        {grouped.length === 0 ? (
          <p className="mt-10 text-sm text-zinc-500">No changelog entries published yet.</p>
        ) : (
          <div className="relative mt-10">
            {/* vertical connector — aligned to the date column edge */}
            <span className="absolute left-[150px] top-3 bottom-16 hidden w-px bg-white/10 sm:block" />

            <div className="space-y-8">
              {grouped.map((g, gi) => {
                const sections = buildSections(g.entries);
                const isLatest = gi === 0;
                const badge = versionBadge(g.version);
                const glow = isLatest
                  ? 'bg-amber-500/20'
                  : 'bg-orange-500/10';

                return (
                  <div key={g.version} className="relative grid gap-x-10 sm:grid-cols-[150px_1fr]">
                    {/* Date + dot + line segment */}
                    <div className="relative hidden whitespace-nowrap pt-1 pr-20 text-right text-xs text-zinc-400 sm:block">
                      {fmtDate(g.date)}
                      <span className="absolute -right-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-amber-400 ring-4 ring-amber-400/20" />
                    </div>

                    {/* Card */}
                    {isLatest ? (
                      <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-white/5 p-6">
                        <div className={`pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full ${glow} blur-2xl`} />
                        <span className="pointer-events-none absolute right-6 top-3 select-none text-6xl font-black text-white/5">
                          {badge}
                        </span>
                        <div className="relative">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-black text-white">{g.version}</h3>
                            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black">
                              Latest
                            </span>
                          </div>
                          <SectionList sections={sections} />
                        </div>
                      </div>
                    ) : (
                      <details className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 open:border-white/20 open:bg-white/[0.07]">
                        <summary className="flex cursor-pointer list-none items-center justify-between p-5 [&::-webkit-details-marker]:hidden">
                          <div className="flex items-center gap-3">
                            <h3 className="text-sm font-bold text-zinc-200">{g.version}</h3>
                            <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-zinc-500">
                              {g.entries.length} update{g.entries.length > 1 ? 's' : ''}
                            </span>
                          </div>
                          <ChevronDown className="h-4 w-4 text-zinc-500 transition-transform group-open:rotate-180" />
                        </summary>
                        <div className="relative px-6 pb-6">
                          <div className={`pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full ${glow} blur-2xl`} />
                          <span className="pointer-events-none absolute right-6 top-3 select-none text-5xl font-black text-white/5">
                            {badge}
                          </span>
                          <div className="relative">
                            <SectionList sections={sections} />
                          </div>
                        </div>
                      </details>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
