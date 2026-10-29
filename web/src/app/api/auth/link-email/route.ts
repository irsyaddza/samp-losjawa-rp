import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import crypto from 'crypto';
import { verifyPassword } from '@/lib/hash';
import { sendVerificationEmail } from '@/lib/mailer';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { isDuplicateEntryError } from '@/lib/db-errors';
import { RowDataPacket } from 'mysql2';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const accountId = Number(body?.accountId);
    const username = typeof body?.username === 'string' ? body.username.trim() : '';
    const email = typeof body?.email === 'string' ? body.email.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!Number.isInteger(accountId) || accountId <= 0 || !username || !email || !password) {
      return NextResponse.json(
        { error: 'Account details, email address, and password are required' },
        { status: 400 }
      );
    }

    if (!email.includes('@') || !email.includes('.')) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
    }

    const ip = getClientIp(request);
    const [ipLimit, accountLimit] = await Promise.all([
      checkRateLimit({ action: 'link:ip', key: ip, limit: 5, windowSeconds: 15 * 60 }),
      checkRateLimit({
        action: 'link:account',
        key: String(accountId),
        limit: 5,
        windowSeconds: 15 * 60,
      }),
    ]);

    if (!ipLimit.allowed) return rateLimitResponse(ipLimit);
    if (!accountLimit.allowed) return rateLimitResponse(accountLimit);

    const [userRows] = await pool.execute<RowDataPacket[]>(
      'SELECT ID, Username, Password, Email FROM accounts WHERE ID = ? AND Username = ? LIMIT 1',
      [accountId, username]
    );

    if (userRows.length === 0) {
      return NextResponse.json({ error: 'Invalid account or password' }, { status: 401 });
    }

    const account = userRows[0];

    const hasExistingEmail =
      typeof account.Email === 'string' &&
      account.Email.trim() !== '' &&
      account.Email !== 'None' &&
      account.Email.includes('@');

    if (hasExistingEmail) {
      return NextResponse.json(
        { error: 'This account already has a linked email address.' },
        { status: 409 }
      );
    }

    // Re-check the password because this route is reachable without a session.
    const isPasswordValid = await verifyPassword(password, String(account.Password ?? ''));
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid account or password' }, { status: 401 });
    }

    // Check if email is already taken by another account
    const [existingEmail] = await pool.execute<RowDataPacket[]>(
      'SELECT ID FROM accounts WHERE Email = ? AND ID != ? LIMIT 1',
      [email, accountId]
    );

    if (existingEmail.length > 0) {
      return NextResponse.json({ error: 'This email address is already registered to another account' }, { status: 400 });
    }

    const verifyToken = crypto.randomBytes(32).toString('hex');
    const verifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Update account with new email and set unverified
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
      [email, verifyToken, verifyExpiry, accountId]
    );

    // Send verification email with request context
    try {
      await sendVerificationEmail(email, verifyToken, request);
    } catch (mailError) {
      console.error('Failed to send verification email during link-email:', mailError);
    }

    return NextResponse.json({
      success: true,
      message: `Email ${email} linked to account ${username}. Please check your inbox to verify your account.`,
    });
  } catch (error) {
    if (isDuplicateEntryError(error)) {
      return NextResponse.json(
        { error: 'This email address is already registered to another account' },
        { status: 400 }
      );
    }

    console.error('Link email error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
