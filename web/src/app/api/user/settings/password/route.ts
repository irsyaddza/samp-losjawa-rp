import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession, setSessionCookieForAccount } from '@/lib/auth';
import { verifyPassword } from '@/lib/hash';
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

    const currentHashed = String(rows[0].Password ?? '');
    const isOldPasswordValid = await verifyPassword(oldPassword, currentHashed);

    if (!isOldPasswordValid) {
      return NextResponse.json({ error: 'Old password is incorrect' }, { status: 400 });
    }

    // Hash new password using Bcrypt
    const salt = await bcrypt.genSalt(12);
    const newHashed = await bcrypt.hash(newPassword, salt);
    await pool.execute(
      'UPDATE accounts SET Password = ?, SessionVersion = SessionVersion + 1 WHERE ID = ?',
      [newHashed, session.userId]
    );

    try {
      await setSessionCookieForAccount(session.userId);
    } catch (sessionError) {
      console.error('Failed to refresh session after password change:', sessionError);
      return NextResponse.json({
        success: true,
        message: 'Password updated. Please sign in again.',
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully. Other sessions have been signed out.',
    });
  } catch (error) {
    console.error('Update password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
