'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, MailOpen, Trash2, Calendar, User, ChevronDown, ChevronUp, Plus, Send, X } from 'lucide-react';

interface Notification {
  id: number;
  title: string;
  body: string;
  time: string;
  read: boolean;
  sender: string;
}

interface InboxClientProps {
  initialNotifications: Notification[];
}

export default function InboxClient({ initialNotifications }: InboxClientProps) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  
  // Compose Message Form State
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [toUsername, setToUsername] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSending, setIsSending] = useState(false);

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
    if (!confirm('Apakah Anda yakin ingin menghapus pesan ini?')) return;

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
        alert('Gagal menghapus pesan.');
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
      alert('Terjadi kesalahan jaringan.');
    }
  };

  const handleComposeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsSending(true);

    if (!toUsername.trim() || !title.trim() || !body.trim()) {
      setErrorMsg('Harap lengkapi semua bidang.');
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
        setSuccessMsg('Pesan berhasil dikirim!');
        setToUsername('');
        setTitle('');
        setBody('');
        setTimeout(() => {
          setIsComposeOpen(false);
          setSuccessMsg('');
        }, 1500);
      } else {
        setErrorMsg(data.error || 'Gagal mengirim pesan.');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setErrorMsg('Terjadi kesalahan jaringan.');
    } finally {
      setIsSending(false);
    }
  };

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
        <span className="text-xs text-zinc-500 font-medium">Kotak Pesan</span>
      </div>

      {/* Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <Mail className="h-6 w-6 text-amber-500" />
            Kotak Pesan (Inbox)
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Pemberitahuan, surat masuk, dan pesan dari sistem atau pemain lain.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsComposeOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black px-4 py-2.5 text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Tulis Pesan
          </button>
          <div className="bg-zinc-950 px-4 py-2.5 rounded-xl border border-zinc-800 flex items-center gap-2 text-xs h-[38px]">
            <span className="text-zinc-450 font-medium">
              Belum Dibaca:{' '}
              <strong className="text-amber-500 font-black">
                {notifications.filter(n => !n.read).length}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Compose Message Modal */}
      {isComposeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Send className="h-4.5 w-4.5 text-amber-500" />
                Kirim Pesan Baru
              </h3>
              <button
                onClick={() => {
                  setIsComposeOpen(false);
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
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

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  Nama Akun UCP Penerima
                </label>
                <input
                  type="text"
                  value={toUsername}
                  onChange={e => setToUsername(e.target.value)}
                  placeholder="Masukkan nama UCP tujuan (misal: Shikimura04)"
                  className="w-full rounded-xl bg-zinc-900 border border-zinc-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 px-4 py-3 text-xs text-white placeholder-zinc-650 transition outline-none font-semibold"
                  disabled={isSending}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  Judul Pesan
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Subjek atau judul pesan"
                  className="w-full rounded-xl bg-zinc-900 border border-zinc-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 px-4 py-3 text-xs text-white placeholder-zinc-650 transition outline-none font-semibold"
                  disabled={isSending}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  Isi Pesan
                </label>
                <textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  placeholder="Tulis pesan lengkap Anda di sini..."
                  rows={5}
                  className="w-full rounded-xl bg-zinc-900 border border-zinc-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 px-4 py-3 text-xs text-white placeholder-zinc-650 transition outline-none font-medium leading-relaxed"
                  disabled={isSending}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsComposeOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-850 hover:bg-zinc-900 text-zinc-400 hover:text-white text-xs font-bold transition"
                  disabled={isSending}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black transition disabled:opacity-50"
                  disabled={isSending}
                >
                  <Send className="h-3.5 w-3.5" />
                  {isSending ? 'Mengirim...' : 'Kirim Pesan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Message List */}
      {notifications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-850 bg-zinc-950/40 p-12 text-center">
          <MailOpen className="h-10 w-10 text-zinc-650 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-zinc-300">Kotak Pesan Kosong</h3>
          <p className="text-xs text-zinc-500 mt-1">
            Anda tidak memiliki pesan masuk saat ini. Klik "Tulis Pesan" untuk mengirim pesan ke pemain lain.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map(notification => {
            const isExpanded = expandedId === notification.id;
            return (
              <div
                key={notification.id}
                onClick={() => toggleExpand(notification.id, notification.read)}
                className={`rounded-xl border transition cursor-pointer select-none overflow-hidden ${
                  isExpanded
                    ? 'border-zinc-700 bg-zinc-900/40'
                    : notification.read
                    ? 'border-zinc-850 bg-zinc-950/30 hover:border-zinc-800'
                    : 'border-amber-500/30 bg-amber-500/[0.02] hover:border-amber-500/50'
                }`}
              >
                {/* Header Section */}
                <div className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 border ${
                        notification.read
                          ? 'bg-zinc-900/80 border-zinc-800 text-zinc-500'
                          : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                      }`}
                    >
                      {notification.read ? (
                        <MailOpen className="h-4.5 w-4.5" />
                      ) : (
                        <Mail className="h-4.5 w-4.5 animate-pulse" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4
                        className={`text-xs font-bold truncate ${
                          notification.read ? 'text-zinc-350' : 'text-white'
                        }`}
                      >
                        {notification.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-500">
                        <span className="flex items-center gap-1 font-medium">
                          <User className="h-3 w-3 shrink-0" />
                          Dari: {notification.sender}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 shrink-0" />
                          {new Date(notification.time).toLocaleString('id-ID', {
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
                    <button
                      onClick={e => deleteNotification(e, notification.id)}
                      className="p-1.5 rounded-lg border border-transparent hover:border-red-500/20 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition cursor-pointer"
                      title="Hapus pesan"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
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
