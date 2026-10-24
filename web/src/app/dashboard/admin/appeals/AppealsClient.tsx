'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  Scale,
  ShieldOff,
  X,
  XCircle,
} from 'lucide-react';
import { getAppealStatus } from '@/lib/appeals';

export interface AppealRecord {
  id: number;
  ban_id: number;
  account_id: number;
  username: string;
  ban_reason: string | null;
  ban_bannedby: string | null;
  ban_player_ip: string | null;
  ban_perm: number;
  ban_expires_at: string | null;
  ban_created_at: string | null;
  ban_source: string;
  message: string;
  status: string;
  admin_username: string | null;
  response: string | null;
  created_at: string;
  reviewed_at: string | null;
  ban_active: number;
  target_admin: number | null;
}

interface ReviewTarget {
  appeal: AppealRecord;
  action: 'accept' | 'reject';
}

export default function AppealsClient({
  appeals,
  currentAdminLevel,
}: {
  appeals: AppealRecord[];
  currentAdminLevel: number;
}) {
  const router = useRouter();
  const [review, setReview] = useState<ReviewTarget | null>(null);
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [success, setSuccess] = useState('');

  function openReview(appeal: AppealRecord, action: 'accept' | 'reject') {
    setReview({ appeal, action });
    setResponse(
      action === 'accept'
        ? 'Your appeal has been accepted. Please review the server rules before playing again.'
        : ''
    );
    setModalError('');
  }

  function closeReview() {
    if (loading) return;
    setReview(null);
    setResponse('');
    setModalError('');
  }

  async function submitReview() {
    if (!review) return;

    if (review.action === 'reject' && response.trim().length < 5) {
      setModalError('Please explain why the appeal is rejected.');
      return;
    }

    setLoading(true);
    setModalError('');
    setSuccess('');

    try {
      const res = await fetch('/api/admin/appeals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appealId: review.appeal.id,
          action: review.action,
          response,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setModalError(data.error || 'Failed to review the appeal.');
        return;
      }

      setSuccess(data.message || 'Appeal reviewed.');
      setReview(null);
      setResponse('');
      router.refresh();
    } catch {
      setModalError('Network error while reviewing the appeal.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {success ? (
        <div className="mb-4 flex items-start gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs text-emerald-400">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{success}</span>
          <button type="button" onClick={() => setSuccess('')} className="ml-auto text-zinc-500 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {appeals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 px-6 py-14 text-center">
          <Scale className="mx-auto mb-3 h-10 w-10 text-zinc-700" />
          <h2 className="text-sm font-bold text-white">No appeals here</h2>
          <p className="mt-1 text-xs text-zinc-500">
            New ban appeals from players will appear in this queue.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {appeals.map((appeal) => {
            const status = getAppealStatus(appeal.status);
            const open = appeal.status === 'open';
            const banInactive = !Number(appeal.ban_active);
            const locked = appeal.target_admin !== null && Number(appeal.target_admin) >= currentAdminLevel;

            return (
              <article key={appeal.id} className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/dashboard/admin/users/${appeal.account_id}`}
                        className="text-sm font-bold text-white transition hover:text-amber-400"
                      >
                        {appeal.username}
                      </Link>
                      <span className="text-[10px] text-zinc-600">ban #{appeal.ban_id}</span>
                      {banInactive ? (
                        <span className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                          Ban inactive
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      Submitted {appeal.created_at} · {appeal.ban_source === 'web' ? 'UCP ban' : 'In-game ban'}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold ${status.className}`}>
                    {status.label}
                  </span>
                </div>

                <div className="mt-3 grid gap-1 text-[11px] text-zinc-500 sm:grid-cols-2">
                  <p>
                    Ban reason: <span className="text-zinc-300">{appeal.ban_reason || 'No reason recorded'}</span>
                  </p>
                  <p>
                    Banned by: <span className="text-zinc-300">{appeal.ban_bannedby || 'Unknown'}</span>
                  </p>
                  <p>
                    Length:{' '}
                    <span className="text-zinc-300">
                      {appeal.ban_perm === 1 ? 'Permanent' : `Until ${appeal.ban_expires_at || 'unknown'}`}
                    </span>
                  </p>
                  <p>
                    Ban created: <span className="text-zinc-300">{appeal.ban_created_at || 'Unknown'}</span>
                  </p>
                </div>

                <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">Player appeal</p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-zinc-300">
                    {appeal.message}
                  </p>
                </div>

                {open ? (
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-[10px] text-zinc-600">
                      {locked
                        ? 'This account is an administrator at or above your level. You cannot review it.'
                        : banInactive
                          ? 'The ban is already inactive. Accepting closes the appeal without another unban.'
                          : 'Accepting removes this ban. The player can rejoin at the next game connection.'}
                    </p>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => openReview(appeal, 'reject')}
                        disabled={locked}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-[11px] font-bold text-red-400 transition hover:border-red-500/40 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => openReview(appeal, 'accept')}
                        disabled={locked}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ShieldOff className="h-3.5 w-3.5" />
                        {banInactive ? 'Accept & close' : 'Accept & unban'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                      Staff decision{appeal.admin_username ? ` · ${appeal.admin_username}` : ''} · {appeal.reviewed_at || '—'}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-zinc-300">
                      {appeal.response || 'No response provided.'}
                    </p>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {review ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                  {review.action === 'accept' ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Clock className="h-4 w-4 text-red-400" />
                  )}
                  {review.action === 'accept' ? 'Accept appeal?' : 'Reject appeal?'}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                  {review.action === 'accept'
                    ? Number(review.appeal.ban_active)
                      ? `This removes ban #${review.appeal.ban_id} and notifies ${review.appeal.username}.`
                      : `The ban is already inactive. This only closes the appeal and notifies ${review.appeal.username}.`
                    : `The ban stays in place. ${review.appeal.username} will be notified of your decision.`}
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

            <div className="mt-4">
              <label htmlFor="appeal-response" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                {review.action === 'accept' ? 'Message to player (optional)' : 'Reason for rejection'}
              </label>
              <textarea
                id="appeal-response"
                value={response}
                onChange={(event) => setResponse(event.target.value)}
                rows={4}
                maxLength={1000}
                className="w-full resize-y rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2.5 text-xs leading-relaxed text-white outline-none placeholder:text-zinc-600 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
                placeholder={
                  review.action === 'accept'
                    ? 'Optional note for the player...'
                    : 'Explain why this appeal is rejected...'
                }
              />
              <p className="mt-1 text-right text-[10px] text-zinc-600">{response.length}/1000</p>
            </div>

            {modalError ? (
              <div className="mt-2 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-[11px] text-red-400">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{modalError}</span>
              </div>
            ) : null}

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
                disabled={loading || (review.action === 'reject' && response.trim().length < 5)}
                className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  review.action === 'accept'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-red-600 hover:bg-red-500'
                }`}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : review.action === 'accept' ? (
                  <ShieldOff className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {review.action === 'accept' ? 'Accept appeal' : 'Reject appeal'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
