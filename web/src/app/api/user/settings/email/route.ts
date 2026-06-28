import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Update email in database
    await pool.execute(
      'UPDATE accounts SET Email = ? WHERE ID = ?',
      [email, session.userId]
    );

    return NextResponse.json({ success: true, message: 'Email updated successfully' });
  } catch (error: any) {
    console.error('Update email error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
