'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { AlertCircle, Loader2, Search, Shield, UserRound, X } from 'lucide-react';

export interface PlayerSuggestion {
  id: number;
  username: string;
  adminLevel: number;
  online: boolean;
  characters: string | null;
  activeBans: number;
  matchedCharacters: string[];
  lastIp: string | null;
  registeredAt: string | null;
  lastLogin: string | null;
}

interface PlayerAutocompleteProps {
  endpoint: string;
  value: string;
  onChange: (value: string) => void;
  onSelect?: (suggestion: PlayerSuggestion) => void;
  placeholder?: string;
  minChars?: number;
  inputId?: string;
  inputName?: string;
  ariaLabel?: string;
  required?: boolean;
  disabled?: boolean;
  maxLength?: number;
  selectValue?: (suggestion: PlayerSuggestion) => string;
  className?: string;
}

type RawSuggestion = Record<string, unknown>;

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function normalizeSuggestion(row: RawSuggestion): PlayerSuggestion | null {
  const id = Number(row.id ?? row.ID ?? 0);
  const username = asString(row.username ?? row.Username);

  if (!Number.isInteger(id) || id <= 0 || !username) {
    return null;
  }

  const matchedCharacters = Array.isArray(row.matchedCharacters)
    ? row.matchedCharacters.map(String).filter(Boolean)
    : typeof row.matchedCharacters === 'string'
      ? row.matchedCharacters.split(', ').filter(Boolean)
      : [];

  return {
    id,
    username,
    adminLevel: Number(row.adminLevel ?? row.Admin ?? 0),
    online: Boolean(Number(row.online ?? row.Online ?? 0)),
    characters: asString(row.characters ?? row.sampleCharacters),
    activeBans: Number(row.activeBans ?? row.active_bans ?? 0),
    matchedCharacters,
    lastIp: asString(row.lastIp ?? row.LastIP),
    registeredAt: asString(row.registeredAt ?? row.registered_at),
    lastLogin: asString(row.lastLogin ?? row.last_login),
  };
}

