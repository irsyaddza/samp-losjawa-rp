import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { whirlpool } from '@/lib/hash';
import { setSessionCookie } from '@/lib/auth';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import bcrypt from 'bcryptjs';
import { RowDataPacket } from 'mysql2';

function describeUserAgent(userAgent: string) {
  const browser = /Edg\//.test(userAgent)
    ? 'Edge'
    : /OPR\//.test(userAgent)
      ? 'Opera'
      : /Chrome\//.test(userAgent)
        ? 'Chrome'
        : /Firefox\//.test(userAgent)
          ? 'Firefox'
          : /Safari\//.test(userAgent)
            ? 'Safari'
            : 'Unknown';

  const os = /Windows/.test(userAgent)
    ? 'Windows'
    : /Android/.test(userAgent)
      ? 'Android'
      : /iPhone|iPad|iPod/.test(userAgent)
        ? 'iOS'
        : /Mac OS X/.test(userAgent)
          ? 'macOS'
          : /Linux/.test(userAgent)
            ? 'Linux'
            : 'Unknown';

  return { browser, os };
}

export async function POST(request: Request) {
  try {
    const { username, password }: { username?: string; password?: string } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const ip = getClientIp(request);
    const [ipLimit, accountLimit] = await Promise.all([
      checkRateLimit({ action: 'login:ip', key: ip, limit: 30, windowSeconds: 15 * 60 }),
      checkRateLimit({
        action: 'login:account',
        key: username.toLowerCase(),
        limit: 10,
        windowSeconds: 15 * 60,
      }),
    ]);

    if (!ipLimit.allowed) return rateLimitResponse(ipLimit);
    if (!accountLimit.allowed) return rateLimitResponse(accountLimit);

    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT ID, Username, Password, Admin, Email, EmailVerified, SessionVersion FROM accounts WHERE Username = ? LIMIT 1',
      [username]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    const account = rows[0];
    let isPasswordValid = false;
    const isBcrypt =
      account.Password.startsWith('$2a$') ||
      account.Password.startsWith('$2y$') ||
      account.Password.startsWith('$2b$');

    if (isBcrypt) {
      isPasswordValid = await bcrypt.compare(password, account.Password);
    } else {
      const hashedPassword = whirlpool(password);
      isPasswordValid = account.Password.toUpperCase() === hashedPassword;

      if (isPasswordValid) {
        try {
          const salt = await bcrypt.genSalt(12);
          const newBcryptHash = await bcrypt.hash(password, salt);
          await pool.execute(
            'UPDATE accounts SET Password = ? WHERE ID = ?',
            [newBcryptHash, account.ID]
          );
        } catch (upgradeError) {
          console.error('Password hash upgrade failed:', upgradeError);
        }
      }
    }

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    const hasValidEmail =
      account.Email &&
      account.Email.trim() !== '' &&
      account.Email !== 'None' &&
      account.Email.includes('@');

    if (!hasValidEmail) {
      return NextResponse.json(
        {
          error: 'Your account does not have a linked email address. Please enter an email address to receive your verification link.',
          requireEmail: true,
          accountId: account.ID,
          username: account.Username,
        },
        { status: 403 }
      );
    }

    if (account.EmailVerified === 0) {
      return NextResponse.json(
        {
          error: 'Please verify your email address before signing in. Check your inbox or request a new verification email.',
          unverified: true,
          email: account.Email,
        },
        { status: 403 }
      );
    }

    await setSessionCookie({
      userId: account.ID,
      username: account.Username,
      adminLevel: account.Admin,
      sessionVersion: Number(account.SessionVersion ?? 0),
    });

    const { browser, os } = describeUserAgent(request.headers.get('user-agent') || '');

    try {
      await pool.execute(
        'INSERT INTO ucp_logins (User, IP, Browser, OS) VALUES (?, ?, ?, ?)',
        [account.Username, ip, browser, os]
      );
    } catch (historyError) {
      console.error('Login history insert failed:', historyError);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: account.ID,
        username: account.Username,
        adminLevel: account.Admin,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Login error:', message);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}