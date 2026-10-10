import Link from 'next/link';
import { getSession } from '@/lib/auth';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';
import {
  Check,
  Smartphone,
  Car,
  Sliders,
  UserCheck,
  ShieldAlert,
  ArrowLeft,
  ChevronRight,
  Gem,
  Tv,
  Users2
} from 'lucide-react';
import Navbar from '@/components/Navbar';

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

export default async function DonatorPage() {
  const session = await getSession();
  const email = session ? await getUserEmail(session.userId) : undefined;

  const tiers = [
    {
      name: 'Bronze Donator',
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
        'Exclusive access to /relog command'
      ]
    },
    {
      name: 'Silver Donator',
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
        'Exclusive access to /relog command'
      ]
    },
    {
      name: 'Gold Donator',
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
        'Exclusive access to /relog command'
      ]
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#05070c] text-zinc-100">
      <Navbar session={session ? { username: session.username, email } : null} />

      <main className="flex-1 pt-24 sm:pt-32 pb-20">
        {/* Hero Section */}
        <section className="relative isolate overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,_rgba(245,158,11,0.15),_transparent_40%)]" />
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-400 hover:text-white transition mb-6"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Home
            </Link>
            <h1 className="text-4xl font-black tracking-[-0.03em] text-white sm:text-6xl">
              Support the Server, Enjoy <span className="text-amber-400">Premium</span>
            </h1>
            <p className="mt-5 mx-auto max-w-2xl text-base leading-8 text-zinc-400 sm:text-lg">
              Los Jawa Roleplay is fully funded by the community. As our appreciation, get exclusive benefits to enhance your roleplaying experience in the city.
            </p>
          </div>
        </section>

        {/* Pricing/Tiers Grid */}
        <section className="mt-12 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-3">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`relative flex flex-col rounded-3xl border p-7 sm:p-8 backdrop-blur-xl transition hover:border-white/20 ${
                  tier.popular ? 'border-amber-500/50 bg-amber-500/5 shadow-[0_20px_50px_rgba(245,158,11,0.1)]' : 'border-white/10 bg-zinc-950/70'
                }`}
              >
                {tier.popular && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-3.5 py-1 text-xs font-black text-black uppercase tracking-wider">
                    Most Popular
                  </span>
                )}

                <div className="mb-6">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Gem className={`h-5 w-5 ${tier.textColor}`} />
                    {tier.name}
                  </h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-black text-white">{tier.price}</span>
                    <span className="text-sm font-semibold text-zinc-400">/ {tier.duration}</span>
                  </div>
                </div>

                <div className="my-2 h-px bg-white/10" />

                <ul className="mt-6 space-y-4 flex-1">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-zinc-300">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                        <Check className="h-3 w-3" />
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-8 border-t border-white/5 pt-6">
                  <Link
                    href={session ? '/dashboard' : '/login'}
                    className={`flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold transition ${
                      tier.popular
                        ? 'bg-amber-500 text-black hover:bg-amber-400'
                        : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                    }`}
                  >
                    Get Donator Now
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Feature Comparison / Detail */}
        <section className="mt-24 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black tracking-[-0.02em] text-white">
              Detailed Donator Feature Comparison
            </h2>
            <p className="mt-2 text-zinc-400">
              Access rights and limit capacity comparison for each account tier
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/50 backdrop-blur-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-300">
                <thead className="bg-white/5 text-xs font-semibold uppercase tracking-wider text-white">
                  <tr>
                    <th className="px-6 py-4">Key Features</th>
                    <th className="px-6 py-4 text-zinc-400">Non-Donator</th>
                    <th className="px-6 py-4 text-amber-400">Bronze</th>
                    <th className="px-6 py-4 text-zinc-300">Silver</th>
                    <th className="px-6 py-4 text-yellow-400">Gold</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <tr>
                    <td className="px-6 py-4 font-semibold text-white flex items-center gap-2"><Car className="h-4 w-4 text-amber-400" /> Vehicle Slots</td>
                    <td className="px-6 py-4">3 Slots</td>
                    <td className="px-6 py-4 font-bold text-amber-300">4 Slots</td>
                    <td className="px-6 py-4 font-bold text-zinc-200">6 Slots</td>
                    <td className="px-6 py-4 font-bold text-yellow-300">12 Slots</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-semibold text-white flex items-center gap-2"><Car className="h-4 w-4 text-amber-400" /> Spawned Vehicles</td>
                    <td className="px-6 py-4">1 Vehicle</td>
                    <td className="px-6 py-4">1 Vehicle</td>
                    <td className="px-6 py-4 font-bold text-zinc-200">2 Vehicles</td>
                    <td className="px-6 py-4 font-bold text-yellow-300">3 Vehicles</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-semibold text-white flex items-center gap-2"><Sliders className="h-4 w-4 text-amber-400" /> Accessory Slots</td>
                    <td className="px-6 py-4">6 items (5 Equip)</td>
                    <td className="px-6 py-4">8 items (5 Equip)</td>
                    <td className="px-6 py-4">10 items (6 Equip)</td>
                    <td className="px-6 py-4">15 items (7 Equip)</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-semibold text-white flex items-center gap-2"><Smartphone className="h-4 w-4 text-amber-400" /> Phone Contacts</td>
                    <td className="px-6 py-4">16 Contacts</td>
                    <td className="px-6 py-4">24 Contacts</td>
                    <td className="px-6 py-4">32 Contacts</td>
                    <td className="px-6 py-4">40 Contacts</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-semibold text-white flex items-center gap-2"><Tv className="h-4 w-4 text-amber-400" /> Ad Cooldown</td>
                    <td className="px-6 py-4">60 Seconds</td>
                    <td className="px-6 py-4">60 Seconds</td>
                    <td className="px-6 py-4">30 Seconds</td>
                    <td className="px-6 py-4">30 Seconds</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-semibold text-white flex items-center gap-2"><Users2 className="h-4 w-4 text-amber-400" /> Job Contract</td>
                    <td className="px-6 py-4">5 Hours</td>
                    <td className="px-6 py-4">1 Hour</td>
                    <td className="px-6 py-4">1 Hour</td>
                    <td className="px-6 py-4">1 Hour</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-semibold text-white flex items-center gap-2"><UserCheck className="h-4 w-4 text-amber-400" /> /relog Command</td>
                    <td className="px-6 py-4 text-red-500">No Access</td>
                    <td className="px-6 py-4 text-emerald-400">Access Granted</td>
                    <td className="px-6 py-4 text-emerald-400">Access Granted</td>
                    <td className="px-6 py-4 text-emerald-400">Access Granted</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Info Box */}
        <section className="mt-16 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 flex flex-col sm:flex-row items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white">Purchase Information</h4>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                Donator status purchases are currently processed manually through the UCP Dashboard or by contacting Admin Management/UCP support in our Discord server. Please ensure your character is registered and active before making payments.
              </p>
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
