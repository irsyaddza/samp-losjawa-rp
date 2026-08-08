'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Radio,
  Plus,
  Search,
  Play,
  Square,
  Edit2,
  Trash2,
  AlertTriangle,
  Loader2,
  CheckCircle,
  X,
  Volume2,
  Volume1,
  VolumeX,
  ShieldAlert,
  Music,
  Disc,
  ExternalLink
} from 'lucide-react';

interface RadioStation {
  id: number;
  genres_id: number;
  subgenres_id: number;
  station_name: string;
  station_url: string;
}

interface RadioManagerClientProps {
  initialStations: RadioStation[];
}

export const SA_MP_GENRES: Record<number, { name: string; color: string; subgenres: string[] }> = {
  0: {
    name: 'Rock',
    color: 'bg-red-500/10 border-red-500/30 text-red-400',
    subgenres: ['Alternative Rock', 'Hard Rock', 'Classic Rock', 'Indie Rock', 'Punk Rock', 'Death Metal', 'Psychedelic Rock', 'Surf', 'Rockabilly', 'Heavy Metal', 'Gothic Rock', 'Doom Metal']
  },
  1: {
    name: 'Other',
    color: 'bg-zinc-800 border-zinc-700 text-zinc-400',
    subgenres: ['legacy-rp', 'Mash Ups', 'Dance', 'Chiptune', 'Ambient', 'Latin']
  },
  2: {
    name: 'Rhythm & Blues',
    color: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
    subgenres: ['Soul', 'Jazz', 'R&B', 'Electro Swing']
  },
  3: {
    name: 'Urban',
    color: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    subgenres: ['Country', 'Hip Hop', 'Ska', 'Rap', 'Trap', 'Classic Rap', 'Reggae', 'Reggaeton']
  },
  4: {
    name: 'Pop',
    color: 'bg-pink-500/10 border-pink-500/30 text-pink-400',
    subgenres: ['Pop', 'Latin']
  },
  5: {
    name: 'Oldies',
    color: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
    subgenres: ['80s', 'Mixed', '70s', '60s', '90s']
  },
  6: {
    name: 'International',
    color: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400',
    subgenres: ['South Asian', 'Russian', 'Mexican', 'Bosnian', 'Macedonian', 'French', 'Cuban', 'Swedish', 'Arabic', 'Romanian', 'Norwegian', 'Dutch', 'Greek', 'Hebrew', 'Serbian', 'Czech', 'Albanian', 'Spanish', 'Armenian']
  },
  7: {
    name: 'Cultural',
    color: 'bg-teal-500/10 border-teal-500/30 text-teal-400',
    subgenres: ['Instruments']
  },
  8: {
    name: 'Electronic',
    color: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    subgenres: ['House', 'Dance', 'Psychedelic', 'Ambient & Chillout', 'Drum and Bass & Dubs', 'Hard House', 'Progressive', 'Synthwave', 'Dark Alternative']
  },
  9: {
    name: 'Talk',
    color: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    subgenres: ['Scanners', 'News']
  }
};

