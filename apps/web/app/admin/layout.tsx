import * as React from 'react';
import { AdminShell } from './AdminShell';
import { WorkspaceGuard } from '@/components/auth/WorkspaceGuard';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceGuard allowedRoles={['admin']}>
      <AdminShell>{children}</AdminShell>
    </WorkspaceGuard>
  );
}
