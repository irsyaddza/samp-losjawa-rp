import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import crypto from 'crypto';
import { sendVerificationEmail } from '@/lib/mailer';
import { RowDataPacket } from 'mysql2';

export async function POST(request: Request) {
  try {
    const { accountId, username, email } = await request.json();

    if (!accountId || !username || !email) {
      return NextResponse.json({ error: 'Account details and email address are required' }, { status: 400 });
    }

    if (!email.includes('@') || !email.includes('.')) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
    }

    // Verify account exists
    const [userRows] = await pool.execute<RowDataPacket[]>(
      'SELECT ID, Email FROM accounts WHERE ID = ? AND Username = ? LIMIT 1',
      [accountId, username]
    );

    if (userRows.length === 0) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
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
        EmailVerifyExpiry = ?
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
    console.error('Link email error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
