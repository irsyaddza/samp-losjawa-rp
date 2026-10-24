'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Loader2, Send, X } from 'lucide-react';
import { REPORT_CATEGORIES } from '@/lib/reports';

interface CharacterOption {
  ID: number;
  char_name: string;
}

export default function NewReportForm({ characters }: { characters: CharacterOption[] }) {
  const router = useRouter();
  const [characterId, setCharacterId] = useState(characters[0] ? String(characters[0].ID) : '');
  const [reportedName, setReportedName] = useState('');
  const [category, setCategory] = useState<string>(REPORT_CATEGORIES[0].value);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [evidence, setEvidence] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: characterId ? Number(characterId) : null,
          reportedName,
          category,
          subject,
          description,
          evidence,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to submit the report.');
        return;
      }

      setSuccess(data.message || 'Report submitted.');
      setReportedName('');
      setSubject('');
      setDescription('');
      setEvidence('');
      router.refresh();
    } catch {
      setError('Network error while submitting the report.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4 sm:p-5">
      <div>
        <h2 className="text-sm font-bold text-white">Submit a report</h2>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">
          Give staff enough detail to verify what happened. Reports are private between you and the staff team.
        </p>
      </div>

      {success ? (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-[11px] text-emerald-400">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">{success}</span>
          <button type="button" onClick={() => setSuccess('')} className="text-zinc-500 hover:text-white" aria-label="Dismiss">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-[11px] text-red-400">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError('')} className="text-zinc-500 hover:text-white" aria-label="Dismiss">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      <div>
        <label htmlFor="report-character" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          Reporting as
        </label>
        <select
          id="report-character"
          value={characterId}
          onChange={(event) => setCharacterId(event.target.value)}
          className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 text-xs text-white outline-none focus:border-amber-500/50"
        >
          <option value="">Account only (no character)</option>
          {characters.map((character) => (
            <option key={character.ID} value={character.ID}>
              {character.char_name.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="report-target" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          Reported player
        </label>
        <input
          id="report-target"
          value={reportedName}
          onChange={(event) => setReportedName(event.target.value)}
          maxLength={64}
          required
          placeholder="Character name or UCP username"
          className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 text-xs text-white outline-none placeholder:text-zinc-600 focus:border-amber-500/50"
        />
      </div>

      <div>
        <label htmlFor="report-category" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          Category
        </label>
        <select
          id="report-category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 text-xs text-white outline-none focus:border-amber-500/50"
        >
          {REPORT_CATEGORIES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="report-subject" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          Subject
        </label>
        <input
          id="report-subject"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          minLength={5}
          maxLength={120}
          required
          placeholder="Short summary of the incident"
          className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 text-xs text-white outline-none placeholder:text-zinc-600 focus:border-amber-500/50"
        />
        <p className="mt-1 text-right text-[10px] text-zinc-600">{subject.length}/120</p>
      </div>

      <div>
        <label htmlFor="report-description" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          Chronology
        </label>
        <textarea
          id="report-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={6}
          minLength={20}
          maxLength={5000}
          required
          placeholder="What happened, where it happened, and who was involved..."
          className="w-full resize-y rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2.5 text-xs leading-relaxed text-white outline-none placeholder:text-zinc-600 focus:border-amber-500/50"
        />
        <p className="mt-1 text-right text-[10px] text-zinc-600">{description.length}/5000</p>
      </div>

      <div>
        <label htmlFor="report-evidence" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          Evidence links (optional)
        </label>
        <textarea
          id="report-evidence"
          value={evidence}
          onChange={(event) => setEvidence(event.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Screenshot or video links, one per line"
          className="w-full resize-y rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2.5 text-xs leading-relaxed text-white outline-none placeholder:text-zinc-600 focus:border-amber-500/50"
        />
        <p className="mt-1 text-right text-[10px] text-zinc-600">{evidence.length}/2000</p>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 text-xs font-bold text-black transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Submit report
      </button>
    </form>
  );
}
