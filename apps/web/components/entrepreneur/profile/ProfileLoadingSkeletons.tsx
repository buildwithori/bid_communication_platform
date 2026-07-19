"use client";

import { Card, Skeleton } from "@/components/shared/Card";
import type { EntrepreneurProfileTab } from "@/lib/entrepreneur-profile-tabs";
import { cn } from "@/lib/utils";

export type ProfileRecordsSkeletonKind = "goals" | "funding" | "updates";

export function ProfilePageSkeleton({
  tab = "business",
}: {
  tab?: EntrepreneurProfileTab;
}) {
  return (
    <div
      aria-label={"Loading " + tab.replaceAll("-", " ") + " profile tab"}
      aria-busy="true"
      className="space-y-4"
    >
      <ProfileHeroSkeleton />
      <ProfileTabsSkeleton tab={tab} />
      {tab === "business" ? <BusinessDetailsSkeleton /> : null}
      {tab === "notifications" ? <NotificationPreferencesSkeleton /> : null}
      {tab === "goals" || tab === "funding" || tab === "updates" ? (
        <RecordsPageSkeleton kind={tab} />
      ) : null}
    </div>
  );
}

export function ProfileRecordsSkeleton({
  kind,
}: {
  kind: ProfileRecordsSkeletonKind;
}) {
  const widths = {
    goals: [64, 132, 148, 112, 260, 120],
    funding: [64, 152, 124, 112, 144, 170, 170],
    updates: [64, 210, 124, 170, 132, 260],
  }[kind];
  const template = widths.map((width) => String(width) + "px").join(" ");
  const minWidth = widths.reduce((total, width) => total + width, 0);

  return (
    <div
      aria-label={"Loading " + kind}
      aria-busy="true"
      className="overflow-x-auto rounded-xl border border-border bg-card"
    >
      <div style={{ minWidth }}>
        <div
          className="grid gap-4 border-b border-line bg-surface-subtle/80 p-4"
          style={{ gridTemplateColumns: template }}
        >
          {widths.map((width, index) => (
            <Skeleton
              key={index}
              className="h-3"
              style={{ width: Math.min(width * 0.55, 112) }}
            />
          ))}
        </div>
        {Array.from({ length: 5 }, (_, row) => (
          <div
            key={row}
            className="grid min-h-16 items-center gap-4 border-b border-line/80 p-4 last:border-0"
            style={{ gridTemplateColumns: template }}
          >
            {widths.map((width, column) => (
              <Skeleton
                key={column}
                className={column === 0 ? "h-9 w-9" : "h-4"}
                style={
                  column === 0
                    ? undefined
                    : { width: Math.min(width * (row % 2 ? 0.58 : 0.72), 180) }
                }
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfileHeroSkeleton() {
  return (
    <section className="rounded-2xl border border-border bg-surface-panel p-5 shadow-sm">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <Skeleton className="h-[68px] w-[68px] shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2.5">
          <Skeleton className="h-7 w-52 max-w-full" />
          <Skeleton className="h-4 w-64 max-w-full" />
          <div className="flex gap-2 pt-1">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-28 rounded-full" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-[72px] w-[120px]" />
          <Skeleton className="h-[72px] w-[120px]" />
        </div>
      </div>
    </section>
  );
}

function ProfileTabsSkeleton({ tab }: { tab: EntrepreneurProfileTab }) {
  const tabs: Array<{ tab: EntrepreneurProfileTab; width: number }> = [
    { tab: "business", width: 136 },
    { tab: "goals", width: 138 },
    { tab: "funding", width: 142 },
    { tab: "updates", width: 132 },
    { tab: "notifications", width: 112 },
  ];

  return (
    <div className="flex w-fit max-w-full gap-1 overflow-hidden rounded-xl border border-border bg-card p-1 shadow-sm">
      {tabs.map((item) => (
        <Skeleton
          key={item.tab}
          className={cn(
            "h-9 shrink-0",
            item.tab === tab && "bg-bid/25 dark:bg-bid/35",
          )}
          style={{ width: item.width }}
        />
      ))}
    </div>
  );
}

function RecordsPageSkeleton({ kind }: { kind: ProfileRecordsSkeletonKind }) {
  return (
    <Card>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-8 w-28" />
      </div>
      <div className="mb-4 flex flex-col gap-3 rounded-xl border border-line bg-surface-subtle p-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-72 max-w-full" />
        </div>
        <Skeleton className="h-9 w-full md:w-72" />
      </div>
      <ProfileRecordsSkeleton kind={kind} />
    </Card>
  );
}

function NotificationPreferencesSkeleton() {
  return (
    <Card>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-[520px] max-w-full" />
        </div>
        <Skeleton className="h-5 w-5 rounded-full" />
      </div>
      <div className="overflow-hidden rounded-xl border border-line">
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
    </Card>
  );
}

function BusinessDetailsSkeleton() {
  return (
    <Card className="min-h-[570px]">
      <div className="mb-5 space-y-2">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="max-w-[780px] space-y-4">
        <FieldSkeleton />
        <div className="grid gap-3 sm:grid-cols-2">
          <FieldSkeleton />
          <FieldSkeleton />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <FieldSkeleton />
          <FieldSkeleton />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <FieldSkeleton />
          <FieldSkeleton />
        </div>
        <FieldSkeleton />
        <Skeleton className="h-[88px] w-full rounded-xl" />
        <Skeleton className="h-10 w-32" />
      </div>
    </Card>
  );
}

function FieldSkeleton() {
  return (
    <div className="space-y-1.5">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}
