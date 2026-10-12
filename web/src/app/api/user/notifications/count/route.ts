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
      'SELECT COUNT(*) as count FROM notifications WHERE master = ? AND `read` = 0',
      [session.userId]
    );

    return NextResponse.json({ count: rows[0]?.count || 0 });
  } catch (error) {
    console.error('Error fetching notification count:', error);
    return NextResponse.json({ count: 0 });
  }
}
export const dynamic = 'force-dynamic';
