import crypto from 'crypto';
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export interface RateLimitOptions {
  action: string;
  key: string;
  limit: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfter: number;
}

function hashKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export function getClientIp(request: Request): string {
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;

  const cloudflareIp = request.headers.get('cf-connecting-ip')?.trim();
  if (cloudflareIp) return cloudflareIp;

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const hops = forwarded
      .split(',')
      .map((hop) => hop.trim())
      .filter(Boolean);
    return hops[hops.length - 1] || 'unknown';
  }

  return 'unknown';
}

export async function checkRateLimit({
  action,
  key,
  limit,
  windowSeconds,
}: RateLimitOptions): Promise<RateLimitResult> {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - (now % windowSeconds);
  const retryAfter = windowStart + windowSeconds - now;
  const bucket = hashKey(key);

  try {
    await pool.execute(
      `INSERT INTO \`ucp_rate_limits\` (\`bucket\`, \`action\`, \`window_start\`, \`count\`)
       VALUES (?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE \`count\` = \`count\` + 1`,
      [bucket, action, windowStart]
    );

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT \`count\` FROM \`ucp_rate_limits\`
       WHERE \`bucket\` = ? AND \`action\` = ? AND \`window_start\` = ?
       LIMIT 1`,
      [bucket, action, windowStart]
    );

    // shortcut: opportunistic cleanup, move to a scheduled job if the table grows.
    if (Math.random() < 0.01) {
      void pool
        .execute('DELETE FROM `ucp_rate_limits` WHERE `window_start` < ?', [now - 86400])
        .catch(() => {});
    }

    return {
      allowed: Number(rows[0]?.count ?? 0) <= limit,
      retryAfter,
    };
  } catch (error) {
    // Do not lock out authentication if the limiter table is unavailable.
    console.error('Rate limit check failed:', error);
    return { allowed: true, retryAfter: 0 };
  }
}

export function rateLimitResponse(result: RateLimitResult) {
  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(result.retryAfter),
      },
    }
  );
}
