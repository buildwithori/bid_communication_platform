'use client';

import * as React from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/shared/Button';
import { NotificationsModal } from '@/components/shared/NotificationsModal';
import { useNotifications } from '@/lib/notifications/use-notifications';

export function NotificationCenter() {
  const [open, setOpen] = React.useState(false);
  const notifications = useNotifications();

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}
        className="relative flex items-center gap-1.5"
        aria-label={`Notifications (${notifications.unreadCount} unread)`}>
        <Bell className="h-3.5 w-3.5" />
        <span>{notifications.unreadCount > 99 ? '99+' : notifications.unreadCount}</span>
        {notifications.unreadCount > 0 ? <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-danger ring-2 ring-surface-panel" /> : null}
      </Button>
      <NotificationsModal
        open={open} onOpenChange={setOpen}
        notifications={notifications.notifications}
        unreadCount={notifications.unreadCount}
        isLoading={notifications.isLoading}
        isLoadingMore={notifications.isLoadingMore}
        isMarkingAllRead={notifications.isMarkingAllRead}
        hasMore={notifications.hasMore}
        onNotificationClick={(notification) => { setOpen(false); notifications.openNotification(notification); }}
        onMarkAllRead={notifications.markAllRead}
        onLoadMore={notifications.loadMore}
      />
    </>
  );
}
