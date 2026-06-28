'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Loader2, ArrowUp, ArrowDown, UserMinus, UserPlus, CheckCircle } from 'lucide-react';

interface Member {
  ID: number;
  char_name: string;
  Level: number;
  FactionRank: number;
  Online: number;
}

interface FactionRosterProps {
  factionId: number;
  members: Member[];
  isLeader: boolean;
}

export default function FactionRoster({ factionId, members, isLeader }: FactionRosterProps) {
  const router = useRouter();
  
  // States
  const [inviteName, setInviteName] = useState('');
  const [loadingActionId, setLoadingActionId] = useState<number | string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleAction = async (targetId: number | null, action: 'promote' | 'demote' | 'kick' | 'invite') => {
    setError('');
    setSuccess('');
    setLoadingActionId(targetId || 'invite');

    try {
      const res = await fetch('/api/faction/member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          factionId,
          targetCharId: targetId,
          targetCharName: action === 'invite' ? inviteName : undefined,
          action
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Gagal memproses aksi');
      } else {
        setSuccess(data.message || 'Aksi berhasil dilakukan');
        if (action === 'invite') setInviteName('');
        router.refresh();
      }
    } catch {
      setError('Koneksi internet bermasalah');
    } finally {
      setLoadingActionId(null);
    }
  };

  return (
    <div className="space-y-6">
      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-xs text-green-400 font-medium">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-xs text-red-500 font-medium">
          <ShieldAlert className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Invite Member form (Visible only to leaders) */}
      {isLeader && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <UserPlus className="h-4.5 w-4.5 text-amber-500" />
            Undang Anggota Baru
          </h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              required
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder="Contoh: Budi_Pranoto"
              className="flex-1 h-11 border border-zinc-800 rounded-xl px-4 text-xs font-medium focus:border-amber-500 focus:outline-none bg-zinc-900 text-white transition"
            />
            <button
              onClick={() => handleAction(null, 'invite')}
              disabled={loadingActionId === 'invite' || !inviteName}
              className="h-11 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-md transition flex items-center justify-center cursor-pointer disabled:opacity-50"
            >
              {loadingActionId === 'invite' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Undang Anggota'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Roster List Table */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 overflow-hidden">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-6">
          Daftar Roster Faksi
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-900 text-zinc-500 font-semibold uppercase tracking-wider">
                <th className="pb-3 pr-4">Nama Karakter</th>
                <th className="pb-3 px-4">Level</th>
                <th className="pb-3 px-4">Rank Level</th>
                <th className="pb-3 px-4">Status</th>
                {isLeader && <th className="pb-3 pl-4 text-right">Tindakan</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {members.map((member) => (
                <tr key={member.ID} className="hover:bg-zinc-900/10">
                  <td className="py-4 pr-4 font-bold text-white">
                    {member.char_name.replace('_', ' ')}
                  </td>
                  <td className="py-4 px-4 text-zinc-300">Level {member.Level}</td>
                  <td className="py-4 px-4 font-semibold text-amber-500">Rank {member.FactionRank}</td>
                  <td className="py-4 px-4">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        member.Online
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                          : 'bg-zinc-800 text-zinc-500'
                      }`}
                    >
                      {member.Online ? 'Online' : 'Offline'}
                    </span>
                  </td>
                  {isLeader && (
                    <td className="py-4 pl-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => handleAction(member.ID, 'promote')}
                          disabled={loadingActionId !== null}
                          title="Promote Member"
                          className="w-8 h-8 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900 hover:bg-zinc-800 flex items-center justify-center text-green-400 hover:text-green-300 transition cursor-pointer disabled:opacity-50"
                        >
                          {loadingActionId === member.ID ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => handleAction(member.ID, 'demote')}
                          disabled={loadingActionId !== null || member.FactionRank <= 1}
                          title="Demote Member"
                          className="w-8 h-8 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900 hover:bg-zinc-800 flex items-center justify-center text-amber-500 hover:text-amber-400 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleAction(member.ID, 'kick')}
                          disabled={loadingActionId !== null}
                          title="Kick Member"
                          className="w-8 h-8 rounded-lg border border-red-950/30 hover:border-red-900/50 bg-red-950/10 hover:bg-red-950/20 flex items-center justify-center text-red-400 hover:text-red-300 transition cursor-pointer disabled:opacity-50"
                        >
                          <UserMinus className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
