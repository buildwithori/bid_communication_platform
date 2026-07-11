'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Bell, CalendarClock, FileCheck2, Globe2 } from 'lucide-react';
import { PageHeader, Notice } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { FormField, FormInput, FormSelect } from '@/components/shared/FormField';
import { StatCard } from '@/components/shared/StatCard';
import { MetricGrid } from '@/components/shared/MetricGrid';
import { cn } from '@/lib/utils';
import { useCompanyConfigStore } from '@/lib/stores/company-config-store';

const currencyOptions = [
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'GHS', label: 'GHS - Ghanaian Cedi' },
  { value: 'NGN', label: 'NGN - Nigerian Naira' },
  { value: 'KES', label: 'KES - Kenyan Shilling' },
  { value: 'RWF', label: 'RWF - Rwandan Franc' },
];

const timezoneOptions = [
  { value: 'Africa/Accra', label: 'Africa/Accra' },
  { value: 'Africa/Lagos', label: 'Africa/Lagos' },
  { value: 'Africa/Nairobi', label: 'Africa/Nairobi' },
  { value: 'Africa/Kigali', label: 'Africa/Kigali' },
  { value: 'UTC', label: 'UTC' },
];

const sessionProviderOptions = [
  { value: 'google-meet', label: 'Google Meet' },
];

function parseOptionalDays(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : Number.NaN;
}

function isValidDays(value: number | null) {
  return value === null || (Number.isInteger(value) && value >= 1 && value <= 365);
}

