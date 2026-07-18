import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { AuthRouteGuard } from '@/components/auth/AuthRouteGuard';
import { SESSION_COOKIE_NAME } from '@/lib/auth-session';

export const metadata: Metadata = {
  title: 'BID Hub — Auth',
};

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();

  if (!cookieStore.has(SESSION_COOKIE_NAME)) return children;

  return (
    <AuthRouteGuard>
      {children}
    </AuthRouteGuard>
  );
}
