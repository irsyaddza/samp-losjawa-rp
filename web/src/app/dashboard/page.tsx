import { redirect } from 'next/navigation';
import Link from 'next/link';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { RowDataPacket } from 'mysql2';
import {
  Shield,
  Calendar,
  Landmark,
  Coins,
  Gamepad2,
  Settings,
  UserPlus,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Users,
  Mail,
  Home,
  LifeBuoy,
  Wallet,
  FileText,
  ChevronDown,
  Scale,
  type LucideIcon,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import { getSkinImageUrl } from '@/lib/assets';

async function getUserData(username: string) {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT ID, Username, Email, Admin, DonateRank, RegisterDate FROM accounts WHERE Username = ? LIMIT 1',
      [username]
    );
    return rows[0] || null;
  } catch (error) {
    console.error('Error fetching user account details:', error);
    return null;
  }
}

async function getUserCharacters(userId: number) {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT c.ID, c.char_name, c.Level, c.Model, c.Online, c.Cash, c.BankAccount,
              c.Faction, f.factionName, f.factionShort
       FROM characters c
       LEFT JOIN factions f ON c.Faction = f.factionID
       WHERE c.master = ?
       ORDER BY c.Online DESC, c.Level DESC, c.ID ASC`,
      [userId]
    );
    return rows;
  } catch (error) {
    console.error('Error fetching user characters:', error);
    return [];
  }
}

async function getUserApplications(userId: number) {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, char_name, status, accepted, reason, date_of_submit FROM application WHERE master = ? ORDER BY date_of_submit DESC',
      [userId]
    );
    return rows;
  } catch (error) {
    console.error('Error fetching user applications:', error);
    return [];
  }
}

async function getDashboardMeta(userId: number) {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
         (SELECT COUNT(*) FROM notifications WHERE master = ? AND \`read\` = 0) AS unreadMessages,
         (SELECT COUNT(*) FROM ucp_friends WHERE friendID = ? AND friendPending = 1) AS pendingFriends,
         (SELECT COUNT(*) FROM characters WHERE Online = 1) AS onlinePlayers`,
      [userId, userId]
    );

    return {
      unreadMessages: Number(rows[0]?.unreadMessages || 0),
      pendingFriends: Number(rows[0]?.pendingFriends || 0),
      onlinePlayers: Number(rows[0]?.onlinePlayers || 0),
    };
  } catch (error) {
    console.error('Error fetching dashboard statistics:', error);
    return { unreadMessages: 0, pendingFriends: 0, onlinePlayers: 0 };
  }
}

function formatMoney(value: number) {
  return `$${Math.max(0, Math.round(value)).toLocaleString('en-US')}`;
}

function formatCompactMoney(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return formatMoney(value);
}

function formatDate(value: unknown) {
  if (!value) return 'Unknown';

  const date = new Date(value as string);
  if (Number.isNaN(date.getTime()) || date.getUTCFullYear() < 1970) return 'Unknown';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function displayName(name: string) {
  return name.replace(/_/g, ' ');
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  href,
}: {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  href?: string;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
          {label}
        </span>
        <Icon className="h-4 w-4 text-zinc-600" />
      </div>
      <p className="mt-3 text-2xl font-black tabular-nums text-white">{value}</p>
      <p className="mt-0.5 text-[11px] leading-4 text-zinc-500">{hint}</p>
    </>
  );

  const className =
    'rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4 transition sm:p-5';

  if (href) {
    return (
      <Link
        href={href}
        className={`${className} hover:border-amber-500/30 hover:bg-zinc-900/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60`}
      >
        {body}
      </Link>
    );
  }

  return <div className={className}>{body}</div>;
}

