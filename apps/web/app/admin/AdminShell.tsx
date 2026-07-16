'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { NotificationCenter } from '@/components/shared/NotificationCenter';
import { adminNav } from '@/lib/nav/admin-nav';
import { trainerNav } from '@/lib/nav/trainer-nav';
import { routes } from '@/lib/routes';
import { useAdminProfileQuery } from '@/lib/api/admins';

interface TrainerSession {
  name?: string;
}

const titles: Record<string, string> = {
  [routes.admin.dashboard]: 'Admin Dashboard',
  [routes.admin.admins]: 'Admins',
  [routes.admin.entrepreneurs]: 'Entrepreneurs',
  [routes.admin.trainers]: 'Trainers',
  [routes.admin.programs]: 'Programs',
  [routes.admin.content]: 'Content Library',
  [routes.admin.entrepreneurTools]: 'Entrepreneur Tools',
  [routes.admin.deliverableReviews]: 'Deliverable Reviews',
  [routes.admin.sessions]: 'Sessions',
  [routes.admin.toolRequests]: 'Tool Requests',
  [routes.admin.stagesSectors]: 'Stages & Sectors',
  [routes.admin.settings]: 'Admin Settings',
  [routes.admin.settingsStages]: 'Business Stages',
  [routes.admin.settingsSectors]: 'Sectors',
  [routes.admin.settingsGoalTypes]: 'Goal Types',
  [routes.admin.settingsCompany]: 'Company Settings',
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

function initialsFor(name: string, fallback: string) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
  return initials || fallback;
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const title = useTitle();
  const profile = useAdminProfileQuery().data;
  const name = profile?.name ?? 'Administrator';

  return (
    <AppShell
      brandTitle="BID Admin"
      brandSubtitle="Management Console"
      role="admin"
      sections={adminNav}
      user={{
        initials: initialsFor(name, 'AD'),
        name,
        subtitle: 'BID administrator',
        tone: 'brand',
      }}
      title={title}
      topRightSlot={<NotificationCenter />}
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
