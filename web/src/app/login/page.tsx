'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldAlert, Loader2, ArrowLeft, ArrowRight, User, Lock, Globe } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState('ID');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
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
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err) {
      setError('Koneksi internet bermasalah');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#070709] relative flex items-center justify-center p-4 sm:p-6 md:p-8 font-sans selection:bg-amber-500 selection:text-black overflow-hidden">
      
      {/* Background Decorative Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[130px] pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-amber-600/5 rounded-full blur-[130px] pointer-events-none animate-pulse-slow" />

      {/* Container Card */}
      <div className="w-full max-w-5xl bg-zinc-950/65 backdrop-blur-xl rounded-[32px] overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.6)] flex flex-col md:flex-row h-auto md:h-[680px] border border-zinc-800/80 relative z-10 animate-fade-in-up">
        
        {/* Left Side: Artwork (Inspired by GTA SA / Los Jawa aesthetic) */}
        <div 
          className="relative hidden md:flex md:w-1/2 flex-col justify-between p-10 text-white overflow-hidden bg-cover bg-center rounded-[24px] m-3 shadow-inner"
          style={{ backgroundImage: "url('/login_artwork.png')" }}
        >
          {/* Overlay to ensure text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/95 via-zinc-950/40 to-zinc-950/70 pointer-events-none rounded-[24px]" />

          {/* Top Row */}
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

          {/* Center visual accent */}
          <div className="relative z-10 my-auto max-w-xs space-y-3">
            <div className="inline-block px-2.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-[10px] font-black uppercase tracking-widest text-amber-400 animate-fade-in [animation-delay:200ms]">
              UCP Portal
            </div>
            <h3 className="text-2xl font-black tracking-tight leading-tight text-white animate-fade-in [animation-delay:300ms]">
              Satu Akun Untuk Semua Karakter Anda
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed font-medium animate-fade-in [animation-delay:400ms]">
              Kelola status karakter, verifikasi UCP, ajukan permohonan faction, dan lihat data statistik secara langsung.
            </p>
          </div>

          {/* Bottom Row */}
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

            {/* Pagination buttons */}
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
          
          {/* Top Row: Brand & Lang */}
          <div className="flex items-center justify-between mb-8 md:mb-0">
            <span className="text-base font-black tracking-wider text-white">
              UCP<span className="text-amber-500">PORTAL</span>
            </span>
            
            {/* Lang Dropdown Capsule */}
            <div className="relative">
              <button 
                onClick={() => setLang(lang === 'ID' ? 'EN' : 'ID')}
                className="h-8 px-3.5 rounded-full border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 text-xs font-bold text-zinc-300 hover:text-white flex items-center gap-1.5 transition duration-300 cursor-pointer"
              >
                <Globe className="h-3 w-3 text-amber-500" />
                <span>{lang === 'ID' ? 'INDONESIA' : 'ENGLISH'}</span>
                <span className="text-[10px] text-zinc-500">▾</span>
              </button>
            </div>
          </div>

          {/* Form Content */}
          <div className="max-w-sm w-full mx-auto my-auto space-y-6">
            <div className="space-y-1">
              <h2 className="text-3xl font-extrabold text-white tracking-tight">
                {lang === 'ID' ? 'Masuk Portal' : 'Sign In'}
              </h2>
              <p className="text-xs text-zinc-400 font-medium">
                {lang === 'ID' 
                  ? 'Masukkan kredensial UCP Anda untuk melanjutkan' 
                  : 'Enter your UCP credentials to continue'}
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/5 p-3.5 text-xs text-red-400 font-medium animate-fade-in">
                <ShieldAlert className="h-4 w-4 flex-shrink-0 mt-0.5 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest" htmlFor="username">
                  Username UCP
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
                    placeholder={lang === 'ID' ? "Masukkan nama UCP" : "Enter UCP username"}
                    className="w-full h-12 border border-zinc-800 rounded-2xl pl-11 pr-4 text-xs font-medium focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 focus:outline-none bg-zinc-900/30 text-white placeholder:text-zinc-600 transition duration-300"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest" htmlFor="password">
                    {lang === 'ID' ? 'Kata Sandi' : 'Password'}
                  </label>
                  <Link href="/#forgot" className="text-[10px] font-bold text-amber-500 hover:text-amber-400 transition-colors duration-200">
                    {lang === 'ID' ? 'Lupa password?' : 'Forgot password?'}
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
                    placeholder={lang === 'ID' ? "Masukkan kata sandi" : "Enter password"}
                    className="w-full h-12 border border-zinc-800 rounded-2xl pl-11 pr-4 text-xs font-medium focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 focus:outline-none bg-zinc-900/30 text-white placeholder:text-zinc-600 transition duration-300"
                  />
                </div>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-2xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold text-xs tracking-wider shadow-lg shadow-amber-500/10 hover:shadow-amber-500/25 active:scale-[0.98] transition duration-300 flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  lang === 'ID' ? 'MASUK PORTAL' : 'SIGN IN TO PORTAL'
                )}
              </button>
            </form>
          </div>

          {/* Bottom Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between border-t border-zinc-900 pt-6 mt-6 md:mt-0 gap-4 sm:gap-0">
            <span className="text-xs text-zinc-400">
              {lang === 'ID' ? 'Belum punya akun UCP?' : 'No account yet?'}{' '}
              <Link href="/register" className="font-bold text-amber-500 hover:text-amber-400 transition-colors duration-200">
                {lang === 'ID' ? 'Daftar Sekarang' : 'Sign Up'}
              </Link>
            </span>
            
            {/* Social Icons */}
            <div className="flex items-center gap-4 text-zinc-500">
              <a href="#" className="hover:text-amber-500 transition-colors duration-300">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.8c4.56-.93 8-4.96 8-9.8z"/></svg>
              </a>
              <a href="#" className="hover:text-amber-500 transition-colors duration-300">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
              </a>
              <a href="#" className="hover:text-amber-500 transition-colors duration-300">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051c-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              </a>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
