import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { whirlpool } from '@/lib/hash';
import bcrypt from 'bcryptjs';
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
    let isOldPasswordValid = false;
    const isBcrypt = currentHashed.startsWith('$2a$') || currentHashed.startsWith('$2y$') || currentHashed.startsWith('$2b$');

    if (isBcrypt) {
      isOldPasswordValid = await bcrypt.compare(oldPassword, currentHashed);
    } else {
      const oldHashed = whirlpool(oldPassword);
      isOldPasswordValid = (currentHashed.toUpperCase() === oldHashed);
    }

    if (!isOldPasswordValid) {
      return NextResponse.json({ error: 'Old password is incorrect' }, { status: 400 });
    }

    // Hash new password using Bcrypt
    const salt = await bcrypt.genSalt(12);
    const newHashed = await bcrypt.hash(newPassword, salt);
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
