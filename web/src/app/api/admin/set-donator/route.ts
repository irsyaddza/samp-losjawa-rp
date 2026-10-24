import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { RowDataPacket } from 'mysql2';
import { createSystemNotification } from '@/lib/system-notifications';
import { logAdminAction } from '@/lib/audit';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.adminLevel <= 0) {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const { charId, level, days } = await request.json();

    if (charId === undefined || level === undefined) {
      return NextResponse.json({ error: 'Character ID and level are required' }, { status: 400 });
    }

    const targetLevel = parseInt(level);
    const durationDays = parseInt(days || '30');

    if (targetLevel < 0 || targetLevel > 3) {
      return NextResponse.json({ error: 'Invalid donator level. Must be between 0 and 3.' }, { status: 400 });
    }

    // Calculate expiry timestamp
    const expiryUnix = targetLevel === 0 ? 0 : Math.floor(Date.now() / 1000) + (durationDays * 86400);

    // 1. Update characters table for this specific character
    await pool.execute(
      'UPDATE characters SET DonateRank = ?, DonateExpired = ? WHERE ID = ?',
      [targetLevel, expiryUnix, charId]
    );

    // 2. Fetch the master UCP account ID of this character
    const [charRows] = await pool.execute<RowDataPacket[]>(
      'SELECT master FROM characters WHERE ID = ? LIMIT 1',
      [charId]
    );

    if (charRows.length > 0) {
      const masterAccountId = charRows[0].master;

      // 3. Find the highest DonateRank among all characters of this UCP account
      const [rankRows] = await pool.execute<RowDataPacket[]>(
        'SELECT MAX(DonateRank) as maxRank FROM characters WHERE master = ?',
        [masterAccountId]
      );

      const maxRank = rankRows[0]?.maxRank || 0;

      // 4. Sync accounts table DonateRank with the highest character DonateRank
      await pool.execute(
        'UPDATE accounts SET DonateRank = ? WHERE ID = ?',
        [maxRank, masterAccountId]
      );

      await createSystemNotification({
        accountId: Number(masterAccountId),
        type: 'account',
        title: 'Donator status updated',
        body:
          targetLevel === 0
            ? `Donator status removed from character #${charId}.`
            : `Character #${charId} is now donator level ${targetLevel} for ${durationDays} days.`,
        link: '/dashboard',
      });
    }

    await logAdminAction({
      adminId: session.userId,
      adminUsername: session.username,
      action: 'donator.set',
      targetType: 'character',
      targetId: charId,
      details:
        targetLevel === 0
          ? `Removed donator status from character #${charId}.`
          : `Set character #${charId} to donator level ${targetLevel} for ${durationDays} days.`,
      request,
    });

    return NextResponse.json({ 
      success: true, 
      message: `Successfully set donator level to ${targetLevel} for character ID ${charId}.` 
    });
  } catch (error) {
    console.error('Set donator error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
