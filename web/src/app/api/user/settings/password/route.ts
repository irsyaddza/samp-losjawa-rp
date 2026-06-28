import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { whirlpool } from '@/lib/hash';
import { RowDataPacket } from 'mysql2';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { oldPassword, newPassword } = await request.json();

    if (!oldPassword || !newPassword) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
    }

    // Get current password hash
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT Password FROM accounts WHERE ID = ? LIMIT 1',
      [session.userId]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const currentHashed = rows[0].Password;
    const oldHashed = whirlpool(oldPassword);

    if (currentHashed.toUpperCase() !== oldHashed) {
      return NextResponse.json({ error: 'Old password is incorrect' }, { status: 400 });
    }

    // Hash new password and update
    const newHashed = whirlpool(newPassword);
    await pool.execute(
      'UPDATE accounts SET Password = ? WHERE ID = ?',
      [newHashed, session.userId]
    );

    return NextResponse.json({ success: true, message: 'Password updated successfully' });
  } catch (error: any) {
    console.error('Update password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
