'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { JSONContent } from '@tiptap/core';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Loader2,
  Mail,
  PenLine,
  Reply,
  Search,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import MessageBody from '@/components/mailbox/MessageBody';
import RecipientPicker from '@/components/mailbox/RecipientPicker';
import { messagePreview } from '@/lib/message-format';
import type { MailboxBox, MailboxMessage, MailboxPage } from '@/lib/mailbox';

const ComposeEditor = dynamic(() => import('@/components/mailbox/ComposeEditor'), {
  ssr: false,
  loading: () => (
    <div className="h-40 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900/40" />
  ),
});

interface MailboxClientProps {
  initialData: MailboxPage;
  currentUsername: string;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatFullDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MailboxClient({ initialData, currentUsername }: MailboxClientProps) {
  const [box, setBox] = useState<MailboxBox>('inbox');
  const [messages, setMessages] = useState<MailboxMessage[]>(initialData.messages);
  const [total, setTotal] = useState(initialData.total);
  const [page, setPage] = useState(initialData.page);
  const [pageSize, setPageSize] = useState(initialData.pageSize);
  const [unread, setUnread] = useState(initialData.unread);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState('');

  const [composeOpen, setComposeOpen] = useState(false);
  const [toUsername, setToUsername] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState<JSONContent | null>(null);
  const [bodyIsEmpty, setBodyIsEmpty] = useState(true);
  const [formError, setFormError] = useState('');
  const [sending, setSending] = useState(false);
  const requestIdRef = useRef(0);
  const mountedRef = useRef(false);

  const selectedMessage = messages.find((message) => message.id === selectedId) || null;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const announceUpdate = useCallback(() => {
    window.dispatchEvent(new Event('notifications-updated'));
  }, []);

  const handleEditorChange = useCallback((json: JSONContent, isEmpty: boolean) => {
    setBody(json);
    setBodyIsEmpty(isEmpty);
  }, []);

  const loadMailbox = useCallback(async (targetBox: MailboxBox, targetPage: number, targetQuery: string) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);

    try {
      const params = new URLSearchParams({
        box: targetBox,
        page: String(targetPage),
      });
      if (targetQuery) params.set('q', targetQuery);

      const response = await fetch(`/api/user/mailbox?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to load mailbox.');

      const data: MailboxPage = await response.json();
      if (requestId !== requestIdRef.current) return;

      setMessages(data.messages);
      setTotal(data.total);
      setPage(data.page);
      setPageSize(data.pageSize);
      setUnread(data.unread);
      setSelectedId((current) =>
        current !== null && data.messages.some((message) => message.id === current) ? current : null
      );
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      console.error('Failed to load mailbox:', error);
      setNotice('Failed to load messages. Please try again.');
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }

    void loadMailbox(box, page, debouncedQuery);
  }, [box, page, debouncedQuery, loadMailbox]);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(timeout);
  }, [notice]);

  function changeBox(nextBox: MailboxBox) {
    if (nextBox === box) return;

    setBox(nextBox);
    setPage(1);
    setQuery('');
    setDebouncedQuery('');
    setMessages([]);
    setTotal(0);
    setSelectedId(null);
    setLoading(true);
  }

  function handleSearch(value: string) {
    setQuery(value);
    setPage(1);
  }

  async function openMessage(message: MailboxMessage) {
    setSelectedId(message.id);

    if (box !== 'inbox' || message.isRead) return;

    setMessages((current) =>
      current.map((item) => (item.id === message.id ? { ...item, isRead: true } : item))
    );
    setUnread((current) => Math.max(0, current - 1));

    try {
      const response = await fetch(`/api/user/mailbox/${message.id}`, { method: 'PATCH' });
      if (!response.ok) throw new Error('Failed to mark message as read.');
      announceUpdate();
    } catch (error) {
      console.error('Failed to mark message as read:', error);
      setMessages((current) =>
        current.map((item) => (item.id === message.id ? { ...item, isRead: false } : item))
      );
      setUnread((current) => current + 1);
    }
  }

  async function deleteMessage() {
    if (!selectedMessage || deleting) return;
    if (!window.confirm('Delete this message? This cannot be undone.')) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/user/mailbox/${selectedMessage.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete message.');

      const remaining = messages.filter((message) => message.id !== selectedMessage.id);
      setMessages(remaining);
      setTotal((current) => Math.max(0, current - 1));
      setSelectedId(null);
      setNotice('Message deleted.');
      announceUpdate();

      if (remaining.length === 0 && page > 1) {
        setPage(page - 1);
      } else {
        await loadMailbox(box, page, debouncedQuery);
      }
    } catch (error) {
      console.error('Failed to delete message:', error);
      setNotice('Failed to delete the message. Please try again.');
    } finally {
      setDeleting(false);
    }
  }

  function openCompose(to = '', initialSubject = '') {
    setToUsername(to);
    setSubject(initialSubject);
    setBody(null);
    setBodyIsEmpty(true);
    setFormError('');
    setComposeOpen(true);
  }

  function closeCompose() {
    if (sending) return;
    setComposeOpen(false);
    setFormError('');
  }

  function replyToMessage() {
    if (!selectedMessage) return;

    const recipient = box === 'inbox' ? selectedMessage.sender : selectedMessage.recipient;
    const replySubject = /^re:\s*/i.test(selectedMessage.subject)
      ? selectedMessage.subject
      : `Re: ${selectedMessage.subject}`;

    openCompose(recipient, replySubject);
  }

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');

    if (!toUsername.trim() || !subject.trim() || !body || bodyIsEmpty) {
      setFormError('Recipient, subject, and message are required.');
      return;
    }

    setSending(true);
    try {
      const response = await fetch('/api/user/mailbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toUsername, subject, body: JSON.stringify(body) }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setFormError(data.error || 'Failed to send message.');
        return;
      }

      setComposeOpen(false);
      setBody(null);
      setBodyIsEmpty(true);
      setNotice('Message sent.');
      announceUpdate();

      if (box === 'sent') {
        if (page === 1) {
          await loadMailbox('sent', 1, debouncedQuery);
        } else {
          setPage(1);
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setFormError('A network error occurred. Please try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      {notice ? (
        <div className="mb-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2 text-xs text-amber-300">
          {notice}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/50">
        <div className="grid min-h-[560px] grid-cols-1 lg:grid-cols-[190px_minmax(0,1fr)_minmax(0,1.25fr)]">
          <aside className="border-b border-zinc-800/80 p-3 lg:border-b-0 lg:border-r">
            <button
              type="button"
              onClick={() => openCompose()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-3 py-2.5 text-xs font-bold text-black transition hover:bg-amber-400"
            >
              <PenLine className="h-3.5 w-3.5" />
              Compose
            </button>

            <nav className="mt-3 grid grid-cols-2 gap-1 lg:grid-cols-1" aria-label="Mailbox folders">
              <button
                type="button"
                onClick={() => changeBox('inbox')}
                className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold transition ${
                  box === 'inbox'
                    ? 'bg-amber-500/10 text-amber-300'
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Inbox className="h-4 w-4" />
                  Inbox
                </span>
                {unread > 0 ? (
                  <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-black text-black">
                    {unread > 99 ? '99+' : unread}
                  </span>
                ) : null}
              </button>

              <button
                type="button"
                onClick={() => changeBox('sent')}
                className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold transition ${
                  box === 'sent'
                    ? 'bg-amber-500/10 text-amber-300'
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
                }`}
              >
                <Send className="h-4 w-4" />
                Sent
              </button>
            </nav>

            <p className="mt-4 hidden truncate border-t border-zinc-800/80 pt-3 text-[10px] text-zinc-600 lg:block">
              Signed in as <span className="text-zinc-400">{currentUsername}</span>
            </p>
          </aside>

          <section
            className={`min-w-0 border-b border-zinc-800/80 lg:border-b-0 lg:border-r ${
              selectedId !== null ? 'hidden lg:block' : 'block'
            }`}
          >
            <div className="border-b border-zinc-800/80 p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => handleSearch(event.target.value)}
                  placeholder="Search messages..."
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 py-2 pl-8 pr-8 text-xs text-white outline-none transition placeholder:text-zinc-600 focus:border-amber-500/40"
                />
                {loading ? (
                  <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-amber-500" />
                ) : null}
              </div>
            </div>

            <div className="max-h-[calc(70vh-8rem)] overflow-y-auto">
              {loading && messages.length === 0 ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
                </div>
              ) : messages.length === 0 ? (
                <div className="px-4 py-14 text-center">
                  <Mail className="mx-auto mb-3 h-9 w-9 text-zinc-700" />
                  <p className="text-sm font-semibold text-zinc-300">
                    {query ? 'No messages found' : box === 'inbox' ? 'Your inbox is empty' : 'No sent messages'}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {query
                      ? 'Try a different search.'
                      : box === 'inbox'
                        ? 'New messages from other UCP accounts will appear here.'
                        : 'Messages you send will appear here.'}
                  </p>
                </div>
              ) : (
                messages.map((message) => {
                  const counterpart = box === 'inbox' ? message.sender : message.recipient;

                  return (
                    <button
                      key={message.id}
                      type="button"
                      onClick={() => void openMessage(message)}
                      className={`flex w-full items-start gap-2 border-b border-zinc-800/60 px-3 py-3 text-left transition ${
                        selectedId === message.id
                          ? 'bg-amber-500/[0.07]'
                          : 'hover:bg-zinc-900/60'
                      }`}
                    >
                      <span
                        className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                          !message.isRead ? 'bg-amber-500' : 'bg-transparent'
                        }`}
                        aria-label={!message.isRead ? 'Unread' : undefined}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span
                            className={`truncate text-xs ${
                              !message.isRead ? 'font-bold text-white' : 'font-semibold text-zinc-300'
                            }`}
                          >
                            {counterpart}
                          </span>
                          <span className="shrink-0 text-[10px] text-zinc-600">
                            {formatDate(message.createdAt)}
                          </span>
                        </span>
                        <span
                          className={`mt-0.5 block truncate text-xs ${
                            !message.isRead ? 'font-semibold text-zinc-200' : 'text-zinc-400'
                          }`}
                        >
                          {message.subject}
                        </span>
                        <span className="mt-0.5 block line-clamp-2 text-[11px] leading-4 text-zinc-600">
                          {messagePreview(message.bodyText)}
                        </span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-zinc-800/80 px-3 py-2 text-[10px] text-zinc-500">
              <span>
                {total} message{total === 1 ? '' : 's'}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1 || loading}
                  className="rounded-md border border-zinc-800 p-1 text-zinc-400 transition hover:border-amber-500/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="min-w-12 text-center">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={page >= totalPages || loading}
                  className="rounded-md border border-zinc-800 p-1 text-zinc-400 transition hover:border-amber-500/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </section>

          <section className={`min-w-0 ${selectedId !== null ? 'block' : 'hidden lg:block'}`}>
            {selectedMessage ? (
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between gap-2 border-b border-zinc-800/80 p-3">
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-zinc-400 transition hover:bg-zinc-900 hover:text-white lg:hidden"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back
                  </button>
                  <div className="ml-auto flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={replyToMessage}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-2.5 py-1.5 text-[11px] font-bold text-zinc-300 transition hover:border-amber-500/30 hover:text-white"
                    >
                      <Reply className="h-3.5 w-3.5" />
                      Reply
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteMessage()}
                      disabled={deleting}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/[0.06] px-2.5 py-1.5 text-[11px] font-bold text-red-300 transition hover:border-red-500/40 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deleting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      Delete
                    </button>
                  </div>
                </div>

                <div className="max-h-[calc(70vh-4rem)] flex-1 overflow-y-auto p-4 sm:p-6">
                  <h2 className="break-words text-lg font-black leading-7 text-white">
                    {selectedMessage.subject}
                  </h2>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-500">
                    <span>
                      From <span className="font-semibold text-zinc-300">{selectedMessage.sender}</span>
                    </span>
                    <span>
                      To <span className="font-semibold text-zinc-300">{selectedMessage.recipient}</span>
                    </span>
                    <span>{formatFullDate(selectedMessage.createdAt)}</span>
                  </div>
                  <div className="mt-5 border-t border-zinc-800/80 pt-5">
                    <MessageBody body={selectedMessage.body} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-[320px] flex-col items-center justify-center px-6 text-center">
                <Mail className="mb-3 h-10 w-10 text-zinc-700" />
                <p className="text-sm font-semibold text-zinc-300">Select a message</p>
                <p className="mt-1 text-xs text-zinc-500">
                  Choose a message from the list to read it here.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>

      {composeOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeCompose();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="compose-title"
            className="flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/50 sm:rounded-2xl"
          >
            <div className="flex items-center justify-between border-b border-zinc-800/80 px-4 py-3">
              <h2 id="compose-title" className="text-sm font-bold text-white">
                New message
              </h2>
              <button
                type="button"
                onClick={closeCompose}
                disabled={sending}
                className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-900 hover:text-white disabled:opacity-50"
                aria-label="Close compose"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={sendMessage} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-zinc-500">From</label>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2.5 text-sm text-zinc-400">
                  {currentUsername}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-zinc-500">To</label>
                <RecipientPicker value={toUsername} onChange={setToUsername} disabled={sending} />
              </div>

              <div>
                <label htmlFor="mailbox-subject" className="mb-1 block text-[11px] font-semibold text-zinc-500">
                  Subject
                </label>
                <input
                  id="mailbox-subject"
                  type="text"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  maxLength={120}
                  disabled={sending}
                  placeholder="What is this about?"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-amber-500/40 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-zinc-500">
                  Message
                </label>
                <ComposeEditor
                  onChange={handleEditorChange}
                  onError={(message) => setFormError(message)}
                  disabled={sending}
                />
              </div>

              <p className="text-[10px] leading-4 text-zinc-600">
                Use the toolbar to format. Links and images must start with http:// or https://.
                Direct image links are shown as previews.
              </p>

              {formError ? (
                <p className="rounded-lg border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-xs text-red-300">
                  {formError}
                </p>
              ) : null}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeCompose}
                  disabled={sending}
                  className="rounded-xl border border-zinc-800 px-3.5 py-2 text-xs font-bold text-zinc-400 transition hover:border-zinc-700 hover:text-white disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-black transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  Send
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
