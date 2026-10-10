import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth';

async function handleLogout(request: Request) {
  await clearSessionCookie();

  const acceptHeader = request.headers.get('accept') || '';
  if (acceptHeader.includes('application/json')) {
    return NextResponse.json({ success: true });
  }

  // Extract real host from headers to prevent redirection to internal bind address (0.0.0.0)
  const hostHeader = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
  const protoHeader = request.headers.get('x-forwarded-proto') || 'http';
  
  // Clean up 0.0.0.0 if present in host header
  const cleanHost = hostHeader.replace(/^0\.0\.0\.0/, 'localhost');
  const redirectUrl = `${protoHeader}://${cleanHost}/login`;

  return NextResponse.redirect(redirectUrl, 303);
}

export async function POST(request: Request) {
  return handleLogout(request);
}

export async function GET(request: Request) {
  return handleLogout(request);
}
