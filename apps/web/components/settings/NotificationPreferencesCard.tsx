'use client';

import * as React from 'react';
import { BellRing, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardHeader, Skeleton } from '@/components/shared/Card';
import { Notice } from '@/components/shared/PageHeader';
import {
  useNotificationPreferencesQuery,
  useUpdateNotificationPreferenceMutation,
  type NotificationPreference,
  type NotificationType,
} from '@/lib/api/notifications';
import { cn } from '@/lib/utils';

const preferenceMeta: Record<NotificationType, { label: string; description: string }> = {
  session_request: { label: 'Session requests', description: 'New requests that need your response or team ownership.' },
  session_confirmed: { label: 'Session confirmations', description: 'A session has been accepted and added to the calendar.' },
  session_rescheduled: { label: 'Session reschedules', description: 'A confirmed session date or time has changed.' },
  session_declined: { label: 'Declined sessions', description: 'A requested session could not be accepted.' },
  session_cancelled: { label: 'Cancelled sessions', description: 'A scheduled session has been cancelled.' },
  session_completed: { label: 'Completed sessions', description: 'A session has been marked complete.' },
  deliverable_review: { label: 'Deliverable reviews', description: 'A submission is ready for review or has been approved.' },
  deliverable_changes_requested: { label: 'Deliverable feedback', description: 'A reviewer requested changes to a submission.' },
  tool_request_updated: { label: 'Tool request updates', description: 'The status or decision on a requested tool changed.' },
  trainer_nudge: { label: 'Coaching reminders', description: 'Useful prompts about learner follow-up and support.' },
  system: { label: 'Product notices', description: 'Important operational and account notices from BID Hub.' },
};

export function NotificationPreferencesCard({ className }: { className?: string }) {
  const preferences = useNotificationPreferencesQuery();
  const updatePreference = useUpdateNotificationPreferenceMutation();
  const rows = preferences.data as NotificationPreference[] | undefined;

  const update = (type: NotificationType, channel: 'inAppEnabled' | 'emailEnabled', checked: boolean) => {
    if (updatePreference.isPending) return;
    updatePreference.mutate(
      { type, payload: { [channel]: checked } },
      {
        onSuccess: () => toast.success('Notification preference updated'),
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <Card className={cn('mt-4', className)}>
      <CardHeader
        title="Notification preferences"
        description="Choose where BID Hub should notify you. Product events still determine when a notification is important."
        actions={<BellRing className="h-5 w-5 text-bid" />}
      />
      {preferences.isLoading ? <PreferencesSkeleton /> : null}
      {preferences.isError ? (
        <Notice>Notification preferences could not be loaded. {preferences.error.message}</Notice>
      ) : null}
      {rows ? (
        <div className="overflow-hidden rounded-xl border border-line">
          <div className="grid grid-cols-[minmax(0,1fr)_74px_74px] items-center gap-2 bg-surface-subtle px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            <span>Activity</span>
            <span className="text-center">In app</span>
            <span className="text-center">Email</span>
          </div>
          <div className="max-h-[440px] divide-y divide-line overflow-y-auto">
            {rows.map((preference) => {
              const pending = updatePreference.isPending && updatePreference.variables?.type === preference.type;
              const meta = preferenceMeta[preference.type];
              return (
                <div key={preference.type} className="grid grid-cols-[minmax(0,1fr)_74px_74px] items-center gap-2 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">{meta.label}</p>
                    <p className="mt-0.5 text-xs leading-5 text-ink-muted">{meta.description}</p>
                  </div>
                  <PreferenceCheckbox
                    label={`Show ${meta.label.toLowerCase()} in app`}
                    checked={preference.inAppEnabled}
                    disabled={pending}
                    icon={<BellRing className="h-3.5 w-3.5" />}
                    onChange={(checked) => update(preference.type, 'inAppEnabled', checked)}
                  />
                  <PreferenceCheckbox
                    label={`Email me about ${meta.label.toLowerCase()}`}
                    checked={preference.emailEnabled}
                    disabled={pending}
                    icon={<Mail className="h-3.5 w-3.5" />}
                    onChange={(checked) => update(preference.type, 'emailEnabled', checked)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </Card>
  );
}

function PreferenceCheckbox({
  label, checked, disabled, icon, onChange,
}: {
  label: string; checked: boolean; disabled: boolean;
  icon: React.ReactNode; onChange: (checked: boolean) => void;
}) {
  return (
    <label className={cn('mx-auto flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border transition-colors',
      checked ? 'border-bid/25 bg-bid-light text-bid-dark' : 'border-line bg-surface-panel text-ink-faint',
      disabled && 'cursor-wait opacity-50')}>
      <input type="checkbox" className="sr-only" checked={checked} disabled={disabled}
        aria-label={label} onChange={(event) => onChange(event.target.checked)} />
      {icon}
    </label>
  );
}

function PreferencesSkeleton() {
  return <div aria-label="Loading notification preferences" aria-busy="true" className="space-y-2">
    {Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-16 w-full" />)}
  </div>;
}
