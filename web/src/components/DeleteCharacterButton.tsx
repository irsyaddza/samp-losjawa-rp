'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';

interface DeleteCharacterButtonProps {
  charId: number;
  charName: string;
}

export default function DeleteCharacterButton({ charId, charName }: DeleteCharacterButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const formattedName = charName.replace('_', ' ');

  const handleDelete = async () => {
    if (confirmName.trim().toLowerCase() !== formattedName.toLowerCase()) {
      setError('The character name you entered does not match.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/character/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ charId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete the character.');
      }

      setIsOpen(false);
      router.push('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'A system error occurred.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 px-4 py-2.5 text-xs font-bold transition cursor-pointer"
      >
        <Trash2 className="h-4 w-4" />
        Delete Character
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl relative overflow-hidden">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500 animate-pulse" />
              Confirm Deletion
            </h3>

            <p className="text-zinc-400 text-xs leading-relaxed mb-4">
              This action is <span className="text-red-400 font-bold">permanent</span>. All vehicle assets will be deleted, and any properties (houses/businesses) owned by <span className="text-white font-bold">{formattedName}</span> will be returned to the State.
            </p>

            <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-3 mb-6">
              <p className="text-[11px] text-red-400">
                The character must be offline in-game before deletion.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] text-zinc-500 block mb-1.5">
                  Type <span className="text-white font-bold select-none">{formattedName}</span> to confirm:
                </label>
                <input
                  type="text"
                  placeholder="Enter the character's full name"
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:border-red-500 focus:outline-none transition"
                  disabled={loading}
                />
              </div>

              {error && (
                <p className="text-[11px] text-red-400 font-semibold bg-red-500/5 border border-red-500/10 p-2.5 rounded-lg">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => {
                    if (!loading) {
                      setIsOpen(false);
                      setConfirmName('');
                      setError('');
                    }
                  }}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-850 px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white transition"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading || confirmName.trim().toLowerCase() !== formattedName.toLowerCase()}
                  className="rounded-xl bg-red-600 hover:bg-red-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white px-4 py-2 text-xs font-bold transition flex items-center gap-1.5"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete Permanently'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
