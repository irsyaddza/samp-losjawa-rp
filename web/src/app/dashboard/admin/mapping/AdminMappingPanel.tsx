'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Home, Briefcase, Building, AlertCircle, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp, FileCode, Check, Ban, Loader2 } from 'lucide-react';

interface MappingRequest {
  id: number;
  ucp_name: string;
  property_type: number;
  property_id: number;
  mapping_code: string;
  created_at: string;
  custom_title?: string;
}

interface AdminMappingPanelProps {
  initialRequests: MappingRequest[];
}

export default function AdminMappingPanel({ initialRequests }: AdminMappingPanelProps) {
  const router = useRouter();
  const [requests, setRequests] = useState<MappingRequest[]>(initialRequests);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [adminNote, setAdminNote] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleAction = async (id: number, action: 'approve' | 'reject') => {
    setError(null);
    setSuccess(null);

    if (action === 'reject' && !adminNote.trim()) {
      setError('Please provide a rejection note so the player knows what needs to be fixed.');
      return;
    }

    setActionLoading(id);

    try {
      const res = await fetch('/api/admin/mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          action,
          note: adminNote,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(`Mapping request #${id} has been successfully ${action === 'approve' ? 'approved' : 'rejected'}.`);
        setRequests((prev) => prev.filter((r) => r.id !== id));
        setExpandedId(null);
        setAdminNote('');
        router.refresh();
      } else {
        setError(data.error || 'An error occurred while processing the request.');
      }
    } catch (err) {
      console.error('Error handling admin mapping action:', err);
      setError('Network error while contacting the API.');
    } finally {
      setActionLoading(null);
    }
  };

  if (requests.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-12 text-center">
        <CheckCircle2 className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
        <h3 className="text-base font-bold text-white mb-1">All Clear!</h3>
        <p className="text-xs text-zinc-500">There are currently no pending custom mapping requests.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-xs text-red-400">
          <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
          <div className="leading-relaxed">{error}</div>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2.5 rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-xs text-green-400">
          <CheckCircle2 className="h-4.5 w-4.5 shrink-0 mt-0.5" />
          <div className="leading-relaxed">{success}</div>
        </div>
      )}

      <div className="space-y-4">
        {requests.map((req) => {
          const isExpanded = expandedId === req.id;
          const isLoading = actionLoading === req.id;

          return (
            <div
              key={req.id}
              className={`rounded-2xl border transition duration-200 ${
                isExpanded ? 'border-amber-500/30 bg-zinc-950/90 shadow-lg' : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
              }`}
            >
              {/* Header / Clickable Summary */}
              <div
                onClick={() => {
                  setExpandedId(isExpanded ? null : req.id);
                  setAdminNote('');
                }}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-5 gap-4 cursor-pointer select-none"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{req.ucp_name}</span>
                    <span className="text-[10px] text-zinc-500">•</span>
                    <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                      {req.property_type === 1 && <Home className="h-3.5 w-3.5" />}
                      {req.property_type === 2 && <Briefcase className="h-3.5 w-3.5" />}
                      {req.property_type === 3 && <Building className="h-3.5 w-3.5" />}
                      {req.property_type === 4 && <FileCode className="h-3.5 w-3.5" />}
                      {req.property_type === 4 
                        ? `Custom: ${req.custom_title || 'Untitled'}`
                        : `${req.property_type === 1 ? 'House' : req.property_type === 2 ? 'Business' : 'Apartment'} #${req.property_id}`}
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-500 flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    Submitted: {new Date(req.created_at).toLocaleDateString('en-US', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button className="text-xs font-medium text-zinc-400 hover:text-white transition flex items-center gap-1">
                    {isExpanded ? (
                      <>
                        Hide Details
                        <ChevronUp className="h-4 w-4 text-amber-500" />
                      </>
                    ) : (
                      <>
                        Review & Details
                        <ChevronDown className="h-4 w-4 text-zinc-450" />
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="border-t border-zinc-800 p-5 space-y-6 bg-zinc-900/10">
                  {/* Code Block */}
                  <div>
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-2.5 flex items-center gap-1.5">
                      <FileCode className="h-4 w-4 text-amber-500" />
                      Player Mapping Code:
                    </span>
                    <div className="max-h-72 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 font-mono text-[10px] text-zinc-300 leading-relaxed whitespace-pre select-all">
                      {req.mapping_code}
                    </div>
                  </div>

                  {/* Form Action */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                        Admin Note / Rejection Reason (Required when rejecting)
                      </label>
                      <textarea
                        value={adminNote}
                        onChange={(e) => setAdminNote(e.target.value)}
                        placeholder="e.g. Approved. Code looks clean. OR Rejected. Contains restricted object ID 18688..."
                        rows={3}
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-xs text-white focus:border-amber-500 focus:outline-none transition leading-relaxed"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <button
                        onClick={() => handleAction(req.id, 'approve')}
                        disabled={isLoading === true}
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-600 hover:bg-green-500 disabled:bg-green-600/50 text-white py-3 text-xs font-bold transition shadow-md"
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="h-4 w-4" />
                            Approve
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleAction(req.id, 'reject')}
                        disabled={isLoading === true}
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-red-650 hover:bg-red-500 disabled:bg-red-600/50 text-white py-3 text-xs font-bold transition shadow-md"
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Ban className="h-4 w-4" />
                            Reject
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
