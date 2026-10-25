'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  CheckCircle,
  Disc,
  Edit2,
  ExternalLink,
  Loader2,
  Music,
  Play,
  Plus,
  Radio,
  Search,
  ShieldAlert,
  Square,
  Trash2,
  Volume1,
  Volume2,
  VolumeX,
  X,
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

function genreInfo(station: RadioStation) {
  return SA_MP_GENRES[station.genres_id] || {
    name: `Genre #${station.genres_id}`,
    color: 'bg-zinc-800 border-zinc-700 text-zinc-400',
    subgenres: [],
  };
}

function subgenreName(station: RadioStation) {
  const genre = genreInfo(station);
  return genre.subgenres[station.subgenres_id] || `Subgenre #${station.subgenres_id}`;
}

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
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  const filteredStations = stations.filter((station) => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch =
      term.length === 0 ||
      station.station_name.toLowerCase().includes(term) ||
      station.station_url.toLowerCase().includes(term);
    const matchesGenre = selectedGenre === 'all' || station.genres_id === selectedGenre;
    return matchesSearch && matchesGenre;
  });

  const activePlayingStation = stations.find((station) => station.id === playingStationId);
  const genreCount = new Set(stations.map((station) => station.genres_id)).size;
  const hasFilters = searchTerm.trim().length > 0 || selectedGenre !== 'all';

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted, playingStationId]);

  const handleAddStation = async (event: React.FormEvent) => {
    event.preventDefault();
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

  const handleUpdateStation = async (event: React.FormEvent) => {
    event.preventDefault();
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

  const toggleStreamPlayback = (stationId: number) => {
    setAudioErrorId(null);
    setPlayingStationId((current) => (current === stationId ? null : stationId));
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedGenre('all');
  };

  return (
    <div className="space-y-6">
      {success ? (
        <div className="flex items-start justify-between gap-2 rounded-2xl border border-green-500/20 bg-green-500/5 p-4 text-xs font-medium text-green-400">
          <div className="flex items-start gap-2">
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{success}</span>
          </div>
          <button type="button" onClick={() => setSuccess('')} className="text-zinc-400 transition hover:text-white" aria-label="Dismiss success message">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="flex items-start justify-between gap-2 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-xs font-medium text-red-500">
          <div className="flex items-start gap-2">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError('')} className="text-zinc-400 transition hover:text-white" aria-label="Dismiss error message">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {activePlayingStation ? (
        <audio
          key={activePlayingStation.id}
          ref={audioRef}
          src={activePlayingStation.station_url}
          autoPlay
          onError={() => {
            setAudioErrorId(activePlayingStation.id);
            setPlayingStationId(null);
          }}
          className="hidden"
        />
      ) : null}

      {activePlayingStation ? (
        <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 shadow-lg">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-black shadow-md">
                <Volume2 className="h-5 w-5 animate-pulse" />
              </div>
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-400">
                  <span className="inline-block h-2 w-2 animate-ping rounded-full bg-green-500" />
                  Live stream test active
                </p>
                <p className="truncate text-sm font-black text-white">{activePlayingStation.station_name}</p>
              </div>
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <div className="flex w-full items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/90 px-3.5 py-2 sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIsMuted((muted) => !muted)}
                  className="text-zinc-400 transition hover:text-amber-400"
                  title={isMuted ? 'Unmute' : 'Mute'}
                  aria-label={isMuted ? 'Unmute stream test' : 'Mute stream test'}
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
                  onChange={(event) => {
                    const nextVolume = Number.parseFloat(event.target.value);
                    setVolume(nextVolume);
                    if (nextVolume > 0) setIsMuted(false);
                  }}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-zinc-700 accent-amber-500 sm:w-32"
                  aria-label="Stream test volume"
                />

                <span className="w-9 shrink-0 text-right font-mono text-[11px] font-bold text-zinc-300">
                  {isMuted ? 'Muted' : `${Math.round(volume * 100)}%`}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setPlayingStationId(null)}
                className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-xs font-bold text-zinc-300 transition hover:bg-zinc-800 hover:text-white sm:w-auto"
              >
                <Square className="h-3.5 w-3.5 fill-current text-red-400" />
                Stop test
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <div className="flex items-center justify-between gap-2 text-zinc-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Stations</span>
            <Radio className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-white">{stations.length}</p>
          <p className="mt-1 text-[10px] text-zinc-600">Configured streams</p>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="flex items-center justify-between gap-2 text-amber-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Stream links</span>
            <Volume2 className="h-4 w-4" />
          </div>
          <p className="mt-2 text-2xl font-black text-white">{stations.length}</p>
          <p className="mt-1 text-[10px] text-amber-500/70">SA-MP audio sources</p>
        </div>

        <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4">
          <div className="flex items-center justify-between gap-2 text-purple-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Genres</span>
            <Disc className="h-4 w-4" />
          </div>
          <p className="mt-2 text-2xl font-black text-white">{genreCount} / 10</p>
          <p className="mt-1 text-[10px] text-purple-500/70">PAWN genres in use</p>
        </div>

        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
          <div className="flex items-center justify-between gap-2 text-blue-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">In-game</span>
            <Music className="h-4 w-4" />
          </div>
          <p className="mt-2 text-xs font-bold text-zinc-200">/setstation & boombox</p>
          <p className="mt-1 text-[10px] text-blue-500/70">Player commands</p>
        </div>
      </div>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search station or URL..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-900 pl-9 pr-9 text-xs text-white placeholder:text-zinc-500 transition focus:border-amber-500 focus:outline-none"
                aria-label="Search radio stations"
              />
              {searchTerm ? (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 transition hover:text-zinc-300"
                  aria-label="Clear station search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>

            <select
              value={selectedGenre}
              onChange={(event) => setSelectedGenre(event.target.value === 'all' ? 'all' : Number.parseInt(event.target.value, 10))}
              className="h-10 w-full cursor-pointer rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-xs text-zinc-300 transition focus:border-amber-500 focus:outline-none sm:w-56"
              aria-label="Filter by SA-MP genre"
            >
              <option value="all">All SA-MP genres (10)</option>
              {Object.entries(SA_MP_GENRES).map(([genreId, info]) => (
                <option key={genreId} value={genreId}>Genre #{genreId}: {info.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between gap-3 lg:justify-end">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Showing {filteredStations.length} of {stations.length}
            </p>
            {hasFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-lg border border-zinc-800 px-2.5 py-1.5 text-[10px] font-bold text-zinc-400 transition hover:border-zinc-700 hover:text-white"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
        <div className="flex flex-col gap-3 border-b border-zinc-800 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="text-sm font-bold text-white">Station library</h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Streams available to players through <span className="font-mono text-zinc-400">/setstation</span> and vehicle boomboxes.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 text-xs font-bold text-black shadow-md transition hover:bg-amber-400 sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Add station
          </button>
        </div>

        {filteredStations.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <Radio className="mx-auto mb-3 h-10 w-10 text-zinc-700" />
            <h3 className="text-sm font-bold text-white">
              {stations.length === 0 ? 'No radio stations yet' : 'No stations match your filters'}
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              {stations.length === 0
                ? 'Add the first stream so players can tune in from the game.'
                : 'Try a different station name, URL, or genre.'}
            </p>
            {hasFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 rounded-xl border border-zinc-800 px-3 py-2 text-[11px] font-bold text-zinc-300 transition hover:border-zinc-700 hover:text-white"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[860px] border-collapse text-left text-xs">
                <thead className="border-b border-zinc-800 bg-zinc-900/40 text-[10px] uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 font-bold">Station</th>
                    <th className="px-4 py-3 font-bold">Genre</th>
                    <th className="px-4 py-3 font-bold">Stream URL</th>
                    <th className="px-4 py-3 text-center font-bold">Web test</th>
                    <th className="px-4 py-3 text-right font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {filteredStations.map((station) => {
                    const genre = genreInfo(station);
                    const isPlaying = playingStationId === station.id;
                    const hasAudioError = audioErrorId === station.id;

                    return (
                      <tr key={station.id} className="transition hover:bg-zinc-900/40">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${genre.color}`}>
                              <Radio className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-white">{station.station_name}</p>
                              <p className="text-[10px] text-zinc-500">Station ID #{station.id}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${genre.color}`}>
                              {genre.name}
                            </span>
                            <p className="text-[10px] text-zinc-400">{subgenreName(station)}</p>
                          </div>
                        </td>

                        <td className="max-w-xs px-4 py-4">
                          <a
                            href={station.station_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex max-w-full items-center gap-1.5 font-mono text-[11px] text-zinc-400 transition hover:text-amber-400"
                            title={station.station_url}
                          >
                            <span className="truncate">{station.station_url}</span>
                            <ExternalLink className="h-3 w-3 shrink-0 text-zinc-600" />
                          </a>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <div className="inline-flex flex-col items-center gap-1">
                            <button
                              type="button"
                              onClick={() => toggleStreamPlayback(station.id)}
                              className={`flex h-8 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition ${
                                isPlaying
                                  ? 'border-amber-400 bg-amber-500 text-black'
                                  : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700 hover:text-white'
                              }`}
                              aria-label={`${isPlaying ? 'Stop' : 'Test'} ${station.station_name} stream`}
                            >
                              {isPlaying ? (
                                <>
                                  <Square className="h-3.5 w-3.5 fill-current" />
                                  Stop test
                                </>
                              ) : (
                                <>
                                  <Play className="h-3.5 w-3.5 fill-current" />
                                  Test stream
                                </>
                              )}
                            </button>
                            {hasAudioError ? (
                              <span className="text-[10px] text-red-400">Stream unreachable</span>
                            ) : null}
                          </div>
                        </td>

                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditStation(station);
                                setEditName(station.station_name);
                                setEditUrl(station.station_url);
                                setEditGenre(station.genres_id);
                                setEditSubgenre(station.subgenres_id);
                              }}
                              className="rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
                              title="Edit radio station"
                              aria-label={`Edit ${station.station_name}`}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteStation(station)}
                              className="rounded-xl border border-red-500/20 bg-red-500/10 p-2 text-red-400 transition hover:bg-red-500/20"
                              title="Delete radio station"
                              aria-label={`Delete ${station.station_name}`}
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

            <div className="space-y-3 p-4 md:hidden">
              {filteredStations.map((station) => {
                const genre = genreInfo(station);
                const isPlaying = playingStationId === station.id;
                const hasAudioError = audioErrorId === station.id;

                return (
                  <article key={station.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
                    <div className="flex items-start gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${genre.color}`}>
                        <Radio className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-bold text-white">{station.station_name}</h3>
                            <p className="mt-0.5 text-[10px] text-zinc-500">Station #{station.id}</p>
                          </div>
                          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold ${genre.color}`}>
                            {genre.name}
                          </span>
                        </div>
                        <p className="mt-1 text-[10px] text-zinc-400">{subgenreName(station)}</p>
                      </div>
                    </div>

                    <a
                      href={station.station_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 flex items-start gap-1.5 break-all rounded-xl border border-zinc-800/80 bg-zinc-950/60 px-3 py-2 font-mono text-[10px] text-zinc-400 transition hover:border-zinc-700 hover:text-amber-400"
                    >
                      <span className="min-w-0 flex-1 break-all">{station.station_url}</span>
                      <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-zinc-600" />
                    </a>

                    <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                      <button
                        type="button"
                        onClick={() => toggleStreamPlayback(station.id)}
                        className={`flex h-10 items-center justify-center gap-1.5 rounded-xl border text-xs font-bold transition ${
                          isPlaying
                            ? 'border-amber-400 bg-amber-500 text-black'
                            : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700 hover:text-white'
                        }`}
                      >
                        {isPlaying ? (
                          <>
                            <Square className="h-3.5 w-3.5 fill-current" />
                            Stop test
                          </>
                        ) : (
                          <>
                            <Play className="h-3.5 w-3.5 fill-current" />
                            Test stream
                          </>
                        )}
                      </button>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditStation(station);
                            setEditName(station.station_name);
                            setEditUrl(station.station_url);
                            setEditGenre(station.genres_id);
                            setEditSubgenre(station.subgenres_id);
                          }}
                          className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
                          aria-label={`Edit ${station.station_name}`}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteStation(station)}
                          className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 transition hover:bg-red-500/20"
                          aria-label={`Delete ${station.station_name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {hasAudioError ? (
                      <p className="mt-2 text-[10px] text-red-400">Stream unreachable. Check the URL or try another source.</p>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>

      {isAddModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-station-title"
            className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl sm:rounded-2xl sm:p-6"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 id="add-station-title" className="flex items-center gap-2 text-base font-bold text-white">
                <Radio className="h-5 w-5 text-amber-500" />
                Add radio station
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-zinc-500 transition hover:text-white"
                aria-label="Close add station dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddStation} className="mt-5 space-y-4">
              <div>
                <label htmlFor="station-name" className="mb-1.5 block text-xs font-semibold text-zinc-400">
                  Station name
                </label>
                <input
                  id="station-name"
                  type="text"
                  required
                  placeholder="e.g. Prambors FM / Lofi Girl 24/7"
                  value={nameInput}
                  onChange={(event) => setNameInput(event.target.value)}
                  className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-xs text-white placeholder:text-zinc-500 transition focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="station-url" className="mb-1.5 block text-xs font-semibold text-zinc-400">
                  Direct audio stream URL
                </label>
                <input
                  id="station-url"
                  type="url"
                  required
                  placeholder="https://stream.zeno.fm/..."
                  value={urlInput}
                  onChange={(event) => setUrlInput(event.target.value)}
                  className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 font-mono text-xs text-white placeholder:text-zinc-500 transition focus:border-amber-500 focus:outline-none"
                />
                <p className="mt-1 text-[10px] text-zinc-600">MP3, AAC, or Shoutcast direct stream.</p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="station-genre" className="mb-1.5 block text-xs font-semibold text-zinc-400">
                    SA-MP genre
                  </label>
                  <select
                    id="station-genre"
                    value={genreInput}
                    onChange={(event) => {
                      setGenreInput(Number.parseInt(event.target.value, 10));
                      setSubgenreInput(0);
                    }}
                    className="h-11 w-full cursor-pointer rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-xs text-white transition focus:border-amber-500 focus:outline-none"
                  >
                    {Object.entries(SA_MP_GENRES).map(([genreId, info]) => (
                      <option key={genreId} value={genreId}>{genreId}: {info.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="station-subgenre" className="mb-1.5 block text-xs font-semibold text-zinc-400">
                    Subgenre
                  </label>
                  <select
                    id="station-subgenre"
                    value={subgenreInput}
                    onChange={(event) => setSubgenreInput(Number.parseInt(event.target.value, 10))}
                    className="h-11 w-full cursor-pointer rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-xs text-white transition focus:border-amber-500 focus:outline-none"
                  >
                    {SA_MP_GENRES[genreInput]?.subgenres.map((name, index) => (
                      <option key={index} value={index}>{index}: {name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="h-10 rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-xs font-bold text-zinc-300 transition hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-10 items-center justify-center rounded-xl bg-amber-500 px-5 text-xs font-bold text-black transition hover:bg-amber-400 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save station'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {editStation ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-station-title"
            className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl sm:rounded-2xl sm:p-6"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 id="edit-station-title" className="flex items-center gap-2 text-base font-bold text-white">
                <Edit2 className="h-5 w-5 text-amber-500" />
                Edit station #{editStation.id}
              </h3>
              <button
                type="button"
                onClick={() => setEditStation(null)}
                className="text-zinc-500 transition hover:text-white"
                aria-label="Close edit station dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStation} className="mt-5 space-y-4">
              <div>
                <label htmlFor="edit-station-name" className="mb-1.5 block text-xs font-semibold text-zinc-400">
                  Station name
                </label>
                <input
                  id="edit-station-name"
                  type="text"
                  required
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-xs text-white transition focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="edit-station-url" className="mb-1.5 block text-xs font-semibold text-zinc-400">
                  Direct audio stream URL
                </label>
                <input
                  id="edit-station-url"
                  type="url"
                  required
                  value={editUrl}
                  onChange={(event) => setEditUrl(event.target.value)}
                  className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 font-mono text-xs text-white transition focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="edit-station-genre" className="mb-1.5 block text-xs font-semibold text-zinc-400">
                    SA-MP genre
                  </label>
                  <select
                    id="edit-station-genre"
                    value={editGenre}
                    onChange={(event) => {
                      setEditGenre(Number.parseInt(event.target.value, 10));
                      setEditSubgenre(0);
                    }}
                    className="h-11 w-full cursor-pointer rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-xs text-white transition focus:border-amber-500 focus:outline-none"
                  >
                    {Object.entries(SA_MP_GENRES).map(([genreId, info]) => (
                      <option key={genreId} value={genreId}>{genreId}: {info.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="edit-station-subgenre" className="mb-1.5 block text-xs font-semibold text-zinc-400">
                    Subgenre
                  </label>
                  <select
                    id="edit-station-subgenre"
                    value={editSubgenre}
                    onChange={(event) => setEditSubgenre(Number.parseInt(event.target.value, 10))}
                    className="h-11 w-full cursor-pointer rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-xs text-white transition focus:border-amber-500 focus:outline-none"
                  >
                    {SA_MP_GENRES[editGenre]?.subgenres.map((name, index) => (
                      <option key={index} value={index}>{index}: {name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setEditStation(null)}
                  className="h-10 rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-xs font-bold text-zinc-300 transition hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-10 items-center justify-center rounded-xl bg-amber-500 px-5 text-xs font-bold text-black transition hover:bg-amber-400 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deleteStation ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-station-title"
            className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl sm:rounded-2xl sm:p-6"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 id="delete-station-title" className="flex items-center gap-2 text-base font-bold text-red-500">
                <AlertTriangle className="h-5 w-5" />
                Delete radio station
              </h3>
              <button
                type="button"
                onClick={() => setDeleteStation(null)}
                className="text-zinc-500 transition hover:text-white"
                aria-label="Close delete station dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-zinc-300">
              Delete <strong className="text-white">{deleteStation.station_name}</strong> (station #{deleteStation.id})?
              Players will no longer be able to tune into this stream in-game via{' '}
              <code className="font-mono text-amber-400">/setstation</code>.
            </p>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDeleteStation(null)}
                className="h-10 rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-xs font-bold text-zinc-300 transition hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteStation}
                disabled={loading}
                className="flex h-10 items-center justify-center rounded-xl bg-red-600 px-5 text-xs font-bold text-white transition hover:bg-red-500 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete station'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
