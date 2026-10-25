'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PlayerAutocomplete, { type PlayerSuggestion } from '@/components/PlayerAutocomplete';

export default function PlayerDirectorySearch({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/dashboard/admin/users?q=${encodeURIComponent(trimmed)}` : '/dashboard/admin/users');
  }

  function handleSelect(suggestion: PlayerSuggestion) {
    router.push(`/dashboard/admin/users/${suggestion.id}`);
  }

  return (
    <form action="/dashboard/admin/users" method="get" onSubmit={handleSubmit} className="mb-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <PlayerAutocomplete
          endpoint="/api/admin/users"
          value={query}
          onChange={setQuery}
          onSelect={handleSelect}
          inputName="q"
          inputId="directory-player-search"
          ariaLabel="Search player directory"
          placeholder="Search username or character name..."
          className="min-w-0 flex-1"
        />
        <button
          type="submit"
          className="h-11 rounded-xl bg-amber-500 px-5 text-xs font-bold text-black transition hover:bg-amber-400"
        >
          Search
        </button>
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        Pick a suggestion to open the exact account. Press Search to list every match for a name.
      </p>
    </form>
  );
}
