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
  '/admin/assignments': 'Assignments',
  '/admin/content': 'Content Library',
  '/admin/stages-sectors': 'Stages & Sectors',
  '/admin/documents': 'Generate Documents',
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

/** Placeholder top-bar action resolver. Each page mounts its own actions
 *  via children; the admin shell itself only renders the title. */
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

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminProvider>
      <AdminShell>{children}</AdminShell>
    </AdminProvider>
  );
}
