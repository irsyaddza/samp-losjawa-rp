import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.trim() === '') {
    throw new Error('JWT_SECRET is not configured');
  }

  if (secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters');
  }

  return secret;
}

interface SessionTokenPayload {
  userId: number;
  username: string;
  adminLevel: number;
  sessionVersion?: number;
}

export interface AuthSession {
  userId: number;
  username: string;
  adminLevel: number;
  sessionVersion: number;
}

export function signToken(payload: AuthSession): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' });
}

export function verifyToken(token: string): SessionTokenPayload | null {
  const secret = getJwtSecret();

  try {
    return jwt.verify(token, secret) as SessionTokenPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT Username, Admin, SessionVersion FROM accounts WHERE ID = ? LIMIT 1',
    [payload.userId]
  );

  if (rows.length === 0) return null;

  const account = rows[0];
  const sessionVersion = Number(account.SessionVersion ?? 0);

  if (sessionVersion !== Number(payload.sessionVersion ?? 0)) {
    return null;
  }

  return {
    userId: payload.userId,
    username: account.Username || payload.username,
    adminLevel: Number(account.Admin ?? 0),
    sessionVersion,
  };
}

export async function setSessionCookie(payload: AuthSession) {
  const token = signToken(payload);
  const cookieStore = await cookies();
  cookieStore.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

export async function setSessionCookieForAccount(userId: number): Promise<boolean> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT Username, Admin, SessionVersion FROM accounts WHERE ID = ? LIMIT 1',
    [userId]
  );

  if (rows.length === 0) return false;

  const account = rows[0];
  await setSessionCookie({
    userId,
    username: account.Username || '',
    adminLevel: Number(account.Admin ?? 0),
    sessionVersion: Number(account.SessionVersion ?? 0),
  });

  return true;
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete('auth_token');
}
