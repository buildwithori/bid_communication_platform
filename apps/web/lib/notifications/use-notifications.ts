'use client';

import * as React from 'react';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import {
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useNotificationsQuery,
  type NotificationRecord,
  type NotificationSeverity,
} from '@/lib/api/notifications';
import type { AppNotification, NotificationTone } from '@/components/shared/NotificationsModal';

const toneBySeverity: Record<NotificationSeverity, NotificationTone> = {
  info: 'info',
  success: 'success',
  warning: 'warning',
  critical: 'danger',
};

export type MappedNotification = AppNotification & {
  actionUrl: string | null;
};

export function useNotifications() {
  const router = useRouter();
  const notificationsQuery = useNotificationsQuery({ take: 20 });
  const markReadMutation = useMarkNotificationReadMutation();
  const markAllReadMutation = useMarkAllNotificationsReadMutation();

  const records: NotificationRecord[] = notificationsQuery.data?.items ?? [];
  const notifications = React.useMemo(
    () => records.map(mapNotification),
    [records],
  );

  const unreadCount = records.filter((notification) => !notification.readAt).length;

  const openNotification = React.useCallback(
    (notification: MappedNotification) => {
      if (notification.unread) {
        markReadMutation.mutate(notification.id);
      }
      if (notification.actionUrl) {
        router.push(notification.actionUrl as Route);
      }
    },
    [markReadMutation, router],
  );

  return {
    notifications,
    unreadCount,
    isLoading: notificationsQuery.isLoading,
    markAllRead: () => markAllReadMutation.mutate(),
    isMarkingAllRead: markAllReadMutation.isPending,
    openNotification,
  };
}

function mapNotification(notification: NotificationRecord): MappedNotification {
  return {
    id: notification.id,
    title: notification.title,
    meta: `${notification.body} · ${formatNotificationTime(notification.createdAt)}`,
    unread: !notification.readAt,
    tone: toneBySeverity[notification.severity],
    actionUrl: notification.actionUrl,
  };
}

function formatNotificationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
