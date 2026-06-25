import { NextRequest, NextResponse } from 'next/server';
import { authenticate, encodeSession, SESSION_COOKIE } from '@/lib/auth/config';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const email: string = body.email ?? '';
  const password: string = body.password ?? '';
  const subdomain: string = body.subdomain ?? 'app';

  const session = authenticate(email.trim(), password);

  if (!session) {
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 });
  }

  if (subdomain === 'admin' && session.role === 'entrepreneur') {
    return NextResponse.json({ error: 'wrong_portal' }, { status: 403 });
  }
  if (subdomain === 'app' && (session.role === 'admin' || session.role === 'trainer')) {
    return NextResponse.json({ error: 'wrong_portal' }, { status: 403 });
  }

  const res = NextResponse.json({ ok: true, role: session.role, status: session.status });
  res.cookies.set(SESSION_COOKIE, encodeSession(session), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
