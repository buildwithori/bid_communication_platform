'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { AdminProvider } from '@/lib/stores/admin-store';
import { adminNav } from '@/lib/nav/admin-nav';

const titles: Record<string, string> = {
  '/admin/dashboard': 'Admin Dashboard',
  '/admin/entrepreneurs': 'Entrepreneurs',
  '/admin/trainers': 'Trainers',
  '/admin/programs': 'Programs',
  '/admin/content': 'Content Library',
  '/admin/sessions': 'Sessions',
  '/admin/tool-requests': 'Tool Requests',
  '/admin/stages-sectors': 'Stages & Sectors',
  '/admin/reporting': 'Reporting & Analytics',
};

function useTitle() {
  const pathname = usePathname();
  if (titles[pathname]) return titles[pathname];
  if (pathname.startsWith('/admin/')) {
    const seg = pathname.split('/')[2] ?? '';
    return seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' ');
  }
  return 'BID Admin';
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const title = useTitle();
  return (
    <AppShell
      brandTitle="BID Admin"
      brandSubtitle="Management Console"
      role="admin"
      sections={adminNav}
      user={{
        initials: 'AD',
        name: 'Ama Darko',
        subtitle: 'Programme Lead',
        tone: 'brand',
      }}
      title={title}
    >
      {children}
    </AppShell>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminProvider>
      <AdminShell>{children}</AdminShell>
    </AdminProvider>
  );
}
