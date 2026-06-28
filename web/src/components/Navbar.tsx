'use client';

import Link from 'next/link';
import { Orbit, LogOut, LayoutDashboard, Mail } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface NavbarProps {
  session?: {
    username: string;
    email?: string;
  } | null;
}

export default function Navbar({ session }: NavbarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch unread notification count
  useEffect(() => {
    if (!session) return;
    async function fetchCount() {
      try {
        const res = await fetch('/api/user/notifications/count');
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.count || 0);
        }
      } catch (error) {
        console.error('Error fetching notification count:', error);
      }
    }
    fetchCount();
    // Poll every 60 seconds
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, [session]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="fixed top-4 left-0 right-0 z-50 px-4">
      <div className="mx-auto max-w-4xl rounded-full bg-zinc-950/90 border border-zinc-800/80 shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-md h-16 flex items-center justify-between px-3 md:px-4">
        {/* Left circular logo wrapper */}
        <Link href="/" className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-zinc-950 shadow-md hover:scale-105 transition duration-200">
            <Orbit className="h-5 w-5 text-zinc-900 animate-pulse" />
          </div>
        </Link>

        {/* Center menu links */}
        <nav className="flex items-center gap-6 md:gap-8">
          <Link
            href="/#features"
            className="text-xs sm:text-sm font-semibold text-zinc-400 hover:text-white transition duration-200"
          >
            Fitur
          </Link>
          <Link
            href="/#stats"
            className="text-xs sm:text-sm font-semibold text-zinc-400 hover:text-white transition duration-200"
          >
            Statistik
          </Link>
          <a
            href="https://forum.losjawa-rp.net"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs sm:text-sm font-semibold text-zinc-400 hover:text-white transition duration-200"
          >
            Forum
          </a>
        </nav>

        {/* Right capsule button */}
        <div className="relative" ref={dropdownRef}>
          {session ? (
            <div>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="h-10 px-4 rounded-full bg-white hover:bg-zinc-100 text-zinc-950 text-xs sm:text-sm font-bold shadow-md flex items-center gap-1.5 transition duration-200 cursor-pointer relative"
              >
                <span className="max-w-[150px] truncate">{session.email || `${session.username}@ucp`}</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-black text-black ring-2 ring-zinc-950 animate-bounce">
                    {unreadCount}
                  </span>
                )}
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-zinc-950 border border-zinc-800 p-2 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
                  <Link
                    href="/dashboard"
                    onClick={() => setDropdownOpen(false)}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-900 transition"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard UCP
                  </Link>
                  <Link
                    href="/dashboard/inbox"
                    onClick={() => setDropdownOpen(false)}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-900 transition"
                  >
                    <span className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Kotak Pesan
                    </span>
                    {unreadCount > 0 && (
                      <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-500">
                        {unreadCount}
                      </span>
                    )}
                  </Link>
                  <form action="/api/auth/logout" method="POST" className="block w-full">
                    <button
                      type="submit"
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/5 transition text-left cursor-pointer"
                    >
                      <LogOut className="h-4 w-4" />
                      Keluar Sesi
                    </button>
                  </form>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="hidden sm:inline-block text-xs font-bold text-zinc-400 hover:text-white px-3 py-2 transition"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="h-10 px-5 rounded-full bg-white hover:bg-zinc-100 text-zinc-950 text-xs sm:text-sm font-bold shadow-md flex items-center justify-center transition duration-200"
              >
                Join Us
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
