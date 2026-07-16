'use client';

import * as React from 'react';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import {
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useNotificationsInfiniteQuery,
  useNotificationSummaryQuery,
  type NotificationRecord,
  type NotificationSeverity,
} from '@/lib/api/notifications';
import type { AppNotification, NotificationTone } from '@/components/shared/NotificationsModal';

const toneBySeverity: Record<NotificationSeverity, NotificationTone> = {
  info: 'info', success: 'success', warning: 'warning', critical: 'danger',
};

export function useNotifications() {
  const router = useRouter();
  const notificationsQuery = useNotificationsInfiniteQuery({ take: 20 });
  const summaryQuery = useNotificationSummaryQuery();
  const markReadMutation = useMarkNotificationReadMutation();
  const markAllReadMutation = useMarkAllNotificationsReadMutation();
  const records = React.useMemo(
    () => notificationsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [notificationsQuery.data],
  );
  const notifications = React.useMemo(() => records.map(mapNotification), [records]);

  const openNotification = React.useCallback((notification: AppNotification) => {
    if (notification.unread && !markReadMutation.isPending) markReadMutation.mutate(notification.id);
    if (notification.actionUrl?.startsWith('/') && !notification.actionUrl.startsWith('//')) {
      router.push(notification.actionUrl as Route);
    }
  }, [markReadMutation, router]);

  return {
    notifications,
    unreadCount: summaryQuery.data?.unreadCount ?? records.filter((item) => !item.readAt).length,
    isLoading: notificationsQuery.isLoading,
    isLoadingMore: notificationsQuery.isFetchingNextPage,
    hasMore: Boolean(notificationsQuery.hasNextPage),
    loadMore: () => {
      if (notificationsQuery.hasNextPage && !notificationsQuery.isFetchingNextPage) void notificationsQuery.fetchNextPage();
    },
    markAllRead: () => {
      if (!markAllReadMutation.isPending) markAllReadMutation.mutate();
    },
    isMarkingAllRead: markAllReadMutation.isPending,
    openNotification,
  };
}

function mapNotification(notification: NotificationRecord): AppNotification {
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
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date);
}
