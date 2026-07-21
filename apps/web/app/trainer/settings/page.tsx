"use client";

import * as React from "react";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserRound } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Notice } from "@/components/shared/PageHeader";
import { Card, CardHeader, Skeleton } from "@/components/shared/Card";
import { MetricGrid } from "@/components/shared/MetricGrid";
import { StatCard } from "@/components/shared/StatCard";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { FormField, FormInput } from "@/components/shared/FormField";
import { CalendarConnectionCard } from "@/components/settings/CalendarConnectionCard";
import { NotificationPreferencesCard } from "@/components/settings/NotificationPreferencesCard";
import { Tabs } from "@/components/shared/Tabs";
import {
  useTrainerProfileQuery,
  useUpdateTrainerProfileMutation,
  type TrainerRecord,
} from "@/lib/api/trainers";
import {
  useCalendarAuthorizationMutation,
  useCalendarConnectionQuery,
  useDisconnectCalendarMutation,
} from "@/lib/api/calendar";
import {
  trainerProfileSchema,
  type TrainerProfileForm,
} from "@/lib/forms/schemas";

const roleLabels = {
  mentor: "Mentor",
  trainer: "Trainer",
  guest_expert: "Guest Expert",
  investment_analyst: "Investment Analyst",
} as const;

type SettingsTab = "account" | "notifications";

function settingsTabFromQuery(value: string | null): SettingsTab {
  return value === "notifications" ? "notifications" : "account";
}

export default function TrainerSettingsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = settingsTabFromQuery(searchParams.get("tab"));
  const setTab = React.useCallback(
    (nextTab: SettingsTab) => {
      if (nextTab === tab) return;
      const params = new URLSearchParams(searchParams.toString());
      params.set(
        "tab",
        nextTab === "notifications" ? "notifications" : "profile-calendar",
      );
      router.push((pathname + "?" + params.toString()) as Route, {
        scroll: false,
      });
    },
    [pathname, router, searchParams, tab],
  );
  const profile = useTrainerProfileQuery();
  const calendar = useCalendarConnectionQuery();
  const form = useForm<TrainerProfileForm>({
    resolver: zodResolver(trainerProfileSchema),
    defaultValues: { firstName: "", lastName: "", phone: "" },
  });
  const updateProfile = useUpdateTrainerProfileMutation({
    onSuccess: () => toast.success("Profile settings saved"),
    onError: (error) => toast.error(error.message),
  });
  const authorizeCalendar = useCalendarAuthorizationMutation({
    onSuccess: ({ url }) => window.location.assign(url),
    onError: (error) => toast.error(error.message),
  });
  const disconnectCalendar = useDisconnectCalendarMutation({
    onSuccess: () => toast.success("Google Calendar disconnected"),
    onError: (error) => toast.error(error.message),
  });

  React.useEffect(() => {
    if (!profile.data) return;
    form.reset({
      firstName: profile.data.firstName ?? "",
      lastName: profile.data.lastName ?? "",
      phone: profile.data.phone ?? "",
    });
  }, [form, profile.data]);

  if (tab === "account" && (profile.isLoading || calendar.isLoading)) {
    return <TrainerSettingsSkeleton />;
  }

  if (tab === "account" && (profile.isError || calendar.isError || !profile.data)) {
    const error = profile.error ?? calendar.error;
    return (
      <>
        <PageHeader
          title="Settings"
          description="Manage the profile and calendar details used across your trainer workspace."
        />
        <Card>
          <Notice>
            Trainer settings could not be loaded. {error?.message}
          </Notice>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => {
              void profile.refetch();
              void calendar.refetch();
            }}
          >
            Try again
          </Button>
        </Card>
      </>
    );
  }

  const trainer = profile.data as TrainerRecord;
  const connected = Boolean(calendar.data?.connected);

  return (
    <>
      <PageHeader
        title="Settings"
        description="Manage the profile and calendar details used across your trainer workspace."
      />

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "account", label: "Profile and calendar" },
          { value: "notifications", label: "Notifications" },
        ]}
      />

      {tab === "account" ? (
        <>
          <MetricGrid columns={3}>
            <StatCard
              label="Profile"
              value={
                trainer.directoryStatus === "active" ? "Active" : "Inactive"
              }
              subline={roleLabels[trainer.roleLabel]}
              dotColor={
                trainer.directoryStatus === "active" ? "success" : "warning"
              }
              accent={
                trainer.directoryStatus === "active" ? "success" : "warning"
              }
            />
            <StatCard
              label="Calendar"
              value={connected ? "Connected" : "Not connected"}
              subline="Google Meet sessions"
              dotColor={connected ? "success" : "warning"}
              accent={connected ? "success" : "warning"}
            />
            <StatCard
              label="My entrepreneurs"
              value={trainer.portfolio.inferredEntrepreneurs}
              subline="Entrepreneurs you support"
              dotColor="info"
              accent="info"
            />
          </MetricGrid>

          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
            <Card>
              <CardHeader
                title="Profile details"
                description="These details appear in trainer lists, session ownership, and entrepreneur-facing booking flows."
                actions={<UserRound className="h-5 w-5 text-ink-faint" />}
              />
              <form
                onSubmit={form.handleSubmit((values) =>
                  updateProfile.mutate(values),
                )}
                className="space-y-4"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    label="First name"
                    error={form.formState.errors.firstName?.message}
                  >
                    <FormInput {...form.register("firstName")} />
                  </FormField>
                  <FormField
                    label="Last name"
                    error={form.formState.errors.lastName?.message}
                  >
                    <FormInput {...form.register("lastName")} />
                  </FormField>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Email">
                    <FormInput type="email" value={trainer.email} disabled />
                  </FormField>
                  <FormField
                    label="Phone"
                    error={form.formState.errors.phone?.message}
                    optional
                  >
                    <FormInput type="tel" {...form.register("phone")} />
                  </FormField>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Role">
                    <FormInput value={roleLabels[trainer.roleLabel]} disabled />
                  </FormField>
                  <FormField label="Specialisms">
                    <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-border bg-surface-subtle px-3 py-2">
                      {trainer.specialisms.length ? (
                        trainer.specialisms.map((specialism) => (
                          <Badge key={specialism.id} tone="blue">
                            {specialism.name}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-ink-muted">
                          No specialisms assigned
                        </span>
                      )}
                    </div>
                  </FormField>
                </div>

                <div className="flex justify-end border-t border-line pt-4">
                  <Button
                    type="submit"
                    isLoading={updateProfile.isPending}
                    loadingLabel="Saving profile"
                  >
                    Save profile
                  </Button>
                </div>
              </form>
            </Card>

            <CalendarConnectionCard
              connected={connected}
              accountEmail={calendar.data?.accountEmail ?? trainer.email}
              isConnecting={authorizeCalendar.isPending}
              isDisconnecting={disconnectCalendar.isPending}
              onConnect={() => authorizeCalendar.mutate()}
              onDisconnect={() => disconnectCalendar.mutate()}
            />
          </div>
        </>
      ) : null}
      {tab === "notifications" ? (
        <NotificationPreferencesCard role="trainer" />
      ) : null}
    </>
  );
}

function TrainerSettingsSkeleton() {
  return (
    <div aria-label="Loading trainer settings" aria-busy="true">
      <Skeleton className="h-16 w-full" />
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-28 w-full" />
        ))}
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Skeleton className="h-[420px] w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    </div>
  );
}
