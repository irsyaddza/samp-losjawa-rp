'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Loader2,
  ShieldOff,
  UserX,
  X,
} from 'lucide-react';
import PlayerAutocomplete, { type PlayerSuggestion } from '@/components/PlayerAutocomplete';

const BAN_REASON_TEMPLATES = [
  'Cheating or exploiting server bugs.',
  'Harassment, threats, or hate speech.',
  'Scamming other players.',
  'Deathmatching or random killing.',
  'Abusing a server bug for personal gain.',
  'Advertising or spamming.',
  'Ban evasion with another account.',
  'Failure to follow staff instructions.',
];

interface BanRecord {
  id: number;
  name: string | null;
  bannedby: string;
  reason: string | null;
  playerIP: string | null;
  perm: number;
  serial: string;
  source: string;
  created_at: string;
  expires_at: string;
  target_admin: number | null;
}

interface AccountResult {
  ID: number;
  Username: string;
  Admin: number;
  Online: number;
  LastIP: string | null;
  registered_at: string;
  last_login: string | null;
  characters: string | null;
  active_bans: number;
}

interface ModerationClientProps {
  initialBans: BanRecord[];
  accounts: AccountResult[];
  query: string;
  currentAdminLevel: number;
  currentUsername: string;
}

export default function ModerationClient({
  initialBans,
  accounts,
  query,
  currentAdminLevel,
  currentUsername,
}: ModerationClientProps) {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState(query);
  const [selected, setSelected] = useState<AccountResult | null>(null);
  const [reason, setReason] = useState('');
  const [durationDays, setDurationDays] = useState('0');
  const [unbanTarget, setUnbanTarget] = useState<BanRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const resetMessages = () => {
    setError('');
    setSuccess('');
  };

  const handleSuggestionSelect = (suggestion: PlayerSuggestion) => {
    resetMessages();

    if (suggestion.username === currentUsername) {
      setError('You cannot ban your own account.');
      return;
    }

    if (suggestion.adminLevel >= currentAdminLevel) {
      setError('You cannot ban an administrator with the same or a higher level.');
      return;
    }

    if (suggestion.activeBans > 0) {
      setError(`${suggestion.username} already has an active ban.`);
      return;
    }

    setSelected({
      ID: suggestion.id,
      Username: suggestion.username,
      Admin: suggestion.adminLevel,
      Online: suggestion.online ? 1 : 0,
      LastIP: suggestion.lastIp,
      registered_at: suggestion.registeredAt || '—',
      last_login: suggestion.lastLogin,
      characters: suggestion.characters,
      active_bans: suggestion.activeBans,
    });
    setReason('');
    setDurationDays('0');
  };

  const handleBan = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) return;

    resetMessages();
    setLoading(true);

    try {
      const res = await fetch('/api/admin/moderation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ban',
          accountId: selected.ID,
          reason,
          durationDays: Number(durationDays),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to ban account.');
      } else {
        setSuccess(data.message || `${selected.Username} has been banned.`);
        setSelected(null);
        setReason('');
        setDurationDays('0');
        router.refresh();
      }
    } catch {
      setError('Network error while banning the account.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnban = async () => {
    if (!unbanTarget) return;

    resetMessages();
    setLoading(true);

    try {
      const res = await fetch('/api/admin/moderation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unban', banId: unbanTarget.id }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to remove the ban.');
      } else {
        setSuccess(data.message || 'Ban removed.');
        setUnbanTarget(null);
        router.refresh();
      }
    } catch {
      setError('Network error while removing the ban.');
    } finally {
      setLoading(false);
    }
  };

  const canBan = (account: AccountResult) =>
    account.Username !== currentUsername &&
    Number(account.Admin) < currentAdminLevel &&
    Number(account.active_bans) === 0;

  return (
    <div className="space-y-6">
      {success ? (
        <div className="flex items-start gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs text-emerald-400">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{success}</span>
          <button type="button" onClick={() => setSuccess('')} className="ml-auto text-zinc-500 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="flex items-start gap-2 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-xs text-red-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
          <button type="button" onClick={() => setError('')} className="ml-auto text-zinc-500 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <section className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4 sm:p-5">
        <div className="mb-4">
          <h2 className="text-sm font-bold text-white">Find an account</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Search by UCP username or character name, then issue a ban.
          </p>
        </div>

        <form action="/dashboard/admin/moderation" method="get" className="flex flex-col gap-2 sm:flex-row">
          <PlayerAutocomplete
            endpoint="/api/admin/users"
            value={searchValue}
            onChange={setSearchValue}
            onSelect={handleSuggestionSelect}
            inputName="q"
            inputId="moderation-player-search"
            ariaLabel="Search player to moderate"
            placeholder="Username or character name..."
            className="min-w-0 flex-1"
          />
          <button
            type="submit"
            className="h-11 rounded-xl bg-amber-500 px-5 text-xs font-bold text-black transition hover:bg-amber-400"
          >
            Search
          </button>
        </form>

        <p className="mt-3 text-xs text-zinc-500">
          Start typing at least 2 characters, then pick the exact account from the suggestions.
          Selecting a player opens the ban panel so you do not ban the wrong target.
        </p>

        {searchValue.length > 0 && searchValue.length < 2 ? (
          <p className="mt-2 text-xs text-zinc-500">Type at least 2 characters to search.</p>
        ) : null}

        {accounts.length > 0 ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {accounts.map((account) => {
              const blocked = !canBan(account);
              return (
                <div key={account.ID} className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">{account.Username}</p>
                      <p className="mt-0.5 text-[10px] text-zinc-500">
                        Account #{account.ID} · {account.Online ? 'Online in game' : 'Offline'}
                        {account.Admin > 0 ? ` · Admin ${account.Admin}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        resetMessages();
                        setSelected(account);
                        setReason('');
                        setDurationDays('0');
                      }}
                      disabled={blocked}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-[11px] font-bold text-red-400 transition hover:border-red-500/40 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Ban className="h-3.5 w-3.5" />
                      {Number(account.active_bans) > 0 ? 'Banned' : 'Ban'}
                    </button>
                  </div>

                  <div className="mt-3 space-y-1 text-[11px] text-zinc-500">
                    <p className="truncate">
                      <span className="text-zinc-600">Characters:</span> {account.characters || 'None'}
                    </p>
                    <p>
                      <span className="text-zinc-600">Last login:</span> {account.last_login || 'Never'}
                      {account.LastIP ? ` · ${account.LastIP}` : ''}
                    </p>
                  </div>

                  {blocked && Number(account.active_bans) === 0 ? (
                    <p className="mt-2 text-[10px] text-amber-500/80">
                      {account.Username === currentUsername
                        ? 'You cannot ban your own account.'
                        : 'You cannot ban this administrator.'}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}
      </section>

      {selected ? (
        <section className="rounded-2xl border border-red-500/20 bg-red-500/[0.03] p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-bold text-white">
                <UserX className="h-4 w-4 text-red-400" />
                Ban {selected.Username}
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                The account will be blocked at the next game login. A permanent ban has no expiry.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-zinc-500 transition hover:text-white"
              aria-label="Cancel ban"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleBan} className="mt-4 space-y-4">
            <div>
              <label htmlFor="ban-template" className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Quick template
              </label>
              <select
                id="ban-template"
                defaultValue=""
                onChange={(event) => {
                  if (event.target.value) setReason(event.target.value);
                  event.currentTarget.value = '';
                }}
                className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 text-xs text-white outline-none focus:border-red-500/50 sm:max-w-sm"
              >
                <option value="">Choose a template...</option>
                {BAN_REASON_TEMPLATES.map((template) => (
                  <option key={template} value={template}>
                    {template}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="ban-reason" className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Reason
              </label>
              <textarea
                id="ban-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
                maxLength={100}
                required
                placeholder="Explain the rule violation..."
                className="w-full resize-y rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2.5 text-xs text-white placeholder:text-zinc-600 focus:border-red-500/50 focus:outline-none"
              />
              <p className="mt-1 text-right text-[10px] text-zinc-600">{reason.length}/100</p>
            </div>

            <div>
              <label htmlFor="ban-duration" className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Duration
              </label>
              <select
                id="ban-duration"
                value={durationDays}
                onChange={(event) => setDurationDays(event.target.value)}
                className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 text-xs text-white focus:border-red-500/50 focus:outline-none sm:max-w-xs"
              >
                <option value="0">Permanent</option>
                <option value="1">1 day</option>
                <option value="3">3 days</option>
                <option value="7">7 days</option>
                <option value="14">14 days</option>
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="365">365 days</option>
              </select>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="h-10 rounded-xl border border-zinc-800 px-4 text-xs font-bold text-zinc-400 transition hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-xs font-bold text-white transition hover:bg-red-500 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                Confirm ban
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60">
        <div className="flex flex-col gap-1 border-b border-zinc-800 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="text-sm font-bold text-white">Active bans</h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Includes bans created from the UCP and in-game.
            </p>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            {initialBans.length} record{initialBans.length === 1 ? '' : 's'}
          </span>
        </div>

        {initialBans.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <ShieldOff className="mx-auto mb-3 h-9 w-9 text-zinc-700" />
            <p className="text-sm font-bold text-white">No active bans</p>
            <p className="mt-1 text-xs text-zinc-500">The ban table is empty.</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[900px] text-left text-xs">
                <thead className="border-b border-zinc-800 bg-zinc-900/40 text-[10px] uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 font-bold">Account</th>
                    <th className="px-4 py-3 font-bold">Reason</th>
                    <th className="px-4 py-3 font-bold">Banned by</th>
                    <th className="px-4 py-3 font-bold">Created</th>
                    <th className="px-4 py-3 font-bold">Expires</th>
                    <th className="px-4 py-3 font-bold">Source</th>
                    <th className="px-4 py-3 text-right font-bold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {initialBans.map((ban) => {
                    const locked = Boolean(ban.name && ban.target_admin !== null && Number(ban.target_admin) >= currentAdminLevel);
                    return (
                      <tr key={ban.id} className="align-top transition hover:bg-zinc-900/30">
                        <td className="px-4 py-3">
                          <p className="font-bold text-white">{ban.name || 'IP-only ban'}</p>
                          <p className="mt-0.5 font-mono text-[10px] text-zinc-600">{ban.playerIP || 'No IP'}</p>
                        </td>
                        <td className="max-w-xs px-4 py-3 text-zinc-300">{ban.reason || '—'}</td>
                        <td className="px-4 py-3 text-zinc-400">{ban.bannedby}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-zinc-500">{ban.created_at}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-zinc-500">
                          {ban.perm === 1 ? 'Permanent' : ban.expires_at}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-md border px-2 py-1 text-[10px] font-bold ${
                              ban.source === 'web'
                                ? 'border-blue-500/20 bg-blue-500/10 text-blue-400'
                                : 'border-amber-500/20 bg-amber-500/10 text-amber-400'
                            }`}
                          >
                            {ban.source === 'web' ? 'UCP' : 'In-game'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              resetMessages();
                              setUnbanTarget(ban);
                            }}
                            disabled={locked}
                            className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-bold text-emerald-400 transition hover:border-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Unban
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-zinc-900 md:hidden">
              {initialBans.map((ban) => {
                const locked = Boolean(ban.name && ban.target_admin !== null && Number(ban.target_admin) >= currentAdminLevel);
                return (
                  <div key={ban.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-white">{ban.name || 'IP-only ban'}</p>
                        <p className="mt-0.5 font-mono text-[10px] text-zinc-600">{ban.playerIP || 'No IP'}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-md border px-2 py-1 text-[10px] font-bold ${
                          ban.source === 'web'
                            ? 'border-blue-500/20 bg-blue-500/10 text-blue-400'
                            : 'border-amber-500/20 bg-amber-500/10 text-amber-400'
                        }`}
                      >
                        {ban.source === 'web' ? 'UCP' : 'In-game'}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-zinc-300">{ban.reason || '—'}</p>
                    <div className="mt-2 space-y-0.5 text-[10px] text-zinc-500">
                      <p>By {ban.bannedby} · {ban.created_at}</p>
                      <p>{ban.perm === 1 ? 'Permanent' : `Expires ${ban.expires_at}`}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        resetMessages();
                        setUnbanTarget(ban);
                      }}
                      disabled={locked}
                      className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-bold text-emerald-400 transition hover:border-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Unban
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      {unbanTarget ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl">
            <h3 className="flex items-center gap-2 text-sm font-bold text-white">
              <ShieldOff className="h-4 w-4 text-emerald-400" />
              Remove ban?
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-zinc-400">
              {unbanTarget.name
                ? `${unbanTarget.name} will be able to log into the game again.`
                : `The IP ban on ${unbanTarget.playerIP || 'this address'} will be removed.`}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setUnbanTarget(null)}
                className="h-10 rounded-xl border border-zinc-800 px-4 text-xs font-bold text-zinc-400 transition hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUnban}
                disabled={loading}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}
                Remove ban
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
