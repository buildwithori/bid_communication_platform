'use client';

import * as React from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { Button } from '@/components/shared/Button';
import { Modal } from '@/components/shared/Modal';
import { Skeleton } from '@/components/shared/Card';
import { cn } from '@/lib/utils';

export type NotificationTone = 'info' | 'warning' | 'danger' | 'success' | 'neutral';

export type AppNotification = {
  id: string;
  title: string;
  meta: string;
  unread?: boolean;
  tone?: NotificationTone;
  actionUrl?: string | null;
};

const dotClassName: Record<NotificationTone, string> = {
  info: 'bg-info', warning: 'bg-warning', danger: 'bg-danger',
  success: 'bg-success', neutral: 'bg-line-strong',
};

export function NotificationsModal({
  open, onOpenChange, notifications, unreadCount, isLoading, isLoadingMore,
  isMarkingAllRead, hasMore, onNotificationClick, onMarkAllRead, onLoadMore,
}: {
  open: boolean; onOpenChange: (open: boolean) => void;
  notifications: AppNotification[]; unreadCount: number; isLoading: boolean;
  isLoadingMore: boolean; isMarkingAllRead: boolean; hasMore: boolean;
  onNotificationClick: (notification: AppNotification) => void;
  onMarkAllRead: () => void; onLoadMore: () => void;
}) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Notifications" width="md">
      <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-subtle px-3 py-2.5">
        <div>
          <p className="text-sm font-medium text-ink">{unreadCount ? `${unreadCount} unread` : 'You are all caught up'}</p>
          <p className="mt-0.5 text-xs text-ink-muted">Activity from across your BID Hub workspace.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onMarkAllRead} disabled={unreadCount === 0}
          isLoading={isMarkingAllRead} loadingLabel="Marking read">
          <CheckCheck className="h-3.5 w-3.5" />Mark all read
        </Button>
      </div>
      <div className="max-h-[55vh] overflow-y-auto rounded-xl border border-line bg-surface-panel">
        {isLoading ? <NotificationListSkeleton /> : (
          <div className="flex flex-col divide-y divide-line">
            {notifications.map((notification) => {
              const tone = notification.unread ? notification.tone ?? 'info' : 'neutral';
              return (
                <button key={notification.id} type="button" onClick={() => onNotificationClick(notification)}
                  className={cn('flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-subtle', notification.unread && 'bg-bid-soft/35')}>
                  <span className={cn('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', dotClassName[tone])} />
                  <span className="min-w-0 flex-1">
                    <span className={cn('block text-sm leading-tight text-ink', notification.unread ? 'font-semibold' : 'font-medium')}>{notification.title}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-ink-muted">{notification.meta}</span>
                  </span>
                </button>
              );
            })}
            {notifications.length === 0 && (
              <div className="flex flex-col items-center px-5 py-10 text-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-subtle text-ink-faint"><Bell className="h-4 w-4" /></span>
                <p className="mt-3 text-sm font-medium text-ink">No notifications yet</p>
                <p className="mt-1 text-xs text-ink-muted">New activity will appear here.</p>
              </div>
            )}
          </div>
        )}
      </div>
      {hasMore ? <div className="mt-3 flex justify-center">
        <Button variant="outline" size="sm" onClick={onLoadMore} isLoading={isLoadingMore} loadingLabel="Loading more">Load more</Button>
      </div> : null}
    </Modal>
  );
}

function NotificationListSkeleton() {
  return <div aria-label="Loading notifications" aria-busy="true" className="divide-y divide-line">
    {Array.from({ length: 4 }, (_, index) => <div key={index} className="flex gap-3 px-4 py-4">
      <Skeleton className="mt-1 h-2.5 w-2.5 rounded-full" />
      <div className="flex-1"><Skeleton className="h-4 w-2/3" /><Skeleton className="mt-2 h-3 w-full" /></div>
    </div>)}
  </div>;
}
