"use client";

import { BellRing, CalendarClock, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Card, CardHeader, Skeleton } from "@/components/shared/Card";
import { Notice } from "@/components/shared/PageHeader";
import {
  useNotificationPreferenceGroupsQuery,
  useNotificationAutomationPreferenceQuery,
  useUpdateNotificationAutomationPreferenceMutation,
  useUpdateNotificationPreferenceGroupMutation,
  type NotificationPreferenceGroup,
  type NotificationPreferenceGroupName,
  type NotificationPreferenceMode,
} from "@/lib/api/notifications";
import { cn } from "@/lib/utils";

type PreferenceRole = "admin" | "trainer" | "entrepreneur";

type PreferenceMeta = { label: string; description: string };

const preferenceMeta: Record<
  PreferenceRole,
  Record<NotificationPreferenceGroupName, PreferenceMeta>
> = {
  admin: {
    sessions: {
      label: "Session requests",
      description:
        "New entrepreneur booking requests that need BID team ownership.",
    },
    deliverables: {
      label: "Deliverable reviews",
      description:
        "Submissions that are ready for an administrator or trainer to review.",
    },
    tools: {
      label: "Tool requests",
      description:
        "New entrepreneur tool requests and decisions that need operational attention.",
    },
    coaching: {
      label: "Coaching reminders",
      description: "Prompts about learner follow-up and support.",
    },
    product: {
      label: "Product and account notices",
      description: "Important BID Hub operational and account information.",
    },
  },
  trainer: {
    sessions: {
      label: "Session requests",
      description:
        "New entrepreneur booking requests that you may accept and own.",
    },
    deliverables: {
      label: "Deliverable reviews",
      description:
        "Submissions from entrepreneurs you support that are ready for review.",
    },
    tools: {
      label: "Tool requests",
      description: "Updates related to entrepreneur tools.",
    },
    coaching: {
      label: "Coaching reminders",
      description: "Prompts about learner follow-up, progress, and support.",
    },
    product: {
      label: "Product and account notices",
      description: "Important BID Hub operational and account information.",
    },
  },
  entrepreneur: {
    sessions: {
      label: "Sessions",
      description:
        "Confirmations, reschedules, cancellations, declines, and completed sessions.",
    },
    deliverables: {
      label: "Deliverables",
      description:
        "Approvals, review decisions, and requests to update a submission.",
    },
    tools: {
      label: "Tool requests",
      description:
        "Progress and decisions for tools you have requested from BID.",
    },
    coaching: {
      label: "Coaching reminders",
      description: "Prompts related to your learning and support activity.",
    },
    product: {
      label: "Product and account notices",
      description:
        "Important BID Hub operational, reporting, and account information.",
    },
  },
};

