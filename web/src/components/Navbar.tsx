'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LogOut, LayoutDashboard, Mail, User, ChevronDown, Bell, Menu, X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface NavbarProps {
  session?: {
    username: string;
    email?: string;
  } | null;
}

const navLinks = [
  { href: '/#features', label: 'Features' },
  { href: '/#stats', label: 'Stats' },
  { href: '/#community', label: 'Community' },
];

export default function Navbar({ session }: NavbarProps) {
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, [session]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setDropdownOpen(false);
  }, [pathname]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-6">
      <div className="mx-auto flex max-w-6xl items-center justify-between rounded-full border border-white/10 bg-[#05070c]/85 px-3 py-2.5 shadow-[0_20px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10">
            <Image src="/logo.png" alt="Los Jawa RP logo" width={28} height={28} priority />
          </div>
          <span className="text-sm font-black uppercase tracking-[0.25em] text-zinc-100">
            Los Jawa <span className="text-amber-400">RP</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 md:flex">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || pathname === link.href.replace('/#', '#');
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  isActive ? 'bg-amber-500/15 text-amber-300' : 'text-zinc-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <a
            href="https://forum.losjawa-rp.net"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full px-4 py-2 text-sm font-semibold text-zinc-400 transition hover:bg-white/10 hover:text-white"
          >
            Forum
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <div className="relative" ref={dropdownRef}>
            {session ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard/inbox"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-400 transition hover:border-amber-400/20 hover:text-white"
                  aria-label="Inbox"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[8px] font-black text-zinc-950">
                      {unreadCount}
                    </span>
                  )}
                </Link>

                <button
                  onClick={() => setDropdownOpen((open) => !open)}
                  className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-2 text-zinc-300 transition hover:border-amber-400/20 hover:text-white"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10 text-[10px] font-black uppercase text-amber-400">
                    {session.username.substring(0, 2)}
                  </div>
                  <span className="hidden text-sm font-semibold sm:block">{session.username}</span>
                  <ChevronDown className={`h-4 w-4 transition ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-3 w-56 rounded-2xl border border-white/10 bg-[#05070c] p-2 shadow-2xl">
                    <div className="mb-2 border-b border-white/10 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">Connected as</p>
                      <p className="mt-1 truncate text-sm font-semibold text-white">{session.email || `${session.username}@ucp`}</p>
                    </div>

                    <Link
                      href="/dashboard"
                      onClick={() => setDropdownOpen(false)}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-400 transition hover:bg-white/10 hover:text-white"
                    >
                      <LayoutDashboard className="h-4 w-4 text-amber-400" />
                      Dashboard
                    </Link>
                    <Link
                      href="/dashboard/inbox"
                      onClick={() => setDropdownOpen(false)}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-400 transition hover:bg-white/10 hover:text-white"
                    >
                      <span className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-amber-400" />
                        Inbox
                      </span>
                      {unreadCount > 0 && (
                        <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400">
                          {unreadCount}
                        </span>
                      )}
                    </Link>

                    <div className="my-2 h-px bg-white/10" />
                    <form action="/api/auth/logout" method="POST" className="block w-full">
                      <button
                        type="submit"
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-400 transition hover:bg-red-500/10"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </form>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden items-center gap-2 sm:flex">
                <Link href="/login" className="rounded-full px-4 py-2 text-sm font-semibold text-zinc-400 transition hover:text-white">
                  Sign in
                </Link>
                <Link href="/register" className="rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400">
                  Join now
                </Link>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-300 transition hover:border-amber-400/20 hover:text-white md:hidden"
            aria-label="Toggle navigation"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="mx-auto mt-3 max-w-6xl rounded-[1.5rem] border border-white/10 bg-[#05070c]/95 p-3 shadow-2xl md:hidden">
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-2xl px-4 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-white/10 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
            <a
              href="https://forum.losjawa-rp.net"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl px-4 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-white/10 hover:text-white"
            >
              Forum
            </a>
            {!session && (
              <div className="mt-2 flex flex-col gap-2 border-t border-white/10 pt-3">
                <Link href="/login" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-semibold text-zinc-200">
                  Sign in
                </Link>
                <Link href="/register" className="rounded-2xl bg-amber-500 px-4 py-3 text-center text-sm font-semibold text-zinc-950">
                  Join now
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
