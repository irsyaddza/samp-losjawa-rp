'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, MailOpen, Trash2, Calendar, User, ChevronDown, ChevronUp, Plus, Send, X, Search, Loader2 } from 'lucide-react';

interface Notification {
  id: number;
  title: string;
  body: string;
  time: string;
  read: boolean;
  sender: string;
  recipient?: string;
}

interface AccountHint {
  id: number;
  username: string;
  characterCount: number;
  sampleCharacters: string | null;
}

interface InboxClientProps {
  initialNotifications: Notification[];
  initialSentMessages: Notification[];
  currentUsername: string;
}

export default function InboxClient({ initialNotifications, initialSentMessages, currentUsername }: InboxClientProps) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [sentMessages, setSentMessages] = useState<Notification[]>(initialSentMessages);
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent'>('inbox');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  
  // Compose Message Form State
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [toUsername, setToUsername] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Recipient autocomplete
  const [hints, setHints] = useState<AccountHint[]>([]);
  const [hintLoading, setHintLoading] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const hintContainerRef = useRef<HTMLDivElement>(null);
  const skipHintSearchRef = useRef(false);

  // Debounced UCP account search for the recipient field
  useEffect(() => {
    if (!isComposeOpen) return;

    if (skipHintSearchRef.current) {
      skipHintSearchRef.current = false;
      return;
    }

    const trimmed = toUsername.trim();
    if (!trimmed) return;

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
      } catch (error) {
        if (cancelled) return;
        console.error('Failed to search accounts:', error);
        setHints([]);
      } finally {
        if (!cancelled) setHintLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [toUsername, isComposeOpen]);

  // Close the suggestion list when clicking outside of it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (hintContainerRef.current && !hintContainerRef.current.contains(event.target as Node)) {
        setShowHints(false);
        setSelectedIndex(-1);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function selectHint(hint: AccountHint) {
    skipHintSearchRef.current = true;
    setToUsername(hint.username);
    setShowHints(false);
    setSelectedIndex(-1);
  }

  function handleHintKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showHints || hints.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < hints.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : hints.length - 1));
    } else if (e.key === 'Enter' && selectedIndex >= 0 && selectedIndex < hints.length) {
      e.preventDefault();
      selectHint(hints[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowHints(false);
      setSelectedIndex(-1);
    }
  }

  function closeCompose() {
    setIsComposeOpen(false);
    setErrorMsg('');
    setSuccessMsg('');
    setShowHints(false);
    setSelectedIndex(-1);
  }

  const toggleExpand = async (id: number, isRead: boolean) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      
      // If it is not read yet, mark it as read
      if (!isRead) {
        try {
          const res = await fetch(`/api/user/notifications?id=${id}`, {
            method: 'PATCH',
          });
          if (res.ok) {
            setNotifications(prev =>
              prev.map(n => (n.id === id ? { ...n, read: true } : n))
            );
          }
        } catch (error) {
          console.error('Failed to mark notification as read:', error);
        }
      }
    }
  };

  const deleteNotification = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation(); // Prevent toggling expansion
    if (!confirm('Are you sure you want to delete this message?')) return;

    try {
      const res = await fetch(`/api/user/notifications?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
        if (expandedId === id) {
          setExpandedId(null);
        }
      } else {
        alert('Failed to delete message.');
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
      alert('A network error occurred.');
    }
  };

  const handleComposeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsSending(true);

    if (!toUsername.trim() || !title.trim() || !body.trim()) {
      setErrorMsg('Please fill in all fields.');
      setIsSending(false);
      return;
    }

    try {
      const res = await fetch('/api/user/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toUsername, title, body }),
      });

      const data = await res.json();

      if (res.ok) {
        setSentMessages(prev => [
          {
            id: -Date.now(),
            title,
            body,
            time: new Date().toISOString(),
            read: true,
            sender: currentUsername,
            recipient: toUsername.trim(),
          },
          ...prev,
        ]);
        setActiveTab('sent');
        setSuccessMsg('Message sent successfully!');
        setToUsername('');
        setTitle('');
        setBody('');
        setTimeout(() => {
          closeCompose();
        }, 1500);
      } else {
        setErrorMsg(data.error || 'Failed to send message.');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setErrorMsg('A network error occurred.');
    } finally {
      setIsSending(false);
    }
  };

  const isSentTab = activeTab === 'sent';
  const visibleMessages = isSentTab ? sentMessages : notifications;

  return (
    <div>
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 mb-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Dashboard
        </Link>
        <span className="text-zinc-650 text-xs">/</span>
        <span className="text-xs text-zinc-500 font-medium">Inbox</span>
      </div>

      {/* Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <Mail className="h-6 w-6 text-amber-500" />
            Message Inbox
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Notifications, incoming messages, and your sent message history.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsComposeOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black px-4 py-2.5 text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Compose Message
          </button>
          <div className="bg-zinc-950 px-4 py-2.5 rounded-xl border border-zinc-800 flex items-center gap-2 text-xs h-[38px]">
            <span className="text-zinc-450 font-medium">
              Unread:{' '}
              <strong className="text-amber-500 font-black">
                {notifications.filter(n => !n.read).length}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-850 pb-3 mb-6">
        <button
          onClick={() => {
            setActiveTab('inbox');
            setExpandedId(null);
          }}
          className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold transition ${
            activeTab === 'inbox'
              ? 'bg-amber-500/15 text-amber-400 border-amber-500/20'
              : 'border-transparent text-zinc-400 hover:bg-zinc-900 hover:text-white'
          }`}
        >
          <Mail className="h-4 w-4" />
          Inbox ({notifications.length})
        </button>
        <button
          onClick={() => {
            setActiveTab('sent');
            setExpandedId(null);
          }}
          className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold transition ${
            activeTab === 'sent'
              ? 'bg-amber-500/15 text-amber-400 border-amber-500/20'
              : 'border-transparent text-zinc-400 hover:bg-zinc-900 hover:text-white'
          }`}
        >
          <Send className="h-4 w-4" />
          Sent ({sentMessages.length})
        </button>
      </div>

      {/* Compose Message Modal */}
      {isComposeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Send className="h-4.5 w-4.5 text-amber-500" />
                Compose New Message
              </h3>
              <button
                onClick={closeCompose}
                className="text-zinc-400 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleComposeSubmit} className="space-y-4">
              {errorMsg && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs font-semibold text-red-400">
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs font-semibold text-emerald-400">
                  {successMsg}
                </div>
              )}

              <div ref={hintContainerRef} className="relative">
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  Recipient UCP Account Name
                </label>
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    value={toUsername}
                    onChange={e => {
                      const value = e.target.value;
                      setToUsername(value);
                      if (!value.trim()) {
                        setHints([]);
                        setShowHints(false);
                        setSelectedIndex(-1);
                        setHintLoading(false);
                      }
                    }}
                    onFocus={() => {
                      if (hints.length > 0 && toUsername.trim()) {
                        setShowHints(true);
                      }
                    }}
                    onKeyDown={handleHintKeyDown}
                    placeholder="Enter target UCP username (e.g. JohnDoe)"
                    autoComplete="off"
                    className="w-full rounded-xl bg-zinc-900 border border-zinc-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 pl-10 pr-10 py-3 text-xs text-white placeholder-zinc-650 transition outline-none font-semibold"
                    disabled={isSending}
                  />
                  {hintLoading && (
                    <Loader2 className="h-4 w-4 animate-spin text-amber-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  )}
                </div>

                {showHints && toUsername.trim().length > 0 && (
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
                      <div className="p-4 text-center text-xs text-zinc-500">
                        No account found matching &quot;{toUsername}&quot;
                      </div>
                    ) : (
                      <div className="max-h-56 overflow-y-auto divide-y divide-zinc-800/40">
                        {hints.map((hint, idx) => {
                          const isSelected = idx === selectedIndex;
                          return (
                            <button
                              key={hint.id}
                              type="button"
                              onClick={() => selectHint(hint)}
                              onMouseEnter={() => setSelectedIndex(idx)}
                              className={`w-full px-3.5 py-2.5 text-left flex items-center gap-3 transition group ${
                                isSelected ? 'bg-amber-500/10' : 'hover:bg-zinc-800/60'
                              }`}
                            >
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
                                <span className="font-bold text-xs text-white group-hover:text-amber-400 transition">
                                  {hint.username}
                                </span>
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
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  Message Subject / Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Subject or message title"
                  className="w-full rounded-xl bg-zinc-900 border border-zinc-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 px-4 py-3 text-xs text-white placeholder-zinc-650 transition outline-none font-semibold"
                  disabled={isSending}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  Message Body
                </label>
                <textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  placeholder="Write your complete message here..."
                  rows={5}
                  className="w-full rounded-xl bg-zinc-900 border border-zinc-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 px-4 py-3 text-xs text-white placeholder-zinc-650 transition outline-none font-medium leading-relaxed"
                  disabled={isSending}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeCompose}
                  className="px-4 py-2.5 rounded-xl border border-zinc-850 hover:bg-zinc-900 text-zinc-400 hover:text-white text-xs font-bold transition"
                  disabled={isSending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black transition disabled:opacity-50"
                  disabled={isSending}
                >
                  <Send className="h-3.5 w-3.5" />
                  {isSending ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Message List */}
      {visibleMessages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-850 bg-zinc-950/40 p-12 text-center">
          {isSentTab ? (
            <Send className="h-10 w-10 text-zinc-650 mx-auto mb-3" />
          ) : (
            <MailOpen className="h-10 w-10 text-zinc-650 mx-auto mb-3" />
          )}
          <h3 className="text-sm font-bold text-zinc-300">
            {isSentTab ? 'No Sent Messages' : 'Inbox is Empty'}
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            {isSentTab
              ? 'Messages you send to other players will appear here.'
              : 'You have no incoming messages at this time. Click "Compose Message" to send a message to another player.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleMessages.map(notification => {
            const isExpanded = expandedId === notification.id;
            const isRead = isSentTab || notification.read;

            return (
              <div
                key={notification.id}
                onClick={() => toggleExpand(notification.id, isSentTab ? true : notification.read)}
                className={`rounded-xl border transition cursor-pointer select-none overflow-hidden ${
                  isExpanded
                    ? 'border-zinc-700 bg-zinc-900/40'
                    : isRead
                    ? 'border-zinc-850 bg-zinc-950/30 hover:border-zinc-800'
                    : 'border-amber-500/30 bg-amber-500/[0.02] hover:border-amber-500/50'
                }`}
              >
                {/* Header Section */}
                <div className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 border ${
                        isRead
                          ? 'bg-zinc-900/80 border-zinc-800 text-zinc-500'
                          : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                      }`}
                    >
                      {isSentTab ? (
                        <Send className="h-4.5 w-4.5" />
                      ) : notification.read ? (
                        <MailOpen className="h-4.5 w-4.5" />
                      ) : (
                        <Mail className="h-4.5 w-4.5 animate-pulse" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4
                        className={`text-xs font-bold truncate ${
                          isRead ? 'text-zinc-350' : 'text-white'
                        }`}
                      >
                        {notification.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-500">
                        <span className="flex items-center gap-1 font-medium">
                          <User className="h-3 w-3 shrink-0" />
                          {isSentTab ? `To: ${notification.recipient}` : `From: ${notification.sender}`}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 shrink-0" />
                          {new Date(notification.time).toLocaleString('en-US', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!isSentTab && (
                      <button
                        onClick={e => deleteNotification(e, notification.id)}
                        className="p-1.5 rounded-lg border border-transparent hover:border-red-500/20 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition cursor-pointer"
                        title="Delete message"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                    <div className="text-zinc-500">
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Body Section (Expanded) */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-zinc-900">
                    <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap font-medium">
                      {notification.body}
                    </p>
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
