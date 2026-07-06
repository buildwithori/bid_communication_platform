'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { adminNav } from '@/lib/nav/admin-nav';
import { trainerNav } from '@/lib/nav/trainer-nav';
import { routes } from '@/lib/routes';

interface TrainerSession {
  name?: string;
}

const titles: Record<string, string> = {
  [routes.admin.dashboard]: 'Admin Dashboard',
  [routes.admin.entrepreneurs]: 'Entrepreneurs',
  [routes.admin.trainers]: 'Trainers',
  [routes.admin.programs]: 'Programs',
  [routes.admin.content]: 'Content Library',
  [routes.admin.deliverableReviews]: 'Deliverable Reviews',
  [routes.admin.sessions]: 'Sessions',
  [routes.admin.toolRequests]: 'Tool Requests',
  [routes.admin.stagesSectors]: 'Stages & Sectors',
  [routes.admin.settingsStages]: 'Business Stages',
  [routes.admin.settingsSectors]: 'Sectors',
  [routes.admin.reporting]: 'Reporting & Analytics',
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
  session: TrainerSession | null;
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
