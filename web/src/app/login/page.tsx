'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldAlert, Loader2, ArrowLeftRight, ArrowRight, ArrowLeft } from 'lucide-react';

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
    <div className="min-h-screen w-full bg-[#f1f3f9] flex items-center justify-center p-4 sm:p-6 md:p-8 font-sans selection:bg-[#ea4335] selection:text-white">
      {/* Container Card */}
      <div className="w-full max-w-5xl bg-white rounded-[32px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex flex-col md:flex-row h-auto md:h-[700px] border border-zinc-100">
        
        {/* Left Side: Artwork (Inspired by Screenshot) */}
        <div 
          className="relative hidden md:flex md:w-1/2 flex-col justify-between p-10 text-white overflow-hidden bg-cover bg-center rounded-[24px] m-3"
          style={{ backgroundImage: "url('/login_artwork.jpg')" }}
        >
          {/* Overlay to ensure text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/60 pointer-events-none rounded-[24px]" />

          {/* Top Row */}
          <div className="relative z-10 flex items-center justify-between">
            <Link href="/" className="text-xs font-black tracking-widest uppercase text-white/90 hover:text-white transition">
              LOS JAWA RP
            </Link>
            <div className="flex items-center gap-4 text-xs font-bold">
              <Link href="/register" className="text-white/80 hover:text-white transition">
                Sign Up
              </Link>
              <Link href="/register" className="h-8 px-4 rounded-full border border-white/40 flex items-center justify-center hover:bg-white hover:text-zinc-950 transition duration-200">
                Join Us
              </Link>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="relative z-10 flex items-end justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-500 flex items-center justify-center font-bold text-black text-xs shadow-md border border-white/20">
                LJ
              </div>
              <div>
                <h4 className="text-xs font-bold text-white tracking-wide">Los Jawa RP UCP</h4>
                <p className="text-[10px] text-white/60">Official Website Portal</p>
              </div>
            </div>

            {/* Pagination buttons (mock matching screenshot) */}
            <div className="flex items-center gap-2">
              <button className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 transition text-white/80 hover:text-white cursor-pointer">
                <ArrowLeft className="h-3.5 w-3.5" />
              </button>
              <button className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 transition text-white/80 hover:text-white cursor-pointer">
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Login Form (Inspired by Screenshot) */}
        <div className="w-full md:w-1/2 flex flex-col justify-between p-8 sm:p-10 bg-white text-zinc-900 relative">
          
          {/* Top Row: Brand & Lang */}
          <div className="flex items-center justify-between mb-8 md:mb-0">
            <span className="text-lg font-black tracking-wider text-zinc-950">
              UCP<span className="text-[#ea4335]">PORTAL</span>
            </span>
            
            {/* Lang Dropdown Capsule */}
            <div className="relative">
              <button 
                onClick={() => setLang(lang === 'ID' ? 'EN' : 'ID')}
                className="h-8 px-3 rounded-full border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-xs font-bold text-zinc-700 flex items-center gap-1 transition duration-200 cursor-pointer"
              >
                🇬🇧 {lang} ▾
              </button>
            </div>
          </div>

          {/* Form Content */}
          <div className="max-w-sm w-full mx-auto my-auto space-y-6">
            <div className="text-center md:text-left">
              <h2 className="text-3xl font-black text-zinc-950 tracking-tight">
                Hi Player
              </h2>
              <p className="text-xs text-zinc-500 mt-1.5 font-medium">
                Selamat datang kembali di Los Jawa Roleplay UCP
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-500 font-medium">
                <ShieldAlert className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wide mb-1.5" htmlFor="username">
                  Username UCP
                </label>
                <input
                  id="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username UCP Anda"
                  className="w-full h-12 border border-zinc-200 rounded-2xl px-4 text-xs font-medium focus:border-zinc-400 focus:outline-none bg-zinc-50 text-zinc-900 transition"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wide" htmlFor="password">
                    Kata Sandi
                  </label>
                  <Link href="/#forgot" className="text-[10px] font-bold text-[#ea4335] hover:underline">
                    Lupa password?
                  </Link>
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi Anda"
                  className="w-full h-12 border border-zinc-200 rounded-2xl px-4 text-xs font-medium focus:border-zinc-400 focus:outline-none bg-zinc-50 text-zinc-900 transition"
                />
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-2xl bg-[#ea4335] hover:bg-[#d93025] text-white font-bold text-xs tracking-wide shadow-md shadow-red-500/10 hover:shadow-red-500/20 transition duration-200 flex items-center justify-center cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  'Login'
                )}
              </button>
            </form>

            <div className="flex items-center my-4">
              <div className="flex-1 border-t border-zinc-150" />
              <span className="px-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">atau</span>
              <div className="flex-1 border-t border-zinc-150" />
            </div>

            {/* Mock Google Login matching screenshot */}
            <button className="w-full h-12 border border-zinc-200 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold text-zinc-700 bg-white hover:bg-zinc-50 hover:border-zinc-300 transition duration-200 cursor-pointer">
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69a5.74 5.74 0 0 1-2.5 3.77v3.13h4.03c2.37-2.18 3.73-5.39 3.73-9.08z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-4.03-3.13c-1.12.75-2.56 1.2-3.93 1.2-3.03 0-5.6-2.05-6.51-4.82H1.31v3.24C3.28 22.31 7.37 24 12 24z" />
                <path fill="#FBBC05" d="M5.49 14.34A7.14 7.14 0 0 1 5.08 12c0-.82.14-1.62.41-2.34V6.42H1.31A11.99 11.99 0 0 0 0 12c0 2.05.52 4 1.31 5.58l4.18-3.24z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.96 1.19 15.24 0 12 0 7.37 0 3.28 1.69 1.31 4.75L5.49 8c.91-2.77 3.48-4.82 6.51-4.82z" />
              </svg>
              Login dengan Google
            </button>
          </div>

          {/* Bottom Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between border-t border-zinc-100 pt-6 mt-6 md:mt-0 gap-4 sm:gap-0">
            <span className="text-xs text-zinc-500">
              Belum punya akun UCP?{' '}
              <Link href="/register" className="font-semibold text-[#ea4335] hover:underline">
                Daftar
              </Link>
            </span>
            
            {/* Social Icons matching screenshot */}
            <div className="flex items-center gap-4 text-zinc-400">
              <a href="#" className="hover:text-zinc-600 transition">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.8c4.56-.93 8-4.96 8-9.8z"/></svg>
              </a>
              <a href="#" className="hover:text-zinc-600 transition">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
              </a>
              <a href="#" className="hover:text-zinc-600 transition">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
              </a>
              <a href="#" className="hover:text-zinc-600 transition">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051c-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              </a>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
