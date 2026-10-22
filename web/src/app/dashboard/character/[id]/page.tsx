import { redirect } from 'next/navigation';
import Link from 'next/link';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { RowDataPacket } from 'mysql2';
import { ArrowLeft, Shield, Landmark, Coins, Heart, FileText, CheckCircle, XCircle, Car, Home, Briefcase, Lock, Unlock, Zap, Gauge } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { getVehicleImageUrl } from '@/lib/assets';
import DeleteCharacterButton from '@/components/DeleteCharacterButton';

// Job titles mirror ReturnJobName() / the JOB_* constants in the gamemode.
const JOB_TITLES: Record<number, string> = {
  0: 'None',
  1: 'Farmer',
  3: 'Car Mechanic',
  4: 'Taxi Driver',
  5: 'Tour Guide',
  8: 'Train Driver',
};

const TRUCKER_TITLES = [
  'Courier Trainee',
  'Courier',
  'Professional Courier',
  'Trucker Trainee',
  'Trucker',
  'Professional Trucker',
];

function getJobTitle(job: number, jobRank: number): string {
  if (job === 2) return TRUCKER_TITLES[jobRank] ?? 'Trucker';
  return JOB_TITLES[job] ?? 'Unemployed';
}

function getStoredRank(faction: RowDataPacket, rank: number): string {
  const name = faction[`factionRank${rank}`];
  return typeof name === 'string' && name.trim() ? name : `Rank ${rank}`;
}

// Mirrors Faction_GetRank() in modules/Faction.pwn, including division ranks.
function getFactionRankTitle(faction: RowDataPacket, char: RowDataPacket): string {
  const rank = Number(char.FactionRank) || 0;
  if (rank < 1) return 'None';

  const type = Number(faction.factionType);
  const dbRank = Number(char.DBRank) || 0;
  const swatRank = Number(char.SWATRank) || 0;
  const emsRank = Number(char.EMSRank) || 0;
  const fireRank = Number(char.FireRank) || 0;

  if (type === 1 && dbRank > 0) {
    return ['Detective I', 'Detective II', 'Detective III'][dbRank - 1] ?? getStoredRank(faction, rank);
  }
  if ((type === 1 || type === 6) && swatRank > 0) {
    const division = type === 1 ? 'SWAT' : 'SEB';
    const title = ['Operator', 'Team Leader', 'Commander'][swatRank - 1];
    if (title) return `${division} ${title}`;
  }
  if (type === 3) {
    if (emsRank > 0) {
      const title = ['EMT-Basic', 'Paramedic', 'Resident Doctor', 'Chief Medical Officer'][emsRank - 1];
      if (title) return title;
    }
    if (fireRank > 0) {
      const title = ['Probationary Firefighter', 'Firefighter', 'Fire Lieutenant', 'Battalion Chief'][fireRank - 1];
      if (title) return title;
    }
  }

  return getStoredRank(faction, rank);
}

// Jailed: 0 = free, 2 = admin jail, 3 = prison (see pJailed in the gamemode).
function getJailStatus(char: RowDataPacket) {
  const state = Number(char.Jailed) || 0;
  if (!state) return null;

  return {
    label: state === 2 ? 'Admin Jail' : state === 3 ? 'Prison' : 'Incarcerated',
    remaining: Number(char.SentenceTime) || 0,
  };
}

function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

// GTA SA-MP Vehicle Names mapping (common models)
const VEHICLE_NAMES: Record<number, string> = {
  400: 'Landstalker', 411: 'Infernus', 415: 'Cheetah', 451: 'Turismo', 480: 'Comet',
  541: 'Bullet', 560: 'Sultan', 562: 'Elegy', 559: 'Jester', 561: 'Stratum',
  565: 'Flash', 422: 'Bobcat', 475: 'Sabre', 506: 'Super GT', 522: 'NRG-500',
  521: 'FCR-900', 461: 'PCJ-600', 463: 'Freeway', 468: 'Sanchez', 471: 'Quad',
  596: 'LSPD Cruiser', 597: 'SFPD Cruiser', 598: 'LVPD Cruiser', 599: 'Ranger',
  427: 'Enforcer', 490: 'FBI Rancher', 528: 'FBI Truck', 407: 'Firetruck',
  416: 'Ambulance', 433: 'Barracks', 432: 'Rhino', 426: 'Premier', 545: 'Hustler',
};

