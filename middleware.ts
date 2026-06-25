import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, decodeSession } from '@/lib/auth/config';

/**
 * Detects which "side" the request is for based on the Host header.
 *
 * Production:
 *   app.bid.org   → 'app'
 *   admin.bid.org → 'admin'
 *
 * Local dev simulation:
 *   localhost:3000  → 'app'    (default)
 *   localhost:3001  → 'admin'  (run `PORT=3001 npm run dev` or set X-BID-Subdomain)
 *
 * You can also force the subdomain during local testing by setting the
 * X-BID-Subdomain request header (useful in Postman / curl / Playwright).
 */
function detectSubdomain(req: NextRequest): 'app' | 'admin' {
  const override = req.headers.get('x-bid-subdomain');
  if (override === 'admin' || override === 'app') return override;

  const host = req.headers.get('host') ?? '';

  // Explicit subdomain prefixes
  if (host.startsWith('admin.')) return 'admin';
  if (host.startsWith('app.')) return 'app';

  // Local port convention
  if (host.includes(':3001')) return 'admin';

  return 'app';
}

/** Routes that are always publicly accessible on the app subdomain. */
const APP_PUBLIC = ['/login', '/register', '/pending'];
/** Routes that are always publicly accessible on the admin subdomain. */
const ADMIN_PUBLIC = ['/admin/login'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const subdomain = detectSubdomain(req);

  // Static assets and Next.js internals — always pass through.
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/api/')
  ) {
    return NextResponse.next();
  }

  const sessionCookie = req.cookies.get(SESSION_COOKIE)?.value;
  const session = sessionCookie ? decodeSession(sessionCookie) : null;

  // ─── ADMIN SUBDOMAIN ────────────────────────────────────────────────────────
  if (subdomain === 'admin') {
    const isAdminPublic = ADMIN_PUBLIC.some((p) => pathname === p || pathname.startsWith(p + '/'));

    if (!session) {
      if (isAdminPublic) return NextResponse.next();
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }

    // Entrepreneur landed on admin — boot them back.
    if (session.role === 'entrepreneur') {
      const url = new URL('/login', req.url);
      url.searchParams.set('error', 'wrong_portal');
      return NextResponse.redirect(url);
    }

    // Active staff on a public page → send to dashboard.
    if (isAdminPublic && session.status === 'active') {
      return NextResponse.redirect(new URL('/admin/dashboard', req.url));
    }

    return NextResponse.next();
  }

  // ─── APP (ENTREPRENEUR) SUBDOMAIN ───────────────────────────────────────────
  const isAppPublic = APP_PUBLIC.some((p) => pathname === p || pathname.startsWith(p + '/'));

  if (!session) {
    if (isAppPublic) return NextResponse.next();
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Admin/trainer landed on app — send them to their console.
  if (session.role === 'admin' || session.role === 'trainer') {
    const url = new URL('/admin/login', req.url);
    url.searchParams.set('error', 'wrong_portal');
    return NextResponse.redirect(url);
  }

  // Pending entrepreneur — only /pending is allowed.
  if (session.status === 'pending') {
    if (pathname === '/pending') return NextResponse.next();
    return NextResponse.redirect(new URL('/pending', req.url));
  }

  // Suspended entrepreneur — show login with error.
  if (session.status === 'suspended') {
    const url = new URL('/login', req.url);
    url.searchParams.set('error', 'suspended');
    return NextResponse.redirect(url);
  }

  // Active entrepreneur on a public auth page → push to dashboard.
  if (isAppPublic && session.status === 'active') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files.
     * The negative lookahead avoids matching _next/static, _next/image, etc.
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
