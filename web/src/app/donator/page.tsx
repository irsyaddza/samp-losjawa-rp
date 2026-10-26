import type { Metadata } from 'next';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { FORUM_URL } from '@/lib/site';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';
import {
  ArrowDown,
  ArrowLeft,
  CalendarDays,
  Car,
  Check,
  ChevronRight,
  Code2,
  Gem,
  Server,
  ShieldAlert,
  Sliders,
  Smartphone,
  Tv,
  UserCheck,
  Users2,
  type LucideIcon,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import { MotionProvider, Reveal } from '@/components/motion/LandingMotion';

export const metadata: Metadata = {
  title: 'Donator | Los Jawa Roleplay',
  description: 'Support Los Jawa Roleplay and unlock more room for vehicles, clothing, and convenience.',
};

async function getUserEmail(userId: number) {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT Email FROM accounts WHERE ID = ? LIMIT 1',
      [userId]
    );
    return rows[0]?.Email || undefined;
  } catch (error) {
    console.error('Failed to fetch user email:', error);
    return undefined;
  }
}

const tiers = [
  {
    name: 'Bronze Donator',
    short: 'Bronze',
    price: 'Rp 20,000',
    duration: '30 Days',
    textColor: 'text-amber-400',
    features: [
      'Maximum 4 vehicle ownership slots',
      'Spawn 1 vehicle at a time',
      'Dealer purchase access: Mountain Bike, Seasparrow, Marquis',
      'Save up to 8 clothing accessories',
      'Equip 5 clothing accessories simultaneously',
      'Maximum 24 mobile phone contacts',
      'Queue multiple ads simultaneously (/ad & /cad)',
      'Leftover XP preserved & bonus +1 XP per 5 paydays',
      'Minimum 1-hour job contract before /leavejob',
      'Exclusive access to /relog command',
    ],
  },
  {
    name: 'Silver Donator',
    short: 'Silver',
    price: 'Rp 30,000',
    duration: '30 Days',
    textColor: 'text-zinc-300',
    features: [
      'Maximum 6 vehicle ownership slots',
      'Spawn up to 2 vehicles simultaneously',
      'Dealer purchase access: NRG, Stuntplane, Hotring Racer 2 (+ Bronze)',
      'Save up to 10 clothing accessories',
      'Equip 6 clothing accessories simultaneously',
      'Maximum 32 mobile phone contacts',
      'Ad cooldown reduced to 30 seconds',
      'Leftover XP preserved & bonus +1 XP per 5 paydays',
      'Minimum 1-hour job contract before /leavejob',
      'Exclusive access to /relog command',
    ],
  },
  {
    name: 'Gold Donator',
    short: 'Gold',
    price: 'Rp 50,000',
    duration: '30 Days',
    textColor: 'text-yellow-400',
    popular: true,
    features: [
      'Maximum 12 vehicle ownership slots',
      'Spawn up to 3 vehicles simultaneously',
      'Dealer purchase access: Infernus, Bullet, Turismo, Shamal, Duneride, Skimmer (+ Silver & Bronze)',
      'Save up to 15 clothing accessories',
      'Equip 7 clothing accessories simultaneously',
      'Maximum 40 mobile phone contacts',
      'Ad cooldown reduced to 30 seconds',
      'Leftover XP preserved & bonus +1 XP per 5 paydays',
      'Minimum 1-hour job contract before /leavejob',
      'Exclusive access to /relog command',
    ],
  },
];

const tierNames = ['Free', 'Bronze', 'Silver', 'Gold'];

interface ComparisonRow {
  label: string;
  icon: LucideIcon;
  values: [string, string, string, string];
}

interface ComparisonGroup {
  label: string;
  rows: ComparisonRow[];
}

const comparisonGroups: ComparisonGroup[] = [
  {
    label: 'Vehicles & access',
    rows: [
      {
        label: 'Vehicle slots',
        icon: Car,
        values: ['3 slots', '4 slots', '6 slots', '12 slots'],
      },
      {
        label: 'Spawned vehicles',
        icon: Car,
        values: ['1 vehicle', '1 vehicle', '2 vehicles', '3 vehicles'],
      },
      {
        label: '/relog command',
        icon: UserCheck,
        values: ['No access', 'Included', 'Included', 'Included'],
      },
    ],
  },
  {
    label: 'Lifestyle limits',
    rows: [
      {
        label: 'Accessory slots',
        icon: Sliders,
        values: ['6 items (5 equip)', '8 items (5 equip)', '10 items (6 equip)', '15 items (7 equip)'],
      },
      {
        label: 'Phone contacts',
        icon: Smartphone,
        values: ['16 contacts', '24 contacts', '32 contacts', '40 contacts'],
      },
    ],
  },
  {
    label: 'Time & convenience',
    rows: [
      {
        label: 'Ad cooldown',
        icon: Tv,
        values: ['60 seconds', '60 seconds', '30 seconds', '30 seconds'],
      },
      {
        label: 'Job contract',
        icon: Users2,
        values: ['5 hours', '1 hour', '1 hour', '1 hour'],
      },
    ],
  },
];

