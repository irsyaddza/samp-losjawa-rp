'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldAlert,
  Loader2,
  User,
  MailCheck,
  CheckCircle,
  Mail,
  Send,
  ArrowRight,
} from 'lucide-react';
import { AuthShell } from '@/components/auth/AuthShell';
import { PasswordInput } from '@/components/auth/PasswordInput';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Unverified existing email flow
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  // Legacy account missing email flow
  const [requireEmail, setRequireEmail] = useState(false);
  const [legacyAccount, setLegacyAccount] = useState<{ id: number; username: string } | null>(null);
  const [newEmailInput, setNewEmailInput] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkSuccess, setLinkSuccess] = useState(false);

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setUnverifiedEmail('');
    setRequireEmail(false);
    setLegacyAccount(null);
    setResendSuccess(false);
    setLinkSuccess(false);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid username or password');

        if (data.requireEmail && data.accountId) {
          setRequireEmail(true);
          setLegacyAccount({ id: data.accountId, username: data.username });
        } else if (data.unverified && data.email) {
          setUnverifiedEmail(data.email);
        }
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!unverifiedEmail) return;
    setResendLoading(true);
    setResendSuccess(false);
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: unverifiedEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        setResendSuccess(true);
      } else {
        setError(data.error || 'Failed to resend verification email.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleLinkEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!legacyAccount || !newEmailInput || !password) return;
    setLinkLoading(true);
    setLinkSuccess(false);
    setError('');

    try {
      const res = await fetch('/api/auth/link-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: legacyAccount.id,
          username: legacyAccount.username,
          email: newEmailInput,
          password,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setLinkSuccess(true);
        setRequireEmail(false);
        setPassword('');
      } else {
        setError(data.error || 'Failed to link email address.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLinkLoading(false);
    }
  };

  return (
    <AuthShell
      headline="One account for every character"
      description="Track your characters, verify your UCP, and manage faction applications from a single dashboard."
      actionLabel="Create account"
      actionHref="/register"
    >
      <div>
        <span className="text-base font-black tracking-wider text-white">
          UCP<span className="text-amber-500">PORTAL</span>
        </span>
      </div>

      <div className="mx-auto my-auto w-full max-w-sm space-y-6 pt-8 lg:pt-0">
        <div className="space-y-1.5">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Welcome back</h1>
          <p className="text-sm font-medium text-zinc-400">
            Enter your UCP credentials to continue.
          </p>
        </div>

        {/* Success message when legacy account links email */}
        {linkSuccess && (
          <div className="flex items-start gap-2.5 rounded-xl border border-green-500/20 bg-green-500/5 p-3.5 text-xs font-medium text-green-400">
            <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-400" />
            <span>
              Email linked. Check your inbox (
              <strong className="text-white">{newEmailInput}</strong>) to verify your account.
            </span>
          </div>
        )}

        {error && (
          <div className="flex flex-col gap-2.5 rounded-xl border border-red-500/20 bg-red-500/5 p-3.5 text-xs font-medium text-red-400">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
              <span>{error}</span>
            </div>

            {/* Legacy account missing email: Inline Email Form */}
            {requireEmail && legacyAccount && (
              <form onSubmit={handleLinkEmail} className="mt-2 flex flex-col gap-2 border-t border-red-500/10 pt-2.5">
                <label
                  className="text-[10px] font-bold uppercase tracking-widest text-amber-400"
                  htmlFor="link-email"
                >
                  Enter email to link account
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                    <Mail className="h-3.5 w-3.5" />
                  </span>
                  <input
                    id="link-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={newEmailInput}
                    onChange={(e) => setNewEmailInput(e.target.value)}
                    placeholder="your@email.com"
                    className="h-10 w-full rounded-xl border border-zinc-700 bg-zinc-900 pl-9 pr-3 text-base font-medium text-white placeholder:text-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/15 md:text-xs"
                  />
                </div>
                <button
                  type="submit"
                  disabled={linkLoading}
                  className="flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-amber-500 text-[11px] font-extrabold text-zinc-950 transition duration-200 hover:bg-amber-400 active:scale-[0.98] disabled:opacity-50"
                >
                  {linkLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-3 w-3" />
                      Link &amp; send verification
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Unverified existing email: Resend button */}
            {unverifiedEmail && !requireEmail && (
              <div className="mt-1 flex flex-col gap-2 border-t border-red-500/10 pt-2.5">
                {resendSuccess ? (
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-green-400">
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span>Verification email sent to {unverifiedEmail}. Check your inbox.</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resendLoading}
                    className="inline-flex w-fit cursor-pointer items-center gap-1.5 text-[11px] font-extrabold text-amber-400 underline underline-offset-2 transition-colors hover:text-amber-300 disabled:opacity-50"
                  >
                    {resendLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <MailCheck className="h-3.5 w-3.5" />
                    )}
                    Resend verification email to {unverifiedEmail}
                  </button>
                )}
              </div>
            )}
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
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter UCP username"
                className="h-12 w-full rounded-2xl border border-zinc-800 bg-zinc-900/40 pl-11 pr-4 text-base font-medium text-white transition duration-200 placeholder:text-zinc-500 hover:border-zinc-700 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/15 lg:text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400"
                htmlFor="password"
              >
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-[10px] font-bold text-amber-500 transition-colors hover:text-amber-400"
              >
                Forgot password?
              </Link>
            </div>
            <PasswordInput
              id="password"
              value={password}
              onChange={setPassword}
              placeholder="Enter password"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-amber-500 text-xs font-extrabold uppercase tracking-wider text-zinc-950 shadow-[0_10px_24px_-14px_rgba(245,158,11,0.4)] transition duration-300 hover:bg-amber-400 hover:shadow-[0_12px_28px_-12px_rgba(245,158,11,0.55)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                Sign in
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </div>

      <div className="mt-8 flex items-center justify-between gap-4 border-t border-zinc-900 pt-6 lg:mt-0">
        <span className="text-xs text-zinc-400">
          No account yet?{' '}
          <Link
            href="/register"
            className="font-bold text-amber-500 transition-colors hover:text-amber-400"
          >
            Create account
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
