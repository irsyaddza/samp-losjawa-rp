import { redirect } from 'next/navigation';
import Link from 'next/link';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { RowDataPacket } from 'mysql2';
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  Flag,
  Gavel,
  History,
  Map,
  Scale,
  Shield,
  Ticket,
  UserSearch,
  Users,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import AdminPanel from './AdminPanel';

interface AdminStats {
  pendingApplications: number;
  activeTickets: number;
  pendingMappings: number;
  onlinePlayers: number;
  activeBans: number;
  pendingAppeals: number;
  pendingReports: number;
}

async function getPendingApplications() {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        a.id, 
        a.master, 
        a.char_name, 
        a.story, 
        a.origin, 
        a.gender, 
        a.age, 
        a.date_of_submit, 
        u.Username, 
        u.answer1, 
        u.answer2 
      FROM application a 
      JOIN accounts u ON a.master = u.ID 
      WHERE a.status = 0 
      ORDER BY a.date_of_submit ASC`
    );
    return rows;
  } catch (error) {
    console.error('Error fetching pending applications for admin:', error);
    return [];
  }
}

async function getAdminStats(): Promise<AdminStats> {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT
        (SELECT COUNT(*) FROM application WHERE status = 0) AS pendingApplications,
        (SELECT COUNT(*) FROM ucp_tickets WHERE status IN ('open', 'in_progress')) AS activeTickets,
        (SELECT COUNT(*) FROM property_mappings WHERE status = 0) AS pendingMappings,
        (SELECT COUNT(*) FROM characters WHERE Online = 1) AS onlinePlayers,
        (SELECT COUNT(*) FROM bans WHERE perm = 1 OR expire > NOW()) AS activeBans,
        (SELECT COUNT(*) FROM ucp_ban_appeals WHERE status = 'open') AS pendingAppeals,
        (SELECT COUNT(*) FROM ucp_player_reports WHERE status IN ('open', 'investigating')) AS pendingReports`
    );

    const row = rows[0];
    return {
      pendingApplications: Number(row?.pendingApplications || 0),
      activeTickets: Number(row?.activeTickets || 0),
      pendingMappings: Number(row?.pendingMappings || 0),
      onlinePlayers: Number(row?.onlinePlayers || 0),
      activeBans: Number(row?.activeBans || 0),
      pendingAppeals: Number(row?.pendingAppeals || 0),
      pendingReports: Number(row?.pendingReports || 0),
    };
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return {
      pendingApplications: 0,
      activeTickets: 0,
      pendingMappings: 0,
      onlinePlayers: 0,
      activeBans: 0,
      pendingAppeals: 0,
      pendingReports: 0,
    };
  }
}

