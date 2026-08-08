'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  UserPlus,
  Search,
  Shield,
  Edit2,
  Trash2,
  AlertTriangle,
  Loader2,
  CheckCircle,
  X,
  Users,
  ShieldAlert,
  Crown
} from 'lucide-react';

interface AdminAccount {
  ID: number;
  Username: string;
  Email: string;
  Admin: number;
  RegisterDate: string;
}

interface RosterClientProps {
  initialAdmins: AdminAccount[];
  currentAdminLevel: number;
}

export function getAdminRoleInfo(level: number) {
  switch (level) {
    case 1337:
      return { label: 'Head Admin', bg: 'bg-red-500/10 border-red-500/30 text-red-400', badgeColor: 'bg-red-500', icon: Crown };
    case 1336:
      return { label: 'Deputy Head Admin', bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400', badgeColor: 'bg-amber-500', icon: ShieldCheck };
    case 4:
      return { label: 'Senior Admin 2', bg: 'bg-purple-500/10 border-purple-500/30 text-purple-400', badgeColor: 'bg-purple-500', icon: Shield };
    case 3:
      return { label: 'Senior Admin', bg: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400', badgeColor: 'bg-indigo-500', icon: Shield };
    case 2:
      return { label: 'Junior Admin', bg: 'bg-blue-500/10 border-blue-500/30 text-blue-400', badgeColor: 'bg-blue-500', icon: Shield };
    case 1:
      return { label: 'Intern / Trial Admin', bg: 'bg-teal-500/10 border-teal-500/30 text-teal-400', badgeColor: 'bg-teal-500', icon: Shield };
    case -1:
      return { label: 'Tester / Volunteer', bg: 'bg-zinc-800 border-zinc-700 text-zinc-400', badgeColor: 'bg-zinc-600', icon: Shield };
    default:
      return { label: `Admin Lv. ${level}`, bg: 'bg-zinc-800 border-zinc-700 text-zinc-400', badgeColor: 'bg-zinc-600', icon: Shield };
  }
}

export default function RosterClient({ initialAdmins, currentAdminLevel }: RosterClientProps) {
  const router = useRouter();
  const [admins, setAdmins] = useState<AdminAccount[]>(initialAdmins);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newAdminLevel, setNewAdminLevel] = useState<number>(1);

  const [editAdmin, setEditAdmin] = useState<AdminAccount | null>(null);
  const [editAdminLevel, setEditAdminLevel] = useState<number>(1);

  const [removeAdmin, setRemoveAdmin] = useState<AdminAccount | null>(null);

  // Status & loading
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filter admins
  const filteredAdmins = admins.filter(admin =>
    admin.Username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (admin.Email && admin.Email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Stats calculation
  const totalStaff = admins.length;
  const headAdmins = admins.filter(a => a.Admin === 1337).length;
  const deputyHeads = admins.filter(a => a.Admin === 4).length;
  const seniorAdmins = admins.filter(a => a.Admin === 3).length;
  const juniorAdmins = admins.filter(a => a.Admin <= 2 && a.Admin > 0).length;

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/roster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          username: newUsername,
          newAdminLevel,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to appoint admin');
      } else {
        setSuccess(data.message);
        setNewUsername('');
        setIsAddModalOpen(false);
        refreshRoster();
      }
    } catch {
      setError('Network error. Failed to add admin.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAdmin) return;
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/roster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          targetUserId: editAdmin.ID,
          newAdminLevel: editAdminLevel,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to update admin rank');
      } else {
        setSuccess(data.message);
        setEditAdmin(null);
        refreshRoster();
      }
    } catch {
      setError('Network error. Failed to update admin.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAdmin = async () => {
    if (!removeAdmin) return;
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/roster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove',
          targetUserId: removeAdmin.ID,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to demote admin');
      } else {
        setSuccess(data.message);
        setRemoveAdmin(null);
        refreshRoster();
      }
    } catch {
      setError('Network error. Failed to demote admin.');
    } finally {
      setLoading(false);
    }
  };

  const refreshRoster = async () => {
    try {
      const res = await fetch('/api/admin/roster');
      const data = await res.json();
      if (res.ok && data.admins) {
        setAdmins(data.admins);
      }
      router.refresh();
    } catch (err) {
      console.error('Error refreshing roster:', err);
    }
  };

  return (
    <div className="space-y-8">
      {/* Alert Notices */}
      {success && (
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-green-500/20 bg-green-500/5 p-4 text-xs text-green-400 font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess('')} className="text-zinc-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-xs text-red-500 font-medium">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-zinc-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Staff Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
            <span>Total Staff</span>
            <Users className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-white mt-2">{totalStaff}</p>
        </div>

        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
          <div className="flex items-center justify-between text-red-400 text-xs font-semibold">
            <span>Head Admin</span>
            <Crown className="h-4 w-4 text-red-400" />
          </div>
          <p className="text-2xl font-black text-white mt-2">{headAdmins}</p>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="flex items-center justify-between text-amber-400 text-xs font-semibold">
            <span>Deputy Head</span>
            <ShieldCheck className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-white mt-2">{deputyHeads}</p>
        </div>

        <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4">
          <div className="flex items-center justify-between text-purple-400 text-xs font-semibold">
            <span>Senior Admin</span>
            <Shield className="h-4 w-4 text-purple-400" />
          </div>
          <p className="text-2xl font-black text-white mt-2">{seniorAdmins}</p>
        </div>

        <div className="col-span-2 md:col-span-1 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
          <div className="flex items-center justify-between text-blue-400 text-xs font-semibold">
            <span>Junior/Trial</span>
            <Shield className="h-4 w-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-white mt-2">{juniorAdmins}</p>
        </div>
      </div>

      {/* Roster Controls: Search & Appoint Button */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search staff by username..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full h-11 pl-10 pr-4 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition"
          />
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="w-full sm:w-auto h-11 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <UserPlus className="h-4 w-4" />
          Appoint New Administrator
        </button>
      </div>

      {/* Administrator Roster List Table */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 overflow-hidden">
        {filteredAdmins.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">
            <Shield className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-semibold">No administrator accounts found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-900 text-zinc-500 font-semibold uppercase tracking-wider">
                  <th className="pb-3 pr-4">Administrator</th>
                  <th className="pb-3 px-4">Rank Level</th>
                  <th className="pb-3 px-4">Email Address</th>
                  <th className="pb-3 px-4">Registered</th>
                  <th className="pb-3 pl-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {filteredAdmins.map((admin) => {
                  const role = getAdminRoleInfo(admin.Admin);
                  const Icon = role.icon;
                  const isProtectedHeadAdmin = admin.Admin === 1337 && currentAdminLevel < 1337;

                  return (
                    <tr key={admin.ID} className="hover:bg-zinc-900/40 transition">
                      {/* Username */}
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-9 w-9 rounded-xl border flex items-center justify-center ${role.bg}`}>
                            <Icon className="h-4.5 w-4.5" />
                          </div>
                          <div>
                            <span className="font-bold text-white text-sm block">{admin.Username}</span>
                            <span className="text-[10px] text-zinc-500">ID #{admin.ID}</span>
                          </div>
                        </div>
                      </td>

                      {/* Rank Level Badge */}
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${role.bg}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${role.badgeColor}`} />
                          {role.label} (Lv. {admin.Admin})
                        </span>
                      </td>

                      {/* Email */}
                      <td className="py-4 px-4 text-zinc-400 font-medium">
                        {admin.Email || <span className="text-zinc-650 italic">No email set</span>}
                      </td>

                      {/* Registered Date */}
                      <td className="py-4 px-4 text-zinc-500">
                        {admin.RegisterDate
                          ? new Date(admin.RegisterDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
                          : 'N/A'}
                      </td>

                      {/* Action buttons */}
                      <td className="py-4 pl-4 text-right">
                        {isProtectedHeadAdmin ? (
                          <span className="text-[10px] text-zinc-600 italic">Protected (Head Admin)</span>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditAdmin(admin);
                                setEditAdminLevel(admin.Admin);
                              }}
                              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition cursor-pointer"
                              title="Edit Admin Rank Level"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setRemoveAdmin(admin)}
                              className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition cursor-pointer"
                              title="Demote Admin to Regular Player"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- MODAL 1: APPOINT NEW ADMIN --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-amber-500" />
                Appoint New Administrator
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-zinc-500 hover:text-white transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddAdmin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  UCP Account Username
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter exact player UCP username"
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  className="w-full h-11 px-4 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  Admin Rank Level
                </label>
                <select
                  value={newAdminLevel}
                  onChange={e => setNewAdminLevel(parseInt(e.target.value, 10))}
                  className="w-full h-11 px-4 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 transition cursor-pointer"
                >
                  <option value={1}>Level 1 - Intern / Trial Admin</option>
                  <option value={2}>Level 2 - Junior Admin</option>
                  <option value={3}>Level 3 - Senior Admin</option>
                  <option value={4}>Level 4 - Senior Admin 2</option>
                  <option value={1336}>Level 1336 - Deputy Head Admin</option>
                  {currentAdminLevel === 1337 && (
                    <option value={1337}>Level 1337 - Head Admin / Executive</option>
                  )}
                  <option value={-1}>Level -1 - Tester / Volunteer</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="h-10 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="h-10 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs text-black font-bold transition flex items-center justify-center cursor-pointer disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: EDIT ADMIN RANK LEVEL --- */}
      {editAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-amber-500" />
                Update Rank Level: {editAdmin.Username}
              </h3>
              <button
                onClick={() => setEditAdmin(null)}
                className="text-zinc-500 hover:text-white transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateAdmin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  Select New Rank Level
                </label>
                <select
                  value={editAdminLevel}
                  onChange={e => setEditAdminLevel(parseInt(e.target.value, 10))}
                  className="w-full h-11 px-4 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 transition cursor-pointer"
                >
                  <option value={1}>Level 1 - Intern / Trial Admin</option>
                  <option value={2}>Level 2 - Junior Admin</option>
                  <option value={3}>Level 3 - Senior Admin</option>
                  <option value={4}>Level 4 - Senior Admin 2</option>
                  <option value={1336}>Level 1336 - Deputy Head Admin</option>
                  {currentAdminLevel === 1337 && (
                    <option value={1337}>Level 1337 - Head Admin / Executive</option>
                  )}
                  <option value={-1}>Level -1 - Tester / Volunteer</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditAdmin(null)}
                  className="h-10 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="h-10 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs text-black font-bold transition flex items-center justify-center cursor-pointer disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 3: CONFIRM DEMOTE ADMIN --- */}
      {removeAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2 text-red-500">
                <AlertTriangle className="h-5 w-5" />
                Demote Administrator
              </h3>
              <button
                onClick={() => setRemoveAdmin(null)}
                className="text-zinc-500 hover:text-white transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Are you sure you want to demote <strong className="text-white">{removeAdmin.Username}</strong> (Currently Lv. {removeAdmin.Admin}) to a Regular Player? Their administrator permissions in game and website will be immediately revoked.
            </p>

            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setRemoveAdmin(null)}
                className="h-10 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRemoveAdmin}
                disabled={loading}
                className="h-10 px-5 rounded-xl bg-red-600 hover:bg-red-500 text-xs text-white font-bold transition flex items-center justify-center cursor-pointer disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Yes, Demote Admin'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