export default function PlayerAutocomplete({
  endpoint,
  value,
  onChange,
  onSelect,
  placeholder = 'Search username or character name...',
  minChars = 2,
  inputId,
  inputName,
  ariaLabel = 'Search player',
  required = false,
  disabled = false,
  maxLength,
  selectValue,
  className = '',
}: PlayerAutocompleteProps) {
  const [hints, setHints] = useState<PlayerSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [failed, setFailed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const skipSearchRef = useRef(false);
  const listboxId = useId();

  useEffect(() => {
    if (skipSearchRef.current) {
      skipSearchRef.current = false;
      return;
    }

    const trimmed = value.trim();
    if (trimmed.length < minChars) {
      return;
    }

    let cancelled = false;
    const timeout = setTimeout(async () => {
      setLoading(true);
      setFailed(false);

      try {
        const res = await fetch(`${endpoint}?q=${encodeURIComponent(trimmed)}`);
        if (cancelled) return;

        if (!res.ok) {
          setHints([]);
          setFailed(true);
          return;
        }

        const payload = await res.json();
        const rows = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.results)
            ? payload.results
            : [];
        const suggestions = rows
          .map((row: RawSuggestion) => normalizeSuggestion(row))
          .filter((row: PlayerSuggestion | null): row is PlayerSuggestion => row !== null);

        setHints(suggestions);
        setShowHints(true);
        setSelectedIndex(-1);
      } catch {
        if (!cancelled) {
          setHints([]);
          setFailed(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [endpoint, minChars, value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowHints(false);
        setSelectedIndex(-1);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function selectHint(hint: PlayerSuggestion) {
    skipSearchRef.current = true;
    onChange(selectValue ? selectValue(hint) : hint.username);
    onSelect?.(hint);
    setHints([]);
    setShowHints(false);
    setSelectedIndex(-1);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!showHints || hints.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex((previous) => (previous < hints.length - 1 ? previous + 1 : 0));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex((previous) => (previous > 0 ? previous - 1 : hints.length - 1));
    } else if (event.key === 'Enter' && selectedIndex >= 0 && selectedIndex < hints.length) {
      event.preventDefault();
      selectHint(hints[selectedIndex]);
    } else if (event.key === 'Escape') {
      setShowHints(false);
      setSelectedIndex(-1);
    }
  }

  function clearInput() {
    skipSearchRef.current = true;
    onChange('');
    setHints([]);
    setShowHints(false);
    setSelectedIndex(-1);
    setFailed(false);
  }

  const showDropdown = showHints && value.trim().length >= minChars;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
      <input
        id={inputId}
        name={inputName}
        type="text"
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={showDropdown}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={
          showDropdown && selectedIndex >= 0 ? `${listboxId}-${selectedIndex}` : undefined
        }
        autoComplete="off"
        required={required}
        disabled={disabled}
        maxLength={maxLength}
        value={value}
        onChange={(event) => {
          const nextValue = event.target.value;
          const wasShort = value.trim().length < minChars;
          const isShort = nextValue.trim().length < minChars;

          skipSearchRef.current = false;
          onChange(nextValue);
          setSelectedIndex(-1);

          if (isShort) {
            setHints([]);
            setShowHints(false);
            setLoading(false);
            setFailed(false);
          } else {
            if (wasShort) setHints([]);
            setShowHints(true);
          }
        }}
        onFocus={() => {
          if (hints.length > 0 && value.trim().length >= minChars) {
            setShowHints(true);
          }
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900/60 pl-10 pr-10 text-sm text-white outline-none placeholder:text-zinc-600 transition focus:border-amber-500/50 disabled:cursor-not-allowed disabled:opacity-50"
      />

      <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
        {loading ? <Loader2 className="h-4 w-4 animate-spin text-amber-500" /> : null}
        {!loading && value.length > 0 ? (
          <button
            type="button"
            onClick={clearInput}
            className="text-zinc-500 transition hover:text-zinc-300"
            aria-label="Clear player search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {showDropdown ? (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/95 shadow-2xl backdrop-blur-md"
        >
          <div className="flex items-center justify-between border-b border-zinc-800/80 bg-zinc-950/60 px-3 py-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Player suggestions
            </span>
            <span className="hidden text-[10px] text-zinc-500 sm:block">
              ↑↓ navigate · Enter select
            </span>
          </div>

          {hints.length === 0 && !loading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-5 text-center text-xs text-zinc-500">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {failed
                ? 'Player search failed. Try again.'
                : `No player found for "${value.trim()}"`}
            </div>
          ) : (
            <div className="max-h-72 divide-y divide-zinc-800/40 overflow-y-auto">
              {hints.map((hint, index) => {
                const selected = index === selectedIndex;
                const meta = hint.matchedCharacters.length > 0
                  ? `Matched: ${hint.matchedCharacters.join(', ')}`
                  : hint.characters
                    ? `Characters: ${hint.characters}`
                    : 'No characters';

                return (
                  <button
                    key={`${hint.id}-${index}`}
                    id={`${listboxId}-${index}`}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => selectHint(hint)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`flex w-full items-start gap-3 px-3.5 py-3 text-left transition ${
                      selected ? 'bg-amber-500/10' : 'hover:bg-zinc-800/60'
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-xs font-black uppercase ${
                        selected
                          ? 'border-amber-400/40 bg-amber-500 text-black'
                          : 'border-zinc-700/50 bg-zinc-800 text-amber-400'
                      }`}
                    >
                      {hint.username.charAt(0)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`truncate text-xs font-bold ${selected ? 'text-white' : 'text-zinc-200'}`}>
                          {hint.username}
                        </span>
                        {hint.adminLevel > 0 ? (
                          <span className="inline-flex items-center gap-0.5 rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-400">
                            <Shield className="h-2.5 w-2.5" />
                            Admin {hint.adminLevel}
                          </span>
                        ) : null}
                        {hint.online ? (
                          <span className="inline-flex items-center gap-1 rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            Online
                          </span>
                        ) : null}
                        {hint.activeBans > 0 ? (
                          <span className="rounded border border-red-500/20 bg-red-500/10 px-1.5 py-0.5 text-[9px] font-bold text-red-400">
                            Banned
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 truncate text-[10px] text-zinc-400">{meta}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-[10px] text-zinc-600">
                        <UserRound className="h-2.5 w-2.5" />
                        Account #{hint.id}
                        {hint.lastLogin ? ` · Last login ${hint.lastLogin}` : ''}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
