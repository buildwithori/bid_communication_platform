'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
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
  const queryClient = useQueryClient();

  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: () => listNotifications({ take: 20 }),
    refetchInterval: 60_000,
  });

  const invalidate = React.useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }, [queryClient]);

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: invalidate,
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: invalidate,
  });

  const records: NotificationRecord[] = notificationsQuery.data?.items ?? [];
  const notifications = React.useMemo(
    () => records.map(mapNotification),
    [records],
  );

  const unreadCount = records.filter((notification) => !notification.readAt).length;

  const openNotification = React.useCallback(
    (notification: AppNotification) => {
      if (notification.unread) {
        markReadMutation.mutate(notification.id);
      }
      if (notification.actionUrl) {
        router.push(notification.actionUrl);
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
