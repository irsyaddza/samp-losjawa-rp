import { NextResponse } from 'next/server';
import crypto from 'crypto';
import pool from '@/lib/db';
import { getSession, setSessionCookieForAccount } from '@/lib/auth';
import { verifyPassword } from '@/lib/hash';
import { sendVerificationEmail } from '@/lib/mailer';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { isDuplicateEntryError } from '@/lib/db-errors';
import { RowDataPacket } from 'mysql2';

const EMAIL_MAX_LENGTH = 32;
const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const email = typeof body?.email === 'string' ? body.email.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and current password are required' },
        { status: 400 }
      );
    }

    if (email.length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address (max 32 characters)' },
        { status: 400 }
      );
    }

    const limit = await checkRateLimit({
      action: 'settings:reauth',
      key: String(session.userId),
      limit: 10,
      windowSeconds: 15 * 60,
    });
    if (!limit.allowed) return rateLimitResponse(limit);

    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT Password, Email FROM accounts WHERE ID = ? LIMIT 1',
      [session.userId]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const account = rows[0];
    const isPasswordValid = await verifyPassword(password, String(account.Password ?? ''));

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    }

    const currentEmail = typeof account.Email === 'string' ? account.Email.trim() : '';
    if (email.toLowerCase() === currentEmail.toLowerCase()) {
      return NextResponse.json(
        { error: 'New email must be different from your current email' },
        { status: 400 }
      );
    }

    const [existingEmail] = await pool.execute<RowDataPacket[]>(
      'SELECT ID FROM accounts WHERE Email = ? AND ID != ? LIMIT 1',
      [email, session.userId]
    );

    if (existingEmail.length > 0) {
      return NextResponse.json(
        { error: 'This email address is already registered to another account' },
        { status: 400 }
      );
    }

    const verifyToken = crypto.randomBytes(32).toString('hex');
    const verifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await pool.execute(
      `UPDATE accounts SET
        Email = ?,
        EmailVerified = 0,
        EmailVerifyToken = ?,
        EmailVerifyExpiry = ?,
        ResetCode = NULL,
        ResetCodeExpiry = NULL,
        SessionVersion = SessionVersion + 1
       WHERE ID = ?`,
      [email, verifyToken, verifyExpiry, session.userId]
    );

    try {
      await sendVerificationEmail(email, verifyToken, request);
    } catch (mailError) {
      console.error('Failed to send verification email after email change:', mailError);
    }

    try {
      await setSessionCookieForAccount(session.userId);
    } catch (sessionError) {
      console.error('Failed to refresh session after email change:', sessionError);
      return NextResponse.json({
        success: true,
        message: 'Email updated. Please verify the new address and sign in again.',
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Recovery email updated. Please check your inbox to verify the new address. Other sessions have been signed out.',
    });
  } catch (error) {
    if (isDuplicateEntryError(error)) {
      return NextResponse.json(
        { error: 'This email address is already registered to another account' },
        { status: 400 }
      );
    }

    console.error('Update email error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
