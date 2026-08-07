'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldAlert, Loader2, Lock, CheckCircle, ArrowLeft } from 'lucide-react';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';

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
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'An error occurred. Please try again.');
      } else {
        setSuccess(true);
        setTimeout(() => router.push('/login'), 3000);
      }
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="text-center space-y-4 py-4">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
          <ShieldAlert className="h-7 w-7 text-red-400" />
        </div>
        <h2 className="text-base font-bold text-white">Invalid Reset Link</h2>
        <p className="text-xs text-zinc-400">This link is missing a token. Please request a new password reset.</p>
        <Link href="/forgot-password" className="inline-block w-full h-11 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-extrabold text-xs tracking-wider text-center leading-[44px] transition duration-300">
          REQUEST NEW LINK
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <Link href="/login" className="inline-flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 hover:text-amber-500 transition-colors duration-200 mb-6">
          <ArrowLeft className="h-3 w-3" />
          BACK TO SIGN IN
        </Link>
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
          <Lock className="h-6 w-6 text-amber-500" />
        </div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Reset Password</h1>
        <p className="text-xs text-zinc-400 mt-1.5">Enter your new password below.</p>
      </div>

      {success ? (
        <div className="flex flex-col items-center gap-5 py-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
            <CheckCircle className="h-7 w-7 text-green-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Password Reset!</h2>
            <p className="text-xs text-zinc-400 mt-1.5">Your password has been updated. Redirecting to login...</p>
          </div>
          <Loader2 className="h-5 w-5 text-amber-500 animate-spin" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400 font-medium">
              <ShieldAlert className="h-4 w-4 flex-shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest" htmlFor="password">New Password</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"><Lock className="h-4 w-4" /></span>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                className="w-full h-12 border border-zinc-800 rounded-2xl pl-11 pr-4 text-xs font-medium focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 focus:outline-none bg-zinc-900/30 text-white placeholder:text-zinc-600 transition duration-300"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest" htmlFor="confirm">Confirm New Password</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"><Lock className="h-4 w-4" /></span>
              <input
                id="confirm"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                className="w-full h-12 border border-zinc-800 rounded-2xl pl-11 pr-4 text-xs font-medium focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 focus:outline-none bg-zinc-900/30 text-white placeholder:text-zinc-600 transition duration-300"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-2xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold text-xs tracking-wider shadow-lg shadow-amber-500/10 hover:shadow-amber-500/25 active:scale-[0.98] transition duration-300 flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'SET NEW PASSWORD'}
          </button>
        </form>
      )}

      <p className="text-center text-[10px] text-zinc-600 mt-8">Los Jawa RP — UCP Portal</p>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen w-full bg-[#070709] relative flex items-center justify-center p-4 sm:p-6 font-sans overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-amber-600/5 rounded-full blur-[130px] pointer-events-none" />
      <div className="relative z-10 w-full max-w-md bg-zinc-950/80 backdrop-blur-xl border border-zinc-800/80 rounded-[28px] p-10 shadow-[0_24px_60px_rgba(0,0,0,0.6)]">
        <Suspense fallback={<Loader2 className="h-6 w-6 text-amber-500 animate-spin mx-auto" />}>
          <ResetPasswordContent />
        </Suspense>
      </div>
    </div>
  );
}