export function NotificationPreferencesCard({
  role,
  className,
}: {
  role: PreferenceRole;
  className?: string;
}) {
  const preferences = useNotificationPreferenceGroupsQuery();
  const automation = useNotificationAutomationPreferenceQuery();
  const updateAutomation = useUpdateNotificationAutomationPreferenceMutation();
  const updatePreference = useUpdateNotificationPreferenceGroupMutation();
  const groups = preferences.data as NotificationPreferenceGroup[] | undefined;

  const update = (
    group: NotificationPreferenceGroupName,
    channel: "inAppEnabled" | "emailEnabled",
    enabled: boolean | null,
  ) => {
    if (updatePreference.isPending) return;
    updatePreference.mutate(
      { group, payload: { [channel]: enabled } },
      {
        onSuccess: () => toast.success("Notification group updated"),
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <Card className={className}>
      <CardHeader
        title="Notification preferences"
        description="Use the company default or set a personal channel choice for each area of work. Personal choices remain unchanged when company defaults change."
        actions={<BellRing className="h-5 w-5 text-bid" />}
      />
      {preferences.isLoading || automation.isLoading ? (
        <PreferencesSkeleton />
      ) : null}
      {preferences.isError || automation.isError ? (
        <Notice>
          Notification preferences could not be loaded.{" "}
          {preferences.error?.message ?? automation.error?.message}
        </Notice>
      ) : null}
      {groups && automation.data ? (
        <div className="overflow-x-auto rounded-xl border border-line">
          <div className="min-w-[620px]">
            <div className="grid grid-cols-[minmax(0,1fr)_150px_150px] items-center gap-2 bg-surface-subtle px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">
              <span>Notification group</span>
              <span className="text-center">In app</span>
              <span className="text-center">Email</span>
            </div>
            <div className="divide-y divide-line">
              {groups.map((preference) => {
                const meta = preferenceMeta[role][preference.group];
                const pending =
                  updatePreference.isPending &&
                  updatePreference.variables?.group === preference.group;
                const inAppPending =
                  pending &&
                  updatePreference.variables?.payload.inAppEnabled !==
                    undefined;
                const emailPending =
                  pending &&
                  updatePreference.variables?.payload.emailEnabled !==
                    undefined;
                return (
                  <div
                    key={preference.group}
                    className="grid grid-cols-[minmax(0,1fr)_150px_150px] items-center gap-2 px-4 py-4"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="text-sm font-semibold text-ink">
                        {meta.label}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-ink-muted">
                        {meta.description}
                      </p>
                    </div>
                    <PreferenceControl
                      label={`Show ${meta.label.toLowerCase()} in app`}
                      mode={preference.inAppMode}
                      effectiveEnabled={preference.inAppEnabled}
                      companyDefault={preference.defaults.inAppEnabled}
                      disabled={updatePreference.isPending}
                      isLoading={inAppPending}
                      onChange={(enabled) =>
                        update(preference.group, "inAppEnabled", enabled)
                      }
                    />
                    <PreferenceControl
                      label={`Email me about ${meta.label.toLowerCase()}`}
                      mode={preference.emailMode}
                      effectiveEnabled={preference.emailEnabled}
                      companyDefault={preference.defaults.emailEnabled}
                      disabled={updatePreference.isPending}
                      isLoading={emailPending}
                      onChange={(enabled) =>
                        update(preference.group, "emailEnabled", enabled)
                      }
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
      {automation.data ? (
        <div className="mt-5 border-t border-line pt-5">
          <div className="mb-3 flex items-start gap-3">
            <CalendarClock className="mt-0.5 h-5 w-5 text-bid" />
            <div>
              <h3 className="text-sm font-semibold text-ink">
                Scheduled notifications
              </h3>
              <p className="mt-1 text-xs leading-5 text-ink-muted">
                Scheduled controls decide whether a reminder or summary is
                created. The group controls above decide which enabled channels
                deliver it.
              </p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <AutomationPreference
              label="Due-date and session reminders"
              description="Reminders up to 24 hours before confirmed sessions and outstanding deliverables are due."
              mode={modeFromOverride(automation.data.reminderOverride)}
              effectiveEnabled={automation.data.reminderEnabled}
              companyDefault={automation.data.defaults.reminderEnabled}
              disabled={updateAutomation.isPending}
              isLoading={
                updateAutomation.isPending &&
                updateAutomation.variables?.reminderEnabled !== undefined
              }
              onChange={(value) =>
                updateAutomation.mutate(
                  { reminderEnabled: value },
                  {
                    onSuccess: () =>
                      toast.success("Reminder preference updated"),
                    onError: (error) => toast.error(error.message),
                  },
                )
              }
            />
            <AutomationPreference
              label="Weekly summary email"
              description="A Monday summary of unread activity, upcoming sessions, and deliverables due in the next seven days."
              mode={modeFromOverride(automation.data.weeklyDigestOverride)}
              effectiveEnabled={automation.data.weeklyDigestEnabled}
              companyDefault={automation.data.defaults.weeklyDigestEnabled}
              disabled={updateAutomation.isPending}
              isLoading={
                updateAutomation.isPending &&
                updateAutomation.variables?.weeklyDigestEnabled !== undefined
              }
              onChange={(value) =>
                updateAutomation.mutate(
                  { weeklyDigestEnabled: value },
                  {
                    onSuccess: () =>
                      toast.success("Weekly summary preference updated"),
                    onError: (error) => toast.error(error.message),
                  },
                )
              }
            />
          </div>
        </div>
      ) : null}
    </Card>
  );
}

function PreferenceControl({
  label,
  mode,
  effectiveEnabled,
  companyDefault,
  disabled,
  isLoading,
  onChange,
}: {
  label: string;
  mode: NotificationPreferenceMode;
  effectiveEnabled: boolean | null;
  companyDefault: boolean;
  disabled: boolean;
  isLoading: boolean;
  onChange: (enabled: boolean | null) => void;
}) {
  const selected = mode;
  return (
    <div className="mx-auto w-full max-w-[142px]">
      <div className="relative">
        <select
          aria-label={label}
          value={selected}
          disabled={disabled}
          onChange={(event) =>
            onChange(
              event.target.value === "inherit"
                ? null
                : event.target.value === "enabled",
            )
          }
          className={cn(
            "h-10 w-full appearance-none rounded-lg border border-line bg-card px-3 pr-8 text-xs font-medium text-ink outline-none transition focus:border-bid/50 focus:ring-2 focus:ring-bid/15 disabled:cursor-wait disabled:opacity-60",
            selected === "enabled" && "border-bid/30 text-bid",
            selected === "disabled" && "text-ink-muted",
          )}
        >
          {mode === "mixed" ? (
            <option value="mixed" disabled>
              Mixed settings
            </option>
          ) : null}
          <option value="inherit">Company default</option>
          <option value="enabled">Always on</option>
          <option value="disabled">Off</option>
        </select>
        {isLoading ? (
          <LoaderCircle className="pointer-events-none absolute right-2.5 top-3 h-4 w-4 animate-spin text-bid" />
        ) : selected === "inherit" ? (
          <span className="pointer-events-none absolute right-2.5 top-3 text-[10px] text-ink-faint">
            {companyDefault ? "ON" : "OFF"}
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-center text-[10px] text-ink-faint">
        {mode === "mixed"
          ? "Mixed event settings"
          : "Currently " + (effectiveEnabled ? "on" : "off")}
      </p>
    </div>
  );
}

function AutomationPreference({
  label,
  description,
  ...control
}: {
  label: string;
  description: string;
  mode: NotificationPreferenceMode;
  effectiveEnabled: boolean;
  companyDefault: boolean;
  disabled: boolean;
  isLoading: boolean;
  onChange: (enabled: boolean | null) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-line bg-surface-subtle p-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">{label}</p>
        <p className="mt-1 text-xs leading-5 text-ink-muted">{description}</p>
      </div>
      <PreferenceControl label={label} {...control} />
    </div>
  );
}

function modeFromOverride(value: boolean | null): NotificationPreferenceMode {
  if (value === null) return "inherit";
  return value ? "enabled" : "disabled";
}

function PreferencesSkeleton() {
  return (
    <div
      aria-label="Loading notification preferences"
      aria-busy="true"
      className="overflow-hidden rounded-xl border border-line"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_150px_150px] gap-2 bg-surface-subtle px-4 py-3">
        <Skeleton className="h-3 w-36" />
        <Skeleton className="mx-auto h-3 w-12" />
        <Skeleton className="mx-auto h-3 w-10" />
      </div>
      <div className="divide-y divide-line">
        {Array.from({ length: 5 }, (_, index) => (
          <div
            key={index}
            className="grid min-h-20 grid-cols-[minmax(0,1fr)_150px_150px] items-center gap-2 px-4 py-3"
          >
            <div className="space-y-2 pr-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-full max-w-md" />
            </div>
            <Skeleton className="mx-auto h-10 w-10" />
            <Skeleton className="mx-auto h-10 w-10" />
          </div>
        ))}
      </div>
    </div>
  );
}
