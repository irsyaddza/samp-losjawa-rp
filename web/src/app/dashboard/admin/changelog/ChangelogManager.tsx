'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Trash2, RefreshCw } from 'lucide-react';

interface Entry {
  id: number;
  version: string;
  entry: string;
  added_by: string;
  added_date: string;
}

export default function ChangelogManager() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState('');
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/changelog');
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/changelog')
      .then((res) => res.ok ? res.json() : Promise.reject())
      .then((data) => { if (!cancelled) setEntries(data.entries || []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const submit = async () => {
    setMessage('');
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (!version.trim()) return setMessage('Version is required.');
    if (lines.length === 0) return setMessage('At least one entry line is required.');

    setSaving(true);
    try {
      const res = await fetch('/api/admin/changelog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: version.trim(), lines }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`Inserted ${data.inserted} entr${data.inserted > 1 ? 'ies' : 'y'} under ${version}.`);
        setText('');
        await load();
      } else {
        setMessage(data.error || 'Failed to save.');
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    await fetch('/api/admin/changelog', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    await load();
  };

  // Group entries by version for the list view
  const groups: { version: string; items: Entry[] }[] = [];
  for (const e of entries) {
    let g = groups.find((x) => x.version === e.version);
    if (!g) {
      g = { version: e.version, items: [] };
      groups.push(g);
    }
    g.items.push(e);
  }

  // Suggest the newest known version as the default input value
  const suggestedVersion =
    version || (groups.length > 0 ? groups[0].version : '');

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-6">
      <h3 className="mb-1 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white">
        <RefreshCw className="h-4 w-4 text-amber-500" />
        Changelog Manager
      </h3>
      <p className="mb-4 text-xs text-zinc-500">
        One change per line. Each line becomes one entry in-game (/changelog)
        and on the website.
      </p>

      {/* Add form */}
      <div className="space-y-3">
        <input
          type="text"
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          placeholder={`Version (e.g. ${suggestedVersion || 'LJ:RP 0.3.0-Alpha'})`}
          className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-amber-500"
        />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder={'[ADD] New sidejob: garbage collector\n[FIX] Sweeper checkpoint bug'}
          className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-white placeholder-zinc-600 outline-none focus:border-amber-500"
        />
        <div className="flex items-center gap-3">
          <button
            onClick={submit}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-5 py-2 text-xs font-semibold text-black transition hover:bg-amber-400 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Publish to version
          </button>
          {message && <span className="text-xs text-zinc-400">{message}</span>}
        </div>
      </div>

      {/* Existing entries */}
      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Recent entries
          </span>
          <button
            onClick={load}
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-white"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="text-xs text-zinc-500">Loading…</p>
        ) : (
          <ul className="space-y-2">
            {entries.map((e) => (
              <li
                key={e.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-white/5 bg-black/20 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs text-zinc-200">{e.entry}</p>
                  <p className="mt-0.5 text-[11px] text-zinc-500">
                    {e.version} · by {e.added_by} · {e.added_date}
                  </p>
                </div>
                <button
                  onClick={() => remove(e.id)}
                  className="shrink-0 text-red-400/70 transition hover:text-red-400"
                  title="Delete entry"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
