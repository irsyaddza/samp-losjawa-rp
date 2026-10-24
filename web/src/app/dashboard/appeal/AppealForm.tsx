'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Loader2, Send } from 'lucide-react';

export default function AppealForm({ banId }: { banId: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/appeals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ banId, message }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to submit your appeal.');
        return;
      }

      router.refresh();
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 inline-flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3.5 py-2 text-xs font-bold text-amber-400 transition hover:border-amber-500/40 hover:bg-amber-500/15"
      >
        <Send className="h-3.5 w-3.5" />
        Appeal this ban
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 rounded-xl border border-amber-500/15 bg-amber-500/[0.03] p-3.5">
      <label htmlFor={`appeal-${banId}`} className="block text-xs font-semibold text-zinc-300">
        Why should this ban be lifted?
      </label>
      <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
        Explain what happened and what you will do differently. You can submit one appeal for this ban.
      </p>
      <textarea
        id={`appeal-${banId}`}
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        rows={4}
        maxLength={3000}
        required
        placeholder="Write your appeal here..."
        className="mt-2.5 w-full resize-y rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2.5 text-xs leading-relaxed text-white outline-none placeholder:text-zinc-600 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
      />
      <div className="mt-1 flex items-center justify-between gap-2">
        <span className="text-[10px] text-zinc-600">{message.length}/3000 · minimum 20</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setError('');
            }}
            className="rounded-lg border border-zinc-800 px-3 py-1.5 text-[11px] font-bold text-zinc-400 transition hover:text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || message.trim().length < 20}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-[11px] font-bold text-black transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Submit appeal
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-2 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-2.5 text-[11px] text-red-400">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}
    </form>
  );
}