async function getCharacterData(charId: string) {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM characters WHERE ID = ? LIMIT 1',
      [charId]
    );
    return rows[0] || null;
  } catch (error) {
    console.error('Error fetching character details:', error);
    return null;
  }
}

async function getCharacterVehicles(charId: number) {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM cars WHERE carOwner = ?',
      [charId]
    );
    return rows;
  } catch (error) {
    console.error('Error fetching character vehicles:', error);
    return [];
  }
}

async function getCharacterHouses(charId: number) {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM houses WHERE ownerSQLID = ?',
      [charId]
    );
    return rows;
  } catch (error) {
    console.error('Error fetching character houses:', error);
    return [];
  }
}

async function getCharacterApartments(charId: number) {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM apartments WHERE ownerSQLID = ? AND owned = 1',
      [charId]
    );
    return rows;
  } catch (error) {
    console.error('Error fetching character apartments:', error);
    return [];
  }
}

async function getFactionData(factionId: number) {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM factions WHERE factionID = ? LIMIT 1',
      [factionId]
    );
    return rows[0] || null;
  } catch (error) {
    console.error('Error fetching faction:', error);
    return null;
  }
}

async function getCharacterBusinesses(charName: string) {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM business WHERE biz_owner = ? AND biz_owned = 1',
      [charName]
    );
    return rows;
  } catch (error) {
    console.error('Error fetching character businesses:', error);
    return [];
  }
}

