'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { WorkspaceGuard } from '@/components/auth/WorkspaceGuard';
import { EntrepreneurProvider, useEntrepreneurStore } from '@/lib/stores/entrepreneur-store';
import { entrepreneurNav } from '@/lib/nav/entrepreneur-nav';
import { NotificationCenter } from '@/components/shared/NotificationCenter';
import { routes } from '@/lib/routes';

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
  if (pathname.startsWith(routes.entrepreneur.training)) return 'Training Library';
  if (pathname.startsWith(routes.entrepreneur.deliverables)) return 'Deliverables';
  return 'BID Hub';
}

function Shell({ children }: { children: React.ReactNode }) {
  const { entrepreneur } = useEntrepreneurStore();
  const title = useTitle();

  const user = {
    initials: entrepreneur.initials,
    name: entrepreneur.businessName,
    subtitle: `${entrepreneur.metrics.trainingProgress > 0 ? 'Growth stage' : ''} · ${
      entrepreneur.sector.charAt(0).toUpperCase() + entrepreneur.sector.slice(1)
    }`,
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
      <EntrepreneurProvider>
        <Shell>{children}</Shell>
      </EntrepreneurProvider>
    </WorkspaceGuard>
  );
}