export default function RadioManagerClient({ initialStations }: RadioManagerClientProps) {
  const router = useRouter();
  const [stations, setStations] = useState<RadioStation[]>(initialStations);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<number | 'all'>('all');

  // Currently playing stream ID for in-browser audio test & volume controls
  const [playingStationId, setPlayingStationId] = useState<number | null>(null);
  const [audioErrorId, setAudioErrorId] = useState<number | null>(null);
  const [volume, setVolume] = useState<number>(0.8);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [genreInput, setGenreInput] = useState(0);
  const [subgenreInput, setSubgenreInput] = useState(0);

  const [editStation, setEditStation] = useState<RadioStation | null>(null);
  const [editName, setEditName] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editGenre, setEditGenre] = useState(0);
  const [editSubgenre, setEditSubgenre] = useState(0);

  const [deleteStation, setDeleteStation] = useState<RadioStation | null>(null);

  // Status & loading
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filter stations
  const filteredStations = stations.filter(st => {
    const matchesSearch = st.station_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      st.station_url.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGenre = selectedGenre === 'all' || st.genres_id === selectedGenre;
    return matchesSearch && matchesGenre;
  });

  const handleAddStation = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/radio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          station_name: nameInput,
          station_url: urlInput,
          genres_id: genreInput,
          subgenres_id: subgenreInput,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to add radio station');
      } else {
        setSuccess(data.message);
        setNameInput('');
        setUrlInput('');
        setIsAddModalOpen(false);
        refreshStations();
      }
    } catch {
      setError('Network error. Failed to add radio station.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editStation) return;
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/radio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'edit',
          id: editStation.id,
          station_name: editName,
          station_url: editUrl,
          genres_id: editGenre,
          subgenres_id: editSubgenre,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to update radio station');
      } else {
        setSuccess(data.message);
        setEditStation(null);
        refreshStations();
      }
    } catch {
      setError('Network error. Failed to update radio station.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStation = async () => {
    if (!deleteStation) return;
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/radio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          id: deleteStation.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to delete radio station');
      } else {
        setSuccess(data.message);
        if (playingStationId === deleteStation.id) {
          setPlayingStationId(null);
        }
        setDeleteStation(null);
        refreshStations();
      }
    } catch {
      setError('Network error. Failed to delete radio station.');
    } finally {
      setLoading(false);
    }
  };

  const refreshStations = async () => {
    try {
      const res = await fetch('/api/admin/radio');
      const data = await res.json();
      if (res.ok && data.stations) {
        setStations(data.stations);
      }
      router.refresh();
    } catch (err) {
      console.error('Error refreshing stations:', err);
    }
  };

  const toggleStreamPlayback = (stId: number) => {
    setAudioErrorId(null);
    if (playingStationId === stId) {
      setPlayingStationId(null);
    } else {
      setPlayingStationId(stId);
    }
  };

  const activePlayingStation = stations.find(s => s.id === playingStationId);

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

      {/* Live Audio Stream Player Bar with Master Volume Control */}
      {playingStationId && activePlayingStation && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 shadow-lg animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500 text-black flex items-center justify-center font-bold shadow-md">
              <Volume2 className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-ping inline-block" />
                Live Stream Test Active
              </p>
              <p className="text-sm font-black text-white">{activePlayingStation.station_name}</p>
            </div>
          </div>

          {/* Volume Controls & Stop Button */}
          <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
            <div className="flex items-center gap-3 bg-zinc-900/90 border border-zinc-800 px-3.5 py-2 rounded-xl">
              <button
                type="button"
                onClick={() => setIsMuted(m => !m)}
                className="text-zinc-400 hover:text-amber-400 transition cursor-pointer"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-4 w-4 text-red-400" />
                ) : volume < 0.5 ? (
                  <Volume1 className="h-4 w-4 text-amber-400" />
                ) : (
                  <Volume2 className="h-4 w-4 text-amber-400" />
                )}
              </button>

              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setVolume(v);
                  if (v > 0) setIsMuted(false);
                }}
                className="w-24 sm:w-32 h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />

              <span className="text-[11px] font-bold text-zinc-300 w-9 text-right font-mono">
                {isMuted ? 'Muted' : `${Math.round(volume * 100)}%`}
              </span>
            </div>

            <button
              onClick={() => setPlayingStationId(null)}
              className="h-10 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-zinc-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
            >
              <Square className="h-3.5 w-3.5 fill-current text-red-400" />
              Stop Test
            </button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
            <span>Total Radio Stations</span>
            <Radio className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-white mt-2">{stations.length}</p>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="flex items-center justify-between text-amber-400 text-xs font-semibold">
            <span>Active SA-MP Stream Links</span>
            <Volume2 className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-white mt-2">{stations.length}</p>
        </div>

        <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4">
          <div className="flex items-center justify-between text-purple-400 text-xs font-semibold">
            <span>PAWN Genres Registered</span>
            <Disc className="h-4 w-4 text-purple-400" />
          </div>
          <p className="text-2xl font-black text-white mt-2">
            {new Set(stations.map(s => s.genres_id)).size} / 10
          </p>
        </div>

        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
          <div className="flex items-center justify-between text-blue-400 text-xs font-semibold">
            <span>In-Game Commands</span>
            <Music className="h-4 w-4 text-blue-400" />
          </div>
          <p className="text-xs font-bold text-zinc-300 mt-2">/setstation & Boombox</p>
        </div>
      </div>

      {/* Controls: Search & SA-MP Genre Filter & Add Button */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search station or URL..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full h-11 pl-10 pr-4 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition"
            />
          </div>

          {/* SA-MP Genre select */}
          <select
            value={selectedGenre}
            onChange={e => setSelectedGenre(e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10))}
            className="w-full sm:w-52 h-11 px-3 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-300 focus:outline-none focus:border-amber-500 transition cursor-pointer"
          >
            <option value="all">All SA-MP Genres (10)</option>
            {Object.entries(SA_MP_GENRES).map(([gId, info]) => (
              <option key={gId} value={gId}>Genre #{gId}: {info.name}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="w-full sm:w-auto h-11 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Add Radio Station
        </button>
      </div>

      {/* Radio Stations List Table */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 overflow-hidden">
        {filteredStations.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">
            <Radio className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-semibold">No radio stations found matching criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-900 text-zinc-500 font-semibold uppercase tracking-wider">
                  <th className="pb-3 pr-4">Station Name</th>
                  <th className="pb-3 px-4">SA-MP Genre & Subgenre</th>
                  <th className="pb-3 px-4">Audio Stream URL</th>
                  <th className="pb-3 px-4 text-center">Web Audio Test</th>
                  <th className="pb-3 pl-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {filteredStations.map((st) => {
                  const genreInfo = SA_MP_GENRES[st.genres_id] || { name: `Genre #${st.genres_id}`, color: 'bg-zinc-800 text-zinc-400', subgenres: [] };
                  const subgenreName = genreInfo.subgenres[st.subgenres_id] || `Subgenre #${st.subgenres_id}`;
                  const isPlaying = playingStationId === st.id;
                  const hasAudioError = audioErrorId === st.id;

                  return (
                    <tr key={st.id} className="hover:bg-zinc-900/40 transition">
                      {/* Name & ID */}
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-9 w-9 rounded-xl border flex items-center justify-center ${genreInfo.color}`}>
                            <Radio className="h-4.5 w-4.5" />
                          </div>
                          <div>
                            <span className="font-bold text-white text-sm block">{st.station_name}</span>
                            <span className="text-[10px] text-zinc-500">Station ID #{st.id}</span>
                          </div>
                        </div>
                      </td>

                      {/* Genre & Subgenre Badge */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${genreInfo.color}`}>
                            {genreInfo.name} (ID {st.genres_id})
                          </span>
                          <span className="text-[10px] text-zinc-400 block font-medium">
                            Subgenre: {subgenreName} (ID {st.subgenres_id})
                          </span>
                        </div>
                      </td>

                      {/* URL Stream */}
                      <td className="py-4 px-4 font-mono text-[11px] text-zinc-400 max-w-xs truncate">
                        <a
                          href={st.station_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-amber-400 transition inline-flex items-center gap-1.5"
                          title={st.station_url}
                        >
                          <span className="truncate">{st.station_url}</span>
                          <ExternalLink className="h-3 w-3 shrink-0 text-zinc-600" />
                        </a>
                      </td>

                      {/* In-Browser Web Audio Test Player */}
                      <td className="py-4 px-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <button
                            onClick={() => toggleStreamPlayback(st.id)}
                            className={`h-8 px-3 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                              isPlaying
                                ? 'bg-amber-500 text-black border-amber-400 animate-pulse'
                                : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700'
                            }`}
                          >
                            {isPlaying ? (
                              <>
                                <Square className="h-3.5 w-3.5 fill-current" />
                                Stop Test
                              </>
                            ) : (
                              <>
                                <Play className="h-3.5 w-3.5 fill-current" />
                                Test Stream
                              </>
                            )}
                          </button>

                          {/* Hidden HTML Audio Element with Volume Ref Binding */}
                          {isPlaying && (
                            <audio
                              src={st.station_url}
                              autoPlay
                              ref={(el) => {
                                if (el) {
                                  el.volume = isMuted ? 0 : volume;
                                }
                              }}
                              onError={() => setAudioErrorId(st.id)}
                              className="hidden"
                            />
                          )}

                          {hasAudioError && (
                            <span className="text-[10px] text-red-400 mt-1">Stream unreachable</span>
                          )}
                        </div>
                      </td>

                      {/* Action buttons */}
                      <td className="py-4 pl-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditStation(st);
                              setEditName(st.station_name);
                              setEditUrl(st.station_url);
                              setEditGenre(st.genres_id);
                              setEditSubgenre(st.subgenres_id);
                            }}
                            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition cursor-pointer"
                            title="Edit Radio Station"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteStation(st)}
                            className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition cursor-pointer"
                            title="Delete Station"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- MODAL 1: ADD RADIO STATION --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Radio className="h-5 w-5 text-amber-500" />
                Add Radio Station
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-zinc-500 hover:text-white transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddStation} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  Station Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Prambors FM / Lofi Girl 24/7"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  className="w-full h-11 px-4 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  Direct Audio Stream URL (MP3 / AAC / Shoutcast)
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://stream.zeno.fm/..."
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  className="w-full h-11 px-4 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                    SA-MP Genre
                  </label>
                  <select
                    value={genreInput}
                    onChange={e => {
                      const gId = parseInt(e.target.value, 10);
                      setGenreInput(gId);
                      setSubgenreInput(0);
                    }}
                    className="w-full h-11 px-3 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 transition cursor-pointer"
                  >
                    {Object.entries(SA_MP_GENRES).map(([gId, info]) => (
                      <option key={gId} value={gId}>{gId}: {info.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                    Subgenre
                  </label>
                  <select
                    value={subgenreInput}
                    onChange={e => setSubgenreInput(parseInt(e.target.value, 10))}
                    className="w-full h-11 px-3 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 transition cursor-pointer"
                  >
                    {SA_MP_GENRES[genreInput]?.subgenres.map((subName, sIdx) => (
                      <option key={sIdx} value={sIdx}>{sIdx}: {subName}</option>
                    ))}
                  </select>
                </div>
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
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Station'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: EDIT RADIO STATION --- */}
      {editStation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-amber-500" />
                Edit Radio Station #{editStation.id}
              </h3>
              <button
                onClick={() => setEditStation(null)}
                className="text-zinc-500 hover:text-white transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStation} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  Station Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full h-11 px-4 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  Direct Audio Stream URL
                </label>
                <input
                  type="url"
                  required
                  value={editUrl}
                  onChange={e => setEditUrl(e.target.value)}
                  className="w-full h-11 px-4 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 transition font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                    SA-MP Genre
                  </label>
                  <select
                    value={editGenre}
                    onChange={e => {
                      const gId = parseInt(e.target.value, 10);
                      setEditGenre(gId);
                      setEditSubgenre(0);
                    }}
                    className="w-full h-11 px-3 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 transition cursor-pointer"
                  >
                    {Object.entries(SA_MP_GENRES).map(([gId, info]) => (
                      <option key={gId} value={gId}>{gId}: {info.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                    Subgenre
                  </label>
                  <select
                    value={editSubgenre}
                    onChange={e => setEditSubgenre(parseInt(e.target.value, 10))}
                    className="w-full h-11 px-3 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 transition cursor-pointer"
                  >
                    {SA_MP_GENRES[editGenre]?.subgenres.map((subName, sIdx) => (
                      <option key={sIdx} value={sIdx}>{sIdx}: {subName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditStation(null)}
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

      {/* --- MODAL 3: DELETE RADIO STATION --- */}
      {deleteStation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2 text-red-500">
                <AlertTriangle className="h-5 w-5" />
                Delete Radio Station
              </h3>
              <button
                onClick={() => setDeleteStation(null)}
                className="text-zinc-500 hover:text-white transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Are you sure you want to delete <strong className="text-white">{deleteStation.station_name}</strong> (ID #{deleteStation.id})? Players will no longer be able to tune into this stream in-game via <code className="text-amber-400 font-mono">/setstation</code>.
            </p>

            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteStation(null)}
                className="h-10 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteStation}
                disabled={loading}
                className="h-10 px-5 rounded-xl bg-red-600 hover:bg-red-500 text-xs text-white font-bold transition flex items-center justify-center cursor-pointer disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Yes, Delete Station'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
