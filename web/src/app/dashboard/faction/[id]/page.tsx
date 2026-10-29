import { redirect } from 'next/navigation';
import Link from 'next/link';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canManageFaction, getFactionInfo } from '@/lib/faction';
import { RowDataPacket } from 'mysql2';
import { ArrowLeft, Shield } from 'lucide-react';
import Navbar from '@/components/Navbar';
import FactionRoster from './FactionRoster';

// Helper mapping for Factions
const FACTION_NAMES: Record<number, string> = {
  1: 'Los Santos Police Department (LSPD)',
  2: 'San Andreas News (SAN)',
  3: 'Los Santos Fire Department (LSFD)',
  4: 'City Hall / Government',
  5: 'Gang / Family Organization',
  6: 'Los Santos Sheriff Department (LSSD)',
  7: 'Department of Corrections (DOC)',
};

async function getFactionMembers(factionId: number) {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT ID, char_name, Level, FactionRank, Online FROM characters WHERE Faction = ? ORDER BY FactionRank ASC, ID ASC',
      [factionId]
    );
    return rows;
  } catch (error) {
    console.error('Error fetching faction members:', error);
    return [];
  }
}

async function verifyFactionMembership(userId: number, factionId: number) {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT MIN(FactionRank) AS FactionRank FROM characters WHERE master = ? AND Faction = ? AND FactionRank > 0',
      [userId, factionId]
    );
    const rank = Number(rows[0]?.FactionRank);
    return Number.isInteger(rank) && rank > 0 ? { FactionRank: rank } : null;
  } catch (error) {
    console.error('Error verifying faction membership:', error);
    return null;
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

export default async function FactionPortalPage({ params }: PageProps) {
  const { id } = await params;
  const factionId = parseInt(id, 10);
  if (!Number.isInteger(factionId) || factionId <= 0) {
    redirect('/dashboard');
  }
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const faction = await getFactionInfo(factionId);
  if (!faction) {
    redirect('/dashboard');
  }

  // Security check: Verify that the user owns a character belonging to this faction
  const memberRecord = await verifyFactionMembership(session.userId, factionId);
  if (!memberRecord) {
    redirect('/dashboard');
  }

  const isLeader = canManageFaction(faction.factionType, memberRecord.FactionRank);

  const email = await getUserEmail(session.userId);
  const members = await getFactionMembers(factionId);

  return (
    <div className="min-h-screen bg-[#09090b] pt-20 pb-12">
      <Navbar session={session ? { username: session.username, email } : null} />

      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 max-w-4xl">
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
          <span className="text-xs text-zinc-500 font-medium">Faction Portal</span>
        </div>

        {/* Heading */}
        <div className="mb-8">
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <Shield className="h-6 w-6 text-amber-500" />
            {FACTION_NAMES[factionId] || `Faction ID ${factionId}`}
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Review the official faction roster for Los Jawa RP.
          </p>
        </div>

        {/* Faction Roster Control Table */}
        <FactionRoster
          factionId={factionId}
          members={members as unknown as { ID: number; char_name: string; Level: number; FactionRank: number; Online: number }[]}
          isLeader={isLeader}
          actorRank={memberRecord.FactionRank}
          maxRank={faction.maxRank}
        />
      </main>
    </div>
  );
}
