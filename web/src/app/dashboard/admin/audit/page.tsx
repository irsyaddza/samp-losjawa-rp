import { redirect } from 'next/navigation';
import Link from 'next/link';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { RowDataPacket } from 'mysql2';
import { ArrowLeft, FileText, Shield } from 'lucide-react';
import Navbar from '@/components/Navbar';

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

export default async function AdminAuditPage() {
  const session = await getSession();

  if (!session || session.adminLevel < 4) {
    redirect('/dashboard');
  }

  const [logs] = await pool.execute<RowDataPacket[]>(
    `SELECT id, admin_username, action, target_type, target_id, details, ip,
            DATE_FORMAT(created_at, '%b %e, %Y %H:%i') AS created_at
     FROM ucp_admin_audit
     ORDER BY id DESC
     LIMIT 100`
  );

  const email = await getUserEmail(session.username);

  return (
    <div className="min-h-screen bg-[#09090b] pb-16 pt-20">
      <Navbar
        session={{
          username: session.username,
          email,
          adminLevel: session.adminLevel,
        }}
      />

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center gap-2 text-xs">
          <Link href="/dashboard/admin" className="flex items-center gap-1 text-zinc-400 transition hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5" />
            Admin Portal
          </Link>
          <span className="text-zinc-700">/</span>
          <span className="font-medium text-zinc-500">Audit Log</span>
        </div>

        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-black text-white">
            <Shield className="h-6 w-6 text-amber-500" />
            Admin Audit Log
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            The latest 100 staff actions, including ticket, application, mapping, donator, roster, changelog, and radio changes.
          </p>
        </div>

        {logs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 px-6 py-14 text-center">
            <FileText className="mx-auto mb-3 h-10 w-10 text-zinc-700" />
            <h2 className="text-sm font-bold text-white">No audit entries yet</h2>
            <p className="mt-1 text-xs text-zinc-500">Staff actions will appear here automatically.</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/60 md:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left text-xs">
                  <thead className="border-b border-zinc-800 bg-zinc-900/50 text-[10px] uppercase tracking-wider text-zinc-500">
                    <tr>
                      <th className="px-4 py-3 font-bold">Time</th>
                      <th className="px-4 py-3 font-bold">Admin</th>
                      <th className="px-4 py-3 font-bold">Action</th>
                      <th className="px-4 py-3 font-bold">Target</th>
                      <th className="px-4 py-3 font-bold">Details</th>
                      <th className="px-4 py-3 font-bold">IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {logs.map((log) => (
                      <tr key={log.id} className="align-top transition hover:bg-zinc-900/30">
                        <td className="whitespace-nowrap px-4 py-3 text-zinc-500">{log.created_at}</td>
                        <td className="whitespace-nowrap px-4 py-3 font-semibold text-white">{log.admin_username}</td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className="rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-1 font-mono text-[10px] text-amber-400">
                            {log.action}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-zinc-400">
                          {log.target_type ? `${log.target_type}${log.target_id ? ` #${log.target_id}` : ''}` : '—'}
                        </td>
                        <td className="max-w-md px-4 py-3 text-zinc-300">{log.details || '—'}</td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-[10px] text-zinc-600">{log.ip || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-3 md:hidden">
              {logs.map((log) => (
                <div key={log.id} className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-1 font-mono text-[10px] text-amber-400">
                      {log.action}
                    </span>
                    <span className="text-[10px] text-zinc-600">{log.created_at}</span>
                  </div>
                  <p className="mt-2 text-xs font-semibold text-white">{log.admin_username}</p>
                  <p className="mt-1 text-[11px] text-zinc-400">
                    {log.target_type ? `${log.target_type}${log.target_id ? ` #${log.target_id}` : ''}` : 'No target'}
                  </p>
                  {log.details ? <p className="mt-2 text-xs leading-relaxed text-zinc-300">{log.details}</p> : null}
                  <p className="mt-2 font-mono text-[10px] text-zinc-600">IP: {log.ip || '—'}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
