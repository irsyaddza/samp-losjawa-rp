'use client';

import { useState, useEffect, useRef } from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import {
  Users,
  UserPlus,
  Check,
  X,
  UserX,
  Search,
  ArrowLeft,
  Gamepad2,
  Clock,
  ShieldCheck,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface Character {
  id: number;
  name: string;
  level: number;
  online: boolean;
}

interface ActiveFriend {
  requestId: number;
  friendId: number;
  friendUsername: string;
  isOnline: boolean;
  characters: Character[];
}

interface IncomingRequest {
  requestId: number;
  senderId: number;
  senderUsername: string;
}

interface OutgoingRequest {
  requestId: number;
  targetId: number;
  targetUsername: string;
}

interface SearchHintResult {
  id: number;
  username: string;
  characterCount: number;
  sampleCharacters: string | null;
  status: 'friend' | 'pending_outgoing' | 'pending_incoming' | 'none';
}

interface FriendsClientProps {
  navSession: {
    username: string;
    email?: string;
    adminLevel?: number;
  } | null;
}

export default function FriendsClient({ navSession }: FriendsClientProps) {
  const [activeFriends, setActiveFriends] = useState<ActiveFriend[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<IncomingRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<OutgoingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchUsername, setSearchUsername] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'friends' | 'pending' | 'add'>('friends');

  // Hint search states
  const [hints, setHints] = useState<SearchHintResult[]>([]);
  const [hintLoading, setHintLoading] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const hintContainerRef = useRef<HTMLDivElement>(null);
  const skipHintSearchRef = useRef(false);

  async function fetchFriendsData() {
    try {
      const res = await fetch('/api/friends');
      if (res.ok) {
        const data = await res.json();
        setActiveFriends(data.active || []);
        setIncomingRequests(data.incoming || []);
        setOutgoingRequests(data.outgoing || []);
      }
    } catch (err) {
      console.error('Failed to load friends:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetch('/api/friends')
      .then((res) => res.ok ? res.json() : Promise.reject())
      .then((data) => {
        if (!cancelled) {
          setActiveFriends(data.active || []);
          setIncomingRequests(data.incoming || []);
          setOutgoingRequests(data.outgoing || []);
        }
      })
      .catch((err) => console.error('Failed to load friends:', err))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Debounced player account search for hints
  useEffect(() => {
    if (skipHintSearchRef.current) {
      skipHintSearchRef.current = false;
      return;
    }

    const trimmed = searchUsername.trim();
    if (!trimmed || activeTab !== 'add') return;

    let cancelled = false;
    const timeout = setTimeout(async () => {
      setHintLoading(true);
      try {
        const res = await fetch(`/api/accounts/search?q=${encodeURIComponent(trimmed)}`);
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          setHints(data.results || []);
          setShowHints(true);
        } else {
          setHints([]);
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to search accounts:', err);
        setHints([]);
      } finally {
        if (!cancelled) setHintLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [searchUsername, activeTab]);

  // Handle click outside hint dropdown to close it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        hintContainerRef.current &&
        !hintContainerRef.current.contains(event.target as Node)
      ) {
        setShowHints(false);
        setSelectedIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelectHint(hint: SearchHintResult) {
    skipHintSearchRef.current = true;
    setSearchUsername(hint.username);
    setShowHints(false);
    setSelectedIndex(-1);
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showHints || hints.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < hints.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : hints.length - 1));
    } else if (e.key === 'Enter' && selectedIndex >= 0 && selectedIndex < hints.length) {
      e.preventDefault();
      handleSelectHint(hints[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowHints(false);
      setSelectedIndex(-1);
    }
  }

  async function handleSendRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!searchUsername.trim()) return;

    setShowHints(false);
    setActionLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', targetUsername: searchUsername }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: data.message });
        setSearchUsername('');
        setHints([]);
        fetchFriendsData();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to send request' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An unexpected error occurred.' });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAction(action: 'accept' | 'remove' | 'cancel' | 'decline', requestId: number) {
    setActionLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, requestId }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: data.message });
        fetchFriendsData();
      } else {
        setMessage({ type: 'error', text: data.error || 'Action failed.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An unexpected error occurred.' });
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#09090b] pt-20 pb-12">
      <Navbar session={navSession} />

      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 max-w-5xl">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 mb-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Dashboard
          </Link>
          <span className="text-zinc-700 text-xs">/</span>
          <span className="text-xs text-zinc-400 font-medium">Friends</span>
        </div>

        {/* Header Title Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-gradient-to-l from-amber-500/5 to-transparent pointer-events-none" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white">Friends & Social List</h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Connect with player friends, view online statuses, and manage UCP friend requests.
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('add')}
            className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-black hover:bg-amber-400 transition shrink-0"
          >
            <UserPlus className="h-4 w-4" />
            Add New Friend
          </button>
        </div>

        {/* Toast / Status Alert */}
        {message && (
          <div
            className={`mb-6 rounded-xl border p-4 text-xs flex items-center justify-between ${
              message.type === 'success'
                ? 'border-green-500/20 bg-green-500/10 text-green-400'
                : 'border-red-500/20 bg-red-500/10 text-red-400'
            }`}
          >
            <div className="flex items-center gap-2">
              {message.type === 'success' ? <ShieldCheck className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <span>{message.text}</span>
            </div>
            <button onClick={() => setMessage(null)} className="text-zinc-500 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-zinc-850 pb-3 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('friends')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition ${
              activeTab === 'friends'
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Users className="h-4 w-4" />
            Active Friends ({activeFriends.length})
          </button>

          <button
            onClick={() => setActiveTab('pending')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition relative ${
              activeTab === 'pending'
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Clock className="h-4 w-4" />
            Pending Requests ({incomingRequests.length + outgoingRequests.length})
            {incomingRequests.length > 0 && (
              <span className="ml-1 rounded-full bg-amber-500 text-black px-1.5 py-0.2 text-[9px] font-black">
                {incomingRequests.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('add')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition ${
              activeTab === 'add'
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <UserPlus className="h-4 w-4" />
            Send Friend Request
          </button>
        </div>

        {/* Main Content Area */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-zinc-500 text-xs gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
            Loading friends list...
          </div>
        ) : (
          <div>
            {/* Tab 1: Active Friends */}
            {activeTab === 'friends' && (
              <div>
                {activeFriends.length === 0 ? (
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-12 text-center">
                    <Users className="h-12 w-12 text-zinc-650 mx-auto mb-3" />
                    <h3 className="text-white font-bold mb-1">No Active Friends Yet</h3>
                    <p className="text-zinc-500 text-xs max-w-sm mx-auto mb-6">
                      You haven&apos;t added any player friends yet. Search for a UCP username to connect!
                    </p>
                    <button
                      onClick={() => setActiveTab('add')}
                      className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-black hover:bg-amber-400 transition"
                    >
                      <UserPlus className="h-4 w-4" />
                      Add First Friend
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeFriends.map((friend) => (
                      <div
                        key={friend.requestId}
                        className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 flex flex-col justify-between space-y-4 hover:border-zinc-700 transition"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-amber-500 text-sm">
                              {friend.friendUsername[0].toUpperCase()}
                            </div>
                            <div>
                              <h4 className="font-bold text-white text-sm">{friend.friendUsername}</h4>
                              <span className="text-[10px] text-zinc-500 block">UCP Account</span>
                            </div>
                          </div>

                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              friend.isOnline
                                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
                            }`}
                          >
                            {friend.isOnline ? 'In-Game Online' : 'Offline'}
                          </span>
                        </div>

                        {/* Character List */}
                        <div className="border-t border-zinc-900 pt-3">
                          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-2 font-semibold">
                            Associated Characters ({friend.characters.length})
                          </span>
                          <div className="space-y-1.5">
                            {friend.characters.map((c) => (
                              <div
                                key={c.id}
                                className="flex justify-between items-center text-xs py-1 px-2 rounded-lg bg-zinc-900/40"
                              >
                                <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                                  <Gamepad2 className="h-3 w-3 text-amber-500" />
                                  {c.name}
                                </span>
                                <span className="text-[10px] text-zinc-500">Level {c.level}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="border-t border-zinc-900 pt-3 flex justify-end">
                          <button
                            disabled={actionLoading}
                            onClick={() => handleAction('remove', friend.requestId)}
                            className="inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 font-semibold transition"
                          >
                            <UserX className="h-3.5 w-3.5" />
                            Remove Friend
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Pending Requests */}
            {activeTab === 'pending' && (
              <div className="space-y-8">
                {/* Incoming Requests */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                    <UserPlus className="h-4.5 w-4.5 text-amber-500" />
                    Incoming Friend Requests ({incomingRequests.length})
                  </h3>

                  {incomingRequests.length === 0 ? (
                    <p className="text-xs text-zinc-500 py-4">No incoming friend requests.</p>
                  ) : (
                    <div className="space-y-3">
                      {incomingRequests.map((req) => (
                        <div
                          key={req.requestId}
                          className="flex justify-between items-center p-3 rounded-xl border border-zinc-850 bg-zinc-900/20 text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-amber-400 text-xs">
                              {req.senderUsername[0].toUpperCase()}
                            </div>
                            <div>
                              <span className="font-bold text-white block">{req.senderUsername}</span>
                              <span className="text-[10px] text-zinc-500">Wants to add you as a friend</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              disabled={actionLoading}
                              onClick={() => handleAction('accept', req.requestId)}
                              className="inline-flex items-center gap-1 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1.5 text-xs font-bold hover:bg-green-500/20 transition"
                            >
                              <Check className="h-3.5 w-3.5" />
                              Accept
                            </button>
                            <button
                              disabled={actionLoading}
                              onClick={() => handleAction('decline', req.requestId)}
                              className="inline-flex items-center gap-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1.5 text-xs font-bold hover:bg-red-500/20 transition"
                            >
                              <X className="h-3.5 w-3.5" />
                              Decline
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Outgoing Requests */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Clock className="h-4.5 w-4.5 text-amber-500" />
                    Outgoing Sent Requests ({outgoingRequests.length})
                  </h3>

                  {outgoingRequests.length === 0 ? (
                    <p className="text-xs text-zinc-500 py-4">No pending outgoing friend requests.</p>
                  ) : (
                    <div className="space-y-3">
                      {outgoingRequests.map((req) => (
                        <div
                          key={req.requestId}
                          className="flex justify-between items-center p-3 rounded-xl border border-zinc-850 bg-zinc-900/20 text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-zinc-400 text-xs">
                              {req.targetUsername[0].toUpperCase()}
                            </div>
                            <div>
                              <span className="font-bold text-white block">{req.targetUsername}</span>
                              <span className="text-[10px] text-zinc-500">Waiting for response</span>
                            </div>
                          </div>

                          <button
                            disabled={actionLoading}
                            onClick={() => handleAction('cancel', req.requestId)}
                            className="inline-flex items-center gap-1 rounded-lg bg-zinc-900 text-zinc-400 border border-zinc-800 px-3 py-1.5 text-xs font-bold hover:text-white transition"
                          >
                            <X className="h-3.5 w-3.5" />
                            Cancel Request
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 3: Send Request Form */}
            {activeTab === 'add' && (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8 max-w-xl mx-auto">
                <div className="text-center mb-6">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto mb-3">
                    <UserPlus className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Send Friend Request</h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Enter the exact master UCP Username of the player you want to connect with.
                  </p>
                </div>

                <form onSubmit={handleSendRequest} className="space-y-4">
                  <div ref={hintContainerRef} className="relative">
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
                      Target UCP Username
                    </label>
                    <div className="relative">
                      <Search className="h-4 w-4 absolute left-3.5 top-3.5 text-zinc-500" />
                      <input
                        type="text"
                        required
                        value={searchUsername}
                        onChange={(e) => {
                          const value = e.target.value;
                          setSearchUsername(value);
                          if (!value.trim()) {
                            setHints([]);
                            setShowHints(false);
                            setSelectedIndex(-1);
                            setHintLoading(false);
                          }
                        }}
                        onFocus={() => {
                          if (hints.length > 0 && searchUsername.trim()) {
                            setShowHints(true);
                          }
                        }}
                        onKeyDown={handleInputKeyDown}
                        placeholder="e.g. JohnDoe (type for suggestions...)"
                        autoComplete="off"
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-900 pl-10 pr-10 py-3 text-xs font-semibold text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none transition"
                      />
                      <div className="absolute right-3.5 top-3.5 flex items-center gap-1.5">
                        {hintLoading && <Loader2 className="h-4 w-4 animate-spin text-amber-500" />}
                        {!hintLoading && searchUsername.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setSearchUsername('');
                              setHints([]);
                              setShowHints(false);
                              setSelectedIndex(-1);
                            }}
                            className="text-zinc-500 hover:text-zinc-300 transition"
                            title="Clear"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Hint Dropdown */}
                    {showHints && searchUsername.trim().length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-2 z-30 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/95 backdrop-blur-md shadow-2xl">
                        <div className="px-3 py-2 border-b border-zinc-800/80 bg-zinc-950/60 flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                            Account Suggestions
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            Use ↑↓ to navigate, Enter to select
                          </span>
                        </div>

                        {hints.length === 0 && !hintLoading ? (
                          <div className="p-4 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
                            <AlertCircle className="h-4 w-4 text-zinc-500" />
                            No account found matching &quot;{searchUsername}&quot;
                          </div>
                        ) : (
                          <div className="max-h-60 overflow-y-auto divide-y divide-zinc-800/40">
                            {hints.map((hint, idx) => {
                              const isSelected = idx === selectedIndex;
                              return (
                                <button
                                  key={hint.id}
                                  type="button"
                                  onClick={() => handleSelectHint(hint)}
                                  onMouseEnter={() => setSelectedIndex(idx)}
                                  className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between transition group ${
                                    isSelected
                                      ? 'bg-amber-500/10 text-white'
                                      : 'hover:bg-zinc-800/60 text-zinc-200'
                                  }`}
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div
                                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs uppercase shrink-0 transition ${
                                        isSelected
                                          ? 'bg-amber-500 text-black font-extrabold shadow-sm'
                                          : 'bg-zinc-800 text-amber-400 border border-zinc-700/50'
                                      }`}
                                    >
                                      {hint.username.charAt(0)}
                                    </div>
                                    <div className="truncate">
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-xs text-white group-hover:text-amber-400 transition">
                                          {hint.username}
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                                        {hint.sampleCharacters ? (
                                          <span>
                                            Char: <span className="text-zinc-300 font-medium">{hint.sampleCharacters}</span>
                                            {hint.characterCount > 2 ? ` (+${hint.characterCount - 2} more)` : ''}
                                          </span>
                                        ) : hint.characterCount > 0 ? (
                                          <span>{hint.characterCount} character(s)</span>
                                        ) : (
                                          <span className="text-zinc-500 italic">No characters created</span>
                                        )}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="shrink-0 ml-3">
                                    {hint.status === 'friend' && (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                                        <Check className="h-3 w-3" />
                                        Friend
                                      </span>
                                    )}
                                    {hint.status === 'pending_outgoing' && (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-amber-400">
                                        <Clock className="h-3 w-3" />
                                        Request Sent
                                      </span>
                                    )}
                                    {hint.status === 'pending_incoming' && (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 border border-sky-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-sky-400">
                                        <UserPlus className="h-3 w-3" />
                                        Pending Accept
                                      </span>
                                    )}
                                    {hint.status === 'none' && (
                                      <span
                                        className={`rounded-md px-2 py-0.5 text-[10px] font-medium border transition ${
                                          isSelected
                                            ? 'bg-amber-500 text-black border-amber-400 font-bold'
                                            : 'bg-zinc-800 text-zinc-400 border-zinc-700/60 group-hover:border-zinc-500 group-hover:text-zinc-200'
                                        }`}
                                      >
                                        Select
                                      </span>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={actionLoading || !searchUsername.trim()}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-xs font-bold text-black hover:bg-amber-400 transition disabled:opacity-50"
                  >
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                    Send Friend Request
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
