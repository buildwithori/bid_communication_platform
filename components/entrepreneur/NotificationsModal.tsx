'use client';

import { Modal } from '@/components/shared/Modal';
import { useEntrepreneurStore } from '@/lib/stores/entrepreneur-store';

export function NotificationsModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { notifications } = useEntrepreneurStore();
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Notifications">
      <div className="flex flex-col divide-y divide-line">
        {notifications.map((n) => (
          <div key={n.id} className="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0">
            <span className="mt-1.5 h-[7px] w-[7px] shrink-0 rounded-full bg-danger" />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-medium leading-tight">{n.title}</div>
              <div className="mt-0.5 text-[10px] text-ink-muted">{n.meta}</div>
            </div>
          </div>
        ))}
        {notifications.length === 0 && (
          <p className="py-4 text-center text-[11px] text-ink-faint">
            You&apos;re all caught up.
          </p>
        )}
      </div>
    </Modal>
  );
}
