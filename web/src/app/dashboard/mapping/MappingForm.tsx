'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Home, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface PropertyItem {
  type: number;
  typeLabel: string;
  id: number;
  label: string;
}

export default function MappingForm() {
  const router = useRouter();
  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [selectedPropIndex, setSelectedPropIndex] = useState<string>('');
  const [mappingCode, setMappingCode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [fetching, setFetching] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProperties() {
      try {
        const res = await fetch('/api/mapping/properties');
        if (res.ok) {
          const data = await res.json();
          setProperties(data.properties || []);
        } else {
          setError('Gagal memuat daftar properti Anda.');
        }
      } catch (error) {
        console.error('Error fetching properties:', error);
        setError('Terjadi kesalahan saat menghubungi server.');
      } finally {
        setFetching(false);
      }
    };
    fetchProperties();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedPropIndex) {
      setError('Silakan pilih salah satu properti terlebih dahulu.');
      return;
    }
    if (!mappingCode.trim()) {
      setError('Silakan isi kode mapping properti Anda.');
      return;
    }

    setLoading(true);
    const selectedProp = properties[parseInt(selectedPropIndex)];

    try {
      const res = await fetch('/api/mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyType: selectedProp.type,
          propertyId: selectedProp.id,
          mappingCode,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess('Permintaan mapping berhasil dikirim! Catatan riwayat status akan diupdate.');
        setMappingCode('');
        router.refresh();
      } else {
        setError(data.error || 'Gagal mengirim pengajuan.');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setError('Terjadi kesalahan sistem saat memproses form.');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
        <p className="text-sm font-semibold text-zinc-400">Anda tidak memiliki properti saat ini</p>
        <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto leading-relaxed">
          Karakter Anda harus membeli properti (rumah, bisnis, atau unit apartemen) di dalam game sebelum dapat mengajukan request mapping.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-xs text-red-400">
          <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
          <div className="leading-relaxed">{error}</div>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2.5 rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-xs text-green-400">
          <CheckCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
          <div className="leading-relaxed">{success}</div>
        </div>
      )}

      <div>
        <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
          Pilih Properti Anda
        </label>
        <select
          value={selectedPropIndex}
          onChange={(e) => setSelectedPropIndex(e.target.value)}
          className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white focus:border-amber-500 focus:outline-none transition"
        >
          <option value="">-- Pilih Properti --</option>
          {properties.map((prop, idx) => (
            <option key={idx} value={idx}>
              [{prop.typeLabel}] {prop.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
          Kode Mapping (CreateDynamicObject / CreateObject)
        </label>
        <textarea
          value={mappingCode}
          onChange={(e) => setMappingCode(e.target.value)}
          placeholder="CreateDynamicObject(1337, 2452.12, -1650.45, 13.56, 0.0, 0.0, 90.0);"
          rows={12}
          className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-xs font-mono text-zinc-200 focus:border-amber-500 focus:outline-none transition leading-relaxed"
        />
        <div className="mt-2 rounded-lg bg-zinc-900 border border-zinc-800/80 p-3">
          <span className="text-[10px] font-bold text-zinc-500 block uppercase mb-1">Panduan Pengisian:</span>
          <ul className="list-disc pl-4 space-y-1 text-[10px] text-zinc-400">
            <li>Gunakan baris kode hasil ekspor peta MTA atau Texture Studio.</li>
            <li>Hanya baris dengan sintaks <code className="font-mono text-zinc-200">CreateDynamicObject(...)</code> atau <code className="font-mono text-zinc-200">CreateObject(...)</code> yang akan diambil.</li>
            <li>Dilarang menggunakan Object ID terlarang (seperti api dynamic, dinding transparan bermasalah, dsb.).</li>
            <li>Setelah dikirim, ajukan pemeriksaan in-game menggunakan perintah admin agar ditinjau.</li>
          </ul>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/50 disabled:cursor-not-allowed text-black py-3.5 text-xs font-bold transition shadow-md"
      >
        {loading ? (
          <>
            <Loader2 className="h-4.5 w-4.5 animate-spin" />
            Mengirim Pengajuan...
          </>
        ) : (
          <>
            <Home className="h-4.5 w-4.5" />
            Kirim Pengajuan Mapping
          </>
        )}
      </button>
    </form>
  );
}
