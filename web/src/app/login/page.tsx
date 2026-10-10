'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldAlert, Loader2, ArrowLeft, ArrowRight, User, Lock, MailCheck, CheckCircle, Mail, Send } from 'lucide-react';

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
    if (!legacyAccount || !newEmailInput) return;
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
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setLinkSuccess(true);
        setRequireEmail(false);
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
    <div className="min-h-screen w-full bg-[#070709] relative flex items-center justify-center p-4 sm:p-6 md:p-8 font-sans selection:bg-amber-500 selection:text-black overflow-hidden">
      
      {/* Background Decorative Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[130px] pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-amber-600/5 rounded-full blur-[130px] pointer-events-none animate-pulse-slow" />

      {/* Container Card */}
      <div className="w-full max-w-5xl bg-zinc-950/65 backdrop-blur-xl rounded-[32px] overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.6)] flex flex-col md:flex-row h-auto md:h-[680px] border border-zinc-800/80 relative z-10 animate-fade-in-up">
        
        {/* Left Side: Artwork */}
        <div 
          className="relative hidden md:flex md:w-1/2 flex-col justify-between p-10 text-white overflow-hidden bg-cover bg-center rounded-[24px] m-3 shadow-inner"
          style={{ backgroundImage: "url('/login_artwork.png')" }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/95 via-zinc-950/40 to-zinc-950/70 pointer-events-none rounded-[24px]" />

          <div className="relative z-10 flex items-center justify-between">
            <Link href="/" className="text-xs font-black tracking-[0.2em] uppercase text-amber-500 hover:text-amber-400 transition-colors duration-200">
              LOS JAWA RP
            </Link>
            <div className="flex items-center gap-4 text-xs font-bold">
              <Link href="/register" className="text-zinc-300 hover:text-white transition-colors duration-200">
                Sign Up
              </Link>
              <Link href="/register" className="h-8 px-4 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm flex items-center justify-center hover:bg-amber-500 hover:text-zinc-950 hover:border-amber-500 transition duration-300">
                Join Us
              </Link>
            </div>
          </div>

          <div className="relative z-10 my-auto max-w-xs space-y-3">
            <div className="inline-block px-2.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-[10px] font-black uppercase tracking-widest text-amber-400">
              UCP Portal
            </div>
            <h3 className="text-2xl font-black tracking-tight leading-tight text-white">
              One Account For All Your Characters
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed font-medium">
              Manage your character stats, UCP verification, faction applications, and view real-time server statistics.
            </p>
          </div>

          <div className="relative z-10 flex items-end justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center font-black text-zinc-950 text-xs shadow-lg shadow-amber-500/20">
                LJ
              </div>
              <div>
                <h4 className="text-xs font-bold text-white tracking-wide">Los Jawa RP</h4>
                <p className="text-[10px] text-zinc-400">Official UCP System v2.0</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="w-8 h-8 rounded-full border border-white/10 bg-white/5 flex items-center justify-center hover:bg-amber-500 hover:text-zinc-950 transition duration-300 cursor-pointer">
                <ArrowLeft className="h-3.5 w-3.5" />
              </button>
              <button className="w-8 h-8 rounded-full border border-white/10 bg-white/5 flex items-center justify-center hover:bg-amber-500 hover:text-zinc-950 transition duration-300 cursor-pointer">
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="w-full md:w-1/2 flex flex-col justify-between p-8 sm:p-10 bg-zinc-950 text-zinc-100 relative">
          
          <div className="flex items-center justify-between mb-8 md:mb-0">
            <span className="text-base font-black tracking-wider text-white">
              UCP<span className="text-amber-500">PORTAL</span>
            </span>
          </div>

          <div className="max-w-sm w-full mx-auto my-auto space-y-6">
            <div className="space-y-1">
              <h2 className="text-3xl font-extrabold text-white tracking-tight">
                Sign In
              </h2>
              <p className="text-xs text-zinc-400 font-medium">
                Enter your UCP credentials to access your account.
              </p>
            </div>

            {/* Success message when legacy account links email */}
            {linkSuccess && (
              <div className="flex items-start gap-2.5 rounded-xl border border-green-500/20 bg-green-500/5 p-3.5 text-xs text-green-400 font-medium animate-fade-in">
                <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-green-400" />
                <span>Email linked successfully! Check your inbox (<strong className="text-white">{newEmailInput}</strong>) to verify your account.</span>
              </div>
            )}

            {error && (
              <div className="flex flex-col gap-2.5 rounded-xl border border-red-500/20 bg-red-500/5 p-3.5 text-xs text-red-400 font-medium animate-fade-in">
                <div className="flex items-start gap-2.5">
                  <ShieldAlert className="h-4 w-4 flex-shrink-0 mt-0.5 text-red-500" />
                  <span>{error}</span>
                </div>

                {/* Legacy account missing email: Inline Email Form */}
                {requireEmail && legacyAccount && (
                  <form onSubmit={handleLinkEmail} className="mt-2 pt-2.5 border-t border-red-500/10 flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
                      Enter Email to Link Account
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                        <Mail className="h-3.5 w-3.5" />
                      </span>
                      <input
                        type="email"
                        required
                        value={newEmailInput}
                        onChange={(e) => setNewEmailInput(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full h-9 border border-zinc-700 rounded-xl pl-9 pr-3 text-xs font-medium focus:border-amber-500 focus:outline-none bg-zinc-900 text-white placeholder:text-zinc-600"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={linkLoading}
                      className="w-full h-8 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold text-[11px] flex items-center justify-center gap-1.5 transition duration-200 cursor-pointer disabled:opacity-50"
                    >
                      {linkLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <Send className="h-3 w-3" />
                          Link & Send Verification Link
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* Unverified existing email: Resend button */}
                {unverifiedEmail && !requireEmail && (
                  <div className="mt-1 pt-2.5 border-t border-red-500/10 flex flex-col gap-2">
                    {resendSuccess ? (
                      <div className="flex items-center gap-1.5 text-green-400 font-semibold text-[11px]">
                        <CheckCircle className="h-3.5 w-3.5" />
                        <span>Verification email sent to {unverifiedEmail}! Check your inbox.</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendVerification}
                        disabled={resendLoading}
                        className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors cursor-pointer w-fit"
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
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest" htmlFor="username">
                  UCP Username
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                    <User className="h-4 w-4" />
                  </span>
                  <input
                    id="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter UCP username"
                    className="w-full h-12 border border-zinc-800 rounded-2xl pl-11 pr-4 text-xs font-medium focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 focus:outline-none bg-zinc-900/30 text-white placeholder:text-zinc-600 transition duration-300"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest" htmlFor="password">
                    Password
                  </label>
                  <Link href="/forgot-password" className="text-[10px] font-bold text-amber-500 hover:text-amber-400 transition-colors duration-200">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                    <Lock className="h-4 w-4" />
                  </span>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full h-12 border border-zinc-800 rounded-2xl pl-11 pr-4 text-xs font-medium focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 focus:outline-none bg-zinc-900/30 text-white placeholder:text-zinc-600 transition duration-300"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-2xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold text-xs tracking-wider shadow-lg shadow-amber-500/10 hover:shadow-amber-500/25 active:scale-[0.98] transition duration-300 flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  'SIGN IN TO PORTAL'
                )}
              </button>
            </form>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between border-t border-zinc-900 pt-6 mt-6 md:mt-0 gap-4 sm:gap-0">
            <span className="text-xs text-zinc-400">
              No account yet?{' '}
              <Link href="/register" className="font-bold text-amber-500 hover:text-amber-400 transition-colors duration-200">
                Sign Up
              </Link>
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
