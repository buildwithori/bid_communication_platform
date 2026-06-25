import * as React from 'react';
import { AdminShell } from './AdminShell';
import { AdminProvider } from '@/lib/stores/admin-store';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminProvider>
      <AdminShell>{children}</AdminShell>
    </AdminProvider>
  );
}
