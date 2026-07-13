import * as React from 'react';
import { AdminShell } from './AdminShell';
import { WorkspaceGuard } from '@/components/auth/WorkspaceGuard';
import { AdminProvider } from '@/lib/stores/admin-store';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceGuard allowedRoles={['admin']}>
      <AdminProvider>
        <AdminShell>{children}</AdminShell>
      </AdminProvider>
    </WorkspaceGuard>
  );
}
