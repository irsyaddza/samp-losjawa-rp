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
  const [customPropertyType, setCustomPropertyType] = useState<string>('1');
  const [customPropertyId, setCustomPropertyId] = useState<string>('');
  const [customTitle, setCustomTitle] = useState<string>('');
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
          setError('Failed to load your property list.');
        }
      } catch (error) {
        console.error('Error fetching properties:', error);
        setError('An error occurred while contacting the server.');
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
      setError('Please select a property first.');
      return;
    }
    if (selectedPropIndex === 'custom') {
      if (customPropertyType === '4') {
        if (!customTitle.trim()) {
          setError('Please enter a custom title for your mapping.');
          return;
        }
      } else {
        if (!customPropertyId.trim()) {
          setError('Please enter your property ID.');
          return;
        }
      }
    }
    if (!mappingCode.trim()) {
      setError('Please enter your property mapping code.');
      return;
    }

    setLoading(true);

    let propType = 1;
    let propId = 0;
    let titleStr = '';

    if (selectedPropIndex === 'custom') {
      propType = parseInt(customPropertyType);
      if (propType === 4) {
        propId = 0;
        titleStr = customTitle.trim();
      } else {
        propId = parseInt(customPropertyId);
      }
    } else {
      const selectedProp = properties[parseInt(selectedPropIndex)];
      propType = selectedProp.type;
      propId = selectedProp.id;
    }

    try {
      const res = await fetch('/api/mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyType: propType,
          propertyId: propId,
          mappingCode,
          customTitle: titleStr || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess('Mapping request submitted successfully! Status history will be updated.');
        setMappingCode('');
        setCustomTitle('');
        router.refresh();
      } else {
        setError(data.error || 'Failed to submit request.');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setError('A system error occurred while processing the form.');
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
          Select Your Property
        </label>
        <select
          value={selectedPropIndex}
          onChange={(e) => setSelectedPropIndex(e.target.value)}
          className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white focus:border-amber-500 focus:outline-none transition"
        >
          <option value="">-- Select Property --</option>
          {properties.map((prop, idx) => (
            <option key={idx} value={idx}>
              [{prop.typeLabel}] {prop.label}
            </option>
          ))}
          <option value="custom">[Custom Entry / Custom ID]</option>
        </select>
      </div>

      {selectedPropIndex === 'custom' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
              Custom Property Type
            </label>
            <select
              value={customPropertyType}
              onChange={(e) => setCustomPropertyType(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white focus:border-amber-500 focus:outline-none transition"
            >
              <option value="1">House</option>
              <option value="2">Business</option>
              <option value="3">Apartment Unit</option>
              <option value="4">[Custom Object / Free Title]</option>
            </select>
          </div>
          {customPropertyType === '4' ? (
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Custom Title
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="e.g. Palomino Church Interior"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white focus:border-amber-500 focus:outline-none transition"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Custom Property ID
              </label>
              <input
                type="number"
                value={customPropertyId}
                onChange={(e) => setCustomPropertyId(e.target.value)}
                placeholder="e.g. 12"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white focus:border-amber-500 focus:outline-none transition"
              />
            </div>
          )}
        </div>
      )}

      <div>
        <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
          Mapping Code (CreateDynamicObject / CreateObject)
        </label>
        <textarea
          value={mappingCode}
          onChange={(e) => setMappingCode(e.target.value)}
          placeholder="CreateDynamicObject(1337, 2452.12, -1650.45, 13.56, 0.0, 0.0, 90.0);"
          rows={12}
          className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-xs font-mono text-zinc-200 focus:border-amber-500 focus:outline-none transition leading-relaxed"
        />
        <div className="mt-2 rounded-lg bg-zinc-900 border border-zinc-800/80 p-3">
          <span className="text-[10px] font-bold text-zinc-500 block uppercase mb-1">Guidelines:</span>
          <ul className="list-disc pl-4 space-y-1 text-[10px] text-zinc-400">
            <li>Use MTA map export or Texture Studio code lines.</li>
            <li>Only lines matching <code className="font-mono text-zinc-200">CreateDynamicObject(...)</code> or <code className="font-mono text-zinc-200">CreateObject(...)</code> will be processed.</li>
            <li>Restricted Object IDs (e.g. dynamic fire, bugged collision walls) are prohibited.</li>
            <li>After submission, request in-game admin review to inspect and apply your mapping.</li>
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
            Submitting Request...
          </>
        ) : (
          <>
            <Home className="h-4.5 w-4.5" />
            Submit Mapping Request
          </>
        )}
      </button>
    </form>
  );
}
