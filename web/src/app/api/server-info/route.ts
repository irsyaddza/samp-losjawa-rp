import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET() {
  try {
    // 1. Count registered accounts
    const [accountsRows] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM accounts'
    );
    const totalAccounts = accountsRows[0]?.count || 0;

    // 2. Count registered characters
    const [charactersRows] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM characters'
    );
    const totalCharacters = charactersRows[0]?.count || 0;

    // 3. Count online players
    const [onlineRows] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM accounts WHERE Online = 1'
    );
    const onlinePlayers = onlineRows[0]?.count || 0;

    // 4. Fetch list of online players (limit to 10 for dashboard preview)
    const [onlinePlayersListRows] = await pool.execute<RowDataPacket[]>(
      'SELECT Username, Admin, DonateRank FROM accounts WHERE Online = 1 LIMIT 10'
    );

    return NextResponse.json({
      success: true,
      stats: {
        totalAccounts,
        totalCharacters,
        onlinePlayers,
        maxPlayers: 200, // Fixed matching MAX_PLAYERS
      },
      onlineList: onlinePlayersListRows,
    });
  } catch (error) {
    console.error('Server info error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch server info' },
      { status: 500 }
    );
  }
}