export default function AdminCompanySettingsPage() {
  const {
    companyConfig,
    updateReportingConfig,
    updateDeliverableConfig,
    updateDefaultConfig,
    updateNotificationConfig,
  } = useCompanyConfigStore();
  const [overdueAfterDays, setOverdueAfterDays] = React.useState(
    String(companyConfig.reporting.periodicUpdateOverdueAfterDays),
  );
  const [moduleDueDays, setModuleDueDays] = React.useState(
    companyConfig.deliverables.moduleCompletionDeliverableDueDays == null
      ? ''
      : String(companyConfig.deliverables.moduleCompletionDeliverableDueDays),
  );
  const [currency, setCurrency] = React.useState(companyConfig.defaults.currency);
  const [timezone, setTimezone] = React.useState(companyConfig.defaults.timezone);
  const [sessionProvider, setSessionProvider] = React.useState(companyConfig.defaults.sessionProvider);
  const [notifications, setNotifications] = React.useState(companyConfig.notifications);

  React.useEffect(() => {
    setOverdueAfterDays(String(companyConfig.reporting.periodicUpdateOverdueAfterDays));
    setModuleDueDays(
      companyConfig.deliverables.moduleCompletionDeliverableDueDays == null
        ? ''
        : String(companyConfig.deliverables.moduleCompletionDeliverableDueDays),
    );
    setCurrency(companyConfig.defaults.currency);
    setTimezone(companyConfig.defaults.timezone);
    setSessionProvider(companyConfig.defaults.sessionProvider);
    setNotifications(companyConfig.notifications);
  }, [companyConfig]);

  const overdueValue = Number(overdueAfterDays);
  const moduleDueValue = parseOptionalDays(moduleDueDays);
  const overdueError =
    !Number.isInteger(overdueValue) || overdueValue < 1 || overdueValue > 365
      ? 'Enter a whole number between 1 and 365.'
      : undefined;
  const moduleDueError = !isValidDays(moduleDueValue)
    ? 'Leave blank or enter a whole number between 1 and 365.'
    : undefined;
  const hasError = Boolean(overdueError || moduleDueError);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (hasError) return;

    updateReportingConfig({ periodicUpdateOverdueAfterDays: overdueValue });
    updateDeliverableConfig({ moduleCompletionDeliverableDueDays: moduleDueValue });
    updateDefaultConfig({ currency, timezone, sessionProvider });
    updateNotificationConfig(notifications);
    toast.success('Company settings updated');
  };

  return (
    <>
      <PageHeader
        title="Company settings"
        description="Configure platform-wide rules used across admin, trainer, and entrepreneur workflows."
      />

      <MetricGrid>
        <StatCard
          label="Report follow-up"
          value={`${companyConfig.reporting.periodicUpdateOverdueAfterDays} days`}
          subline="Periodic update overdue rule"
          dotColor="bid"
          accent="bid"
        />
        <StatCard
          label="Module-triggered deliverables"
          value={
            companyConfig.deliverables.moduleCompletionDeliverableDueDays == null
              ? 'Manual'
              : `${companyConfig.deliverables.moduleCompletionDeliverableDueDays} days`
          }
          subline="Default due window"
          dotColor="warning"
          accent="warning"
        />
        <StatCard
          label="Default currency"
          value={companyConfig.defaults.currency}
          subline="Used in reporting and funding"
          dotColor="info"
          accent="info"
        />
        <StatCard
          label="Session provider"
          value="Google Meet"
          subline="Default meeting platform"
          dotColor="success"
          accent="success"
        />
      </MetricGrid>

      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <Card>
          <CardHeader
            title="Reporting rules"
            description="Control when entrepreneurs appear in reporting follow-up queues."
            actions={<CalendarClock className="h-5 w-5 text-ink-faint" />}
          />
          <Notice>
            If an entrepreneur has never submitted a periodic report, the count starts from their joined date.
            Otherwise, it starts from the latest submitted periodic report date.
          </Notice>
          <div className="mt-4 max-w-[560px]">
            <FormField
              label="Mark periodic report as overdue after"
              error={overdueError}
            >
              <div className="grid gap-2 sm:grid-cols-[180px_auto] sm:items-center">
                <FormInput
                  type="number"
                  min={1}
                  max={365}
                  step={1}
                  value={overdueAfterDays}
                  onChange={(event) => setOverdueAfterDays(event.target.value)}
                />
                <span className="text-sm text-ink-muted">days without a periodic report</span>
              </div>
            </FormField>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Deliverable rules"
            description="Set the default due window for deliverables triggered by module completion."
            actions={<FileCheck2 className="h-5 w-5 text-ink-faint" />}
          />
          <Notice>
            This is only a default. A programme deliverable can still define its own due window when the rule is created.
          </Notice>
          <div className="mt-4 max-w-[560px]">
            <FormField
              label="Default due window after module completion"
              optional
              error={moduleDueError}
            >
              <div className="grid gap-2 sm:grid-cols-[180px_auto] sm:items-center">
                <FormInput
                  type="number"
                  min={1}
                  max={365}
                  step={1}
                  value={moduleDueDays}
                  onChange={(event) => setModuleDueDays(event.target.value)}
                  placeholder="e.g. 7"
                />
                <span className="text-sm text-ink-muted">days after the learner completes the trigger module</span>
              </div>
            </FormField>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Platform defaults"
            description="Set defaults used by reporting, dates, and session creation."
            actions={<Globe2 className="h-5 w-5 text-ink-faint" />}
          />
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <FormField label="Default currency">
              <FormSelect
                value={currency}
                onValueChange={setCurrency}
                options={currencyOptions}
              />
            </FormField>
            <FormField label="Default timezone">
              <FormSelect
                value={timezone}
                onValueChange={setTimezone}
                options={timezoneOptions}
              />
            </FormField>
            <FormField label="Default session provider">
              <FormSelect
                value={sessionProvider}
                onValueChange={setSessionProvider}
                options={sessionProviderOptions}
              />
              <p className="mt-1.5 text-xs leading-5 text-ink-muted">
                Google Meet is the only enabled provider for now.
              </p>
            </FormField>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Notification defaults"
            description="Set the default notification channels and reminder behavior for users."
            actions={<Bell className="h-5 w-5 text-ink-faint" />}
          />
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <SettingToggle
              label="In-app notifications"
              description="Show important product activity in the notification center."
              checked={notifications.inAppNotifications}
              onChange={(checked) => setNotifications((current) => ({ ...current, inAppNotifications: checked }))}
            />
            <SettingToggle
              label="Email notifications"
              description="Send important account, programme, session, and review updates by email."
              checked={notifications.emailNotifications}
              onChange={(checked) => setNotifications((current) => ({ ...current, emailNotifications: checked }))}
            />
            <SettingToggle
              label="Reminder notifications"
              description="Send reminders for due dates, sessions, follow-ups, and pending work."
              checked={notifications.reminderNotifications}
              onChange={(checked) => setNotifications((current) => ({ ...current, reminderNotifications: checked }))}
            />
            <SettingToggle
              label="Weekly summary digest"
              description="Send a weekly summary of unread activity and upcoming work."
              checked={notifications.weeklyDigest}
              onChange={(checked) => setNotifications((current) => ({ ...current, weeklyDigest: checked }))}
            />
          </div>
        </Card>

        <div className="sticky bottom-0 z-10 flex flex-col gap-2 border-t border-line bg-[color:var(--background)]/95 py-4 backdrop-blur sm:flex-row">
          <Button type="submit" disabled={hasError}>
            Save company settings
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setOverdueAfterDays('30');
              setModuleDueDays('7');
              setCurrency('USD');
              setTimezone('Africa/Accra');
              setSessionProvider('google-meet');
              setNotifications({
                inAppNotifications: true,
                emailNotifications: true,
                reminderNotifications: true,
                weeklyDigest: false,
              });
              toast.success('Defaults restored. Save to keep these settings.');
            }}
          >
            Reset form
          </Button>
        </div>
      </form>
    </>
  );
}

function SettingToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-xl border border-black/[0.08] bg-surface-subtle p-4 transition hover:bg-white',
        checked && 'border-bid/25 bg-bid-light/50',
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 accent-bid"
      />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink">{label}</span>
        <span className="mt-1 block text-sm leading-6 text-ink-muted">{description}</span>
      </span>
    </label>
  );
}
