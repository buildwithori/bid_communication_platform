'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { WorkspaceGuard } from '@/components/auth/WorkspaceGuard';
import { NotificationCenter } from '@/components/shared/NotificationCenter';
import { trainerNav } from '@/lib/nav/trainer-nav';
import { routes } from '@/lib/routes';
import { useTrainerProfileQuery } from '@/lib/api/trainers';

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

function TrainerShell({ children }: { children: React.ReactNode }) {
  const title = useTitle();
  const trainerQuery = useTrainerProfileQuery();
  const trainer = trainerQuery.data;
  const name = trainer?.name ?? 'Trainer';
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part: string) => part[0])
      .join('')
      .toUpperCase() || 'TR';
  const roleLabel = trainer?.roleLabel
    ? trainer.roleLabel.replace(/_/g, ' ')
    : 'Trainer';
  const subtitle = trainer
    ? `${roleLabel.charAt(0).toUpperCase() + roleLabel.slice(1)} · ${trainer.portfolio.inferredEntrepreneurs} entrepreneurs`
    : 'Trainer';

  return (
    <AppShell
      brandTitle="BID Hub"
      brandSubtitle="Trainer Workspace"
      role="trainer"
      sections={trainerNav}
      user={{
        initials,
        name,
        subtitle,
        tone: 'blue',
      }}
      userLoading={trainerQuery.isLoading && !trainer}
      title={title}
      topRightSlot={<NotificationCenter />}
    >
      {children}
    </AppShell>
  );
}

export default function TrainerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WorkspaceGuard allowedRoles={['trainer']}>
      <TrainerShell>{children}</TrainerShell>
    </WorkspaceGuard>
  );
}
