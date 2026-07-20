"use client";

import * as React from "react";
import { toast } from "sonner";
import { Bell, CalendarClock, FileCheck2, Globe2 } from "lucide-react";
import { PageHeader, Notice } from "@/components/shared/PageHeader";
import { Card, CardHeader, Skeleton } from "@/components/shared/Card";
import { Button } from "@/components/shared/Button";
import {
  FormAutocomplete,
  FormField,
  FormInput,
  FormSelect,
} from "@/components/shared/FormField";
import { StatCard } from "@/components/shared/StatCard";
import { MetricGrid } from "@/components/shared/MetricGrid";
import { cn } from "@/lib/utils";
import { getTimezoneOptions, PLATFORM_DEFAULT_TIMEZONE } from "@/lib/timezones";
import {
  useCompanySettingsQuery,
  useUpdateCompanySettingsMutation,
  type CompanyConfig,
} from "@/lib/api/settings";

const currencyOptions = [
  { value: "USD", label: "USD - US Dollar" },
  { value: "GHS", label: "GHS - Ghanaian Cedi" },
  { value: "NGN", label: "NGN - Nigerian Naira" },
  { value: "KES", label: "KES - Kenyan Shilling" },
  { value: "RWF", label: "RWF - Rwandan Franc" },
];

const sessionProviderOptions = [{ value: "google-meet", label: "Google Meet" }];

const weekdayOptions = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

