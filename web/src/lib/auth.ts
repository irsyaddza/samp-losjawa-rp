import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

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

export interface AuthSession {
  userId: number;
  username: string;
  adminLevel: number;
}

export function signToken(payload: AuthSession): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' });
}

export function verifyToken(token: string): AuthSession | null {
  const secret = getJwtSecret();

  try {
    return jwt.verify(token, secret) as AuthSession;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return null;
  return verifyToken(token);
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

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete('auth_token');
}
