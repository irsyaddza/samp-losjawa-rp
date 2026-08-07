import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT ID, EmailVerified, EmailVerifyExpiry FROM accounts
       WHERE EmailVerifyToken = ? LIMIT 1`,
      [token]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Invalid or expired verification link' }, { status: 400 });
    }

    const account = rows[0];

    if (account.EmailVerified === 1) {
      return NextResponse.json({ message: 'Email is already verified' });
    }

    if (new Date(account.EmailVerifyExpiry) < new Date()) {
      return NextResponse.json({ error: 'Verification link has expired. Please register again or request a new link.' }, { status: 400 });
    }

    await pool.execute(
      `UPDATE accounts SET EmailVerified = 1, EmailVerifyToken = NULL, EmailVerifyExpiry = NULL WHERE ID = ?`,
      [account.ID]
    );

    return NextResponse.json({ success: true, message: 'Email verified successfully. You can now log in.' });
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
