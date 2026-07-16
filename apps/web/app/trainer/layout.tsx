'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { WorkspaceGuard } from '@/components/auth/WorkspaceGuard';
import { NotificationCenter } from '@/components/shared/NotificationCenter';
import { trainerNav } from '@/lib/nav/trainer-nav';
import { trainerById } from '@/lib/mock-data/trainers';
import { routes } from '@/lib/routes';

const titles: Record<string, string> = {
  [routes.trainer.dashboard]: 'Trainer Dashboard',
  [routes.trainer.entrepreneurs]: 'My Entrepreneurs',
  [routes.trainer.programmes]: 'My Programmes',
  [routes.trainer.deliverableReviews]: 'Deliverable Reviews',
  [routes.trainer.sessions]: 'My Sessions',
  [routes.trainer.settings]: 'Settings',
};

function useTitle() {
  const pathname = usePathname();
  return titles[pathname] ?? 'Trainer Workspace';
}

export default function TrainerLayout({ children }: { children: React.ReactNode }) {
  const title = useTitle();
  const trainer = trainerById('t-kofi');

  return (
    <WorkspaceGuard allowedRoles={['trainer']}>
      <AppShell
      brandTitle="BID Hub"
      brandSubtitle="Trainer Workspace"
      role="trainer"
      sections={trainerNav}
      user={{
        initials: trainer?.initials ?? 'TR',
        name: trainer?.fullName ?? 'Trainer',
        subtitle: trainer ? `${trainer.role} · ${trainer.metrics.entrepreneursCount} entrepreneurs` : 'Trainer',
        tone: 'blue',
      }}
      title={title}
      topRightSlot={<NotificationCenter />}
    >
      {children}
      </AppShell>
    </WorkspaceGuard>
  );
}
