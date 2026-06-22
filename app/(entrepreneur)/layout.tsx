'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { EntrepreneurProvider, useEntrepreneurStore } from '@/lib/stores/entrepreneur-store';
import { entrepreneurNav } from '@/lib/nav/entrepreneur-nav';
import { Bell } from 'lucide-react';
import { Button } from '@/components/shared/Button';
import { Modal } from '@/components/shared/Modal';
import { NotificationsModal } from '@/components/entrepreneur/NotificationsModal';

const titles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/training': 'Training Library',
  '/profile': 'My Profile',
  '/deliverables': 'Deliverables',
  '/schedule': 'Schedule',
  '/tools': 'Entrepreneur Tools',
};

/** Resolves the top-bar title from the active pathname. */
function useTitle() {
  const pathname = usePathname();
  const exact = titles[pathname];
  if (exact) return exact;
  if (pathname.startsWith('/training')) return 'Training Library';
  if (pathname.startsWith('/deliverables')) return 'Deliverables';
  return 'BID Hub';
}

function Shell({ children }: { children: React.ReactNode }) {
  const { entrepreneur, notifications } = useEntrepreneurStore();
  const title = useTitle();
  const [notifOpen, setNotifOpen] = React.useState(false);

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
          aria-label={`Notifications (${notifications.length} unread)`}
        >
          <Bell className="h-3 w-3" />
          {notifications.length}
        </Button>
      }
    >
      {children}
      <NotificationsModal open={notifOpen} onOpenChange={setNotifOpen} />
    </AppShell>
  );
}

export default function EntrepreneurLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <EntrepreneurProvider>
      <Shell>{children}</Shell>
    </EntrepreneurProvider>
  );
}
