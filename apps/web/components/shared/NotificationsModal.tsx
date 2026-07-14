'use client';

import { Modal } from '@/components/shared/Modal';
import { Button } from '@/components/shared/Button';
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
  info: 'bg-info',
  warning: 'bg-warning',
  danger: 'bg-danger',
  success: 'bg-success',
  neutral: 'bg-line-strong',
};

export function NotificationsModal({
  open,
  onOpenChange,
  notifications,
  onNotificationClick,
  onMarkAllRead,
  isMarkingAllRead = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notifications: AppNotification[];
  onNotificationClick?: (notification: AppNotification) => void;
  onMarkAllRead?: () => void;
  isMarkingAllRead?: boolean;
}) {
  const unreadCount = notifications.filter((notification) => notification.unread).length;

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Notifications" width="md">
      {notifications.length > 0 && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-line bg-surface-subtle px-3 py-2">
          <span className="text-sm text-ink-muted">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </span>
          {onMarkAllRead && unreadCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onMarkAllRead}
              disabled={isMarkingAllRead}
            >
              Mark all read
            </Button>
          )}
        </div>
      )}
      <div className="flex flex-col divide-y divide-line">
        {notifications.map((notification) => {
          const tone = notification.unread ? notification.tone ?? 'info' : 'neutral';
          const isClickable = Boolean(onNotificationClick);

          return (
            <button
              key={notification.id}
              type="button"
              onClick={() => onNotificationClick?.(notification)}
              className={cn(
                'flex w-full items-start gap-3 py-3 text-left first:pt-0 last:pb-0',
                isClickable && 'rounded-lg transition-colors hover:bg-surface-subtle',
              )}
            >
              <span
                className={cn(
                  'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                  dotClassName[tone],
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium leading-tight text-ink">
                  {notification.title}
                </div>
                <div className="mt-1 text-xs leading-relaxed text-ink-muted">
                  {notification.meta}
                </div>
              </div>
            </button>
          );
        })}
        {notifications.length === 0 && (
          <p className="py-4 text-center text-sm text-ink-faint">
            You&apos;re all caught up.
          </p>
        )}
      </div>
    </Modal>
  );
}
