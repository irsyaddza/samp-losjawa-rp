import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { RowDataPacket } from 'mysql2';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ count: 0 });
    }

    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) AS count FROM ucp_notifications WHERE account_id = ? AND is_read = 0',
      [session.userId]
    );

    return NextResponse.json({ count: Number(rows[0]?.count || 0) });
  } catch (error) {
    console.error('System notification count error:', error);
    return NextResponse.json({ count: 0 });
  }
}

export const dynamic = 'force-dynamic';