async function getRecentAudit() {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, admin_username, action, target_type, target_id, details,
              DATE_FORMAT(created_at, '%b %e, %H:%i') AS created_at
       FROM ucp_admin_audit
       ORDER BY id DESC
       LIMIT 5`
    );
    return rows;
  } catch (error) {
    console.error('Error fetching recent admin audit:', error);
    return [];
  }
}

async function getUserEmail(username: string) {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT Email FROM accounts WHERE Username = ? LIMIT 1',
      [username]
    );
    return rows[0]?.Email || '';
  } catch {
    return '';
  }
}

export default async function AdminPortalPage() {
  const session = await getSession();

  if (!session || session.adminLevel <= 0) {
    redirect('/dashboard');
  }

  const [email, pendingApps, stats] = await Promise.all([
    getUserEmail(session.username),
    getPendingApplications(),
    getAdminStats(),
  ]);
  const recentAudit = session.adminLevel >= 4 ? await getRecentAudit() : [];

  const statCards = [
    {
      label: 'Pending Applications',
      value: stats.pendingApplications,
      href: '#applications',
      icon: FileText,
    },
    {
      label: 'Active Tickets',
      value: stats.activeTickets,
      href: '/dashboard/admin/tickets',
      icon: Ticket,
    },
    {
      label: 'Pending Mappings',
      value: stats.pendingMappings,
      href: '/dashboard/admin/mapping',
      icon: Map,
    },
    {
      label: 'Players Online',
      value: stats.onlinePlayers,
      href: '/dashboard/online',
      icon: Users,
    },
    {
      label: 'Active Bans',
      value: stats.activeBans,
      href: '/dashboard/admin/moderation',
      icon: Gavel,
    },
    {
      label: 'Ban Appeals',
      value: stats.pendingAppeals,
      href: '/dashboard/admin/appeals',
      icon: Scale,
    },
    {
      label: 'Player Reports',
      value: stats.pendingReports,
      href: '/dashboard/admin/reports',
      icon: Flag,
    },
  ];

  return (
    <div className="min-h-screen bg-[#09090b] pb-12 pt-20">
      <Navbar
        session={{
          username: session.username,
          email,
          adminLevel: session.adminLevel,
        }}
      />

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center gap-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-1 text-xs text-zinc-400 transition hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Dashboard
          </Link>
          <span className="text-xs text-zinc-700">/</span>
          <span className="text-xs font-bold text-zinc-500">Admin Portal</span>
        </div>

        <div className="mb-8">
          <h1 className="flex items-center gap-2 text-2xl font-black text-white">
            <Shield className="h-6 w-6 text-amber-500" />
            Administrator Portal
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Review applications, answer support tickets, and keep the community running.
          </p>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.label}
                href={card.href}
                className="group rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4 transition hover:border-amber-500/30 hover:bg-zinc-900/50"
              >
                <div className="flex items-center justify-between gap-2">
                  <Icon className="h-4 w-4 text-amber-500" />
                  <ArrowRight className="h-3.5 w-3.5 text-zinc-700 transition group-hover:text-amber-400" />
                </div>
                <p className="mt-4 text-2xl font-black text-white">{card.value}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">{card.label}</p>
              </Link>
            );
          })}
        </div>

        <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/dashboard/admin/tickets"
            className="group flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-950/60 px-4 py-3 transition hover:border-amber-500/30"
          >
            <span className="flex items-center gap-2 text-xs font-bold text-white">
              <Ticket className="h-4 w-4 text-amber-500" />
              Support Tickets
            </span>
            <ArrowRight className="h-4 w-4 text-zinc-600 transition group-hover:text-amber-400" />
          </Link>

          <Link
            href="/dashboard/admin/moderation"
            className="group flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-950/60 px-4 py-3 transition hover:border-amber-500/30"
          >
            <span className="flex items-center gap-2 text-xs font-bold text-white">
              <Gavel className="h-4 w-4 text-amber-500" />
              Moderation Center
            </span>
            <ArrowRight className="h-4 w-4 text-zinc-600 transition group-hover:text-amber-400" />
          </Link>

          <Link
            href="/dashboard/admin/appeals"
            className="group flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-950/60 px-4 py-3 transition hover:border-amber-500/30"
          >
            <span className="flex items-center gap-2 text-xs font-bold text-white">
              <Scale className="h-4 w-4 text-amber-500" />
              Ban Appeals
            </span>
            <ArrowRight className="h-4 w-4 text-zinc-600 transition group-hover:text-amber-400" />
          </Link>

          <Link
            href="/dashboard/admin/reports"
            className="group flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-950/60 px-4 py-3 transition hover:border-amber-500/30"
          >
            <span className="flex items-center gap-2 text-xs font-bold text-white">
              <Flag className="h-4 w-4 text-amber-500" />
              Player Reports
            </span>
            <ArrowRight className="h-4 w-4 text-zinc-600 transition group-hover:text-amber-400" />
          </Link>

          <Link
            href="/dashboard/admin/users"
            className="group flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-950/60 px-4 py-3 transition hover:border-amber-500/30"
          >
            <span className="flex items-center gap-2 text-xs font-bold text-white">
              <UserSearch className="h-4 w-4 text-amber-500" />
              Player Directory
            </span>
            <ArrowRight className="h-4 w-4 text-zinc-600 transition group-hover:text-amber-400" />
          </Link>

          <Link
            href="/dashboard/admin/mapping"
            className="group flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-950/60 px-4 py-3 transition hover:border-amber-500/30"
          >
            <span className="flex items-center gap-2 text-xs font-bold text-white">
              <Map className="h-4 w-4 text-amber-500" />
              Property Mappings
            </span>
            <ArrowRight className="h-4 w-4 text-zinc-600 transition group-hover:text-amber-400" />
          </Link>

          {session.adminLevel >= 4 ? (
            <Link
              href="/dashboard/admin/audit"
              className="group flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-950/60 px-4 py-3 transition hover:border-amber-500/30"
            >
              <span className="flex items-center gap-2 text-xs font-bold text-white">
                <History className="h-4 w-4 text-amber-500" />
                Audit Log
              </span>
              <ArrowRight className="h-4 w-4 text-zinc-600 transition group-hover:text-amber-400" />
            </Link>
          ) : null}

          {session.adminLevel === 1337 ? (
            <Link
              href="/dashboard/admin/changelog"
              className="group flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-950/60 px-4 py-3 transition hover:border-amber-500/30"
            >
              <span className="flex items-center gap-2 text-xs font-bold text-white">
                <FileText className="h-4 w-4 text-amber-500" />
                Changelog Manager
              </span>
              <ArrowRight className="h-4 w-4 text-zinc-600 transition group-hover:text-amber-400" />
            </Link>
          ) : null}
        </div>

        {session.adminLevel >= 4 && recentAudit.length > 0 ? (
          <div className="mb-8 rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-400">Recent Staff Activity</h2>
              <Link href="/dashboard/admin/audit" className="text-[11px] font-bold text-amber-400 hover:text-amber-300">
                View all
              </Link>
            </div>
            <div className="divide-y divide-zinc-900">
              {recentAudit.map((log) => (
                <div key={log.id} className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-start sm:justify-between">
                  <p className="min-w-0 break-words text-xs text-zinc-300">
                    <span className="font-semibold text-white">{log.admin_username}</span>{' '}
                    <span className="font-mono text-[10px] text-amber-400">{log.action}</span>
                    {log.details ? <span className="text-zinc-500"> · {log.details}</span> : null}
                  </p>
                  <span className="shrink-0 text-[10px] text-zinc-600">{log.created_at}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div id="applications" className="scroll-mt-24">
          <AdminPanel
            initialApps={pendingApps as unknown as {
              id: number;
              master: number;
              char_name: string;
              story: string;
              origin: string;
              gender: string;
              age: number;
              date_of_submit: string;
              Username: string;
              answer1: string;
              answer2: string;
            }[]}
            currentAdminLevel={session.adminLevel}
          />
        </div>
      </main>
    </div>
  );
}
