'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { WorkspaceGuard } from '@/components/auth/WorkspaceGuard';
import { entrepreneurNav } from '@/lib/nav/entrepreneur-nav';
import { NotificationCenter } from '@/components/shared/NotificationCenter';
import { routes } from '@/lib/routes';
import { useEntrepreneurProfileQuery } from '@/lib/api/entrepreneurs';

const titles: Record<string, string> = {
  [routes.entrepreneur.dashboard]: 'Dashboard',
  [routes.entrepreneur.training]: 'Training Library',
  [routes.entrepreneur.profile]: 'My Profile',
  [routes.entrepreneur.deliverables]: 'Deliverables',
  [routes.entrepreneur.schedule]: 'Schedule',
  [routes.entrepreneur.tools]: 'Entrepreneur Tools',
};

/** Resolves the top-bar title from the active pathname. */
function useTitle() {
  const pathname = usePathname();
  const exact = titles[pathname];
  if (exact) return exact;
  if (pathname.startsWith(routes.entrepreneur.training))
    return 'Training Library';
  if (pathname.startsWith(routes.entrepreneur.deliverables))
    return 'Deliverables';
  return 'BID Hub';
}

function Shell({ children }: { children: React.ReactNode }) {
  const entrepreneur = useEntrepreneurProfileQuery().data;
  const title = useTitle();
  const name =
    entrepreneur?.representativeName ||
    entrepreneur?.businessName ||
    'Entrepreneur';
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part: string) => part[0])
      .join('')
      .toUpperCase() || 'EN';
  const user = {
    initials,
    name,
    subtitle: entrepreneur?.businessName || 'Entrepreneur',
    tone: 'brand' as const,
  };

  return (
    <AppShell
      brandTitle="BID Hub"
      brandSubtitle="Entrepreneur Platform"
      sections={entrepreneurNav}
      user={user}
      title={title}
      topRightSlot={<NotificationCenter />}
    >
      {children}
    </AppShell>
  );
}

export default function EntrepreneurLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WorkspaceGuard allowedRoles={['entrepreneur']}>
      <Shell>{children}</Shell>
    </WorkspaceGuard>
  );
}