const slotIntervalOptions = [
  { value: "15", label: "15 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "45", label: "45 minutes" },
  { value: "60", label: "60 minutes" },
];

const sessionDurationOptions = [
  { value: "30", label: "30 minutes" },
  { value: "45", label: "45 minutes" },
  { value: "60", label: "60 minutes" },
  { value: "90", label: "90 minutes" },
  { value: "120", label: "120 minutes" },
];

function minutesToTime(minutes: number) {
  const hours = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const remainder = (minutes % 60).toString().padStart(2, "0");
  return hours + ":" + remainder;
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function parseOptionalDays(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : Number.NaN;
}

function isValidDays(value: number | null) {
  return (
    value === null || (Number.isInteger(value) && value >= 1 && value <= 365)
  );
}

export default function AdminCompanySettingsPage() {
  const settings = useCompanySettingsQuery();

  if (settings.isLoading) {
    return <CompanySettingsSkeleton />;
  }

  if (settings.isError || !settings.data) {
    return (
      <>
        <PageHeader
          title="Company settings"
          description="Configure platform-wide rules used across admin, trainer, and entrepreneur workflows."
        />
        <Card>
          <Notice>
            Company settings could not be loaded. {settings.error?.message}
          </Notice>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => void settings.refetch()}
          >
            Try again
          </Button>
        </Card>
      </>
    );
  }

  return <CompanySettingsForm companyConfig={settings.data} />;
}

function CompanySettingsForm({
  companyConfig,
}: {
  companyConfig: CompanyConfig;
}) {
  const updateSettings = useUpdateCompanySettingsMutation({
    onSuccess: () => toast.success("Company settings updated"),
    onError: (error) => toast.error(error.message),
  });
  const [overdueAfterDays, setOverdueAfterDays] = React.useState(() =>
    String(companyConfig.reporting.periodicUpdateOverdueAfterDays),
  );
  const [moduleDueDays, setModuleDueDays] = React.useState(() =>
    companyConfig.deliverables.moduleCompletionDeliverableDueDays == null
      ? ""
      : String(companyConfig.deliverables.moduleCompletionDeliverableDueDays),
  );
  const [currency, setCurrency] = React.useState(
    companyConfig.defaults.currency,
  );
  const [timezone, setTimezone] = React.useState(
    companyConfig.defaults.timezone,
  );
  const [timezoneOpen, setTimezoneOpen] = React.useState(false);
  const [sessionProvider, setSessionProvider] = React.useState(
    companyConfig.defaults.sessionProvider,
  );
  const [sessionPolicy, setSessionPolicy] = React.useState(
    companyConfig.sessions,
  );
  const [notifications, setNotifications] = React.useState(
    companyConfig.notifications,
  );

  const overdueValue = Number(overdueAfterDays);
  const moduleDueValue = parseOptionalDays(moduleDueDays);
  const overdueError =
    !Number.isInteger(overdueValue) || overdueValue < 1 || overdueValue > 365
      ? "Enter a whole number between 1 and 365."
      : undefined;
  const moduleDueError = !isValidDays(moduleDueValue)
    ? "Leave blank or enter a whole number between 1 and 365."
    : undefined;
  const sessionHoursError =
    sessionPolicy.workdayStartMinutes >= sessionPolicy.workdayEndMinutes
      ? "End time must be after the start time."
      : undefined;
  const sessionDurationError =
    sessionPolicy.defaultDurationMinutes >
    sessionPolicy.workdayEndMinutes - sessionPolicy.workdayStartMinutes
      ? "Duration must fit inside the working day."
      : undefined;
  const hasError = Boolean(
    overdueError ||
    moduleDueError ||
    sessionHoursError ||
    sessionDurationError ||
    sessionPolicy.workingDays.length === 0,
  );

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (hasError) return;

    updateSettings.mutate({
      reporting: { periodicUpdateOverdueAfterDays: overdueValue },
      deliverables: { moduleCompletionDeliverableDueDays: moduleDueValue },
      defaults: { currency, timezone, sessionProvider },
      sessions: sessionPolicy,
      notifications,
    });
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
            companyConfig.deliverables.moduleCompletionDeliverableDueDays ==
            null
              ? "Manual"
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
            If an entrepreneur has never submitted a periodic report, the count
            starts from their joined date. Otherwise, it starts from the latest
            submitted periodic report date.
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
                <span className="text-sm text-ink-muted">
                  days without a periodic report
                </span>
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
            This is only a default. A programme deliverable can still define its
            own due window when the rule is created.
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
                <span className="text-sm text-ink-muted">
                  days after the learner completes the trigger module
                </span>
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
              <FormAutocomplete
                value={timezone}
                onValueChange={setTimezone}
                options={
                  timezoneOpen
                    ? getTimezoneOptions()
                    : [
                        {
                          value: timezone,
                          label: timezone.replaceAll("_", " "),
                        },
                      ]
                }
                placeholder="Select timezone"
                searchPlaceholder="Search timezones..."
                emptyMessage="No timezone found."
                onOpenChange={setTimezoneOpen}
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
            title="Session booking hours"
            description="Control when entrepreneurs can request sessions against connected BID team calendars."
            actions={<CalendarClock className="h-5 w-5 text-ink-faint" />}
          />
          <Notice>
            Availability still comes from each team member&apos;s live Google
            Calendar. These rules define the bookable window and slot spacing.
          </Notice>
          <div className="mt-4 space-y-5">
            <FormField
              label="Working days"
              error={
                sessionPolicy.workingDays.length === 0
                  ? "Choose at least one working day."
                  : undefined
              }
            >
              <div className="flex flex-wrap gap-2">
                {weekdayOptions.map((day) => {
                  const selected = sessionPolicy.workingDays.includes(
                    day.value,
                  );
                  return (
                    <button
                      key={day.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() =>
                        setSessionPolicy((current) => ({
                          ...current,
                          workingDays: selected
                            ? current.workingDays.filter(
                                (value) => value !== day.value,
                              )
                            : [...current.workingDays, day.value],
                        }))
                      }
                      className={cn(
                        "min-w-14 rounded-lg border px-3 py-2 text-sm font-semibold transition",
                        selected
                          ? "border-bid bg-bid text-white"
                          : "border-line bg-surface text-ink-muted hover:border-bid/40 hover:text-ink",
                      )}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </FormField>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <FormField label="Working day starts">
                <FormInput
                  type="time"
                  value={minutesToTime(sessionPolicy.workdayStartMinutes)}
                  onChange={(event) =>
                    setSessionPolicy((current) => ({
                      ...current,
                      workdayStartMinutes: timeToMinutes(event.target.value),
                    }))
                  }
                />
              </FormField>
              <FormField label="Working day ends" error={sessionHoursError}>
                <FormInput
                  type="time"
                  value={minutesToTime(sessionPolicy.workdayEndMinutes)}
                  onChange={(event) =>
                    setSessionPolicy((current) => ({
                      ...current,
                      workdayEndMinutes: timeToMinutes(event.target.value),
                    }))
                  }
                />
              </FormField>
              <FormField label="Slot interval">
                <FormSelect
                  value={String(sessionPolicy.slotIntervalMinutes)}
                  onValueChange={(value) =>
                    setSessionPolicy((current) => ({
                      ...current,
                      slotIntervalMinutes: Number(value),
                    }))
                  }
                  options={slotIntervalOptions}
                />
              </FormField>
              <FormField
                label="Default session duration"
                error={sessionDurationError}
              >
                <FormSelect
                  value={String(sessionPolicy.defaultDurationMinutes)}
                  onValueChange={(value) =>
                    setSessionPolicy((current) => ({
                      ...current,
                      defaultDurationMinutes: Number(value),
                    }))
                  }
                  options={sessionDurationOptions}
                />
              </FormField>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Company notification policy"
            description="Set fallback channels and scheduled-notification policy. A scheduled notice is delivered only through its enabled channel; users can inherit either setting or choose personal overrides."
            actions={<Bell className="h-5 w-5 text-ink-faint" />}
          />
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <SettingToggle
              label="In-app notifications"
              description="Fallback for users who keep their in-app preference on company default."
              checked={notifications.inAppNotifications}
              onChange={(checked) =>
                setNotifications((current) => ({
                  ...current,
                  inAppNotifications: checked,
                }))
              }
            />
            <SettingToggle
              label="Email notifications"
              description="Fallback for users who keep their email preference on company default."
              checked={notifications.emailNotifications}
              onChange={(checked) =>
                setNotifications((current) => ({
                  ...current,
                  emailNotifications: checked,
                }))
              }
            />
            <SettingToggle
              label="Reminder notifications"
              description="Default for reminders up to 24 hours before confirmed sessions and outstanding deliverables are due."
              checked={notifications.reminderNotifications}
              onChange={(checked) =>
                setNotifications((current) => ({
                  ...current,
                  reminderNotifications: checked,
                }))
              }
            />
            <SettingToggle
              label="Weekly summary digest"
              description="Default for a Monday email summary of unread activity and work due in the next seven days."
              checked={notifications.weeklyDigest}
              onChange={(checked) =>
                setNotifications((current) => ({
                  ...current,
                  weeklyDigest: checked,
                }))
              }
            />
          </div>
        </Card>

        <div className="sticky bottom-0 z-10 flex flex-col gap-2 border-t border-line bg-[color:var(--background)]/95 py-4 backdrop-blur sm:flex-row">
          <Button
            type="submit"
            disabled={hasError}
            isLoading={updateSettings.isPending}
            loadingLabel="Saving settings"
          >
            Save company settings
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setOverdueAfterDays("30");
              setModuleDueDays("7");
              setCurrency("USD");
              setTimezone(PLATFORM_DEFAULT_TIMEZONE);
              setSessionProvider("google-meet");
              setSessionPolicy({
                workingDays: [1, 2, 3, 4, 5],
                workdayStartMinutes: 540,
                workdayEndMinutes: 1020,
                slotIntervalMinutes: 30,
                defaultDurationMinutes: 60,
              });
              setNotifications({
                inAppNotifications: true,
                emailNotifications: true,
                reminderNotifications: true,
                weeklyDigest: false,
              });
              toast.success("Defaults restored. Save to keep these settings.");
            }}
          >
            Reset form
          </Button>
        </div>
      </form>
    </>
  );
}

function CompanySettingsSkeleton() {
  return (
    <div
      aria-label="Loading company settings"
      aria-busy="true"
      className="space-y-4"
    >
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-28 w-full" />
        ))}
      </div>
      {Array.from({ length: 5 }, (_, index) => (
        <Card key={index} className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full max-w-xl" />
          <Skeleton className="h-11 w-full max-w-xl" />
        </Card>
      ))}
    </div>
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
        "flex cursor-pointer items-start gap-3 rounded-xl border border-black/[0.08] bg-surface-subtle p-4 transition hover:bg-white",
        checked && "border-bid/25 bg-bid-light/50",
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
        <span className="mt-1 block text-sm leading-6 text-ink-muted">
          {description}
        </span>
      </span>
    </label>
  );
}
