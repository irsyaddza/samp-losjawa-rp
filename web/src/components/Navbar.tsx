'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LogOut,
  LayoutDashboard,
  Mail,
  Users,
  ChevronDown,
  Bell,
  Menu,
  X,
  Shield,
  Settings,
  Globe,
  LifeBuoy,
  Scale,
  Flag,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface NavbarProps {
  session?: {
    username: string;
    email?: string;
    adminLevel?: number;
  } | null;
}

const mainNavLinks = [
  { href: '/#stats', label: 'Stats' },
  { href: '/#features', label: 'Features' },
  { href: '/changelog', label: 'Changelog' },
  { href: '/donator', label: 'Donator' },
];

export default function Navbar({ session }: NavbarProps) {
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!session) return;
    async function fetchCounts() {
      try {
        const [notificationRes, messageRes] = await Promise.all([
          fetch('/api/user/system-notifications/count'),
          fetch('/api/user/notifications/count'),
        ]);

        if (notificationRes.ok) {
          const data = await notificationRes.json();
          setNotificationCount(data.count || 0);
        }
        if (messageRes.ok) {
          const data = await messageRes.json();
          setMessageCount(data.count || 0);
        }
      } catch (error) {
        console.error('Error fetching notification counts:', error);
      }
    }

    function handleNotificationsUpdated() {
      fetchCounts();
    }

    fetchCounts();
    const interval = setInterval(fetchCounts, 60000);
    window.addEventListener('notifications-updated', handleNotificationsUpdated);
    return () => {
      clearInterval(interval);
      window.removeEventListener('notifications-updated', handleNotificationsUpdated);
    };
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
    const t = setTimeout(() => {
      setMobileOpen(false);
      setDropdownOpen(false);
    }, 0);
    return () => clearTimeout(t);
  }, [pathname]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full border-b border-zinc-800/80 bg-[#09090b]/90 backdrop-blur-md transition-all duration-200">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Brand Logo & Title */}
        <Link href="/" className="flex items-center gap-3 group">
          <Image
            src="/logo.png"
            alt="Los Jawa RP Logo"
            width={44}
            height={44}
            className="h-10 w-auto object-contain shrink-0 transition-transform duration-200 group-hover:scale-105"
            priority
          />
        </Link>

        {/* Center Desktop Navigation Links */}
        <nav className="hidden items-center gap-8 md:flex">
          {mainNavLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative text-xs font-bold uppercase tracking-wider transition-colors py-1 ${
                  isActive ? 'text-amber-400' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {link.label}
                {isActive && (
                  <span className="absolute -bottom-[21px] left-0 right-0 h-[2px] bg-amber-500 shadow-[0_0_8px_#f59e0b] rounded-full" />
                )}
              </Link>
            );
          })}
          {session && (
            <Link
              href="/dashboard/online"
              className={`relative text-xs font-bold uppercase tracking-wider transition-colors py-1 ${
                pathname === '/dashboard/online' ? 'text-amber-400' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Online Players
              {pathname === '/dashboard/online' && (
                <span className="absolute -bottom-[21px] left-0 right-0 h-[2px] bg-amber-500 shadow-[0_0_8px_#f59e0b] rounded-full" />
              )}
            </Link>
          )}
          <a
            href="https://forum.losjawa-rp.net"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors"
          >
            Forum
          </a>
        </nav>

        {/* Right Section: User Dropdown or Auth Actions */}
        <div className="flex items-center gap-3">
          {session ? (
            <div className="flex items-center gap-3">
              {/* Notification Bell */}
              <Link
                href="/dashboard/notifications"
                className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/60 text-zinc-400 transition hover:border-amber-500/30 hover:bg-zinc-800 hover:text-white"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-amber-500 text-[9px] font-black text-black ring-2 ring-[#09090b]">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
              </Link>

              {/* User Dropdown Trigger */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen((open) => !open)}
                  aria-expanded={dropdownOpen}
                  aria-haspopup="menu"
                  className="flex items-center gap-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-zinc-300 transition hover:border-amber-500/30 hover:bg-zinc-800 hover:text-white cursor-pointer"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs font-black uppercase text-amber-400">
                    {session.username.charAt(0)}
                  </div>
                  <span className="hidden text-xs font-bold sm:block">{session.username}</span>
                  <ChevronDown className={`h-3.5 w-3.5 text-zinc-500 transition-transform duration-200 ${dropdownOpen ? 'rotate-180 text-amber-400' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                <div
                  className={`absolute right-0 mt-2 max-h-[calc(100vh-5rem)] w-60 origin-top-right overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-2 shadow-2xl transition-all duration-200 ease-out ${
                    dropdownOpen
                      ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
                      : 'pointer-events-none -translate-y-2 scale-[0.98] opacity-0'
                  }`}
                  aria-hidden={!dropdownOpen}
                  inert={!dropdownOpen}
                >
                    <div className="mb-2 border-b border-zinc-900 px-3 py-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">User Control Panel</p>
                      <p className="mt-0.5 truncate text-xs font-bold text-white">{session.username}</p>
                      <p className="truncate text-[10px] text-zinc-400">{session.email || `${session.username}@ucp`}</p>
                    </div>

                    <div className="space-y-0.5">
                      <Link
                        href="/dashboard"
                        onClick={() => setDropdownOpen(false)}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-zinc-900 hover:text-amber-400"
                      >
                        <LayoutDashboard className="h-4 w-4 text-amber-500" />
                        Dashboard
                      </Link>

                      <Link
                        href="/dashboard/online"
                        onClick={() => setDropdownOpen(false)}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-zinc-900 hover:text-amber-400"
                      >
                        <Globe className="h-4 w-4 text-amber-500" />
                        Online Players
                      </Link>

                      <Link
                        href="/dashboard/notifications"
                        onClick={() => setDropdownOpen(false)}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-zinc-900 hover:text-amber-400"
                      >
                        <span className="flex items-center gap-2.5">
                          <Bell className="h-4 w-4 text-amber-500" />
                          Notifications
                        </span>
                        {notificationCount > 0 && (
                          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/20">
                            {notificationCount}
                          </span>
                        )}
                      </Link>

                      <Link
                        href="/dashboard/friends"
                        onClick={() => setDropdownOpen(false)}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-zinc-900 hover:text-amber-400"
                      >
                        <Users className="h-4 w-4 text-amber-500" />
                        Friends
                      </Link>

                      <Link
                        href="/dashboard/inbox"
                        onClick={() => setDropdownOpen(false)}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-zinc-900 hover:text-amber-400"
                      >
                        <span className="flex items-center gap-2.5">
                          <Mail className="h-4 w-4 text-amber-500" />
                          Inbox
                        </span>
                        {messageCount > 0 && (
                          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/20">
                            {messageCount}
                          </span>
                        )}
                      </Link>

                      <Link
                        href="/dashboard/support"
                        onClick={() => setDropdownOpen(false)}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-zinc-900 hover:text-amber-400"
                      >
                        <LifeBuoy className="h-4 w-4 text-amber-500" />
                        Support Center
                      </Link>

                      <Link
                        href="/dashboard/reports"
                        onClick={() => setDropdownOpen(false)}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-zinc-900 hover:text-amber-400"
                      >
                        <Flag className="h-4 w-4 text-amber-500" />
                        Player Reports
                      </Link>

                      <Link
                        href="/dashboard/appeal"
                        onClick={() => setDropdownOpen(false)}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-zinc-900 hover:text-amber-400"
                      >
                        <Scale className="h-4 w-4 text-amber-500" />
                        Ban Appeal
                      </Link>

                      <Link
                        href="/dashboard/settings"
                        onClick={() => setDropdownOpen(false)}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-zinc-900 hover:text-amber-400"
                      >
                        <Settings className="h-4 w-4 text-amber-500" />
                        Account Settings
                      </Link>

                      {session.adminLevel && session.adminLevel > 0 ? (
                        <Link
                          href="/dashboard/admin"
                          onClick={() => setDropdownOpen(false)}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-amber-400 transition hover:bg-amber-500/10"
                        >
                          <Shield className="h-4 w-4 text-amber-400" />
                          Admin Portal
                        </Link>
                      ) : null}
                    </div>

                    <div className="my-2 h-px bg-zinc-900" />

                    <form action="/api/auth/logout" method="POST" className="block w-full">
                      <button
                        type="submit"
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-red-400 transition hover:bg-red-500/10 cursor-pointer"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </button>
                    </form>
                </div>
              </div>
            </div>
          ) : (
            <div className="hidden items-center gap-3 sm:flex">
              <Link
                href="/login"
                className="text-xs font-bold uppercase tracking-wider text-zinc-400 transition hover:text-white px-3 py-2"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="h-9 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase tracking-wider shadow-md transition flex items-center justify-center cursor-pointer"
              >
                Join now
              </Link>
            </div>
          )}

          {/* Mobile Navigation Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/60 text-zinc-300 transition hover:text-white md:hidden"
            aria-label="Toggle navigation"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileOpen && (
        <div className="border-b border-zinc-800 bg-zinc-950/95 p-4 backdrop-blur-md md:hidden animate-in slide-in-from-top-4 duration-200">
          <nav className="flex flex-col gap-1">
            {mainNavLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:bg-zinc-900 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
            {session && (
              <>
                <Link
                  href="/dashboard/online"
                  className="rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:bg-zinc-900 hover:text-white"
                >
                  Online Players
                </Link>
                <Link
                  href="/dashboard/appeal"
                  className="rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:bg-zinc-900 hover:text-white"
                >
                  Ban Appeal
                </Link>
                <Link
                  href="/dashboard/reports"
                  className="rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:bg-zinc-900 hover:text-white"
                >
                  Player Reports
                </Link>
              </>
            )}
            <a
              href="https://forum.losjawa-rp.fun"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:bg-zinc-900 hover:text-white"
            >
              Forum
            </a>

            {!session && (
              <div className="mt-3 flex flex-col gap-2 border-t border-zinc-900 pt-3">
                <Link
                  href="/login"
                  className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-white"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="rounded-xl bg-amber-500 px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-black"
                >
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
