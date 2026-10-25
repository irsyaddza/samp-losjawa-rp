import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function firstHeaderValue(value: string | null): string | undefined {
  return value?.split(',')[0]?.trim() || undefined;
}

function requestOrigin(request: NextRequest): string {
  const host =
    firstHeaderValue(request.headers.get('x-forwarded-host')) ||
    request.headers.get('host') ||
    request.nextUrl.host;
  const proto =
    firstHeaderValue(request.headers.get('x-forwarded-proto')) ||
    request.nextUrl.protocol.replace(':', '');

  return `${proto}://${host}`;
}

function isAllowedOrigin(value: string, request: NextRequest): boolean {
  try {
    const origin = new URL(value);
    const current = new URL(requestOrigin(request));

    if (origin.host === current.host) {
      return true;
    }

    const configured = process.env.NEXT_PUBLIC_BASE_URL;
    if (configured) {
      return origin.origin === new URL(configured).origin;
    }

    return false;
  } catch {
    return false;
  }
}

export function proxy(request: NextRequest) {
  if (SAFE_METHODS.has(request.method)) {
    return NextResponse.next();
  }

  const origin = request.headers.get('origin');
  if (origin) {
    return isAllowedOrigin(origin, request)
      ? NextResponse.next()
      : NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  }

  if (request.headers.get('sec-fetch-site') === 'cross-site') {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  }

  const referer = request.headers.get('referer');
  if (referer && !isAllowedOrigin(referer, request)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
