import { redirect } from 'next/navigation';
import Link from 'next/link';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { RowDataPacket } from 'mysql2';
import { ArrowLeft, Users, ShieldAlert, Award, Search } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { getSkinImageUrl } from '@/lib/assets';

async function getOnlinePlayers() {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT c.ID, c.char_name, c.Level, c.Model, f.factionName, f.factionShort 
       FROM characters c 
       LEFT JOIN factions f ON c.Faction = f.factionID 
       WHERE c.Online = 1 
       ORDER BY c.char_name ASC`
    );
    return rows;
  } catch (error) {
    console.error('Error fetching online players:', error);
    return [];
  }
}

async function getUserEmail(username: string) {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT Email FROM accounts WHERE Username = ? LIMIT 1',
      [username]
    );
    return rows[0]?.Email || '';
  } catch {
    return '';
  }
}

export default async function OnlinePlayersPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const email = await getUserEmail(session.username);
  const players = await getOnlinePlayers();

  return (
    <div className="min-h-screen bg-[#09090b] pt-20 pb-12">
      <Navbar session={session ? { username: session.username, email } : null} />

      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 max-w-5xl">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 mb-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Dashboard
          </Link>
          <span className="text-zinc-650 text-xs">/</span>
          <span className="text-xs text-zinc-500 font-medium">Online Players</span>
        </div>

        {/* Heading */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-2">
              <Users className="h-6 w-6 text-amber-500" />
              Online Players List
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              List of characters currently connected to the server.
            </p>
          </div>
          <div className="bg-zinc-950 px-4 py-2 rounded-xl border border-zinc-800 flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-zinc-450 font-medium">
              Total Online: <strong className="text-white">{players.length}</strong> Players
            </span>
          </div>
        </div>

        {/* Player List */}
        {players.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-850 bg-zinc-950/40 p-12 text-center">
            <Users className="h-10 w-10 text-zinc-650 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-zinc-300">No Players Online</h3>
            <p className="text-xs text-zinc-500 mt-1">
              There are currently no active players connected to the server. Log in now to join the roleplay!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {players.map((player: any) => {
              const formattedName = player.char_name.replace('_', ' ');
              return (
                <div
                  key={player.ID}
                  className="rounded-xl border border-zinc-850 bg-zinc-950/60 p-4 hover:border-zinc-700 transition flex items-center gap-3.5 group relative overflow-hidden"
                >
                  {/* Skin Image */}
                  <div className="w-12 h-16 bg-zinc-900/50 rounded-lg border border-zinc-850 flex items-center justify-center overflow-hidden shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getSkinImageUrl(player.Model, true)}
                      alt={`Skin ${player.Model}`}
                      className="h-14 w-auto object-contain group-hover:scale-105 transition"
                      style={{ filter: 'brightness(1.35) contrast(1.05)' }}
                      loading="lazy"
                    />
                  </div>

                  {/* Player Stats */}
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-white truncate group-hover:text-amber-500 transition">
                      {formattedName}
                    </h4>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="bg-zinc-900 text-zinc-400 text-[10px] px-1.5 py-0.5 rounded font-mono flex items-center gap-0.5 border border-zinc-850">
                        <Award className="h-2.5 w-2.5 text-zinc-450" />
                        Lvl {player.Level}
                      </span>
                    </div>
                    {player.factionShort && (
                      <span className="inline-block bg-amber-500/10 text-amber-500 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border border-amber-500/20 mt-1.5 truncate max-w-full">
                        {player.factionShort}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
