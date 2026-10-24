'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  ChevronRight,
  FileText,
  LifeBuoy,
  Loader2,
} from 'lucide-react';
import type { SystemNotificationRecord } from '@/lib/system-notifications';

interface NotificationsClientProps {
  initialNotifications: SystemNotificationRecord[];
}

export default function NotificationsClient({ initialNotifications }: NotificationsClientProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [pending, setPending] = useState<number | 'all' | null>(null);

  const unreadCount = notifications.filter((item) => Number(item.is_read) === 0).length;

  function announceUpdate() {
    window.dispatchEvent(new Event('notifications-updated'));
  }

  async function markAllRead() {
    if (unreadCount === 0 || pending) return;

    setPending('all');
    try {
      const response = await fetch('/api/user/system-notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read_all' }),
      });

      if (response.ok) {
        setNotifications((items) => items.map((item) => ({ ...item, is_read: 1 })));
        announceUpdate();
        router.refresh();
      }
    } finally {
      setPending(null);
    }
  }

  async function openNotification(notification: SystemNotificationRecord) {
    if (pending) return;

    const isUnread = Number(notification.is_read) === 0;

    if (!isUnread) {
      if (notification.link) router.push(notification.link);
      return;
    }

    setPending(notification.id);
    try {
      const response = await fetch('/api/user/system-notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read', id: notification.id }),
      });

      if (response.ok) {
        setNotifications((items) =>
          items.map((item) => (item.id === notification.id ? { ...item, is_read: 1 } : item))
        );
        announceUpdate();
        if (notification.link) {
          router.push(notification.link);
        } else {
          router.refresh();
        }
      }
    } finally {
      setPending(null);
    }
  }

  function getIcon(type: string) {
    if (type === 'ticket') return LifeBuoy;
    if (type === 'application') return FileText;
    return Bell;
  }

  if (notifications.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 px-6 py-14 text-center">
        <Bell className="mx-auto mb-3 h-10 w-10 text-zinc-700" />
        <h2 className="text-sm font-bold text-white">No notifications yet</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Ticket replies, application results, and account updates will appear here.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-zinc-400">
          {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}` : 'All caught up.'}
        </p>
        <button
          type="button"
          onClick={markAllRead}
          disabled={unreadCount === 0 || pending !== null}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3.5 py-2 text-[11px] font-bold text-zinc-300 transition hover:border-amber-500/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending === 'all' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
          Mark all as read
        </button>
      </div>

      <div className="space-y-2">
        {notifications.map((notification) => {
          const Icon = getIcon(notification.type);
          const isUnread = Number(notification.is_read) === 0;

          return (
            <button
              key={notification.id}
              type="button"
              onClick={() => openNotification(notification)}
              disabled={pending !== null}
              className={`group flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition disabled:cursor-wait ${
                isUnread
                  ? 'border-amber-500/20 bg-amber-500/[0.04] hover:border-amber-500/40'
                  : 'border-zinc-800/80 bg-zinc-950/60 hover:border-zinc-700'
              }`}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                  isUnread
                    ? 'border-amber-500/20 bg-amber-500/10 text-amber-400'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-500'
                }`}
              >
                {pending === notification.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className={`text-sm font-semibold ${isUnread ? 'text-white' : 'text-zinc-300'}`}>
                    {notification.title}
                  </p>
                  {isUnread ? <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-label="Unread" /> : null}
                </div>
                {notification.body ? (
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-500">{notification.body}</p>
                ) : null}
                <p className="mt-1.5 text-[10px] text-zinc-600">{notification.created_at}</p>
              </div>

              {notification.link ? (
                <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-zinc-600 transition group-hover:text-amber-400" />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
