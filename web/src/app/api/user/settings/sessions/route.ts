import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession, setSessionCookieForAccount } from '@/lib/auth';

export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await pool.execute(
      'UPDATE accounts SET SessionVersion = SessionVersion + 1 WHERE ID = ?',
      [session.userId]
    );

    const refreshed = await setSessionCookieForAccount(session.userId);
    if (!refreshed) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'All other sessions have been revoked.',
    });
  } catch (error) {
    console.error('Revoke sessions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
