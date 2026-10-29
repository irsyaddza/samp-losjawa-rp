import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canManageFaction, getFactionInfo } from '@/lib/faction';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

const ACTIONS = new Set(['promote', 'demote', 'kick', 'invite']);

async function getTargetCharacter(targetCharId: number, factionId: number) {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT ID, char_name, master, Faction, FactionRank FROM characters WHERE ID = ? AND Faction = ? LIMIT 1',
    [targetCharId, factionId]
  );

  return rows[0] ?? null;
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const factionId = Number(body?.factionId);
    const action = typeof body?.action === 'string' ? body.action : '';
    const targetCharId = Number(body?.targetCharId);
    const targetCharName = typeof body?.targetCharName === 'string' ? body.targetCharName.trim() : '';

    if (!Number.isInteger(factionId) || factionId <= 0) {
      return NextResponse.json({ error: 'Invalid faction ID' }, { status: 400 });
    }

    if (!ACTIONS.has(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const faction = await getFactionInfo(factionId);
    if (!faction) {
      return NextResponse.json({ error: 'Faction not found' }, { status: 404 });
    }

    // Rank 1 is the highest faction rank. Use the best rank across the account,
    // matching the in-game permission inheritance for alternative characters.
    const [actorRows] = await pool.execute<RowDataPacket[]>(
      'SELECT MIN(FactionRank) AS FactionRank FROM characters WHERE master = ? AND Faction = ? AND FactionRank > 0',
      [session.userId, factionId]
    );
    const actorRank = Number(actorRows[0]?.FactionRank ?? 0);

    if (actorRank < 1) {
      return NextResponse.json({ error: 'You are not a member of this faction.' }, { status: 403 });
    }

    if (!canManageFaction(faction.factionType, actorRank)) {
      return NextResponse.json({ error: 'Your rank does not allow managing this faction roster.' }, { status: 403 });
    }

    if (action === 'invite') {
      if (!targetCharName) {
        return NextResponse.json({ error: 'Target character name is required' }, { status: 400 });
      }

      const nameRegex = /^[A-Z][a-z]+_[A-Z][a-z]+$/;
      if (!nameRegex.test(targetCharName)) {
        return NextResponse.json({ error: 'Character name must use the Firstname_Lastname format (e.g. Budi_Pranoto).' }, { status: 400 });
      }

      if (faction.maxRank < 1) {
        return NextResponse.json({ error: 'Faction ranks are not configured.' }, { status: 400 });
      }

      const [charRows] = await pool.execute<RowDataPacket[]>(
        'SELECT ID, Faction FROM characters WHERE char_name = ? LIMIT 1',
        [targetCharName]
      );

      if (charRows.length === 0) {
        return NextResponse.json({ error: 'Character not found.' }, { status: 404 });
      }

      const memberChar = charRows[0];
      if (Number(memberChar.Faction) > 0) {
        return NextResponse.json({ error: 'Character is already a member of another faction.' }, { status: 400 });
      }

      const [result] = await pool.execute<ResultSetHeader>(
        'UPDATE characters SET Faction = ?, FactionRank = ? WHERE ID = ? AND Faction <= 0',
        [factionId, faction.maxRank, memberChar.ID]
      );

      if (result.affectedRows === 0) {
        return NextResponse.json({ error: 'Character is already a member of another faction.' }, { status: 409 });
      }

      return NextResponse.json({
        success: true,
        message: `Successfully invited ${targetCharName.replace('_', ' ')}!`,
      });
    }

    if (!Number.isInteger(targetCharId) || targetCharId <= 0) {
      return NextResponse.json({ error: 'Target character ID is required' }, { status: 400 });
    }

    const target = await getTargetCharacter(targetCharId, factionId);
    if (!target) {
      return NextResponse.json({ error: 'Member not found in this faction.' }, { status: 404 });
    }

    const targetRank = Number(target.FactionRank);

    if (Number(target.master) === session.userId) {
      return NextResponse.json({ error: 'You cannot manage your own faction membership.' }, { status: 400 });
    }

    if (targetRank <= actorRank) {
      return NextResponse.json({ error: 'You cannot manage a member with equal or higher rank.' }, { status: 403 });
    }

    if (action === 'promote') {
      if (targetRank <= 1) {
        return NextResponse.json({ error: 'Member is already at the highest rank.' }, { status: 400 });
      }

      const [result] = await pool.execute<ResultSetHeader>(
        'UPDATE characters SET FactionRank = FactionRank - 1 WHERE ID = ? AND Faction = ? AND FactionRank = ? AND FactionRank > 1',
        [targetCharId, factionId, targetRank]
      );

      if (result.affectedRows === 0) {
        return NextResponse.json({ error: 'Member rank changed. Please refresh and try again.' }, { status: 409 });
      }

      return NextResponse.json({ success: true, message: 'Member promoted successfully.' });
    }

    if (action === 'demote') {
      if (targetRank >= faction.maxRank) {
        return NextResponse.json({ error: 'Member is already at the lowest rank.' }, { status: 400 });
      }

      const [result] = await pool.execute<ResultSetHeader>(
        'UPDATE characters SET FactionRank = FactionRank + 1 WHERE ID = ? AND Faction = ? AND FactionRank = ? AND FactionRank < ?',
        [targetCharId, factionId, targetRank, faction.maxRank]
      );

      if (result.affectedRows === 0) {
        return NextResponse.json({ error: 'Member rank changed. Please refresh and try again.' }, { status: 409 });
      }

      return NextResponse.json({ success: true, message: 'Member demoted successfully.' });
    }

    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE characters SET Faction = -1, FactionRank = 0, FactionSpawn = 0 WHERE ID = ? AND Faction = ? AND FactionRank = ?',
      [targetCharId, factionId, targetRank]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Member changed. Please refresh and try again.' }, { status: 409 });
    }

    return NextResponse.json({ success: true, message: 'Member kicked from faction.' });
  } catch (error) {
    console.error('Faction roster action error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
