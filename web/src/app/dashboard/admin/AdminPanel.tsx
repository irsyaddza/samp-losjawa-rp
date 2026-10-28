'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Check,
  X,
  ShieldAlert,
  Loader2,
  Calendar,
  FileText,
  ChevronDown,
  ChevronUp,
  Globe,
  HelpCircle,
  Search,
  Gem,
  CheckCircle,
  Clock,
  User
} from 'lucide-react';

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

interface CharacterSearchResult {
  ID: number;
  char_name: string;
  DonateRank: number;
}

interface AdminPanelProps {
  initialApps: Application[];
  currentAdminLevel?: number;
}

export default function AdminPanel({ initialApps, currentAdminLevel }: AdminPanelProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'applications' | 'donators'>('applications');
  const [apps, setApps] = useState<Application[]>(initialApps);
  const [expandedAppId, setExpandedAppId] = useState<number | null>(null);

  // Review actions state
  const [loadingAppId, setLoadingAppId] = useState<number | null>(null);
  const [denyReason, setDenyReason] = useState('');
  const [showDenyInputId, setShowDenyInputId] = useState<number | null>(null);
  const [error, setError] = useState('');

  // Donators management state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CharacterSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedChar, setSelectedChar] = useState<CharacterSearchResult | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<number>(0);
  const [durationDays, setDurationDays] = useState<number>(30);
  const [updatingDonator, setUpdatingDonator] = useState(false);
  const [donatorSuccessMsg, setDonatorSuccessMsg] = useState('');
  const [donatorErrorMsg, setDonatorErrorMsg] = useState('');

  const handleReview = async (appId: number, action: 'accept' | 'deny') => {
    setError('');

    if (action === 'deny' && !denyReason) {
      setError('Rejection reason is required!');
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
        setError(data.error || 'Failed to process review');
      } else {
        setApps(apps.filter((app) => app.id !== appId));
        setExpandedAppId(null);
        setShowDenyInputId(null);
        setDenyReason('');
        router.refresh();
      }
    } catch {
      setError('Network connection error');
    } finally {
      setLoadingAppId(null);
    }
  };

  // Search characters for donators management
  useEffect(() => {
    if (searchQuery.length < 2) {
      const timer = setTimeout(() => setSearchResults([]), 0);
      return () => clearTimeout(timer);
    }

    const delayDebounce = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/admin/characters?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch (err) {
        console.error('Failed to search characters:', err);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const handleSetDonator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChar) return;

    setUpdatingDonator(true);
    setDonatorSuccessMsg('');
    setDonatorErrorMsg('');

    try {
      const res = await fetch('/api/admin/set-donator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          charId: selectedChar.ID,
          level: selectedLevel,
          days: durationDays,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setDonatorSuccessMsg(`Successfully updated donator status for ${selectedChar.char_name.replace('_', ' ')}`);
        // Update local search results if character is in list
        setSearchResults(
          searchResults.map((c) =>
            c.ID === selectedChar.ID ? { ...c, DonateRank: selectedLevel } : c
          )
        );
        setSelectedChar({ ...selectedChar, DonateRank: selectedLevel });
        router.refresh();
      } else {
        setDonatorErrorMsg(data.error || 'Failed to update donator status');
      }
    } catch {
      setDonatorErrorMsg('Connection error. Please try again.');
    } finally {
      setUpdatingDonator(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-zinc-800">
        <button
          onClick={() => setActiveTab('applications')}
          className={`shrink-0 whitespace-nowrap px-5 py-3 text-sm font-bold border-b-2 transition ${
            activeTab === 'applications'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          Character Applications
        </button>
        <button
          onClick={() => setActiveTab('donators')}
          className={`shrink-0 whitespace-nowrap px-5 py-3 text-sm font-bold border-b-2 transition ${
            activeTab === 'donators'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          Manage Donators (Character-based)
        </button>
        <Link
          href="/dashboard/admin/mapping"
          className="shrink-0 whitespace-nowrap px-5 py-3 text-sm font-bold border-b-2 border-transparent text-zinc-400 hover:text-white transition"
        >
          Review Property Mappings
        </Link>
        <Link
          href="/dashboard/admin/radio"
          className="shrink-0 whitespace-nowrap px-5 py-3 text-sm font-bold border-b-2 border-transparent text-zinc-400 hover:text-white transition flex items-center gap-1.5"
        >
          Radio Manager
        </Link>
        {(currentAdminLevel === 1336 || currentAdminLevel === 1337) && (
          <Link
            href="/dashboard/admin/roster"
            className="shrink-0 whitespace-nowrap px-5 py-3 text-sm font-bold border-b-2 border-transparent text-amber-400 hover:text-amber-300 transition flex items-center gap-1.5"
          >
            Staff Roster
          </Link>
        )}
      </div>

      {activeTab === 'applications' ? (
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
              <h4 className="text-white font-bold mb-1">No Pending Applications</h4>
              <p className="text-zinc-400 text-sm max-w-sm mx-auto">
                All character creation applications have been reviewed by the admin team.
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
                      isExpanded
                        ? 'border-amber-500/30 bg-zinc-950/80 shadow-lg'
                        : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
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
                            Submitted by UCP:{' '}
                            <span className="font-semibold text-zinc-300">{app.Username}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-400 px-2.5 py-1 text-[10px] font-bold border border-amber-500/20">
                          <Calendar className="h-3 w-3" />
                          {app.date_of_submit
                            ? new Date(app.date_of_submit).toLocaleDateString('en-US', {
                                day: 'numeric',
                                month: 'short',
                              })
                            : 'N/A'}
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
                            <span className="text-zinc-500 block">Citizenship / Origin</span>
                            <span className="font-bold text-white flex items-center gap-1 mt-0.5">
                              <Globe className="h-3.5 w-3.5 text-zinc-500" />
                              {app.origin}
                            </span>
                          </div>
                          <div>
                            <span className="text-zinc-500 block">Character Age</span>
                            <span className="font-bold text-white block mt-0.5">
                              {app.age} Years Old
                            </span>
                          </div>
                          <div>
                            <span className="text-zinc-500 block">Gender</span>
                            <span className="font-bold text-white block mt-0.5">{app.gender}</span>
                          </div>
                        </div>

                        {/* Quiz answers */}
                        <div className="space-y-4">
                          <h5 className="font-bold text-white text-xs flex items-center gap-1.5 uppercase tracking-wider text-amber-500">
                            <HelpCircle className="h-4 w-4" />
                            Roleplay Quiz Answers
                          </h5>
                          <div className="space-y-3 text-xs bg-zinc-900/20 p-4 rounded-xl border border-zinc-900">
                            <div>
                              <p className="text-zinc-400 font-semibold mb-1">
                                1. Explain Roleplay & Difference between IC / OOC:
                              </p>
                              <p className="text-zinc-200 leading-relaxed bg-zinc-900/40 p-3 rounded-lg border border-zinc-800">
                                {app.answer1 || 'No answer provided'}
                              </p>
                            </div>
                            <div>
                              <p className="text-zinc-400 font-semibold mb-1">
                                2. Provide examples of Metagaming (MG) & Powergaming (PG):
                              </p>
                              <p className="text-zinc-200 leading-relaxed bg-zinc-900/40 p-3 rounded-lg border border-zinc-800">
                                {app.answer2 || 'No answer provided'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Backstory */}
                        <div className="space-y-2">
                          <h5 className="font-bold text-white text-xs flex items-center gap-1.5 uppercase tracking-wider text-amber-500">
                            <FileText className="h-4 w-4" />
                            Character Backstory (Story)
                          </h5>
                          <div className="text-zinc-200 text-xs leading-relaxed bg-zinc-900/10 p-5 rounded-xl border border-zinc-900 whitespace-pre-wrap break-words font-medium">
                            {app.story}
                          </div>
                        </div>

                        {/* Actions Panel */}
                        <div className="pt-4 border-t border-zinc-900 flex flex-col gap-4">
                          {showDenyInputId === app.id ? (
                            <div className="space-y-3 animate-in slide-in-from-bottom-2 duration-200">
                              <label
                                className="block text-xs font-bold text-zinc-400 mb-1"
                                htmlFor={`reason-${app.id}`}
                              >
                                Write Rejection Reason (Will be sent to player)
                              </label>
                              <input
                                id={`reason-${app.id}`}
                                type="text"
                                required
                                value={denyReason}
                                onChange={(e) => setDenyReason(e.target.value)}
                                placeholder="e.g. Story is less than 200 words, or provide quiz answer corrections."
                                className="w-full h-11 border border-zinc-800 rounded-xl px-4 text-xs font-medium focus:border-red-500 focus:outline-none bg-zinc-900 text-white transition"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleReview(app.id, 'deny')}
                                  disabled={loadingAppId !== null}
                                  className="h-10 px-5 rounded-xl bg-red-500 hover:bg-red-400 text-white font-bold text-xs shadow-md transition flex items-center justify-center cursor-pointer disabled:opacity-50"
                                >
                                  {loadingAppId === app.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    'Submit Rejection'
                                  )}
                                </button>
                                <button
                                  onClick={() => {
                                    setShowDenyInputId(null);
                                    setDenyReason('');
                                  }}
                                  className="h-10 px-5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-bold text-xs transition cursor-pointer"
                                >
                                  Cancel
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
                                    Accept
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => setShowDenyInputId(app.id)}
                                disabled={loadingAppId !== null}
                                className="h-10 px-5 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                              >
                                <X className="h-4 w-4" />
                                Deny
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
      ) : (
        /* Donators management tab */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Character Search List */}
          <div className="md:col-span-1 space-y-4">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Character Name..."
                className="w-full h-11 border border-zinc-800 rounded-xl pl-10 pr-4 text-xs font-semibold focus:border-amber-500 focus:outline-none bg-zinc-950 text-white transition"
              />
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-550" />
            </div>

            <div className="space-y-2 max-h-[350px] overflow-y-auto">
              {searching && (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
                </div>
              )}

              {!searching && searchResults.length === 0 && searchQuery.length >= 2 && (
                <p className="text-xs text-zinc-500 text-center py-6">No characters found.</p>
              )}

              {!searching && searchQuery.length < 2 && (
                <p className="text-xs text-zinc-500 text-center py-6">Type at least 2 characters to search.</p>
              )}

              {searchResults.map((char) => (
                <button
                  key={char.ID}
                  onClick={() => {
                    setSelectedChar(char);
                    setSelectedLevel(char.DonateRank);
                    setDonatorSuccessMsg('');
                    setDonatorErrorMsg('');
                  }}
                  className={`w-full text-left p-3.5 rounded-xl border text-xs flex items-center justify-between transition ${
                    selectedChar?.ID === char.ID
                      ? 'border-amber-500/50 bg-amber-500/5 text-white'
                      : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700 text-zinc-300'
                  }`}
                >
                  <span className="font-bold flex items-center gap-2">
                    <User className="h-4 w-4 text-zinc-500" />
                    {char.char_name.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] font-bold text-amber-400">
                    {char.DonateRank > 0 ? `Level ${char.DonateRank}` : 'None'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Form edit donator */}
          <div className="md:col-span-2">
            {selectedChar ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-amber-400 text-sm">
                    {selectedChar.char_name[0]}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm sm:text-base">
                      Set Donator for Character: {selectedChar.char_name.replace('_', ' ')}
                    </h4>
                    <p className="text-[10px] text-zinc-500 mt-0.5">
                      Character ID: <span className="font-semibold text-zinc-300">{selectedChar.ID}</span>
                    </p>
                  </div>
                </div>

                <div className="my-2 h-px bg-white/10" />

                {donatorSuccessMsg && (
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs text-emerald-400 font-semibold">
                    <CheckCircle className="h-5 w-5 flex-shrink-0 text-emerald-500" />
                    <span>{donatorSuccessMsg}</span>
                  </div>
                )}

                {donatorErrorMsg && (
                  <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-xs text-red-500 font-semibold">
                    <ShieldAlert className="h-5 w-5 flex-shrink-0 text-red-500" />
                    <span>{donatorErrorMsg}</span>
                  </div>
                )}

                <form onSubmit={handleSetDonator} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 mb-2">
                      Donator Package Level
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: 'None (Level 0)', val: 0 },
                        { label: 'Bronze (Level 1)', val: 1 },
                        { label: 'Silver (Level 2)', val: 2 },
                        { label: 'Gold (Level 3)', val: 3 },
                      ].map((pkg) => (
                        <button
                          key={pkg.val}
                          type="button"
                          onClick={() => setSelectedLevel(pkg.val)}
                          className={`py-3 rounded-xl border text-[10px] font-bold transition flex flex-col items-center justify-center gap-1.5 ${
                            selectedLevel === pkg.val
                              ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                              : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700'
                          }`}
                        >
                          <Gem className={`h-4 w-4 ${selectedLevel === pkg.val ? 'text-amber-400 animate-pulse' : 'text-zinc-500'}`} />
                          {pkg.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedLevel > 0 && (
                    <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-200">
                      <div>
                        <label className="block text-xs font-bold text-zinc-400 mb-2">
                          Duration (Days)
                        </label>
                        <select
                          value={durationDays}
                          onChange={(e) => setDurationDays(parseInt(e.target.value))}
                          className="w-full h-11 border border-zinc-850 rounded-xl px-4 text-xs font-semibold focus:border-amber-500 focus:outline-none bg-zinc-900 text-white"
                        >
                          <option value={7}>7 Days (1 Week)</option>
                          <option value={14}>14 Days (2 Weeks)</option>
                          <option value={30}>30 Days (1 Month)</option>
                          <option value={60}>60 Days (2 Months)</option>
                          <option value={90}>90 Days (3 Months)</option>
                          <option value={180}>180 Days (6 Months)</option>
                          <option value={365}>365 Days (1 Year)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-400 mb-2">
                          Expiration Preview
                        </label>
                        <div className="h-11 border border-zinc-850 rounded-xl bg-zinc-900/50 px-4 text-xs flex items-center gap-2 font-semibold text-zinc-400">
                          <Clock className="h-4 w-4 text-zinc-500" />
                          {new Date(new Date().getTime() + durationDays * 86400000).toLocaleDateString('en-US', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={updatingDonator}
                      className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {updatingDonator ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          Update Donator Status
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="h-full rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/10 flex flex-col items-center justify-center py-20 text-center">
                <Gem className="h-12 w-12 text-zinc-650 mb-4" />
                <h4 className="text-white font-bold mb-1">Select a Character</h4>
                <p className="text-zinc-500 text-xs max-w-xs leading-relaxed">
                  Search for a character name on the left side, then select it to view or change its donator status.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
