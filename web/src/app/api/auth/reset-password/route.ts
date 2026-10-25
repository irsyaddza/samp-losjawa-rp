import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import bcrypt from 'bcryptjs';
import { RowDataPacket } from 'mysql2';

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ error: 'Token and new password are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const ipLimit = await checkRateLimit({
      action: 'reset:ip',
      key: getClientIp(request),
      limit: 10,
      windowSeconds: 15 * 60,
    });

    if (!ipLimit.allowed) return rateLimitResponse(ipLimit);

    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT ID, ResetCodeExpiry FROM accounts WHERE ResetCode = ? LIMIT 1',
      [token]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 });
    }

    const account = rows[0];

    if (new Date(account.ResetCodeExpiry) < new Date()) {
      return NextResponse.json({ error: 'Reset link has expired. Please request a new one.' }, { status: 400 });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Resetting password via email link proves email ownership -> Set EmailVerified = 1 automatically
    await pool.execute(
      `UPDATE accounts SET
        Password = ?,
        EmailVerified = 1,
        EmailVerifyToken = NULL,
        EmailVerifyExpiry = NULL,
        ResetCode = NULL,
        ResetCodeExpiry = NULL
       WHERE ID = ?`,
      [hashedPassword, account.ID]
    );

    return NextResponse.json({ success: true, message: 'Password has been reset. Your account is now verified and you can log in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
