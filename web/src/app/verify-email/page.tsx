'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    token ? 'loading' : 'error'
  );
  const [message, setMessage] = useState(
    token ? '' : 'No verification token provided.'
  );

  useEffect(() => {
    if (!token) return;

    fetch(`/api/auth/verify-email?token=${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success || data.message?.includes('already')) {
          setStatus('success');
          setMessage(data.message || 'Email verified successfully. You can now log in.');
        } else {
          setStatus('error');
          setMessage(data.error || 'Verification failed.');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Network error. Please try again.');
      });
  }, [token]);

  if (!token) {
    return (
      <div className="min-h-screen w-full bg-[#070709] flex items-center justify-center p-6 font-sans">
        <div className="relative z-10 w-full max-w-md bg-zinc-950/80 backdrop-blur-xl border border-zinc-800/80 rounded-[28px] p-10 shadow-[0_24px_60px_rgba(0,0,0,0.6)] flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <XCircle className="h-8 w-8 text-red-400" />
          </div>
          <h1 className="mt-4 text-xl font-extrabold text-white">Verification Failed</h1>
          <p className="mt-2 text-xs text-zinc-400 text-center leading-relaxed">
            No verification token provided.
          </p>
          <Link
            href="/register"
            className="mt-6 w-full h-11 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-extrabold text-xs tracking-wider flex items-center justify-center transition duration-300"
          >
            BACK TO REGISTER
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#070709] flex items-center justify-center p-6 font-sans">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-amber-600/5 rounded-full blur-[130px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md bg-zinc-950/80 backdrop-blur-xl border border-zinc-800/80 rounded-[28px] p-10 shadow-[0_24px_60px_rgba(0,0,0,0.6)] flex flex-col items-center">
        {status === 'loading' && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
            </div>
            <div className="mt-4 text-center">
              <h1 className="text-xl font-extrabold text-white">Verifying Email</h1>
              <p className="text-xs text-zinc-400 mt-1">Please wait a moment...</p>
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
            <div className="mt-4 text-center">
              <h1 className="text-xl font-extrabold text-white">Email Verified!</h1>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">{message}</p>
            </div>
            <Link
              href="/login"
              className="mt-6 w-full h-11 rounded-2xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold text-xs tracking-wider flex items-center justify-center transition duration-300"
            >
              SIGN IN NOW
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <XCircle className="h-8 w-8 text-red-400" />
            </div>
            <div className="mt-4 text-center">
              <h1 className="text-xl font-extrabold text-white">Verification Failed</h1>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">{message}</p>
            </div>
            <Link
              href="/register"
              className="mt-6 w-full h-11 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-extrabold text-xs tracking-wider flex items-center justify-center transition duration-300"
            >
              BACK TO REGISTER
            </Link>
          </>
        )}

        <div className="mt-6 text-[10px] text-zinc-600 flex items-center gap-1.5">
          <Mail className="h-3 w-3" />
          <span>Los Jawa RP — UCP Portal</span>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#070709] flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}