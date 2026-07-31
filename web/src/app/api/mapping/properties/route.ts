import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { RowDataPacket } from 'mysql2';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Get UCP houses
    const [houses] = await pool.execute<RowDataPacket[]>(
      'SELECT id, info FROM houses WHERE ownerSQLID IN (SELECT ID FROM characters WHERE master = ?)',
      [session.userId]
    );

    // 2. Get UCP businesses
    const [bizs] = await pool.execute<RowDataPacket[]>(
      'SELECT biz_id, biz_info FROM business WHERE biz_owner IN (SELECT char_name FROM characters WHERE master = ?)',
      [session.userId]
    );

    // 3. Get UCP apartments
    const [apts] = await pool.execute<RowDataPacket[]>(
      'SELECT ID, name FROM apartments WHERE ownerSQLID IN (SELECT ID FROM characters WHERE master = ?)',
      [session.userId]
    );

    // Format them into a unified list
    const propertiesList = [
      ...houses.map((h) => ({ type: 1, typeLabel: 'Rumah', id: h.id, label: `${h.info} (ID: ${h.id})` })),
      ...bizs.map((b) => ({ type: 2, typeLabel: 'Bisnis', id: b.biz_id, label: `${b.biz_info} (ID: ${b.biz_id})` })),
      ...apts.map((a) => ({ type: 3, typeLabel: 'Apartemen', id: a.ID, label: `${a.name} (ID: ${a.ID})` })),
    ];

    return NextResponse.json({ properties: propertiesList });
  } catch (error) {
    console.error('Error fetching owned properties:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
