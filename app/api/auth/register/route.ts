import { NextRequest, NextResponse } from 'next/server';
import { encodeSession, SESSION_COOKIE } from '@/lib/auth/config';
import type { BidSession } from '@/lib/auth/config';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const email: string = body.email ?? '';
  const businessName: string = body.businessName ?? '';
  const representativeName: string = body.representativeName ?? '';

  if (!email || !businessName || !representativeName) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const pendingSession: BidSession = {
    userId: `usr_new_${Date.now()}`,
    email,
    name: representativeName,
    role: 'entrepreneur',
    status: 'pending',
    businessId: `biz_new_${Date.now()}`,
  };

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, encodeSession(pendingSession), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
