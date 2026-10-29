import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getTrustedBaseUrl } from '@/lib/site';

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

function isLoopbackHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '[::1]'
  );
}

function isAllowedOrigin(value: string, request: NextRequest): boolean {
  try {
    const origin = new URL(value);
    const trusted = new URL(getTrustedBaseUrl());

    if (origin.origin === trusted.origin) {
      return true;
    }

    // Local development often alternates between localhost and 127.0.0.1.
    if (
      origin.protocol === trusted.protocol &&
      origin.port === trusted.port &&
      isLoopbackHost(origin.hostname) &&
      isLoopbackHost(trusted.hostname)
    ) {
      return true;
    }

    // Production trusts only the configured public origin, never request headers.
    if (process.env.NODE_ENV === 'production') {
      return false;
    }

    const current = new URL(requestOrigin(request));
    return origin.origin === current.origin;
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
