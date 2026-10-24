import { redirect } from 'next/navigation';
import Link from 'next/link';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { RowDataPacket } from 'mysql2';
import { Flag, LifeBuoy, MessageSquare } from 'lucide-react';
import Navbar from '@/components/Navbar';
import NewReportForm from './NewReportForm';
import { getReportCategory, getReportStatus } from '@/lib/reports';

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

async function getCharacters(accountId: number) {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT ID, char_name FROM characters WHERE master = ? ORDER BY Online DESC, Level DESC, ID ASC',
    [accountId]
  );
  return rows;
}

async function getReports(accountId: number) {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, category, subject, description, evidence, status,
              reported_username, reported_character_name, resolution, admin_username,
              DATE_FORMAT(created_at, '%b %e, %Y %H:%i') AS created_at,
              DATE_FORMAT(reviewed_at, '%b %e, %Y %H:%i') AS reviewed_at
       FROM ucp_player_reports
       WHERE reporter_account_id = ?
       ORDER BY id DESC
       LIMIT 50`,
      [accountId]
    );
    return rows;
  } catch (error) {
    console.error('Error fetching player reports:', error);
    return [];
  }
}

function EvidenceLinks({ text }: { text: string }) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  return (
    <div className="mt-2 space-y-1">
      {lines.map((line, index) =>
        /^https?:\/\//i.test(line) ? (
          <a
            key={`${line}-${index}`}
            href={line}
            target="_blank"
            rel="noopener noreferrer"
            className="block break-all text-[11px] font-semibold text-amber-400 underline decoration-amber-500/30 underline-offset-2 hover:text-amber-300"
          >
            {line}
          </a>
        ) : (
          <p key={`${line}-${index}`} className="break-words text-[11px] leading-relaxed text-zinc-400">
            {line}
          </p>
        )
      )}
    </div>
  );
}

export default async function ReportsPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const [email, characters, reports] = await Promise.all([
    getUserEmail(session.username),
    getCharacters(session.userId),
    getReports(session.userId),
  ]);

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
          <Link href="/dashboard" className="text-zinc-400 transition hover:text-white">
            Dashboard
          </Link>
          <span className="text-zinc-700">/</span>
          <span className="font-medium text-zinc-500">Player Reports</span>
        </div>

        <div className="mb-8">
          <h1 className="flex items-center gap-2 text-2xl font-black text-white">
            <Flag className="h-6 w-6 text-amber-500" />
            Player Reports
          </h1>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-zinc-400">
            Report a player for breaking the rules. Staff will review your evidence and update the report status here.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-24">
              <NewReportForm characters={characters as unknown as { ID: number; char_name: string }[]} />
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-zinc-300">
                <MessageSquare className="h-4 w-4 text-amber-500" />
                Your Reports
              </h2>
              <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-[10px] font-bold text-zinc-500">
                {reports.length} total
              </span>
            </div>

            {reports.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 px-6 py-12 text-center">
                <Flag className="mx-auto mb-3 h-10 w-10 text-zinc-700" />
                <h3 className="text-sm font-bold text-white">No reports yet</h3>
                <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-zinc-500">
                  When you see a rule violation, submit a report with as much detail and evidence as you can.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((report) => {
                  const status = getReportStatus(report.status);
                  const category = getReportCategory(report.category);
                  const target = report.reported_username
                    ? report.reported_character_name && report.reported_character_name !== report.reported_username
                      ? `${String(report.reported_character_name).replace(/_/g, ' ')} (${report.reported_username})`
                      : report.reported_username
                    : String(report.reported_character_name).replace(/_/g, ' ');

                  return (
                    <article key={report.id} id={`report-${report.id}`} className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4 sm:p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-bold text-zinc-600">#{report.id}</span>
                            <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[9px] font-bold text-zinc-400">
                              {category.label}
                            </span>
                            <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${status.className}`}>
                              {status.label}
                            </span>
                          </div>
                          <h3 className="mt-2 break-words text-sm font-bold text-white">{report.subject}</h3>
                          <p className="mt-1 text-[11px] text-zinc-500">
                            Against <span className="text-zinc-300">{target}</span> · Submitted {report.created_at}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">Chronology</p>
                        <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-zinc-300">
                          {report.description}
                        </p>
                        {report.evidence ? (
                          <div className="mt-3 border-t border-zinc-800/80 pt-2">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">Evidence</p>
                            <EvidenceLinks text={String(report.evidence)} />
                          </div>
                        ) : null}
                      </div>

                      {report.status === 'resolved' || report.status === 'rejected' ? (
                        <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                            Staff decision{report.admin_username ? ` · ${report.admin_username}` : ''}
                            {report.reviewed_at ? ` · ${report.reviewed_at}` : ''}
                          </p>
                          <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-zinc-300">
                            {report.resolution || 'No response provided.'}
                          </p>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            )}

            <div className="mt-4 rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-4">
              <p className="flex items-start gap-2 text-[11px] leading-relaxed text-zinc-500">
                <LifeBuoy className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                <span>
                  Need help with a ban or an account issue instead?{' '}
                  <Link href="/dashboard/appeal" className="font-semibold text-amber-400 hover:text-amber-300">
                    Appeal a ban
                  </Link>{' '}
                  or open a{' '}
                  <Link href="/dashboard/support" className="font-semibold text-amber-400 hover:text-amber-300">
                    support ticket
                  </Link>
                  .
                </span>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
