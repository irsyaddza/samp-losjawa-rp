import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUnreadMessageCount } from '@/lib/mailbox';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ count: 0 });
  }

  try {
    const count = await getUnreadMessageCount(session.userId);
    return NextResponse.json({ count });
  } catch (error) {
    console.error('Error fetching unread message count:', error);
    return NextResponse.json({ count: 0 });
  }
}

export const dynamic = 'force-dynamic';
