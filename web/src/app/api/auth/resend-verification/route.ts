import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import crypto from 'crypto';
import { sendVerificationEmail } from '@/lib/mailer';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { RowDataPacket } from 'mysql2';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email address is required' }, { status: 400 });
    }

    const ip = getClientIp(request);
    const [ipLimit, emailLimit] = await Promise.all([
      checkRateLimit({ action: 'resend:ip', key: ip, limit: 5, windowSeconds: 15 * 60 }),
      checkRateLimit({
        action: 'resend:email',
        key: email.toLowerCase(),
        limit: 3,
        windowSeconds: 15 * 60,
      }),
    ]);

    if (!ipLimit.allowed) return rateLimitResponse(ipLimit);
    if (!emailLimit.allowed) return rateLimitResponse(emailLimit);

    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT ID, EmailVerified FROM accounts WHERE Email = ? LIMIT 1',
      [email]
    );

    if (rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'If that email is registered and unverified, a new verification link has been sent.',
      });
    }

    const account = rows[0];

    if (account.EmailVerified === 1) {
      return NextResponse.json({ message: 'This email is already verified. You can sign in.' });
    }

    const verifyToken = crypto.randomBytes(32).toString('hex');
    const verifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await pool.execute(
      `UPDATE accounts SET EmailVerifyToken = ?, EmailVerifyExpiry = ? WHERE ID = ?`,
      [verifyToken, verifyExpiry, account.ID]
    );

    try {
      await sendVerificationEmail(email, verifyToken, request);
    } catch (mailError) {
      console.error('Failed to resend verification email via SMTP:', mailError);
    }

    return NextResponse.json({
      success: true,
      message: 'If that email is registered and unverified, a new verification link has been sent.',
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
