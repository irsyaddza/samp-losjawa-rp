'use client';

import { useState } from 'react';
import { CheckCircle, Loader2, Monitor, ShieldAlert, ShieldOff } from 'lucide-react';

export interface LoginHistoryEntry {
  ip: string;
  browser: string;
  os: string;
  date: string;
}

function formatDate(value: string) {
  if (!value) return 'Unknown time';
  return `${value.slice(0, 10)} ${value.slice(11, 16)} UTC`;
}

export default function LoginHistory({ entries }: { entries: LoginHistoryEntry[] }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleRevoke = async () => {
    setLoading(true);
    setSuccess('');
    setError('');

    try {
      const res = await fetch('/api/user/settings/sessions', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to revoke sessions');
      } else {
        setSuccess(data.message || 'All other sessions have been revoked.');
      }
    } catch {
      setError('Network connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
            <Monitor className="h-5 w-5 text-amber-500" />
            Login History
          </h3>
          <p className="text-xs text-zinc-400">
            Recent successful sign-ins to your UCP account. Times are UTC.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRevoke}
          disabled={loading}
          className="h-10 px-5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}
          Log out all other devices
        </button>
      </div>

      {success && (
        <div
          role="status"
          className="mt-4 flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/5 p-3 text-xs text-green-400 font-medium"
        >
          <CheckCircle className="h-4 w-4" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-500 font-medium"
        >
          <ShieldAlert className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {entries.length === 0 ? (
        <p className="mt-6 text-xs text-zinc-500">No login history recorded yet.</p>
      ) : (
        <ul className="mt-6 divide-y divide-zinc-900">
          {entries.map((entry, index) => (
            <li
              key={`${entry.date}-${index}`}
              className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium text-white">
                  {entry.browser} on {entry.os}
                </p>
                <p className="text-xs text-zinc-500">{entry.ip}</p>
              </div>
              <p className="text-xs text-zinc-500">{formatDate(entry.date)}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
