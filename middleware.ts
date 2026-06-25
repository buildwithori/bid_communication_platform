import { NextRequest, NextResponse } from 'next/server';

/**
 * Auth middleware — currently disabled for demo mode.
 * Re-enable by swapping the body below with the full implementation in
 * the git history (or the README auth section).
 */
export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
