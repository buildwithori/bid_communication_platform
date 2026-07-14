'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { WorkspaceGuard } from '@/components/auth/WorkspaceGuard';
import { AppShell } from '@/components/layout/AppShell';
import { EntrepreneurProvider, useEntrepreneurStore } from '@/lib/stores/entrepreneur-store';
import { entrepreneurNav } from '@/lib/nav/entrepreneur-nav';
import { Bell } from 'lucide-react';
import { Button } from '@/components/shared/Button';
import { NotificationsModal } from '@/components/shared/NotificationsModal';
import { routes } from '@/lib/routes';
import { useNotifications } from '@/lib/notifications/use-notifications';

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
  const [notifOpen, setNotifOpen] = React.useState(false);
  const {
    notifications,
    unreadCount,
    markAllRead,
    isMarkingAllRead,
    openNotification,
  } = useNotifications();

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
        notifications={notifications}
        onNotificationClick={openNotification}
        onMarkAllRead={markAllRead}
        isMarkingAllRead={isMarkingAllRead}
      />
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
