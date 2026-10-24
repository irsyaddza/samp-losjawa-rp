import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { RowDataPacket } from 'mysql2';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { action, id } = await request.json();

    if (action === 'read_all') {
      await pool.execute(
        'UPDATE ucp_notifications SET is_read = 1 WHERE account_id = ? AND is_read = 0',
        [session.userId]
      );
    } else if (action === 'read') {
      const notificationId = parseInt(id, 10);
      if (!notificationId) {
        return NextResponse.json({ error: 'Invalid notification.' }, { status: 400 });
      }

      await pool.execute(
        'UPDATE ucp_notifications SET is_read = 1 WHERE id = ? AND account_id = ?',
        [notificationId, session.userId]
      );
    } else {
      return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
    }

    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) AS count FROM ucp_notifications WHERE account_id = ? AND is_read = 0',
      [session.userId]
    );

    return NextResponse.json({ success: true, count: Number(rows[0]?.count || 0) });
  } catch (error) {
    console.error('System notification update error:', error);
    return NextResponse.json({ error: 'Failed to update notifications.' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
