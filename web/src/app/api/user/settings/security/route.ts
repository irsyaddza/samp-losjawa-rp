import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { secretWord, secretHint } = await request.json();

    if (!secretWord) {
      return NextResponse.json({ error: 'Secret word is required' }, { status: 400 });
    }

    // Update SecretWord and SecretHint in database
    await pool.execute(
      'UPDATE accounts SET SecretWord = ?, SecretHint = ? WHERE ID = ?',
      [secretWord, secretHint || '', session.userId]
    );

    return NextResponse.json({ success: true, message: 'Security details updated successfully' });
  } catch (error) {
    console.error('Update security details error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
