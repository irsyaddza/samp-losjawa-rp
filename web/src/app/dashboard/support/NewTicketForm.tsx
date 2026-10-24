'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Send, AlertCircle } from 'lucide-react';
import { TICKET_CATEGORIES } from '@/lib/tickets';

export default function NewTicketForm() {
  const router = useRouter();
  const [category, setCategory] = useState('report');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, subject, body }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create ticket.');
        return;
      }

      router.push(`/dashboard/support/${data.ticketId}`);
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-5 sm:p-6">
      <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-zinc-300">New Ticket</h2>
      <p className="mt-1 text-xs leading-relaxed text-zinc-500">
        Describe your issue clearly. Staff replies will appear in this ticket and in your notifications.
      </p>

      <div className="mt-5 space-y-4">
        <div>
          <label htmlFor="ticket-category" className="mb-1.5 block text-xs font-semibold text-zinc-400">
            Category
          </label>
          <select
            id="ticket-category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
          >
            {TICKET_CATEGORIES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="ticket-subject" className="mb-1.5 block text-xs font-semibold text-zinc-400">
            Subject
          </label>
          <input
            id="ticket-subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            maxLength={120}
            placeholder="Short summary of your issue"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
          />
        </div>

        <div>
          <label htmlFor="ticket-body" className="mb-1.5 block text-xs font-semibold text-zinc-400">
            Message
          </label>
          <textarea
            id="ticket-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={5000}
            rows={5}
            placeholder="Include character names, time, location, and any useful details."
            className="w-full resize-y rounded-xl border border-zinc-800 bg-zinc-900/60 px-3.5 py-2.5 text-sm leading-relaxed text-white outline-none transition placeholder:text-zinc-600 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
          />
        </div>

        {error ? (
          <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-black transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {loading ? 'Submitting...' : 'Submit Ticket'}
        </button>
      </div>
    </form>
  );
}
