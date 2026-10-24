'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Flag,
  Gavel,
  Loader2,
  Shield,
  UserCheck,
  UserRound,
  X,
} from 'lucide-react';
import { REPORT_STATUSES, getReportCategory, getReportStatus } from '@/lib/reports';

export interface ReportRecord {
  id: number;
  reporter_account_id: number;
  reporter_username: string;
  reporter_character_name: string | null;
  reported_account_id: number | null;
  reported_username: string | null;
  reported_character_id: number | null;
  reported_character_name: string;
  category: string;
  subject: string;
  description: string;
  evidence: string | null;
  status: string;
  assigned_username: string | null;
  staff_notes: string | null;
  resolution: string | null;
  created_at: string;
  reviewed_at: string | null;
  updated_at: string;
}

function displayName(value: string) {
  return value.replace(/_/g, ' ');
}

function targetLabel(report: ReportRecord) {
  if (report.reported_username) {
    if (report.reported_character_name && report.reported_character_name !== report.reported_username) {
      return `${displayName(report.reported_character_name)} (${report.reported_username})`;
    }
    return report.reported_username;
  }
  return displayName(report.reported_character_name);
}

function EvidenceLinks({ text }: { text: string }) {
  return (
    <div className="mt-1 space-y-1">
      {text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line, index) =>
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

export default function ReportsClient({
  reports,
  currentUsername,
}: {
  reports: ReportRecord[];
  currentUsername: string;
}) {
  const router = useRouter();
  const [review, setReview] = useState<ReportRecord | null>(null);
  const [status, setStatus] = useState('open');
  const [staffNotes, setStaffNotes] = useState('');
  const [resolution, setResolution] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  function openReview(report: ReportRecord) {
    setReview(report);
    setStatus(report.status);
    setStaffNotes(report.staff_notes || '');
    setResolution(report.resolution || '');
    setModalError('');
  }

  function closeReview() {
    if (loading) return;
    setReview(null);
    setModalError('');
  }

  async function runAction(reportId: number, payload: Record<string, unknown>) {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/admin/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, ...payload }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to update the report.');
        return false;
      }

      setSuccess(data.message || 'Report updated.');
      router.refresh();
      return true;
    } catch {
      setError('Network error while updating the report.');
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function updateAssignment(report: ReportRecord, action: 'assign' | 'unassign') {
    await runAction(report.id, { action });
  }

  async function submitReview() {
    if (!review) return;

    const finalStatus = status === 'resolved' || status === 'rejected';

    if (finalStatus && resolution.trim().length < 5) {
      setModalError('Write a short explanation for the player before closing the report.');
      return;
    }

    setModalError('');
    const ok = await runAction(review.id, {
      action: 'update',
      status,
      staffNotes,
      resolution,
    });

    if (ok) {
      setReview(null);
      setStaffNotes('');
      setResolution('');
    }
  }

  return (
    <div>
      {success ? (
        <div className="mb-4 flex items-start gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs text-emerald-400">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{success}</span>
          <button type="button" onClick={() => setSuccess('')} className="ml-auto text-zinc-500 hover:text-white" aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="mb-4 flex items-start gap-2 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-xs text-red-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
          <button type="button" onClick={() => setError('')} className="ml-auto text-zinc-500 hover:text-white" aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {reports.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 px-6 py-14 text-center">
          <Flag className="mx-auto mb-3 h-10 w-10 text-zinc-700" />
          <h2 className="text-sm font-bold text-white">No reports here</h2>
          <p className="mt-1 text-xs text-zinc-500">
            New player reports will appear in this queue.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const reportStatus = getReportStatus(report.status);
            const category = getReportCategory(report.category);
            const finalStatus = report.status === 'resolved' || report.status === 'rejected';
            const assignedToMe = report.assigned_username === currentUsername;
            const target = targetLabel(report);
            const targetHref = report.reported_account_id
              ? `/dashboard/admin/users/${report.reported_account_id}`
              : `/dashboard/admin/users?q=${encodeURIComponent(target)}`;

            return (
              <article key={report.id} className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold text-zinc-600">#{report.id}</span>
                      <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[9px] font-bold text-zinc-400">
                        {category.label}
                      </span>
                      <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${reportStatus.className}`}>
                        {reportStatus.label}
                      </span>
                      {report.assigned_username ? (
                        <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[9px] font-bold text-zinc-500">
                          {assignedToMe ? 'Assigned to you' : `Assigned to ${report.assigned_username}`}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mt-2 break-words text-sm font-bold text-white">{report.subject}</h3>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      Reporter{' '}
                      <Link href={`/dashboard/admin/users/${report.reporter_account_id}`} className="font-semibold text-zinc-300 hover:text-amber-400">
                        {report.reporter_username}
                      </Link>
                      {report.reporter_character_name ? ` (${displayName(report.reporter_character_name)})` : ''}
                      {' '}· Against{' '}
                      <Link href={targetHref} className="font-semibold text-zinc-300 hover:text-amber-400">
                        {target}
                      </Link>
                    </p>
                    <p className="mt-1 text-[10px] text-zinc-600">
                      Submitted {report.created_at} · Updated {report.updated_at}
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
                      <EvidenceLinks text={report.evidence} />
                    </div>
                  ) : null}
                </div>

                {report.staff_notes ? (
                  <div className="mt-3 rounded-xl border border-amber-500/15 bg-amber-500/[0.03] p-3">
                    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-500/80">
                      <Shield className="h-3 w-3" />
                      Internal notes · staff only
                    </p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-zinc-300">
                      {report.staff_notes}
                    </p>
                  </div>
                ) : null}

                {finalStatus ? (
                  <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                      Player response{report.reviewed_at ? ` · ${report.reviewed_at}` : ''}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-zinc-300">
                      {report.resolution || 'No response provided.'}
                    </p>
                  </div>
                ) : null}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateAssignment(report, assignedToMe ? 'unassign' : 'assign')}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-[11px] font-bold text-zinc-300 transition hover:border-amber-500/30 hover:text-white disabled:opacity-50"
                  >
                    {assignedToMe ? <X className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5 text-amber-500" />}
                    {assignedToMe ? 'Unassign' : 'Assign to me'}
                  </button>
                  <button
                    type="button"
                    onClick={() => openReview(report)}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-[11px] font-bold text-black transition hover:bg-amber-400 disabled:opacity-50"
                  >
                    <Flag className="h-3.5 w-3.5" />
                    Review report
                  </button>
                  <Link
                    href={`/dashboard/admin/moderation?q=${encodeURIComponent(report.reported_username || target)}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-[11px] font-bold text-red-400 transition hover:border-red-500/40"
                  >
                    <Gavel className="h-3.5 w-3.5" />
                    Moderation
                  </Link>
                  <Link
                    href={targetHref}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 px-3 py-1.5 text-[11px] font-bold text-zinc-400 transition hover:text-white"
                  >
                    <UserRound className="h-3.5 w-3.5" />
                    Player
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {review ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                  <Flag className="h-4 w-4 text-amber-500" />
                  Review report #{review.id}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                  {review.subject}
                </p>
              </div>
              <button
                type="button"
                onClick={closeReview}
                disabled={loading}
                className="text-zinc-500 transition hover:text-white disabled:opacity-40"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label htmlFor="report-status" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Status
                </label>
                <select
                  id="report-status"
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 text-xs text-white outline-none focus:border-amber-500/50"
                >
                  {REPORT_STATUSES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="report-notes" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Internal notes · staff only
                </label>
                <textarea
                  id="report-notes"
                  value={staffNotes}
                  onChange={(event) => setStaffNotes(event.target.value)}
                  rows={3}
                  maxLength={4000}
                  placeholder="Evidence checked, related accounts, follow-up actions..."
                  className="w-full resize-y rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2.5 text-xs leading-relaxed text-white outline-none placeholder:text-zinc-600 focus:border-amber-500/50"
                />
                <p className="mt-1 text-right text-[10px] text-zinc-600">{staffNotes.length}/4000</p>
              </div>

              <div>
                <label htmlFor="report-resolution" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Player response
                </label>
                <textarea
                  id="report-resolution"
                  value={resolution}
                  onChange={(event) => setResolution(event.target.value)}
                  rows={4}
                  maxLength={2000}
                  placeholder="Explain the decision. Required when resolving or rejecting."
                  className="w-full resize-y rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2.5 text-xs leading-relaxed text-white outline-none placeholder:text-zinc-600 focus:border-amber-500/50"
                />
                <p className="mt-1 text-right text-[10px] text-zinc-600">{resolution.length}/2000</p>
                <p className="mt-1 flex items-center gap-1.5 text-[10px] text-zinc-600">
                  <Clock className="h-3 w-3" />
                  Sent to the reporter when the status is Resolved or Rejected.
                </p>
              </div>

              {modalError ? (
                <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-[11px] text-red-400">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{modalError}</span>
                </div>
              ) : null}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeReview}
                disabled={loading}
                className="h-10 rounded-xl border border-zinc-800 px-4 text-xs font-bold text-zinc-400 transition hover:text-white disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitReview}
                disabled={loading}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-amber-500 px-4 text-xs font-bold text-black transition hover:bg-amber-400 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Save report
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
