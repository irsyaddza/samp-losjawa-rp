import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '@/lib/mailer';
import { RowDataPacket } from 'mysql2';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email address is required' }, { status: 400 });
    }

    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT ID, Username FROM accounts WHERE Email = ? LIMIT 1',
      [email]
    );

    // Always return success message to prevent email enumeration
    if (rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'If that email is registered, you will receive a reset link shortly.',
      });
    }

    const account = rows[0];
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await pool.execute(
      'UPDATE accounts SET ResetCode = ?, ResetCodeExpiry = ? WHERE ID = ?',
      [resetToken, resetExpiry, account.ID]
    );

    try {
      await sendPasswordResetEmail(email, resetToken, request);
    } catch (mailError) {
      console.error('Failed to send reset email via SMTP:', mailError);
    }

    return NextResponse.json({
      success: true,
      message: 'If that email is registered, you will receive a reset link shortly.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
