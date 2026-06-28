'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X, ShieldAlert, Loader2, Calendar, FileText, ChevronDown, ChevronUp, User, Globe, HelpCircle } from 'lucide-react';

interface Application {
  id: number;
  master: number;
  char_name: string;
  story: string;
  origin: string;
  gender: string;
  age: number;
  date_of_submit: string;
  Username: string; // The account UCP username
  answer1: string;
  answer2: string;
}

interface AdminPanelProps {
  initialApps: Application[];
}

export default function AdminPanel({ initialApps }: AdminPanelProps) {
  const router = useRouter();
  const [apps, setApps] = useState<Application[]>(initialApps);
  const [expandedAppId, setExpandedAppId] = useState<number | null>(null);
  
  // Review actions state
  const [loadingAppId, setLoadingAppId] = useState<number | null>(null);
  const [denyReason, setDenyReason] = useState('');
  const [showDenyInputId, setShowDenyInputId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const handleReview = async (appId: number, action: 'accept' | 'deny') => {
    setError('');
    
    if (action === 'deny' && !denyReason) {
      setError('Alasan penolakan harus diisi!');
      return;
    }

    setLoadingAppId(appId);

    try {
      const res = await fetch('/api/applications/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId, action, reason: denyReason }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Gagal memproses review');
      } else {
        // Remove reviewed application from UI list
        setApps(apps.filter(app => app.id !== appId));
        setExpandedAppId(null);
        setShowDenyInputId(null);
        setDenyReason('');
        router.refresh();
      }
    } catch {
      setError('Koneksi internet bermasalah');
    } finally {
      setLoadingAppId(null);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-xs text-red-500 font-medium">
          <ShieldAlert className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {apps.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-zinc-800 rounded-2xl bg-zinc-950/20">
          <FileText className="h-12 w-12 text-zinc-650 mx-auto mb-4" />
          <h4 className="text-white font-bold mb-1">Tidak Ada Pengajuan Pending</h4>
          <p className="text-zinc-400 text-sm max-w-sm mx-auto">
            Semua pengajuan pembuatan karakter baru telah selesai ditinjau oleh tim administrator.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {apps.map((app) => {
            const isExpanded = expandedAppId === app.id;
            return (
              <div 
                key={app.id} 
                className={`rounded-2xl border transition duration-200 ${
                  isExpanded ? 'border-amber-500/30 bg-zinc-950/80 shadow-lg' : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
                }`}
              >
                {/* Header Summary */}
                <div 
                  onClick={() => {
                    setExpandedAppId(isExpanded ? null : app.id);
                    setShowDenyInputId(null);
                    setDenyReason('');
                  }}
                  className="flex items-center justify-between p-5 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-white text-xs">
                      {app.char_name[0]}
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm sm:text-base">
                        {app.char_name.replace('_', ' ')}
                      </h4>
                      <p className="text-[10px] text-zinc-500 mt-0.5">
                        Diajukan oleh UCP: <span className="font-semibold text-zinc-300">{app.Username}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-400 px-2.5 py-1 text-[10px] font-bold border border-amber-500/20">
                      <Calendar className="h-3 w-3" />
                      {app.date_of_submit ? new Date(app.date_of_submit).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                      }) : 'N/A'}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-zinc-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-zinc-500" />
                    )}
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-zinc-900 p-6 space-y-6 animate-in fade-in duration-200">
                    {/* Character Bio Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-zinc-900/30 p-4 rounded-xl border border-zinc-900 text-xs">
                      <div>
                        <span className="text-zinc-500 block">Kewarganegaraan / Origin</span>
                        <span className="font-bold text-white flex items-center gap-1 mt-0.5">
                          <Globe className="h-3.5 w-3.5 text-zinc-500" />
                          {app.origin}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">Umur Karakter</span>
                        <span className="font-bold text-white block mt-0.5">{app.age} Tahun</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">Jenis Kelamin</span>
                        <span className="font-bold text-white block mt-0.5">{app.gender}</span>
                      </div>
                    </div>

                    {/* Quiz answers */}
                    <div className="space-y-4">
                      <h5 className="font-bold text-white text-xs flex items-center gap-1.5 uppercase tracking-wider text-amber-500">
                        <HelpCircle className="h-4 w-4" />
                        Jawaban Kuis Roleplay
                      </h5>
                      <div className="space-y-3 text-xs bg-zinc-900/20 p-4 rounded-xl border border-zinc-900">
                        <div>
                          <p className="text-zinc-400 font-semibold mb-1">1. Jelaskan Roleplay & Perbedaan IC / OOC:</p>
                          <p className="text-zinc-200 leading-relaxed bg-zinc-900/40 p-3 rounded-lg border border-zinc-800">{app.answer1 || 'Tidak ada jawaban'}</p>
                        </div>
                        <div>
                          <p className="text-zinc-400 font-semibold mb-1">2. Berikan contoh tindakan Metagaming (MG) & Powergaming (PG):</p>
                          <p className="text-zinc-200 leading-relaxed bg-zinc-900/40 p-3 rounded-lg border border-zinc-800">{app.answer2 || 'Tidak ada jawaban'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Backstory */}
                    <div className="space-y-2">
                      <h5 className="font-bold text-white text-xs flex items-center gap-1.5 uppercase tracking-wider text-amber-500">
                        <FileText className="h-4 w-4" />
                        Latar Belakang Karakter (Story)
                      </h5>
                      <div className="text-zinc-200 text-xs leading-relaxed bg-zinc-900/10 p-5 rounded-xl border border-zinc-900 whitespace-pre-line font-medium">
                        {app.story}
                      </div>
                    </div>

                    {/* Actions Panel */}
                    <div className="pt-4 border-t border-zinc-900 flex flex-col gap-4">
                      {showDenyInputId === app.id ? (
                        <div className="space-y-3 animate-in slide-in-from-bottom-2 duration-200">
                          <label className="block text-xs font-bold text-zinc-400 mb-1" htmlFor={`reason-${app.id}`}>
                            Tulis Alasan Penolakan (Akan dikirimkan ke pemain)
                          </label>
                          <input
                            id={`reason-${app.id}`}
                            type="text"
                            required
                            value={denyReason}
                            onChange={(e) => setDenyReason(e.target.value)}
                            placeholder="Contoh: Story kurang dari 200 kata, atau berikan koreksi jawaban kuis."
                            className="w-full h-11 border border-zinc-800 rounded-xl px-4 text-xs font-medium focus:border-red-500 focus:outline-none bg-zinc-900 text-white transition"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleReview(app.id, 'deny')}
                              disabled={loadingAppId !== null}
                              className="h-10 px-5 rounded-xl bg-red-500 hover:bg-red-400 text-white font-bold text-xs shadow-md transition flex items-center justify-center cursor-pointer disabled:opacity-50"
                            >
                              {loadingAppId === app.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Kirim Penolakan'}
                            </button>
                            <button
                              onClick={() => {
                                setShowDenyInputId(null);
                                setDenyReason('');
                              }}
                              className="h-10 px-5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-bold text-xs transition cursor-pointer"
                            >
                              Batal
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleReview(app.id, 'accept')}
                            disabled={loadingAppId !== null}
                            className="h-10 px-5 rounded-xl bg-green-500 hover:bg-green-400 text-black font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            {loadingAppId === app.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Check className="h-4 w-4" />
                                Terima (Accept)
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => setShowDenyInputId(app.id)}
                            disabled={loadingAppId !== null}
                            className="h-10 px-5 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <X className="h-4 w-4" />
                            Tolak (Deny)
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
