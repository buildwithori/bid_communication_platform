'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { Bell } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/shared/Button';
import { NotificationsModal, type AppNotification } from '@/components/shared/NotificationsModal';
import { adminNav } from '@/lib/nav/admin-nav';
import { trainerNav } from '@/lib/nav/trainer-nav';
import { routes } from '@/lib/routes';

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

const adminNotifications: AppNotification[] = [
  {
    id: 'an-session-open',
    title: 'Open session request needs an owner',
    meta: 'PayBridge Africa Ltd · Investor prep · Any available BID team member',
    unread: true,
    tone: 'warning',
  },
  {
    id: 'an-deliverable-review',
    title: 'Deliverable waiting for review',
    meta: 'FarmLink GH · Business Model Canvas · Submitted Jul 5, 2026',
    unread: true,
    tone: 'info',
  },
  {
    id: 'an-overdue-updates',
    title: 'Entrepreneurs have overdue impact updates',
    meta: '3 businesses crossed the company follow-up rule',
    unread: true,
    tone: 'danger',
  },
  {
    id: 'an-tool-request',
    title: 'Tool request moved to development',
    meta: 'Cap table modelling tool · PayBridge Africa Ltd',
  },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const title = useTitle();
  const [notifOpen, setNotifOpen] = React.useState(false);
  const unreadCount = adminNotifications.filter((notification) => notification.unread).length;

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
        notifications={adminNotifications}
      />
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
