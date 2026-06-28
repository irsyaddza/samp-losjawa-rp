'use client';

import Link from 'next/link';
import { Orbit, LogOut, LayoutDashboard, Mail, User, ChevronDown, Bell } from 'lucide-react';
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
    <div className="fixed top-5 left-0 right-0 z-50 px-4 sm:px-6">
      <div className="mx-auto max-w-5xl rounded-2xl bg-zinc-950/70 border border-zinc-800/80 shadow-[0_16px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl h-16 flex items-center justify-between px-4 sm:px-6 relative transition-all duration-300">
        
        {/* Subtle glass border highlights */}
        <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-amber-500/20 to-transparent pointer-events-none" />

        {/* Left Side: Brand Logo & Title */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-zinc-950 shadow-md shadow-amber-500/10 group-hover:scale-105 group-hover:shadow-amber-500/20 transition-all duration-300">
            <Orbit className="h-4.5 w-4.5 text-zinc-950 group-hover:rotate-180 transition-transform duration-700 ease-out" />
          </div>
          <span className="text-[11px] font-black tracking-[0.25em] uppercase text-zinc-100 group-hover:text-amber-500 transition-colors duration-300">
            LOS JAWA<span className="text-amber-500 group-hover:text-zinc-100 transition-colors duration-300"> RP</span>
          </span>
        </Link>

        {/* Center: Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 bg-zinc-900/40 p-1 rounded-xl border border-zinc-800/50">
          <Link
            href="/#features"
            className="px-4 py-2 rounded-lg text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-900/60 transition-all duration-200"
          >
            Fitur
          </Link>
          <Link
            href="/#stats"
            className="px-4 py-2 rounded-lg text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-900/60 transition-all duration-200"
          >
            Statistik
          </Link>
          <a
            href="https://forum.losjawa-rp.net"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-lg text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-900/60 transition-all duration-200"
          >
            Forum
          </a>
        </nav>

        {/* Right: User / Auth section */}
        <div className="relative" ref={dropdownRef}>
          {session ? (
            <div className="flex items-center gap-3">
              {/* Inbox Shortcut with unread count */}
              <Link 
                href="/dashboard/inbox"
                className="w-9 h-9 rounded-xl bg-zinc-900/30 border border-zinc-800/50 hover:border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-all duration-200 relative"
                aria-label="Kotak Pesan"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[8px] font-black text-zinc-950 ring-2 ring-zinc-950">
                    {unreadCount}
                  </span>
                )}
              </Link>

              {/* User Dropdown Button */}
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="h-9 pl-2 pr-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700/80 text-zinc-300 hover:text-white flex items-center gap-2.5 transition duration-300 cursor-pointer shadow-sm relative group"
              >
                <div className="w-6.5 h-6.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center font-black text-[9px] uppercase">
                  {session.username.substring(0, 2)}
                </div>
                <span className="text-xs font-bold max-w-[120px] truncate">{session.username}</span>
                <ChevronDown className={`h-3 w-3 text-zinc-500 group-hover:text-zinc-300 transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-3.5 w-52 rounded-2xl bg-zinc-950 border border-zinc-800 p-2 shadow-2xl origin-top-right transition-all duration-300 z-50 animate-fade-in-up">
                  <div className="px-3.5 py-2.5 border-b border-zinc-900 mb-1.5">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Terhubung Sebagai</p>
                    <p className="text-xs font-bold text-white truncate mt-0.5">{session.email || `${session.username}@ucp`}</p>
                  </div>
                  
                  <Link
                    href="/dashboard"
                    onClick={() => setDropdownOpen(false)}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-900/60 transition-all duration-200"
                  >
                    <LayoutDashboard className="h-4 w-4 text-amber-500" />
                    Dashboard UCP
                  </Link>
                  
                  <Link
                    href="/dashboard/inbox"
                    onClick={() => setDropdownOpen(false)}
                    className="flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-900/60 transition-all duration-200"
                  >
                    <span className="flex items-center gap-2.5">
                      <Mail className="h-4 w-4 text-amber-500" />
                      Kotak Pesan
                    </span>
                    {unreadCount > 0 && (
                      <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-500">
                        {unreadCount}
                      </span>
                    )}
                  </Link>

                  <div className="h-[1px] bg-zinc-900 my-1.5" />
                  
                  <form action="/api/auth/logout" method="POST" className="block w-full">
                    <button
                      type="submit"
                      className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-all duration-200 text-left cursor-pointer"
                    >
                      <LogOut className="h-4 w-4" />
                      Keluar Sesi
                    </button>
                  </form>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-xs font-bold text-zinc-400 hover:text-white px-3 py-2 transition-colors duration-300"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="h-9 px-4.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 text-xs font-extrabold shadow-md shadow-amber-500/10 hover:shadow-amber-500/25 flex items-center justify-center transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
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
