import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { whirlpool } from '@/lib/hash';
import { setSessionCookie } from '@/lib/auth';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function POST(request: Request) {
  try {
    const { username, password, email } = await request.json();

    if (!username || !password || !email) {
      return NextResponse.json(
        { error: 'All fields (username, password, email) are required' },
        { status: 400 }
      );
    }

    if (username.length < 3 || username.length > 24) {
      return NextResponse.json(
        { error: 'Username must be between 3 and 24 characters' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Check if username already exists
    const [existingUsers] = await pool.execute<RowDataPacket[]>(
      'SELECT ID FROM accounts WHERE Username = ? LIMIT 1',
      [username]
    );

    if (existingUsers.length > 0) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 400 }
      );
    }

    // Hash the password using Whirlpool
    const hashedPassword = whirlpool(password);

    // Insert user into accounts table
    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO accounts (Username, Password, Email) VALUES (?, ?, ?)',
      [username, hashedPassword, email]
    );

    const newUserId = result.insertId;

    // Save session
    await setSessionCookie({
      userId: newUserId,
      username,
      adminLevel: 0,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: newUserId,
        username,
        adminLevel: 0,
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
