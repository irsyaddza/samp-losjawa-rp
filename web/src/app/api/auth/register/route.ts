import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendVerificationEmail } from '@/lib/mailer';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function POST(request: Request) {
  try {
    const { username, password, email } = await request.json();

    if (!username || !password || !email) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }
    if (username.length < 3 || username.length > 24) {
      return NextResponse.json({ error: 'Username must be between 3 and 24 characters' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const ip = getClientIp(request);
    const [ipLimit, emailLimit] = await Promise.all([
      checkRateLimit({ action: 'register:ip', key: ip, limit: 5, windowSeconds: 60 * 60 }),
      checkRateLimit({
        action: 'register:email',
        key: email.toLowerCase(),
        limit: 3,
        windowSeconds: 60 * 60,
      }),
    ]);

    if (!ipLimit.allowed) return rateLimitResponse(ipLimit);
    if (!emailLimit.allowed) return rateLimitResponse(emailLimit);

    // Clean up expired unverified accounts matching username or email
    await pool.execute(
      `DELETE FROM accounts WHERE (Username = ? OR Email = ?) AND EmailVerified = 0 AND EmailVerifyExpiry < NOW()`,
      [username, email]
    );

    // Check duplicate username
    const [existingUsers] = await pool.execute<RowDataPacket[]>(
      'SELECT ID FROM accounts WHERE Username = ? LIMIT 1',
      [username]
    );
    if (existingUsers.length > 0) {
      return NextResponse.json({ error: 'Username is already taken' }, { status: 400 });
    }

    // Check duplicate email
    const [existingEmail] = await pool.execute<RowDataPacket[]>(
      'SELECT ID FROM accounts WHERE Email = ? LIMIT 1',
      [email]
    );
    if (existingEmail.length > 0) {
      return NextResponse.json({ error: 'Email address is already registered' }, { status: 400 });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate email verification token (expires in 24 hours)
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const verifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await pool.execute<ResultSetHeader>(
      `INSERT INTO accounts (Username, Password, Email, EmailVerified, EmailVerifyToken, EmailVerifyExpiry)
       VALUES (?, ?, ?, 0, ?, ?)`,
      [username, hashedPassword, email, verifyToken, verifyExpiry]
    );

    // Await email dispatch with request context to build dynamic URL
    try {
      await sendVerificationEmail(email, verifyToken, request);
    } catch (mailError) {
      console.error('Failed to send verification email via SMTP:', mailError);
    }

    return NextResponse.json({
      success: true,
      message: 'Account created. Please check your email to verify your account.',
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
