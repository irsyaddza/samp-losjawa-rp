import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { RowDataPacket } from 'mysql2';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.adminLevel <= 0) {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim() || '';

    if (query.length < 2) {
      return NextResponse.json([]);
    }

    const searchPattern = `%${query}%`;
    const startPattern = `${query}%`;

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT a.ID, a.Username, a.Admin, a.Online, a.LastIP,
              DATE_FORMAT(a.RegisterDate, '%b %e, %Y') AS registered_at,
              DATE_FORMAT(FROM_UNIXTIME(NULLIF(a.LoginDate, 0)), '%b %e, %Y %H:%i') AS last_login,
              (SELECT GROUP_CONCAT(c.char_name SEPARATOR ', ')
               FROM characters c WHERE c.master = a.ID) AS characters,
              (SELECT SUBSTRING_INDEX(
                 GROUP_CONCAT(
                   DISTINCT CASE WHEN c.char_name LIKE ? THEN REPLACE(c.char_name, '_', ' ') END
                   SEPARATOR ', '
                 ),
                 ', ',
                 3
               )
               FROM characters c WHERE c.master = a.ID) AS matchedCharacters,
              (SELECT COUNT(*) FROM bans b
               WHERE b.name = a.Username AND (b.perm = 1 OR b.expire > NOW())) AS active_bans
       FROM accounts a
       WHERE a.Username LIKE ?
          OR EXISTS (
            SELECT 1 FROM characters c
            WHERE c.master = a.ID AND c.char_name LIKE ?
          )
       ORDER BY
         CASE
           WHEN a.Username LIKE ? THEN 0
           WHEN EXISTS (
             SELECT 1 FROM characters c
             WHERE c.master = a.ID AND c.char_name LIKE ?
           ) THEN 1
           ELSE 2
         END,
         a.Online DESC,
         a.Username ASC
       LIMIT 10`,
      [searchPattern, searchPattern, searchPattern, startPattern, searchPattern]
    );

    return NextResponse.json(rows);
  } catch (error) {
    console.error('Search users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
