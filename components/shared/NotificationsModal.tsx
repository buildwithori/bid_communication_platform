'use client';

import { Modal } from '@/components/shared/Modal';
import { cn } from '@/lib/utils';

export type NotificationTone = 'info' | 'warning' | 'danger' | 'success' | 'neutral';

export type AppNotification = {
  id: string;
  title: string;
  meta: string;
  unread?: boolean;
  tone?: NotificationTone;
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notifications: AppNotification[];
}) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Notifications">
      <div className="flex flex-col divide-y divide-line">
        {notifications.map((notification) => {
          const tone = notification.unread ? notification.tone ?? 'info' : 'neutral';

          return (
            <div key={notification.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
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
            </div>
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
