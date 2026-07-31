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
    const query = searchParams.get('q') || '';

    if (query.length < 2) {
      return NextResponse.json([]);
    }

    // Search characters by name
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT ID, char_name, DonateRank FROM characters WHERE char_name LIKE ? LIMIT 10',
      [`%${query}%`]
    );

    return NextResponse.json(rows);
  } catch (error) {
    console.error('Search characters error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
