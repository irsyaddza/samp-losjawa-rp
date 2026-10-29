import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { verifyPassword } from '@/lib/hash';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { RowDataPacket } from 'mysql2';

const SECRET_MAX_LENGTH = 24;

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const secretWord = typeof body?.secretWord === 'string' ? body.secretWord.trim() : '';
    const secretHint = typeof body?.secretHint === 'string' ? body.secretHint.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!password) {
      return NextResponse.json(
        { error: 'Current password is required' },
        { status: 400 }
      );
    }

    if (!secretWord && !secretHint) {
      return NextResponse.json(
        { error: 'Enter a new secret word or hint' },
        { status: 400 }
      );
    }

    if (secretWord.length > SECRET_MAX_LENGTH || secretHint.length > SECRET_MAX_LENGTH) {
      return NextResponse.json(
        { error: 'Secret word and hint must be 24 characters or fewer' },
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
      'SELECT Password FROM accounts WHERE ID = ? LIMIT 1',
      [session.userId]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const isPasswordValid = await verifyPassword(password, String(rows[0].Password ?? ''));

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    }

    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (secretWord) {
      updates.push('SecretWord = ?');
      values.push(secretWord);
    }
    if (secretHint) {
      updates.push('SecretHint = ?');
      values.push(secretHint);
    }

    values.push(session.userId);
    await pool.execute(`UPDATE accounts SET ${updates.join(', ')} WHERE ID = ?`, values);

    return NextResponse.json({
      success: true,
      message: 'Security details updated successfully',
    });
  } catch (error) {
    console.error('Update security details error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
