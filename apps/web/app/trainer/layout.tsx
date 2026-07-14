'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { Bell } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/shared/Button';
import { NotificationsModal, type AppNotification } from '@/components/shared/NotificationsModal';
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

const trainerNotifications: AppNotification[] = [
  {
    id: 'tn-session-accept',
    title: 'Session request awaiting your response',
    meta: 'PayBridge Africa Ltd · Pricing model review · Jul 17, 2026',
    unread: true,
  },
  {
    id: 'tn-feedback',
    title: 'Financial Model feedback is still open',
    meta: 'PayBridge Africa Ltd · Changes required',
    unread: true,
  },
  {
    id: 'tn-office-hours',
    title: 'Office hours starts soon',
    meta: 'BID Office Hours · Jul 10, 2026',
  },
];

export default function TrainerLayout({ children }: { children: React.ReactNode }) {
  const title = useTitle();
  const trainer = trainerById('t-kofi');
  const [notifOpen, setNotifOpen] = React.useState(false);
  const unreadCount = trainerNotifications.filter((notification) => notification.unread).length;

  return (
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
      topRightSlot={
        <Button
          variant="outline"
          size="sm"
          onClick={() => setNotifOpen(true)}
          className="flex items-center gap-1.5"
          aria-label={`Notifications (${unreadCount} unread)`}
        >
          <Bell className="h-3 w-3" />
          {unreadCount}
        </Button>
      }
    >
      {children}
      <NotificationsModal
        open={notifOpen}
        onOpenChange={setNotifOpen}
        notifications={trainerNotifications}
      />
    </AppShell>
  );
}