function ApplicationItem({ app }: { app: RowDataPacket }) {
  const isPending = Number(app.status) === 0;
  const isAccepted = !isPending && Number(app.accepted) === 1;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-800/80 bg-zinc-900/20 p-3.5 transition hover:border-zinc-700 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 text-xs font-black text-zinc-500">
          {displayName(app.char_name).charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">
            {displayName(app.char_name)}
          </p>
          <p className="text-[11px] text-zinc-500">
            Submitted {formatDate(app.date_of_submit)}
          </p>
          {!isPending && !isAccepted && app.reason ? (
            <p className="mt-1 line-clamp-2 text-[11px] text-red-400/90">
              {app.reason}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center sm:justify-end">
        {isPending ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold text-amber-400">
            <Clock className="h-3 w-3" />
            Pending Review
          </span>
        ) : isAccepted ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            Accepted
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-[10px] font-bold text-red-400">
            <ShieldAlert className="h-3 w-3" />
            Denied
          </span>
        )}
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const account = await getUserData(session.username);
  if (!account) {
    redirect('/login');
  }

  const characters = await getUserCharacters(session.userId);
  const applications = await getUserApplications(session.userId);
  const meta = await getDashboardMeta(session.userId);

  const totalCash = characters.reduce((sum, char) => sum + Number(char.Cash || 0), 0);
  const totalBank = characters.reduce((sum, char) => sum + Number(char.BankAccount || 0), 0);
  const totalBalance = totalCash + totalBank;
  const onlineCharacters = characters.filter((char) => Number(char.Online) > 0).length;
  const pendingApplications = applications.filter((app) => Number(app.status) === 0).length;
  const visibleApplications = applications.slice(0, 4);
  const hiddenApplications = applications.slice(4);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#09090b] pb-16 pt-20">
      <Navbar
        session={
          session
            ? {
                username: session.username,
                email: account.Email,
                adminLevel: session.adminLevel,
              }
            : null
        }
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px]"
        style={{
          background:
            'radial-gradient(ellipse at top, rgba(245, 158, 11, 0.10), transparent 65%)',
        }}
      />

      <main className="relative mx-auto w-full max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-amber-500">
              UCP Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
              Welcome back, <span className="text-amber-400">{account.Username}</span>
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
              Your characters, applications, and account tools in one place.
            </p>
          </div>

          <div className="flex w-full items-center gap-3 rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-3 pr-4 sm:w-auto sm:min-w-[280px]">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-lg font-black uppercase text-amber-400">
              {account.Username.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-bold text-white">{account.Username}</p>
                {Number(account.Admin) > 0 ? (
                  <Shield className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                ) : null}
              </div>
              <p className="truncate text-[11px] text-zinc-500">
                {account.Email || 'No recovery email'}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] font-semibold">
                <span className="inline-flex items-center gap-1 text-zinc-500">
                  <Calendar className="h-3 w-3" />
                  Member since {formatDate(account.RegisterDate)}
                </span>
                {Number(account.DonateRank) > 0 ? (
                  <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-amber-400">
                    Donator {account.DonateRank}
                  </span>
                ) : null}
                {Number(account.Admin) > 0 ? (
                  <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-zinc-300">
                    Admin {account.Admin}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        <section aria-label="Account overview" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Characters"
            value={String(characters.length)}
            hint={
              onlineCharacters > 0
                ? `${onlineCharacters} online now`
                : 'All characters offline'
            }
            icon={Gamepad2}
            href="#characters"
          />
          <StatCard
            label="Net Worth"
            value={formatCompactMoney(totalBalance)}
            hint="Wallet and bank combined"
            icon={Wallet}
          />
          <StatCard
            label="Applications"
            value={String(applications.length)}
            hint={
              pendingApplications > 0
                ? `${pendingApplications} awaiting review`
                : 'All applications reviewed'
            }
            icon={FileText}
            href="#applications"
          />
          <StatCard
            label="Inbox"
            value={String(meta.unreadMessages)}
            hint={
              meta.unreadMessages > 0
                ? 'Unread message waiting'
                : 'No unread messages'
            }
            icon={Mail}
            href="/dashboard/inbox"
          />
        </section>

        <section
          aria-label="Quick access"
          className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-2"
        >
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <Link
              href="/dashboard/apply"
              className="group flex min-w-0 flex-col items-start gap-2 rounded-xl border border-transparent px-3 py-3 transition hover:border-amber-500/20 hover:bg-amber-500/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 sm:flex-row sm:items-center sm:gap-3"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-400">
                <UserPlus className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold leading-5 text-white sm:text-sm">
                  New Character
                </span>
                <span className="block text-[11px] leading-4 text-zinc-500">
                  Start an application
                </span>
              </span>
            </Link>

            <Link
              href="/dashboard/inbox"
              className="group flex min-w-0 flex-col items-start gap-2 rounded-xl border border-transparent px-3 py-3 transition hover:border-amber-500/20 hover:bg-amber-500/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 sm:flex-row sm:items-center sm:gap-3"
            >
              <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400">
                <Mail className="h-4 w-4" />
                {meta.unreadMessages > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-black text-black">
                    {meta.unreadMessages > 9 ? '9+' : meta.unreadMessages}
                  </span>
                ) : null}
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold leading-5 text-white sm:text-sm">
                  Messages
                </span>
                <span className="block text-[11px] leading-4 text-zinc-500">
                  {meta.unreadMessages > 0
                    ? `${meta.unreadMessages} unread`
                    : 'You are all caught up'}
                </span>
              </span>
            </Link>

            <Link
              href="/dashboard/friends"
              className="group flex min-w-0 flex-col items-start gap-2 rounded-xl border border-transparent px-3 py-3 transition hover:border-amber-500/20 hover:bg-amber-500/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 sm:flex-row sm:items-center sm:gap-3"
            >
              <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400">
                <Users className="h-4 w-4" />
                {meta.pendingFriends > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-black text-black">
                    {meta.pendingFriends > 9 ? '9+' : meta.pendingFriends}
                  </span>
                ) : null}
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold leading-5 text-white sm:text-sm">
                  Friends
                </span>
                <span className="block text-[11px] leading-4 text-zinc-500">
                  {meta.pendingFriends > 0
                    ? `${meta.pendingFriends} pending request${meta.pendingFriends === 1 ? '' : 's'}`
                    : 'Manage connections'}
                </span>
              </span>
            </Link>

            <Link
              href="/dashboard/settings"
              className="group flex min-w-0 flex-col items-start gap-2 rounded-xl border border-transparent px-3 py-3 transition hover:border-amber-500/20 hover:bg-amber-500/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 sm:flex-row sm:items-center sm:gap-3"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400">
                <Settings className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold leading-5 text-white sm:text-sm">
                  Settings
                </span>
                <span className="block text-[11px] leading-4 text-zinc-500">
                  Security and account
                </span>
              </span>
            </Link>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-zinc-900 px-3 pb-1 pt-3 text-[11px] font-semibold text-zinc-500">
            <Link
              href="/dashboard/online"
              className="inline-flex items-center gap-1.5 transition hover:text-amber-400"
            >
              <Users className="h-3.5 w-3.5" />
              Online Players
              <span className="tabular-nums text-zinc-600">({meta.onlinePlayers})</span>
            </Link>
            <Link
              href="/dashboard/mapping"
              className="inline-flex items-center gap-1.5 transition hover:text-amber-400"
            >
              <Home className="h-3.5 w-3.5" />
              Property Mapping
            </Link>
            <Link
              href="/dashboard/records"
              className="inline-flex items-center gap-1.5 transition hover:text-amber-400"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              Sanction Records
            </Link>
            <Link
              href="/dashboard/appeal"
              className="inline-flex items-center gap-1.5 transition hover:text-amber-400"
            >
              <Scale className="h-3.5 w-3.5" />
              Ban Appeal
            </Link>
            <Link
              href="/dashboard/support"
              className="inline-flex items-center gap-1.5 transition hover:text-amber-400"
            >
              <LifeBuoy className="h-3.5 w-3.5" />
              Support Center
            </Link>
            {Number(account.Admin) > 0 ? (
              <Link
                href="/dashboard/admin"
                className="inline-flex items-center gap-1.5 text-red-400/90 transition hover:text-red-300"
              >
                <Shield className="h-3.5 w-3.5" />
                Admin Portal
              </Link>
            ) : null}
          </div>
        </section>

        <section id="characters" className="scroll-mt-24">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Gamepad2 className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-zinc-300">
                Your Characters
              </h2>
            </div>
            <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-[10px] font-bold text-zinc-500">
              {characters.length} total
            </span>
          </div>

          {characters.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 px-6 py-12 text-center">
              <Gamepad2 className="mx-auto mb-4 h-12 w-12 text-zinc-700" />
              <h3 className="font-bold text-white">No characters yet</h3>
              <p className="mx-auto mt-1 max-w-md text-sm text-zinc-400">
                Submit a character application to start playing on Los Jawa RP.
              </p>
              <Link
                href="/dashboard/apply"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-black transition hover:bg-amber-400"
              >
                <UserPlus className="h-4 w-4" />
                Submit First Character
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {characters.map((char) => {
                const isOnline = Number(char.Online) > 0;

                return (
                  <Link
                    key={char.ID}
                    href={`/dashboard/character/${char.ID}`}
                    className="group relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950 p-5 transition hover:border-amber-500/30 hover:bg-zinc-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60"
                  >
                    <div
                      aria-hidden
                      className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-amber-500/[0.06] blur-2xl transition group-hover:bg-amber-500/10"
                    />

                    <div className="relative flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-bold text-white transition group-hover:text-amber-400">
                          {displayName(char.char_name)}
                        </h3>
                        <p className="mt-0.5 text-[11px] text-zinc-500">
                          Character #{char.ID}
                        </p>
                        <p className="mt-2 inline-flex max-w-full items-center gap-1 truncate rounded-full border border-zinc-800 bg-zinc-900/60 px-2 py-0.5 text-[10px] font-semibold text-zinc-400">
                          {char.factionShort || char.factionName || 'Civilian'}
                        </p>
                      </div>

                      <span
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-bold ${
                          isOnline
                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                            : 'border-zinc-800 bg-zinc-900 text-zinc-500'
                        }`}
                      >
                        {isOnline ? (
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                        ) : null}
                        {isOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>

                    <div className="relative mt-5 flex items-end justify-between gap-4">
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex items-center gap-2 text-xs">
                          <Coins className="h-3.5 w-3.5 text-amber-500" />
                          <span className="font-semibold tabular-nums text-white">
                            {formatMoney(Number(char.Cash || 0))}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <Landmark className="h-3.5 w-3.5 text-amber-500" />
                          <span className="font-semibold tabular-nums text-white">
                            {formatMoney(Number(char.BankAccount || 0))}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-400">
                          <Shield className="h-3.5 w-3.5 text-zinc-600" />
                          <span>Level {char.Level}</span>
                        </div>
                      </div>

                      <div className="flex h-28 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getSkinImageUrl(char.Model, true)}
                          alt={`Skin ${char.Model}`}
                          className="h-24 w-auto object-contain drop-shadow-[0_4px_6px_rgba(245,158,11,0.25)] transition group-hover:scale-105"
                          style={{ filter: 'brightness(1.35) contrast(1.05)' }}
                          loading="lazy"
                        />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section
          id="applications"
          className="scroll-mt-24 rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-5 sm:p-6"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-zinc-300">
                Application History
              </h2>
            </div>
            <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-[10px] font-bold text-zinc-500">
              {applications.length} total
            </span>
          </div>

          {applications.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">
              No character applications yet.
            </p>
          ) : (
            <>
              <div className="grid gap-2 md:grid-cols-2">
                {visibleApplications.map((app) => (
                  <ApplicationItem key={app.id} app={app} />
                ))}
              </div>

              {hiddenApplications.length > 0 ? (
                <details className="group mt-3">
                  <summary className="flex cursor-pointer list-none items-center justify-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/30 px-4 py-3 text-xs font-semibold text-zinc-400 transition hover:border-zinc-700 hover:text-white [&::-webkit-details-marker]:hidden">
                    Show {hiddenApplications.length} more application
                    {hiddenApplications.length === 1 ? '' : 's'}
                    <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
                  </summary>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    {hiddenApplications.map((app) => (
                      <ApplicationItem key={app.id} app={app} />
                    ))}
                  </div>
                </details>
              ) : null}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
