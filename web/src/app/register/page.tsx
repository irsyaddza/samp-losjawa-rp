'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ShieldAlert, Loader2, User, Mail, CheckCircle, ArrowRight } from 'lucide-react';
import { AuthShell } from '@/components/auth/AuthShell';
import { PasswordInput } from '@/components/auth/PasswordInput';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'An error occurred during registration.');
      } else {
        setSuccess(true);
      }
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      headline="Your story starts here"
      description="Create your UCP account, link your in-game character, and join the city on your first night."
      actionLabel="Sign in"
      actionHref="/login"
    >
      <div>
        <span className="text-base font-black tracking-wider text-white">
          UCP<span className="text-amber-500">PORTAL</span>
        </span>
      </div>

      <div className="mx-auto my-auto w-full max-w-sm pt-8 lg:pt-0">
        {success ? (
          <div className="flex flex-col items-center gap-5 py-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-green-500/20 bg-green-500/10">
              <Mail className="h-8 w-8 text-green-400" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-extrabold text-white">Check your email</h1>
              <p className="text-sm leading-relaxed text-zinc-400">
                We sent a verification link to{' '}
                <span className="font-semibold text-amber-400">{email}</span>. Verify it to activate
                your account.
              </p>
            </div>
            <Link
              href="/login"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 text-xs font-extrabold uppercase tracking-wider text-zinc-950 transition duration-300 hover:bg-amber-400 active:scale-[0.98]"
            >
              Go to sign in
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-1.5">
              <h1 className="text-3xl font-extrabold tracking-tight text-white">Create your account</h1>
              <p className="text-sm font-medium text-zinc-400">
                Takes a minute. Verify your email to activate.
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs font-medium text-red-400">
                <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <label
                  className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400"
                  htmlFor="username"
                >
                  UCP Username
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                    <User className="h-4 w-4" />
                  </span>
                  <input
                    id="username"
                    type="text"
                    required
                    minLength={3}
                    maxLength={24}
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="3 to 24 characters"
                    className="h-12 w-full rounded-2xl border border-zinc-800 bg-zinc-900/40 pl-11 pr-4 text-base font-medium text-white transition duration-200 placeholder:text-zinc-500 hover:border-zinc-700 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/15 lg:text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400"
                  htmlFor="email"
                >
                  Email Address
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                    <Mail className="h-4 w-4" />
                  </span>
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="h-12 w-full rounded-2xl border border-zinc-800 bg-zinc-900/40 pl-11 pr-4 text-base font-medium text-white transition duration-200 placeholder:text-zinc-500 hover:border-zinc-700 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/15 lg:text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400"
                  htmlFor="password"
                >
                  Password
                </label>
                <PasswordInput
                  id="password"
                  value={password}
                  onChange={setPassword}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  minLength={6}
                />
              </div>

              <div className="space-y-1.5">
                <label
                  className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400"
                  htmlFor="confirmPassword"
                >
                  Confirm Password
                </label>
                <PasswordInput
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  minLength={6}
                />
                {confirmPassword.length > 0 && (
                  <p
                    className={`flex items-center gap-1.5 text-[11px] font-medium ${
                      password === confirmPassword ? 'text-green-400' : 'text-zinc-500'
                    }`}
                  >
                    {password === confirmPassword ? (
                      <>
                        <CheckCircle className="h-3.5 w-3.5" />
                        Passwords match
                      </>
                    ) : (
                      'Passwords do not match yet'
                    )}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-1 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-amber-500 text-xs font-extrabold uppercase tracking-wider text-zinc-950 shadow-[0_10px_24px_-14px_rgba(245,158,11,0.4)] transition duration-300 hover:bg-amber-400 hover:shadow-[0_12px_28px_-12px_rgba(245,158,11,0.55)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    Create account
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>

      <div className="mt-8 flex items-center justify-between gap-4 border-t border-zinc-900 pt-6 lg:mt-0">
        <span className="text-xs text-zinc-400">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-bold text-amber-500 transition-colors hover:text-amber-400"
          >
            Sign in
          </Link>
        </span>
        <Link
          href="/"
          className="hidden text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-300 sm:block"
        >
          Back to site
        </Link>
      </div>
    </AuthShell>
  );
}
