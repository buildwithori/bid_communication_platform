import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'bid_session';

/**
 * Optimistic network boundary for authenticated web routes.
 * NestJS remains authoritative for session validation and authorization.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.next();
  }

  const loginUrl = new URL('/auth/login', request.url);
  loginUrl.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/admin/:path*', '/trainer/:path*', '/entrepreneur/:path*', '/auth/onboarding'],
};
