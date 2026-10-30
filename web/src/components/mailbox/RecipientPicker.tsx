'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Search } from 'lucide-react';

interface AccountHint {
  id: number;
  username: string;
  characterCount: number;
  sampleCharacters: string | null;
}

interface RecipientPickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function RecipientPicker({ value, onChange, disabled = false }: RecipientPickerProps) {
  const [hints, setHints] = useState<AccountHint[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const skipSearchRef = useRef(false);

  useEffect(() => {
    if (disabled) return;

    if (skipSearchRef.current) {
      skipSearchRef.current = false;
      return;
    }

    const query = value.trim();
    if (!query) return;

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/accounts/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });

        if (response.ok) {
          const data = await response.json();
          setHints(data.results || []);
          setOpen(true);
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Failed to search accounts:', error);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [value, disabled]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setSelectedIndex(-1);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleChange(nextValue: string) {
    onChange(nextValue);
    if (!nextValue.trim()) {
      setHints([]);
      setOpen(false);
      setSelectedIndex(-1);
    }
  }

  function selectHint(hint: AccountHint) {
    skipSearchRef.current = true;
    onChange(hint.username);
    setOpen(false);
    setSelectedIndex(-1);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || hints.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex((current) => (current < hints.length - 1 ? current + 1 : 0));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex((current) => (current > 0 ? current - 1 : hints.length - 1));
    } else if (event.key === 'Enter' && selectedIndex >= 0 && selectedIndex < hints.length) {
      event.preventDefault();
      selectHint(hints[selectedIndex]);
    } else if (event.key === 'Escape') {
      setOpen(false);
      setSelectedIndex(-1);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
      <input
        type="text"
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        onFocus={() => {
          if (hints.length > 0) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Search UCP username..."
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-controls="recipient-suggestions"
        aria-expanded={open}
        aria-haspopup="listbox"
        className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 py-2.5 pl-9 pr-9 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-amber-500/40 disabled:opacity-60"
      />
      {loading ? (
        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-amber-500" />
      ) : null}

      {open && value.trim() ? (
        <div
          id="recipient-suggestions"
          role="listbox"
          className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/40"
        >
          {hints.length > 0 ? (
            hints.map((hint, index) => (
              <button
                key={hint.id}
                type="button"
                role="option"
                aria-selected={index === selectedIndex}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectHint(hint)}
                className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition ${
                  index === selectedIndex
                    ? 'bg-amber-500/10 text-amber-300'
                    : 'text-zinc-300 hover:bg-zinc-900'
                }`}
              >
                <span className="font-semibold">{hint.username}</span>
                <span className="truncate text-[11px] text-zinc-500">
                  {hint.sampleCharacters || `${hint.characterCount} character${hint.characterCount === 1 ? '' : 's'}`}
                </span>
              </button>
            ))
          ) : (
            <p className="px-3 py-3 text-xs text-zinc-500">No UCP account found.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
