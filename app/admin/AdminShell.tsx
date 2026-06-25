'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { adminNav } from '@/lib/nav/admin-nav';
import { trainerNav } from '@/lib/nav/trainer-nav';
import type { BidSession } from '@/lib/auth/config';

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

export function TrainerShell({
  children,
  session,
}: {
  children: React.ReactNode;
  session: BidSession | null;
}) {
  const title = useTitle();
  const name = session?.name ?? 'Trainer';
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <AppShell
      brandTitle="BID Admin"
      brandSubtitle="Trainer Console"
      sections={trainerNav}
      user={{
        initials,
        name,
        subtitle: 'Trainer',
        tone: 'blue',
      }}
      title={title}
    >
      {children}
    </AppShell>
  );
}
