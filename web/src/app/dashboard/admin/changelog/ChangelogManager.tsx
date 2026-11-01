'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowLeftRight, Loader2, Trash2, RefreshCw } from 'lucide-react';

type Component = 'game' | 'web';

const VERSION_PREFIX: Record<Component, string> = {
  game: 'LJ:RP ',
  web: 'UCP ',
};

interface Entry {
  id: number;
  version: string;
  component: Component;
  entry: string;
  added_by: string;
  added_date: string;
}

interface VersionOption {
  version: string;
  component: Component;
}

export default function ChangelogManager() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [versions, setVersions] = useState<VersionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState('');
  const [component, setComponent] = useState<Component>('game');
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/changelog');
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
        setVersions(data.versions || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    setMessage('');
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (!version.trim()) return setMessage('Version is required.');
    const prefix = VERSION_PREFIX[component];
    if (!version.trim().startsWith(prefix)) {
      return setMessage(`Version must start with "${prefix}".`);
    }
    if (lines.length === 0) return setMessage('At least one entry line is required.');

    setSaving(true);
    try {
      const res = await fetch('/api/admin/changelog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: version.trim(), lines, component }),
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

  const move = async (id: number, current: Component) => {
    const res = await fetch('/api/admin/changelog', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, component: current === 'game' ? 'web' : 'game' }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(data.error || 'Failed to move entry.');
      return;
    }
    await load();
  };

  const versionOptions = versions
    .filter((option) => option.component === component)
    .map((option) => option.version);

  const query = search.trim().toLowerCase();
  const visible = query
    ? entries.filter((e) =>
        `${e.entry} ${e.version} ${e.added_by}`.toLowerCase().includes(query)
      )
    : entries;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-6">
      <h3 className="mb-1 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white">
        <RefreshCw className="h-4 w-4 text-amber-500" />
        Changelog Manager
      </h3>
      <p className="mb-4 text-xs text-zinc-500">
        One change per line. Game entries appear in-game (/changelog) and on the
        website; portal entries appear on the website only.
      </p>

      {/* Add form */}
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_150px]">
          <input
            type="text"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            list="changelog-versions"
            placeholder={`Version (e.g. ${versionOptions[0] || (component === 'game' ? 'LJ:RP 0.9.2-Beta' : 'UCP 1.0.1')})`}
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-amber-500"
          />
          <select
            value={component}
            onChange={(e) => {
              setComponent(e.target.value as Component);
              setVersion('');
            }}
            aria-label="Changelog component"
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
          >
            <option value="game">Game</option>
            <option value="web">Portal</option>
          </select>
        </div>
        <datalist id="changelog-versions">
          {versionOptions.map((v) => (
            <option key={v} value={v} />
          ))}
        </datalist>
        <p className="text-[11px] text-zinc-500">
          Game versions use <code>LJ:RP x.y.z-Stage</code>; portal versions use{' '}
          <code>UCP x.y.z</code>.
        </p>
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
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Recent entries
          </span>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-zinc-500">
              {query ? `${visible.length} of ${entries.length}` : entries.length}
            </span>
            <button
              onClick={load}
              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-white"
            >
              <RefreshCw className="h-3 w-3" />
              Refresh
            </button>
          </div>
        </div>

        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search entries, version or author"
          aria-label="Search changelog entries"
          className="mb-3 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-amber-500"
        />

        {loading ? (
          <p className="text-xs text-zinc-500">Loading…</p>
        ) : visible.length === 0 ? (
          <p className="text-xs text-zinc-500">No entries match this search.</p>
        ) : (
          <ul className="space-y-2">
            {visible.map((e) => (
              <li
                key={e.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-white/5 bg-black/20 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs text-zinc-200">{e.entry}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-500">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        e.component === 'web'
                          ? 'bg-sky-500/15 text-sky-300'
                          : 'bg-emerald-500/15 text-emerald-300'
                      }`}
                    >
                      {e.component === 'web' ? 'Portal' : 'Game'}
                    </span>
                    <span>{e.version} · by {e.added_by} · {e.added_date}</span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => move(e.id, e.component)}
                    className="text-zinc-500 transition hover:text-white"
                    title={`Move to ${e.component === 'game' ? 'portal' : 'game'} changelog`}
                  >
                    <ArrowLeftRight className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => remove(e.id)}
                    className="text-red-400/70 transition hover:text-red-400"
                    title="Delete entry"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
