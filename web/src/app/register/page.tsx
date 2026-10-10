'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldAlert, Loader2, ArrowLeft, ArrowRight, User, Lock, Mail } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
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
    <div className="min-h-screen w-full bg-[#070709] relative flex items-center justify-center p-4 sm:p-6 md:p-8 font-sans selection:bg-amber-500 selection:text-black overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[130px] pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-amber-600/5 rounded-full blur-[130px] pointer-events-none animate-pulse-slow" />

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
              <Link href="/login" className="text-zinc-300 hover:text-white transition-colors duration-200">Sign In</Link>
              <Link href="/login" className="h-8 px-4 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm flex items-center justify-center hover:bg-amber-500 hover:text-zinc-950 hover:border-amber-500 transition duration-300">
                Join Us
              </Link>
            </div>
          </div>

          <div className="relative z-10 my-auto max-w-xs space-y-3">
            <div className="inline-block px-2.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-[10px] font-black uppercase tracking-widest text-amber-400">
              UCP Portal
            </div>
            <h3 className="text-2xl font-black tracking-tight leading-tight text-white">
              Start Your Greatest Adventure Here
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed font-medium">
              Create your UCP account today, then link it to your in-game character to start enjoying the best roleplay experience.
            </p>
          </div>

          <div className="relative z-10 flex items-end justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center font-black text-zinc-950 text-xs shadow-lg shadow-amber-500/20">LJ</div>
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

        {/* Right Side: Register Form */}
        <div className="w-full md:w-1/2 flex flex-col justify-between p-8 sm:p-10 bg-zinc-950 text-zinc-100 relative">

          <div className="flex items-center justify-between mb-8 md:mb-0">
            <span className="text-base font-black tracking-wider text-white">
              UCP<span className="text-amber-500">PORTAL</span>
            </span>
          </div>

          <div className="max-w-sm w-full mx-auto my-auto space-y-4">
            {success ? (
              <div className="flex flex-col items-center gap-5 py-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                  <Mail className="h-8 w-8 text-green-400" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-white">Check Your Email</h2>
                  <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                    We sent a verification link to <span className="text-amber-400 font-semibold">{email}</span>. Please verify your email to activate your account.
                  </p>
                </div>
                <Link
                  href="/login"
                  className="w-full h-11 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-extrabold text-xs tracking-wider flex items-center justify-center transition duration-300"
                >
                  GO TO SIGN IN
                </Link>
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <h2 className="text-2xl font-extrabold text-white tracking-tight">Create UCP Account</h2>
                  <p className="text-xs text-zinc-400 font-medium">Fill in the form below to register your UCP account.</p>
                </div>

                {error && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400 font-medium animate-fade-in">
                    <ShieldAlert className="h-4 w-4 flex-shrink-0 mt-0.5 text-red-500" />
                    <span>{error}</span>
                  </div>
                )}

                <form className="space-y-3.5" onSubmit={handleSubmit}>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest" htmlFor="username">UCP Username</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"><User className="h-4 w-4" /></span>
                      <input
                        id="username" type="text" required
                        value={username} onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter UCP username"
                        className="w-full h-11 border border-zinc-800 rounded-2xl pl-11 pr-4 text-xs font-medium focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 focus:outline-none bg-zinc-900/30 text-white placeholder:text-zinc-600 transition duration-300"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest" htmlFor="email">Email Address</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"><Mail className="h-4 w-4" /></span>
                      <input
                        id="email" type="email" required
                        value={email} onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full h-11 border border-zinc-800 rounded-2xl pl-11 pr-4 text-xs font-medium focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 focus:outline-none bg-zinc-900/30 text-white placeholder:text-zinc-600 transition duration-300"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest" htmlFor="password">Password</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"><Lock className="h-4 w-4" /></span>
                      <input
                        id="password" type="password" required
                        value={password} onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min. 6 characters"
                        className="w-full h-11 border border-zinc-800 rounded-2xl pl-11 pr-4 text-xs font-medium focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 focus:outline-none bg-zinc-900/30 text-white placeholder:text-zinc-600 transition duration-300"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest" htmlFor="confirmPassword">Confirm Password</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"><Lock className="h-4 w-4" /></span>
                      <input
                        id="confirmPassword" type="password" required
                        value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repeat password"
                        className="w-full h-11 border border-zinc-800 rounded-2xl pl-11 pr-4 text-xs font-medium focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 focus:outline-none bg-zinc-900/30 text-white placeholder:text-zinc-600 transition duration-300"
                      />
                    </div>
                  </div>

                  <button
                    type="submit" disabled={loading}
                    className="w-full h-11 rounded-2xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold text-xs tracking-wider shadow-lg shadow-amber-500/10 hover:shadow-amber-500/25 active:scale-[0.98] transition duration-300 flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'CREATE ACCOUNT'}
                  </button>
                </form>
              </>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between border-t border-zinc-900 pt-6 mt-6 md:mt-0 gap-4 sm:gap-0">
            <span className="text-xs text-zinc-400">
              Already have an account?{' '}
              <Link href="/login" className="font-bold text-amber-500 hover:text-amber-400 transition-colors duration-200">Sign In</Link>
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
