import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export const FACTION_POLICE = 1;

export interface FactionInfo {
  factionType: number;
  maxRank: number;
}

export function canManageFaction(factionType: number, rank: number): boolean {
  return factionType === FACTION_POLICE ? rank <= 4 : rank <= 1;
}

export async function getFactionInfo(factionId: number): Promise<FactionInfo | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT factionType,
            factionRank1, factionRank2, factionRank3, factionRank4, factionRank5,
            factionRank6, factionRank7, factionRank8, factionRank9, factionRank10,
            factionRank11, factionRank12, factionRank13, factionRank14, factionRank15,
            factionRank16, factionRank17, factionRank18, factionRank19
     FROM factions
     WHERE factionID = ?
     LIMIT 1`,
    [factionId]
  );

  if (rows.length === 0) return null;

  const faction = rows[0];
  let maxRank = 0;

  for (let rank = 1; rank <= 19; rank += 1) {
    const name = faction[`factionRank${rank}`];
    if (typeof name === 'string' && name.trim() !== '') {
      maxRank = rank;
    }
  }

  return {
    factionType: Number(faction.factionType ?? 0),
    maxRank,
  };
}
