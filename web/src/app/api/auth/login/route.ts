import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { whirlpool } from '@/lib/hash';
import { setSessionCookie } from '@/lib/auth';
import { RowDataPacket } from 'mysql2';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Query database for user
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT ID, Username, Password, Admin FROM accounts WHERE Username = ? LIMIT 1',
      [username]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    const account = rows[0];
    const hashedPassword = whirlpool(password);

    // Compare Whirlpool hashes
    if (account.Password.toUpperCase() !== hashedPassword) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Save session
    await setSessionCookie({
      userId: account.ID,
      username: account.Username,
      adminLevel: account.Admin,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: account.ID,
        username: account.Username,
        adminLevel: account.Admin,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
