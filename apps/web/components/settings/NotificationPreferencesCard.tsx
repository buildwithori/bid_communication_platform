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
    enabled: boolean,
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
        description="Choose where BID Hub should send updates for each area of your work."
        actions={<BellRing className="h-5 w-5 text-bid" />}
      />
      {preferences.isLoading || automation.isLoading ? (
        <NotificationPreferencesContentSkeleton />
      ) : null}
      {preferences.isError || automation.isError ? (
        <Notice>
          Notification preferences could not be loaded.{" "}
          {preferences.error?.message ?? automation.error?.message}
        </Notice>
      ) : null}
      {groups && automation.data ? (
        <div className="overflow-x-auto rounded-xl border border-line">
          <div className="min-w-[520px]">
            <div className="grid grid-cols-[minmax(0,1fr)_80px_80px] items-center gap-1 bg-surface-subtle px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">
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
                    className="grid grid-cols-[minmax(0,1fr)_80px_80px] items-center gap-1 px-4 py-4"
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
                      enabled={
                        preference.inAppEnabled ??
                        preference.defaults.inAppEnabled
                      }
                      disabled={updatePreference.isPending}
                      isLoading={inAppPending}
                      onChange={(enabled) =>
                        update(preference.group, "inAppEnabled", enabled)
                      }
                    />
                    <PreferenceControl
                      label={`Email me about ${meta.label.toLowerCase()}`}
                      enabled={
                        preference.emailEnabled ??
                        preference.defaults.emailEnabled
                      }
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
                Choose which scheduled updates you want to receive. Delivery
                uses your channel choices above.
              </p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <AutomationPreference
              label={
                automation.data.scope.reminderKinds.includes("deliverable")
                  ? "Session and deliverable reminders"
                  : "Upcoming session reminders"
              }
              description={
                automation.data.scope.reminderKinds.includes("deliverable")
                  ? "Reminders up to 24 hours before confirmed sessions and outstanding deliverables are due."
                  : "Reminders up to 24 hours before confirmed sessions assigned to you."
              }
              enabled={automation.data.reminderEnabled}
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
              description={
                automation.data.scope.weeklyDigestKinds.includes("deliverable")
                  ? "A Monday summary of unread activity, upcoming sessions, and deliverables due in the next seven days."
                  : "A Monday summary of unread activity and sessions assigned to you in the next seven days."
              }
              enabled={automation.data.weeklyDigestEnabled}
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
  enabled,
  disabled,
  isLoading,
  onChange,
}: {
  label: string;
  enabled: boolean;
  disabled: boolean;
  isLoading: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={enabled}
      title={enabled ? "Turn off" : "Turn on"}
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={cn(
        "relative mx-auto inline-flex h-7 w-12 shrink-0 items-center rounded-full border p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bid/30 focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:cursor-wait disabled:opacity-60",
        enabled
          ? "border-bid bg-bid shadow-sm hover:bg-bid-dark"
          : "border-bid/25 bg-bid/10 hover:border-bid/40 hover:bg-bid/15",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex h-5 w-5 items-center justify-center rounded-full shadow-sm ring-1 transition-transform",
          enabled
            ? "translate-x-5 bg-white text-bid ring-white/70"
            : "translate-x-0 bg-bid/45 text-bid ring-bid/20",
        )}
      >
        {isLoading ? <LoaderCircle className="h-3 w-3 animate-spin" /> : null}
      </span>
      <span className="sr-only">{enabled ? "On" : "Off"}</span>
    </button>
  );
}

function AutomationPreference({
  label,
  description,
  enabled,
  disabled,
  isLoading,
  onChange,
}: {
  label: string;
  description: string;
  enabled: boolean;
  disabled: boolean;
  isLoading: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-line bg-surface-subtle p-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">{label}</p>
        <p className="mt-1 text-xs leading-5 text-ink-muted">{description}</p>
      </div>
      <div className="ml-auto w-12 shrink-0">
        <PreferenceControl
          label={label}
          enabled={enabled}
          disabled={disabled}
          isLoading={isLoading}
          onChange={onChange}
        />
      </div>
    </div>
  );
}

export function NotificationPreferencesContentSkeleton() {
  return (
    <div aria-label="Loading notification preferences" aria-busy="true">
      <div className="overflow-x-auto rounded-xl border border-line">
        <div className="min-w-[520px]">
          <div className="grid grid-cols-[minmax(0,1fr)_80px_80px] gap-1 bg-surface-subtle px-4 py-2.5">
            <Skeleton className="h-3 w-36" />
            <Skeleton className="mx-auto h-3 w-12" />
            <Skeleton className="mx-auto h-3 w-10" />
          </div>
          <div className="divide-y divide-line">
            {Array.from({ length: 5 }, (_, index) => (
              <div
                key={index}
                className="grid min-h-20 grid-cols-[minmax(0,1fr)_80px_80px] items-center gap-1 px-4 py-4"
              >
                <div className="space-y-2 pr-3">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-full max-w-md" />
                </div>
                <Skeleton className="mx-auto h-7 w-12 rounded-full" />
                <Skeleton className="mx-auto h-7 w-12 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 border-t border-line pt-5">
        <div className="mb-3 flex items-start gap-3">
          <Skeleton className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-[460px] max-w-full" />
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 2 }, (_, index) => (
            <div
              key={index}
              className="flex min-h-[78px] items-center justify-between gap-4 rounded-xl border border-line bg-surface-subtle p-4"
            >
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-44 max-w-full" />
                <Skeleton className="h-3 w-full max-w-sm" />
                <Skeleton className="h-3 w-3/4 max-w-xs" />
              </div>
              <Skeleton className="h-7 w-12 shrink-0 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