function valueClass(value: string, index: number) {
  if (value === 'No access') return 'text-red-400';
  if (value === 'Included') return 'text-emerald-300';
  return index === 3 ? 'font-semibold text-amber-200' : 'text-zinc-300';
}

export default async function DonatorPage() {
  const session = await getSession();
  const email = session ? await getUserEmail(session.userId) : undefined;

  return (
    <MotionProvider>
      <div className="flex min-h-screen flex-col bg-[#05070c] text-zinc-100">
        <Navbar session={session ? { username: session.username, email } : null} />

        <main className="flex-1 pb-20 pt-24 sm:pt-28">
          <section className="relative isolate overflow-hidden">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.10),transparent_38%)]"
            />
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-2">
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 text-xs text-zinc-500 transition hover:text-white"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Home
                </Link>
                <span className="text-xs text-zinc-700">/</span>
                <span className="text-xs font-medium text-zinc-400">Donator</span>
              </div>

              <div className="mt-8 grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
                <div className="max-w-2xl">
                  <h1 className="text-balance text-4xl font-black leading-[1.02] tracking-[-0.045em] text-white sm:text-6xl">
                    Support the city. Unlock more.
                  </h1>
                  <p className="mt-5 max-w-xl text-base leading-8 text-zinc-400">
                    Donator tiers add room for vehicles, clothing, and convenience without changing the roleplay itself.
                  </p>
                  <p className="mt-4 text-xs text-zinc-500">
                    Every tier lasts 30 days and is activated manually through UCP support.
                  </p>
                  <a
                    href="#tiers"
                    className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-amber-400 px-6 py-3.5 text-sm font-bold text-black transition hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05070c]"
                  >
                    Compare tiers
                    <ArrowDown className="h-4 w-4" />
                  </a>
                </div>

                <div className="rounded-3xl border border-amber-500/20 bg-amber-500/[0.04] p-6 sm:p-8">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">
                    Community funded
                  </p>
                  <div className="mt-6 space-y-5">
                    <div className="flex gap-3">
                      <Server className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-semibold text-white">Server hosting</p>
                        <p className="mt-1 text-xs leading-5 text-zinc-400">
                          Keeps the city online and the connection stable.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Code2 className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-semibold text-white">Script development</p>
                        <p className="mt-1 text-xs leading-5 text-zinc-400">
                          Funds the systems, fixes, and features that move the city forward.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-semibold text-white">Community events</p>
                        <p className="mt-1 text-xs leading-5 text-zinc-400">
                          Helps create moments that bring the community together.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="tiers" className="mx-auto mt-16 max-w-7xl scroll-mt-24 px-4 sm:px-6 lg:px-8">
            <Reveal>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="max-w-xl">
                  <h2 className="text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
                    Choose your pace.
                  </h2>
                  <p className="mt-3 text-base leading-7 text-zinc-400">Same city, more room to build.</p>
                </div>
                <p className="text-xs text-zinc-500">Prices are in IDR, per 30 days.</p>
              </div>
            </Reveal>

            <div className="mt-8 grid gap-4 lg:grid-cols-3 lg:gap-6">
              {tiers.map((tier, index) => (
                <Reveal key={tier.name} delay={index * 0.06}>
                  <article
                    className={`relative flex h-full flex-col rounded-3xl border p-6 sm:p-7 ${
                      tier.popular
                        ? 'border-amber-400/40 bg-[linear-gradient(180deg,rgba(245,158,11,0.10),rgba(5,7,12,0.9))] shadow-[0_24px_80px_rgba(245,158,11,0.08)]'
                        : 'border-white/10 bg-white/[0.025]'
                    }`}
                  >
                    {tier.popular && (
                      <span className="absolute -top-3 left-6 rounded-full bg-amber-400 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-black">
                        Most popular
                      </span>
                    )}

                    <div>
                      <h3 className="flex items-center gap-2 text-lg font-bold text-white">
                        <Gem className={`h-5 w-5 ${tier.textColor}`} aria-hidden="true" />
                        {tier.name}
                      </h3>
                      <div className="mt-4 flex items-baseline gap-1">
                        <span className="text-3xl font-black tracking-[-0.03em] text-white sm:text-4xl">
                          {tier.price}
                        </span>
                        <span className="text-sm font-semibold text-zinc-500">/ {tier.duration}</span>
                      </div>
                    </div>

                    <div className="my-5 h-px bg-white/10" />

                    <ul className="flex-1 space-y-3.5">
                      {tier.features.map((feature, featureIndex) => (
                        <li
                          key={featureIndex}
                          className="flex items-start gap-2.5 text-sm leading-6 text-zinc-300"
                        >
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                            <Check className="h-3 w-3" aria-hidden="true" />
                          </span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-7 border-t border-white/5 pt-5">
                      <Link
                        href={session ? '/dashboard' : '/login'}
                        className={`flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05070c] ${
                          tier.popular
                            ? 'bg-amber-400 text-black hover:bg-amber-300 focus-visible:ring-amber-300'
                            : 'border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08] focus-visible:ring-white/40'
                        }`}
                      >
                        Get {tier.short}
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          </section>

          <section className="mx-auto mt-24 max-w-6xl px-4 sm:px-6 lg:px-8">
            <Reveal>
              <div className="max-w-xl">
                <h2 className="text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
                  Compare the details.
                </h2>
                <p className="mt-3 text-base leading-7 text-zinc-400">The limits that matter, side by side.</p>
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              <div className="mt-8 hidden overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] md:block">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-white/10 bg-white/[0.03]">
                    <tr>
                      <th
                        scope="col"
                        className="w-[36%] px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400"
                      >
                        Feature
                      </th>
                      {tierNames.map((name, index) => (
                        <th
                          key={name}
                          scope="col"
                          className={`px-5 py-4 text-center text-xs font-semibold uppercase tracking-[0.16em] ${
                            index === 3 ? 'bg-amber-500/[0.03] text-amber-300' : 'text-zinc-400'
                          }`}
                        >
                          {name}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  {comparisonGroups.map((group) => (
                    <tbody key={group.label}>
                      <tr>
                        <th
                          colSpan={5}
                          scope="colgroup"
                          className="px-5 pb-2 pt-7 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500"
                        >
                          {group.label}
                        </th>
                      </tr>
                      {group.rows.map((row) => {
                        const Icon = row.icon;
                        return (
                          <tr key={row.label} className="transition-colors hover:bg-white/[0.02]">
                            <th scope="row" className="px-5 py-3.5 font-semibold text-zinc-200">
                              <span className="flex items-center gap-2">
                                <Icon className="h-4 w-4 text-amber-400" aria-hidden="true" />
                                {row.label}
                              </span>
                            </th>
                            {row.values.map((value, index) => (
                              <td
                                key={tierNames[index]}
                                className={`px-5 py-3.5 text-center ${
                                  index === 3 ? 'bg-amber-500/[0.03]' : ''
                                } ${valueClass(value, index)}`}
                              >
                                {value}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  ))}
                </table>
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              <div className="mt-8 space-y-6 md:hidden">
                {comparisonGroups.map((group) => (
                <div key={group.label}>
                  <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                    {group.label}
                  </p>
                  <div className="space-y-2">
                    {group.rows.map((row) => {
                      const Icon = row.icon;
                      return (
                        <div
                          key={row.label}
                          className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"
                        >
                          <div className="flex items-center gap-2 text-sm font-semibold text-white">
                            <Icon className="h-4 w-4 text-amber-400" aria-hidden="true" />
                            {row.label}
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            {row.values.map((value, index) => (
                              <div
                                key={tierNames[index]}
                                className={`rounded-xl px-3 py-2 ${
                                  index === 3 ? 'bg-amber-500/[0.06]' : 'bg-white/[0.03]'
                                }`}
                              >
                                <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                                  {tierNames[index]}
                                </p>
                                <p className={`mt-1 text-sm ${valueClass(value, index)}`}>{value}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                ))}
              </div>
            </Reveal>
          </section>

          <section className="mx-auto mt-16 max-w-4xl px-4 sm:px-6 lg:px-8">
            <Reveal>
              <div className="rounded-3xl border border-amber-500/20 bg-amber-500/[0.04] p-6 sm:p-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400">
                    <ShieldAlert className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Before you purchase</h2>
                    <p className="mt-2 text-sm leading-7 text-zinc-400">
                      Donator status is activated manually through the UCP Dashboard or by contacting Admin
                      Management/UCP support in our Discord server. Make sure your character is registered and active
                      before making a payment.
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>
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
