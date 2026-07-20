"use client";

import * as React from "react";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Notice } from "@/components/shared/PageHeader";
import { Card, CardHeader, Skeleton } from "@/components/shared/Card";
import { MetricGrid } from "@/components/shared/MetricGrid";
import { StatCard } from "@/components/shared/StatCard";
import { Button } from "@/components/shared/Button";
import { FormField, FormInput, FormRow2 } from "@/components/shared/FormField";
import { CalendarConnectionCard } from "@/components/settings/CalendarConnectionCard";
import { NotificationPreferencesCard } from "@/components/settings/NotificationPreferencesCard";
import { Tabs } from "@/components/shared/Tabs";
import {
  useAdminProfileQuery,
  useUpdateAdminProfileMutation,
} from "@/lib/api/admins";
import {
  useCalendarAuthorizationMutation,
  useCalendarConnectionQuery,
  useDisconnectCalendarMutation,
} from "@/lib/api/calendar";
import { adminProfileSchema, type AdminProfileForm } from "@/lib/forms/schemas";

type SettingsTab = "account" | "notifications";

function settingsTabFromQuery(value: string | null): SettingsTab {
  return value === "notifications" ? "notifications" : "account";
}

export default function AdminSettingsPage() {
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
  const profile = useAdminProfileQuery();
  const calendar = useCalendarConnectionQuery();
  const form = useForm<AdminProfileForm>({
    resolver: zodResolver(adminProfileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
    },
  });
  const updateProfile = useUpdateAdminProfileMutation({
    onSuccess: () => toast.success("Admin profile saved"),
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
    return <AdminSettingsSkeleton />;
  }

  if (tab === "account" && (profile.isError || calendar.isError || !profile.data)) {
    const error =
      profile.error?.message ??
      calendar.error?.message ??
      "Admin settings could not be loaded.";
    return (
      <>
        <PageHeader
          title="Admin settings"
          description="Manage the profile and calendar connection used when you own BID sessions."
        />
        <Card>
          <Notice>{error}</Notice>
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

  const connected = calendar.data?.connected ?? false;

  return (
    <>
      <PageHeader
        title="Admin settings"
        description="Manage the profile and calendar connection used when you own BID sessions."
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
          <MetricGrid>
            <StatCard
              label="Admin profile"
              value={profile.data.status === "active" ? "Active" : "Disabled"}
              subline="Administrator"
              dotColor={
                profile.data.status === "active" ? "success" : "warning"
              }
              accent={profile.data.status === "active" ? "success" : "warning"}
            />
            <StatCard
              label="Calendar"
              value={connected ? "Connected" : "Not connected"}
              subline="Google Meet sessions"
              dotColor={connected ? "success" : "warning"}
              accent={connected ? "success" : "warning"}
            />
          </MetricGrid>

          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
            <Card>
              <CardHeader
                title="Profile details"
                description="These details appear when you own sessions, send feedback, or manage operational work."
                actions={<UserRound className="h-5 w-5 text-ink-faint" />}
              />
              <form
                onSubmit={form.handleSubmit((values) =>
                  updateProfile.mutate({
                    firstName: values.firstName.trim(),
                    lastName: values.lastName.trim(),
                    phone: values.phone?.trim() || undefined,
                  }),
                )}
                className="space-y-4"
              >
                <FormRow2>
                  <FormField
                    label="First name"
                    error={form.formState.errors.firstName?.message}
                    className="mb-0"
                  >
                    <FormInput {...form.register("firstName")} />
                  </FormField>
                  <FormField
                    label="Last name"
                    error={form.formState.errors.lastName?.message}
                    className="mb-0"
                  >
                    <FormInput {...form.register("lastName")} />
                  </FormField>
                </FormRow2>

                <FormRow2>
                  <FormField label="Email" className="mb-0">
                    <FormInput
                      type="email"
                      value={profile.data.email}
                      disabled
                    />
                  </FormField>
                  <FormField
                    label="Phone number"
                    optional
                    error={form.formState.errors.phone?.message}
                    className="mb-0"
                  >
                    <FormInput {...form.register("phone")} />
                  </FormField>
                </FormRow2>

                <FormField label="Role">
                  <FormInput value="Admin" disabled />
                </FormField>

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

            <div className="space-y-4">
              <Card>
                <CardHeader
                  title="Session ownership"
                  description="Admins with a connected Google Calendar can accept open BID team session requests and create Google Meet events."
                  actions={<ShieldCheck className="h-5 w-5 text-ink-faint" />}
                />
                <div className="rounded-xl bg-surface-subtle px-4 py-3 text-sm leading-6 text-ink-muted">
                  Calendar authentication is required before an admin can own a
                  confirmed Google Meet session.
                </div>
              </Card>
              <CalendarConnectionCard
                connected={connected}
                accountEmail={calendar.data?.accountEmail ?? profile.data.email}
                isConnecting={authorizeCalendar.isPending}
                isDisconnecting={disconnectCalendar.isPending}
                onConnect={() => authorizeCalendar.mutate()}
                onDisconnect={() => disconnectCalendar.mutate()}
              />
            </div>
          </div>
        </>
      ) : null}
      {tab === "notifications" ? (
        <NotificationPreferencesCard role="admin" />
      ) : null}
    </>
  );
}

function AdminSettingsSkeleton() {
  return (
    <>
      <PageHeader
        title="Admin settings"
        description="Manage the profile and calendar connection used when you own BID sessions."
      />
      <MetricGrid>
        {Array.from({ length: 2 }, (_, index) => (
          <Card key={index}>
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-4 h-9 w-28" />
            <Skeleton className="mt-3 h-4 w-36" />
          </Card>
        ))}
      </MetricGrid>
      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-3 h-4 w-3/4" />
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-11 w-full" />
            ))}
          </div>
          <Skeleton className="mt-4 h-11 w-full" />
        </Card>
        <div className="space-y-4">
          <Card>
            <Skeleton className="h-6 w-36" />
            <Skeleton className="mt-4 h-20 w-full" />
          </Card>
          <Card>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="mt-4 h-24 w-full" />
            <Skeleton className="mt-4 h-10 w-44" />
          </Card>
        </div>
      </div>
    </>
  );
}
