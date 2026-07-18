"use client";

import { BellRing, LoaderCircle, Mail, Minus } from "lucide-react";
import { toast } from "sonner";
import { Card, CardHeader, Skeleton } from "@/components/shared/Card";
import { Notice } from "@/components/shared/PageHeader";
import {
  useNotificationPreferenceGroupsQuery,
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
        description="Choose how BID Hub notifies you for related areas of work. Each control applies to every event in that group."
        actions={<BellRing className="h-5 w-5 text-bid" />}
      />
      {preferences.isLoading ? <PreferencesSkeleton /> : null}
      {preferences.isError ? (
        <Notice>
          Notification preferences could not be loaded.{" "}
          {preferences.error.message}
        </Notice>
      ) : null}
      {groups ? (
        <div className="overflow-x-auto rounded-xl border border-line">
          <div className="min-w-[620px]">
            <div className="grid grid-cols-[minmax(0,1fr)_68px_68px] items-center gap-1 bg-surface-subtle px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">
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
                    className="grid grid-cols-[minmax(0,1fr)_68px_68px] items-center gap-1 px-4 py-4"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="text-sm font-semibold text-ink">
                        {meta.label}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-ink-muted">
                        {meta.description}
                      </p>
                    </div>
                    <PreferenceToggle
                      label={`Show ${meta.label.toLowerCase()} in app`}
                      value={preference.inAppEnabled}
                      disabled={updatePreference.isPending}
                      isLoading={inAppPending}
                      icon={<BellRing className="h-4 w-4" />}
                      onChange={(enabled) =>
                        update(preference.group, "inAppEnabled", enabled)
                      }
                    />
                    <PreferenceToggle
                      label={`Email me about ${meta.label.toLowerCase()}`}
                      value={preference.emailEnabled}
                      disabled={updatePreference.isPending}
                      isLoading={emailPending}
                      icon={<Mail className="h-4 w-4" />}
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
    </Card>
  );
}

function PreferenceToggle({
  label,
  value,
  disabled,
  isLoading,
  icon,
  onChange,
}: {
  label: string;
  value: boolean | null;
  disabled: boolean;
  isLoading: boolean;
  icon: React.ReactNode;
  onChange: (enabled: boolean) => void;
}) {
  const mixed = value === null;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={mixed ? "mixed" : value}
      aria-label={label}
      title={mixed ? `${label} (some events enabled)` : label}
      disabled={disabled}
      onClick={() => onChange(value !== true)}
      className={cn(
        "mx-auto inline-flex h-10 w-10 items-center justify-center rounded-lg border shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bid/25 disabled:cursor-wait disabled:opacity-60",
        value === true && "border-bid/30 bg-bid-light text-bid",
        value === false &&
          "border-line bg-card text-ink-faint hover:border-bid/30 hover:text-bid",
        mixed && "border-warning/40 bg-warning-light text-warning-dark",
      )}
    >
      {isLoading ? (
        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : mixed ? (
        <Minus className="h-4 w-4" aria-hidden="true" />
      ) : (
        icon
      )}
    </button>
  );
}

function PreferencesSkeleton() {
  return (
    <div
      aria-label="Loading notification preferences"
      aria-busy="true"
      className="overflow-hidden rounded-xl border border-line"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_68px_68px] gap-1 bg-surface-subtle px-4 py-3">
        <Skeleton className="h-3 w-36" />
        <Skeleton className="mx-auto h-3 w-12" />
        <Skeleton className="mx-auto h-3 w-10" />
      </div>
      <div className="divide-y divide-line">
        {Array.from({ length: 5 }, (_, index) => (
          <div
            key={index}
            className="grid min-h-20 grid-cols-[minmax(0,1fr)_68px_68px] items-center gap-1 px-4 py-3"
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
