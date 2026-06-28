'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, CheckCircle, Loader2, BookOpen, User, HelpCircle } from 'lucide-react';

export default function ApplyForm() {
  const router = useRouter();

  // Form states
  const [charName, setCharName] = useState('');
  const [origin, setOrigin] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [story, setStory] = useState('');
  const [answer1, setAnswer1] = useState('');
  const [answer2, setAnswer2] = useState('');

  // Status states
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/applications/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          charName,
          origin,
          age: parseInt(age, 10),
          gender,
          story,
          answer1,
          answer2
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Gagal mengirimkan aplikasi');
      } else {
        setSuccess('Aplikasi karakter berhasil dikirim! Silakan tunggu admin meninjau pengajuan Anda.');
        setTimeout(() => {
          router.push('/dashboard');
          router.refresh();
        }, 3000);
      }
    } catch {
      setError('Koneksi internet bermasalah');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {success && (
        <div className="flex items-center gap-2 rounded-2xl border border-green-500/20 bg-green-500/5 p-4 text-xs text-green-400 font-medium animate-in fade-in duration-300">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-xs text-red-500 font-medium animate-in fade-in duration-300">
          <ShieldAlert className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Section 1: Character Basics */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <User className="h-5 w-5 text-amber-500" />
          Detail Identitas Karakter
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5" htmlFor="charName">
              Nama Karakter (Format: NamaDepan_NamaBelakang)
            </label>
            <input
              id="charName"
              type="text"
              required
              value={charName}
              onChange={(e) => setCharName(e.target.value)}
              placeholder="Contoh: Ganjar_Prabroro"
              className="w-full h-11 border border-zinc-800 rounded-xl px-4 text-xs font-medium focus:border-amber-500 focus:outline-none bg-zinc-900 text-white transition"
            />
            <span className="text-[10px] text-zinc-500 mt-1 block">Harus diawali huruf kapital di setiap kata, dipisah garis bawah.</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5" htmlFor="origin">
              Kewarganegaraan / Asal
            </label>
            <input
              id="origin"
              type="text"
              required
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="Contoh: Indonesia, Mexico, America"
              className="w-full h-11 border border-zinc-800 rounded-xl px-4 text-xs font-medium focus:border-amber-500 focus:outline-none bg-zinc-900 text-white transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5" htmlFor="age">
              Umur Karakter
            </label>
            <input
              id="age"
              type="number"
              required
              min="18"
              max="99"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="Rentang umur: 18 - 99"
              className="w-full h-11 border border-zinc-800 rounded-xl px-4 text-xs font-medium focus:border-amber-500 focus:outline-none bg-zinc-900 text-white transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5" htmlFor="gender">
              Jenis Kelamin
            </label>
            <select
              id="gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full h-11 border border-zinc-800 rounded-xl px-4 text-xs font-medium focus:border-amber-500 focus:outline-none bg-zinc-900 text-white transition"
            >
              <option value="Male">Laki-Laki (Male)</option>
              <option value="Female">Perempuan (Female)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Section 2: Roleplay Quiz */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-amber-500" />
          Uji Pengetahuan Roleplay (Kuis)
        </h3>

        <div className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5" htmlFor="ans1">
              Pertanyaan 1: Jelaskan apa yang dimaksud dengan Roleplay dan apa perbedaan antara IC (In-Character) dan OOC (Out-of-Character)?
            </label>
            <textarea
              id="ans1"
              required
              rows={3}
              value={answer1}
              onChange={(e) => setAnswer1(e.target.value)}
              placeholder="Berikan jawaban penjelasan Anda secara lengkap..."
              className="w-full border border-zinc-800 rounded-xl p-4 text-xs font-medium focus:border-amber-500 focus:outline-none bg-zinc-900 text-white transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5" htmlFor="ans2">
              Pertanyaan 2: Berikan contoh konkrit tindakan Metagaming (MG) dan Powergaming (PG) yang dilarang di server roleplay.
            </label>
            <textarea
              id="ans2"
              required
              rows={3}
              value={answer2}
              onChange={(e) => setAnswer2(e.target.value)}
              placeholder="Berikan contoh MG dan PG..."
              className="w-full border border-zinc-800 rounded-xl p-4 text-xs font-medium focus:border-amber-500 focus:outline-none bg-zinc-900 text-white transition"
            />
          </div>
        </div>
      </div>

      {/* Section 3: Backstory */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-amber-500" />
          Latar Belakang Karakter (Backstory)
        </h3>
        <p className="text-xs text-zinc-400 mb-4">
          Tuliskan biografi/sejarah karakter Anda secara naratif (min. 200 karakter). Jelaskan dari mana dia berasal, bagaimana masa lalunya, dan apa tujuannya datang ke kota Los Jawa.
        </p>

        <div>
          <textarea
            required
            rows={8}
            value={story}
            onChange={(e) => setStory(e.target.value)}
            placeholder="Tulis biografi karakter Anda di sini secara naratif..."
            className="w-full border border-zinc-800 rounded-xl p-4 text-xs font-medium focus:border-amber-500 focus:outline-none bg-zinc-900 text-white transition"
          />
          <div className="flex justify-between text-[10px] text-zinc-500 mt-1.5">
            <span>Minimum 200 karakter</span>
            <span className={`${story.length >= 200 ? 'text-green-500' : 'text-amber-500'}`}>
              {story.length} Karakter
            </span>
          </div>
        </div>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={loading}
          className="w-full md:w-auto h-12 px-8 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs tracking-wide shadow-md transition flex items-center justify-center cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Kirim Pengajuan Karakter'
          )}
        </button>
      </div>
    </form>
  );
}
