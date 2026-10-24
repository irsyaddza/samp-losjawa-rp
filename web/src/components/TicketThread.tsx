'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  Loader2,
  Send,
  Shield,
  User,
} from 'lucide-react';
import Link from 'next/link';
import {
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  getTicketCategory,
  getTicketPriority,
  getTicketStatus,
  type TicketMessageRecord,
  type TicketRecord,
} from '@/lib/tickets';

interface TicketThreadProps {
  ticket: TicketRecord;
  messages: TicketMessageRecord[];
  currentUsername: string;
  isAdmin: boolean;
  backHref: string;
  backLabel: string;
}

export default function TicketThread({
  ticket,
  messages,
  currentUsername,
  isAdmin,
  backHref,
  backLabel,
}: TicketThreadProps) {
  const router = useRouter();
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [statusValue, setStatusValue] = useState(ticket.status);
  const [priorityValue, setPriorityValue] = useState(ticket.priority);

  const status = getTicketStatus(ticket.status);
  const priority = getTicketPriority(ticket.priority);
  const category = getTicketCategory(ticket.category);

  async function sendReply(event: React.FormEvent) {
    event.preventDefault();
    if (!reply.trim()) return;

    setError('');
    setSending(true);

    try {
      const response = await fetch(`/api/support/tickets/${ticket.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: reply }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to send reply.');
        return;
      }

      setReply('');
      if (typeof data.status === 'string') {
        setStatusValue(data.status);
      }
      router.refresh();
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setSending(false);
    }
  }

  async function updateTicket(
    action: 'status' | 'priority' | 'assign' | 'unassign',
    value?: string
  ): Promise<boolean> {
    setError('');
    setUpdating(true);

    try {
      const response = await fetch(`/api/admin/tickets/${ticket.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, value }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to update ticket.');
        return false;
      }

      router.refresh();
      return true;
    } catch {
      setError('Connection error. Please try again.');
      return false;
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-xs text-zinc-400 transition hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {backLabel}
      </Link>

      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold ${status.className}`}>
                {status.label}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                {category.label}
              </span>
              {isAdmin ? (
                <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold ${priority.className}`}>
                  {priority.label}
                </span>
              ) : null}
            </div>
            <h1 className="mt-3 text-xl font-black text-white sm:text-2xl">{ticket.subject}</h1>
            <p className="mt-1 text-[11px] text-zinc-500">
              Ticket #{ticket.id} · Opened by {ticket.username} · {ticket.created_at}
            </p>
            {ticket.assigned_username ? (
              <p className="mt-1 text-[11px] text-zinc-500">
                Assigned to <span className="font-semibold text-zinc-300">{ticket.assigned_username}</span>
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className={`grid gap-6 ${isAdmin ? 'lg:grid-cols-3' : ''}`}>
        <div className={isAdmin ? 'lg:col-span-2' : ''}>
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4 sm:p-5">
            <div className="space-y-3">
              {messages.map((message) => {
                const isOwn = message.author_username === currentUsername;
                const isStaff = Number(message.is_staff) === 1;

                return (
                  <div
                    key={message.id}
                    className={`max-w-[92%] rounded-2xl border p-3.5 sm:max-w-[85%] ${
                      isOwn
                        ? 'ml-auto border-amber-500/20 bg-amber-500/[0.06]'
                        : 'mr-auto border-zinc-800 bg-zinc-900/40'
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-white">
                        {isStaff ? <Shield className="h-3 w-3 text-amber-400" /> : <User className="h-3 w-3 text-zinc-500" />}
                        {message.author_username}
                      </span>
                      {isStaff ? (
                        <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-400">
                          Staff
                        </span>
                      ) : null}
                      <span className="text-[10px] text-zinc-600">{message.created_at}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-300">
                      {message.body}
                    </p>
                  </div>
                );
              })}
            </div>

            {isAdmin || ticket.status !== 'closed' ? (
            <form onSubmit={sendReply} className="mt-5 border-t border-zinc-900 pt-5">
              <label htmlFor="ticket-reply" className="mb-1.5 block text-xs font-semibold text-zinc-400">
                {isAdmin ? 'Reply as staff' : 'Reply'}
              </label>
              <textarea
                id="ticket-reply"
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                rows={4}
                maxLength={5000}
                placeholder={isAdmin ? 'Write a clear reply for the player...' : 'Add more details or answer staff...'}
                className="w-full resize-y rounded-xl border border-zinc-800 bg-zinc-900/60 px-3.5 py-2.5 text-sm leading-relaxed text-white outline-none transition placeholder:text-zinc-600 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
              />

              {error ? (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={sending || !reply.trim()}
                className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-black transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {sending ? 'Sending...' : 'Send Reply'}
              </button>
            </form>
            ) : (
              <div className="mt-5 border-t border-zinc-900 pt-5 text-xs leading-relaxed text-zinc-500">
                This ticket is closed.{' '}
                <Link href="/dashboard/support" className="font-semibold text-amber-400 hover:text-amber-300">
                  Create a new ticket
                </Link>{' '}
                if you need more help.
              </div>
            )}
          </div>
        </div>

        {isAdmin ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-5">
              <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-400">Ticket Controls</h2>

              <div className="mt-4 space-y-4">
                <div>
                  <label htmlFor="ticket-status" className="mb-1.5 block text-[11px] font-semibold text-zinc-500">
                    Status
                  </label>
                  <select
                    id="ticket-status"
                    value={statusValue}
                    onChange={async (event) => {
                      const value = event.target.value;
                      setStatusValue(value);
                      const updated = await updateTicket('status', value);
                      if (!updated) setStatusValue(ticket.status);
                    }}
                    disabled={updating}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-xs text-white outline-none focus:border-amber-500/50"
                  >
                    {TICKET_STATUSES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="ticket-priority" className="mb-1.5 block text-[11px] font-semibold text-zinc-500">
                    Priority
                  </label>
                  <select
                    id="ticket-priority"
                    value={priorityValue}
                    onChange={async (event) => {
                      const value = event.target.value;
                      setPriorityValue(value);
                      const updated = await updateTicket('priority', value);
                      if (!updated) setPriorityValue(ticket.priority);
                    }}
                    disabled={updating}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-xs text-white outline-none focus:border-amber-500/50"
                  >
                    {TICKET_PRIORITIES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                <p className="text-[10px] leading-relaxed text-zinc-600">
                  Status and priority changes save automatically.
                </p>

                <div className="border-t border-zinc-900 pt-4">
                  {ticket.assigned_username ? (
                    <button
                      type="button"
                      onClick={() => updateTicket('unassign')}
                      disabled={updating}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:border-zinc-700 hover:text-white disabled:opacity-60"
                    >
                      Unassign from {ticket.assigned_username}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => updateTicket('assign')}
                      disabled={updating}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:border-amber-500/30 hover:text-white disabled:opacity-60"
                    >
                      Assign to me
                    </button>
                  )}
                </div>
              </div>

              {updating ? (
                <p className="mt-3 flex items-center gap-1.5 text-[10px] text-zinc-500">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Updating ticket...
                </p>
              ) : null}
            </div>

            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-5">
              <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-400">Player</h2>
              <p className="mt-2 text-sm font-semibold text-white">{ticket.username}</p>
              <p className="mt-1 text-[11px] text-zinc-500">Ticket #{ticket.id}</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
