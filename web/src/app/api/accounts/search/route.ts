import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { RowDataPacket } from 'mysql2';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim() || '';

    if (!query || query.length === 0) {
      return NextResponse.json({ results: [] });
    }

    const searchPattern = `%${query}%`;
    const startPattern = `${query}%`;

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
         a.ID as id,
         a.Username as username,
         COUNT(DISTINCT c.ID) as characterCount,
         SUBSTRING_INDEX(GROUP_CONCAT(DISTINCT REPLACE(c.char_name, '_', ' ') SEPARATOR ', '), ', ', 2) as sampleCharacters,
         f.friendPending,
         f.playerID as requestSenderId
       FROM accounts a
       LEFT JOIN characters c ON c.master = a.ID
       LEFT JOIN ucp_friends f ON (
         (f.playerID = ? AND f.friendID = a.ID) OR
         (f.playerID = a.ID AND f.friendID = ?)
       )
       WHERE (a.Username LIKE ? OR c.char_name LIKE ?) AND a.ID != ?
       GROUP BY a.ID, a.Username, f.friendPending, f.playerID
       ORDER BY 
         CASE 
           WHEN a.Username = ? THEN 1
           WHEN a.Username LIKE ? THEN 2
           ELSE 3 
         END,
         a.Username ASC
       LIMIT 10`,
      [
        session.userId,
        session.userId,
        searchPattern,
        searchPattern,
        session.userId,
        query,
        startPattern,
      ]
    );

    const results = rows.map((row) => {
      let status: 'friend' | 'pending_outgoing' | 'pending_incoming' | 'none' = 'none';

      if (row.friendPending === 0) {
        status = 'friend';
      } else if (row.friendPending === 1) {
        status = row.requestSenderId === session.userId ? 'pending_outgoing' : 'pending_incoming';
      }

      return {
        id: row.id,
        username: row.username,
        characterCount: Number(row.characterCount || 0),
        sampleCharacters: row.sampleCharacters || null,
        status,
      };
    });

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error searching player accounts:', error);
    return NextResponse.json({ error: 'Failed to search accounts' }, { status: 500 });
  }
}
