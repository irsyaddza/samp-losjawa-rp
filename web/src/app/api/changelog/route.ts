import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, version, entry, added_by, added_date, created_at
       FROM server_changelogs
       ORDER BY id DESC`
    );

    return NextResponse.json({ success: true, entries: rows });
  } catch (error) {
    console.error('Changelog fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch changelog' },
      { status: 500 }
    );
  }
}
