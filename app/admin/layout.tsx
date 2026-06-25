import * as React from 'react';
import { cookies } from 'next/headers';
import { AdminShell, TrainerShell } from './AdminShell';
import { AdminProvider } from '@/lib/stores/admin-store';
import { SESSION_COOKIE, decodeSession } from '@/lib/auth/config';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  const session = raw ? decodeSession(raw) : null;
  const role = session?.role ?? 'admin';

  return (
    <AdminProvider>
      {role === 'trainer' ? (
        <TrainerShell session={session}>{children}</TrainerShell>
      ) : (
        <AdminShell>{children}</AdminShell>
      )}
    </AdminProvider>
  );
}