async function getUserEmail(userId: number) {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT Email FROM accounts WHERE ID = ? LIMIT 1',
      [userId]
    );
    return rows[0]?.Email || '';
  } catch {
    return '';
  }
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CharacterDetailsPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const char = await getCharacterData(id);

  // Security check: Make sure character belongs to the logged-in master UCP account
  if (!char || char.master !== session.userId) {
    redirect('/dashboard');
  }

  const email = await getUserEmail(session.userId);

  // Fetch character assets
  const vehicles = await getCharacterVehicles(char.ID);
  const houses = await getCharacterHouses(char.ID);
  const apartments = await getCharacterApartments(char.ID);
  const businesses = await getCharacterBusinesses(char.char_name);
  const faction = char.Faction > 0 ? await getFactionData(char.Faction) : null;

  const properties = [...houses, ...apartments];
  const jail = getJailStatus(char);
  const jobTitle = getJobTitle(Number(char.playerJob) || 0, Number(char.playerJobRank) || 0);
  const factionRank = faction ? getFactionRankTitle(faction, char) : '';
  const factionName = faction
    ? `${faction.factionShort ? `${faction.factionShort} — ` : ''}${faction.factionName}`
    : 'Civilian';

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
          <span className="text-xs text-zinc-500 font-medium">{char.char_name.replace('_', ' ')}</span>
        </div>

        {/* Character Title Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 overflow-hidden relative">
          {/* Subtle background glow */}
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-gradient-to-l from-amber-500/5 to-transparent pointer-events-none" />
          
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-amber-500 text-lg">
              {char.char_name[0]}
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                {char.char_name.replace('_', ' ')}
              </h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs text-zinc-500">
                  Karakter ID: <span className="font-semibold text-zinc-300">{char.ID}</span>
                </span>
                <span className="text-zinc-700">•</span>
                <span className="text-xs text-zinc-500">
                  Level <span className="font-semibold text-zinc-300">{char.Level}</span>
                </span>
                <span className="text-zinc-700">•</span>
                <span className="text-xs text-zinc-500">
                  Model Skin <span className="font-semibold text-zinc-300">ID {char.Model}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 relative z-10 w-full md:w-auto justify-between md:justify-end">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                char.Online
                  ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                  : 'bg-zinc-800 text-zinc-500 border border-zinc-700/30'
              }`}
            >
              {char.Online ? 'Online' : 'Offline'}
            </span>

            <DeleteCharacterButton charId={char.ID} charName={char.char_name} />
          </div>
        </div>

        {/* Grid Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          
          {/* Box 1: Wallet & Faction Stats */}
          <div className="space-y-6">
            
            {/* Wallet & Bank */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <Landmark className="h-4.5 w-4.5 text-amber-500" />
                Wallet & Bank Accounts
              </h3>
              <div className="space-y-4 text-xs">
                <div className="flex justify-between items-center py-2 border-b border-zinc-900">
                  <span className="text-zinc-500">Cash Wallet</span>
                  <span className="font-bold text-white flex items-center gap-1">
                    <Coins className="h-3.5 w-3.5 text-amber-500" />
                    ${char.Cash.toLocaleString('en-US')}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-zinc-900">
                  <span className="text-zinc-500">Bank Balance</span>
                  <span className="font-bold text-white flex items-center gap-1">
                    <Landmark className="h-3.5 w-3.5 text-amber-500" />
                    ${char.BankAccount.toLocaleString('en-US')}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-zinc-500">Savings Deposit</span>
                  <span className="font-bold text-white">${char.Savings.toLocaleString('en-US')}</span>
                </div>
              </div>
            </div>

            {/* Job & Faction */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <Shield className="h-4.5 w-4.5 text-amber-500" />
                Job & Faction Affiliation
              </h3>
              <div className="space-y-4 text-xs">
                <div className="py-2 border-b border-zinc-900">
                  <span className="text-zinc-500 block mb-1">Faction Affiliation</span>
                  <span className="font-bold text-white">{factionName}</span>
                  {faction && (
                    <div className="flex flex-col gap-2 mt-1.5">
                      <span className="text-[10px] text-zinc-500 block">Rank: {factionRank}</span>
                      <Link
                        href={`/dashboard/faction/${char.Faction}`}
                        className="inline-flex items-center justify-center gap-1 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 py-1.5 px-3 text-[10px] font-bold text-amber-500 hover:text-amber-400 transition cursor-pointer w-fit"
                      >
                        Open Faction Roster Portal →
                      </Link>
                    </div>
                  )}
                </div>
                <div className="py-2">
                  <span className="text-zinc-500 block mb-1">Primary Occupation</span>
                  <span className="font-bold text-white">{jobTitle}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Box 2: Licenses & Status */}
          <div className="space-y-6">
            
            {/* Legal Licenses */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <FileText className="h-4.5 w-4.5 text-amber-500" />
                Legal Licenses
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-zinc-400">Driver&apos;s License</span>
                  {char.CarLic ? (
                    <span className="flex items-center gap-1 text-green-400 font-semibold"><CheckCircle className="h-4 w-4" /> Active</span>
                  ) : (
                    <span className="flex items-center gap-1 text-zinc-500 font-semibold"><XCircle className="h-4 w-4" /> None</span>
                  )}
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-zinc-400">Pilot License</span>
                  {char.FlyLic ? (
                    <span className="flex items-center gap-1 text-green-400 font-semibold"><CheckCircle className="h-4 w-4" /> Active</span>
                  ) : (
                    <span className="flex items-center gap-1 text-zinc-500 font-semibold"><XCircle className="h-4 w-4" /> None</span>
                  )}
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-zinc-400">Medical License</span>
                  {char.MedLic ? (
                    <span className="flex items-center gap-1 text-green-400 font-semibold"><CheckCircle className="h-4 w-4" /> Active</span>
                  ) : (
                    <span className="flex items-center gap-1 text-zinc-500 font-semibold"><XCircle className="h-4 w-4" /> None</span>
                  )}
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-zinc-400">Trucker License</span>
                  {char.TruckLic ? (
                    <span className="flex items-center gap-1 text-green-400 font-semibold"><CheckCircle className="h-4 w-4" /> Active</span>
                  ) : (
                    <span className="flex items-center gap-1 text-zinc-500 font-semibold"><XCircle className="h-4 w-4" /> None</span>
                  )}
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-zinc-400">Firearms License</span>
                  {char.WepLic ? (
                    <span className="flex items-center gap-1 text-green-400 font-semibold"><CheckCircle className="h-4 w-4" /> Active</span>
                  ) : (
                    <span className="flex items-center gap-1 text-zinc-500 font-semibold"><XCircle className="h-4 w-4" /> None</span>
                  )}
                </div>
              </div>
            </div>

            {/* Medical & Physical Condition */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <Heart className="h-4.5 w-4.5 text-amber-500" />
                Physical Condition & Legal Status
              </h3>
              <div className="space-y-4 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-zinc-900">
                  <span className="text-zinc-500">Health Points</span>
                  <span className="font-bold text-white">{char.Health} HP</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-zinc-900">
                  <span className="text-zinc-500">Body Armour</span>
                  <span className="font-bold text-white">{char.Armour} AP</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-zinc-900">
                  <span className="text-zinc-500">Hunger Level</span>
                  <span className="font-bold text-white">{char.Hunger}%</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-zinc-900">
                  <span className="text-zinc-500">Thirst Level</span>
                  <span className="font-bold text-white">{char.Thirst}%</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-zinc-500">Jail Status</span>
                  {jail ? (
                    <span className="text-red-500 font-bold">
                      {jail.label} ({formatDuration(jail.remaining)} remaining)
                    </span>
                  ) : (
                    <span className="text-green-500 font-bold">Clear / Free</span>
                  )}
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Section 3: Character Assets */}
        <div className="space-y-8">
          
          {/* Vehicles */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Car className="h-5 w-5 text-amber-500" />
              Owned Personal Vehicles ({vehicles.length})
            </h3>
            
            {vehicles.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-6">This character does not own any vehicles.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {vehicles.map((veh) => (
                  <div key={veh.carID} className="rounded-xl border border-zinc-850 bg-zinc-900/10 p-4 text-xs flex gap-4 items-center">
                    {/* Left: Stats */}
                    <div className="flex-1 space-y-2.5">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-white text-sm">
                            {VEHICLE_NAMES[veh.carModel] || veh.carName || `Vehicle Model ${veh.carModel}`}
                          </h4>
                          <span className="text-[10px] text-zinc-500">Plate: {veh.carPlate} • ID: {veh.carID}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-y-2 pt-2 border-t border-zinc-900">
                        <div>
                          <span className="text-zinc-500 block text-[9px] uppercase tracking-wider">Vehicle Health</span>
                          <span className="font-semibold text-white flex items-center gap-1">
                            <Zap className="h-3 w-3 text-amber-500" />
                            {Number(veh.carHealth ?? 0).toFixed(0)} HP
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block text-[9px] uppercase tracking-wider">Engine Life</span>
                          <span className="font-semibold text-white">{Number(veh.carEngineL ?? 0).toFixed(0)}%</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block text-[9px] uppercase tracking-wider">Battery</span>
                          <span className="font-semibold text-white">{Number(veh.carBatteryL ?? 0).toFixed(0)}%</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block text-[9px] uppercase tracking-wider">Fuel Level</span>
                          <span className="font-semibold text-white">{Number(veh.carFuel ?? 0).toFixed(0)} L</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-zinc-500 block text-[9px] uppercase tracking-wider">Odometer</span>
                          <span className="font-semibold text-white flex items-center gap-0.5">
                            <Gauge className="h-3 w-3 text-zinc-500" />
                            {Number(veh.carMileage ?? 0).toFixed(1)} mi
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Vehicle Rendering */}
                    <div className="w-20 h-20 rounded-lg bg-zinc-950/50 border border-zinc-850/80 flex flex-col items-center justify-center relative overflow-hidden flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getVehicleImageUrl(veh.carModel)}
                        alt={veh.carName || `Model ${veh.carModel}`}
                        className="h-12 w-auto object-contain drop-shadow-[0_4px_8px_rgba(245,158,11,0.2)] hover:scale-110 transition duration-300"
                        loading="lazy"
                      />
                      <span className="text-[9px] text-zinc-500 absolute bottom-1 font-semibold flex items-center gap-0.5">
                        {veh.carLocked ? <Lock className="h-2.5 w-2.5 text-red-500" /> : <Unlock className="h-2.5 w-2.5 text-green-500" />}
                        {veh.carLocked ? 'Locked' : 'Unlocked'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Properties (Houses & Businesses) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Houses & Apartments */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
              <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2">
                <Home className="h-5 w-5 text-amber-500" />
                Houses & Apartments ({properties.length})
              </h3>
              
              {properties.length === 0 ? (
                <p className="text-xs text-zinc-500 text-center py-6">This character does not own any properties.</p>
              ) : (
                <div className="space-y-4">
                  {properties.map((property) => {
                    const isApartment = property.info === undefined;

                    return (
                      <div
                        key={isApartment ? `apartment-${property.ID}` : `house-${property.id}`}
                        className="rounded-xl border border-zinc-850 bg-zinc-900/10 p-4 text-xs"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-bold text-white text-sm truncate max-w-[200px]">
                              {isApartment
                                ? property.name || `Apartment ID ${property.ID}`
                                : property.info || `House ID ${property.id}`}
                            </h4>
                            <span className="text-[9px] uppercase tracking-wider text-zinc-500">
                              {isApartment ? 'Apartment' : 'House'}
                            </span>
                          </div>
                          {property.locked ? <Lock className="h-3.5 w-3.5 text-red-400" /> : <Unlock className="h-3.5 w-3.5 text-green-400" />}
                        </div>
                        <div className="flex justify-between text-zinc-500 pt-2 border-t border-zinc-900 text-[11px]">
                          <span>Price: ${property.price.toLocaleString('en-US')}</span>
                          {property.rentable === 1 && (
                            <span className="text-amber-400 font-semibold">Rent: ${property.rentprice}/day</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Businesses */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
              <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-amber-500" />
                Owned Businesses ({businesses.length})
              </h3>
              
              {businesses.length === 0 ? (
                <p className="text-xs text-zinc-500 text-center py-6">This character does not own any businesses.</p>
              ) : (
                <div className="space-y-4">
                  {businesses.map((biz) => (
                    <div key={biz.biz_id} className="rounded-xl border border-zinc-850 bg-zinc-900/10 p-4 text-xs">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-white text-sm truncate max-w-[200px]">
                          {biz.biz_info || `Business ID ${biz.biz_id}`}
                        </h4>
                        {biz.biz_locked ? <Lock className="h-3.5 w-3.5 text-red-400" /> : <Unlock className="h-3.5 w-3.5 text-green-400" />}
                      </div>
                      <div className="space-y-1.5 pt-2 border-t border-zinc-900 text-[11px]">
                        <div className="flex justify-between text-zinc-500">
                          <span>Business Value: ${biz.biz_price.toLocaleString('en-US')}</span>
                          <span>Product Stock: {biz.biz_prod} units</span>
                        </div>
                        <div className="flex justify-between text-zinc-400 font-bold">
                          <span>Register Cash (Till)</span>
                          <span className="text-green-400">${biz.biz_till.toLocaleString('en-US')}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}
