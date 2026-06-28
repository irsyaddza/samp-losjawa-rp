import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { RowDataPacket } from 'mysql2';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { factionId, targetCharId, targetCharName, action } = await request.json();

    if (!factionId || !action) {
      return NextResponse.json({ error: 'Faction ID and action are required' }, { status: 400 });
    }

    // 1. Verify if the logged-in user owns a character that is a leader/officer of the faction
    // We assume FactionRank >= 5 represents leadership/officer rank (common in SA-MP scripts)
    const [leaderRows] = await pool.execute<RowDataPacket[]>(
      'SELECT ID, FactionRank FROM characters WHERE master = ? AND Faction = ? AND FactionRank >= 5 LIMIT 1',
      [session.userId, factionId]
    );

    if (leaderRows.length === 0) {
      return NextResponse.json({
        error: 'Only faction leaders or officers (Rank 5+) can manage the roster.'
      }, { status: 403 });
    }

    if (action === 'promote') {
      if (!targetCharId) return NextResponse.json({ error: 'Target character ID is required' }, { status: 400 });
      
      await pool.execute(
        'UPDATE characters SET FactionRank = FactionRank + 1 WHERE ID = ? AND Faction = ?',
        [targetCharId, factionId]
      );
      return NextResponse.json({ success: true, message: 'Member promoted successfully.' });
    } 
    
    else if (action === 'demote') {
      if (!targetCharId) return NextResponse.json({ error: 'Target character ID is required' }, { status: 400 });

      await pool.execute(
        'UPDATE characters SET FactionRank = FactionRank - 1 WHERE ID = ? AND Faction = ? AND FactionRank > 1',
        [targetCharId, factionId]
      );
      return NextResponse.json({ success: true, message: 'Member demoted successfully.' });
    } 
    
    else if (action === 'kick') {
      if (!targetCharId) return NextResponse.json({ error: 'Target character ID is required' }, { status: 400 });

      // Kick member by resetting Faction and FactionRank
      await pool.execute(
        'UPDATE characters SET Faction = -1, FactionRank = 0, FactionSpawn = 0 WHERE ID = ? AND Faction = ?',
        [targetCharId, factionId]
      );
      return NextResponse.json({ success: true, message: 'Member kicked from faction.' });
    } 
    
    else if (action === 'invite') {
      if (!targetCharName) return NextResponse.json({ error: 'Target character name is required' }, { status: 400 });

      // Format check (Firstname_Lastname)
      const nameRegex = /^[A-Z][a-z]+_[A-Z][a-z]+$/;
      if (!nameRegex.test(targetCharName)) {
        return NextResponse.json({ error: 'Format nama harus Firstname_Lastname (e.g. Budi_Pranoto)' }, { status: 400 });
      }

      // Check if character exists
      const [charRows] = await pool.execute<RowDataPacket[]>(
        'SELECT ID, Faction FROM characters WHERE char_name = ? LIMIT 1',
        [targetCharName]
      );

      if (charRows.length === 0) {
        return NextResponse.json({ error: 'Character not found.' }, { status: 404 });
      }

      const memberChar = charRows[0];
      if (memberChar.Faction > 0) {
        return NextResponse.json({ error: 'Character is already a member of another faction.' }, { status: 400 });
      }

      // Invite to faction at Rank 1
      await pool.execute(
        'UPDATE characters SET Faction = ?, FactionRank = 1 WHERE ID = ?',
        [factionId, memberChar.ID]
      );

      return NextResponse.json({ success: true, message: `Successfully invited ${targetCharName.replace('_', ' ')}!` });
    } 
    
    else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Faction roster action error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
