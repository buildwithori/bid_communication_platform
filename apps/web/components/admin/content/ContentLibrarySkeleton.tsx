import * as React from "react";
import type { ContentItemType } from "@/lib/api/content";
import { Card, Skeleton } from "@/components/shared/Card";
import { PageHeader } from "@/components/shared/PageHeader";

const typeLabels: Record<ContentItemType, string> = {
  video: "videos",
  pdf: "PDFs",
  excel: "Excel workbooks",
  tool: "tools",
};

export function ContentLibrarySkeleton({
  activeType,
}: {
  activeType: ContentItemType;
}) {
  return (
    <>
      <PageHeader
        title="Content library"
        description="Upload once, reuse across programme modules, and keep trainer attribution in one place."
        actions={<Skeleton className="h-9 w-36" />}
      />
      <div
        aria-label="Loading content categories"
        aria-busy="true"
        className="mb-4 flex h-12 w-full max-w-md items-center gap-2 rounded-xl border border-border bg-card p-1"
      >
        {[96, 82, 88, 86].map((width, index) => (
          <Skeleton
            key={index}
            className="h-9"
            style={{ width: `${width}px` }}
          />
        ))}
      </div>
      <Card>
        <div className="mb-4 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-border bg-surface-subtle p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-52" />
          </div>
          <Skeleton className="h-9 w-full sm:w-[340px]" />
        </div>
        <ContentTableSkeleton type={activeType} rows={10} />
        <ContentPaginationSkeleton />
      </Card>
    </>
  );
}

export function ContentTableSkeleton({
  type,
  rows,
}: {
  type: ContentItemType;
  rows: number;
}) {
  const assetWidth = {
    video: "w-28",
    pdf: "w-44",
    excel: "w-48",
    tool: "w-52",
  }[type];

  return (
    <div
      aria-label={`Loading ${typeLabels[type]} content`}
      aria-busy="true"
      className="overflow-x-auto rounded-xl border border-border bg-card"
    >
      <div className="min-w-[1040px]">
        <div className="grid grid-cols-[64px_minmax(280px,1.35fr)_minmax(190px,1fr)_minmax(180px,1fr)_minmax(170px,0.8fr)] gap-4 border-b border-line bg-surface-subtle/80 px-5 py-4">
          {["Action", "Content", "Trainer owner", "Asset", "Used in"].map(
            (label) => (
              <span
                key={label}
                className="text-xs font-medium uppercase tracking-wide text-ink-faint"
              >
                {label}
              </span>
            ),
          )}
        </div>
        {Array.from({ length: rows }, (_, index) => (
          <div
            key={index}
            className="grid min-h-[80px] grid-cols-[64px_minmax(280px,1.35fr)_minmax(190px,1fr)_minmax(180px,1fr)_minmax(170px,0.8fr)] items-center gap-4 border-b border-line/80 px-5 py-3 last:border-0"
          >
            <Skeleton className="h-9 w-9 rounded-lg" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
              <div className="min-w-0 space-y-2">
                <Skeleton className="h-4 w-44" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-40" />
            </div>
            <div className="space-y-2">
              <Skeleton className={`h-4 ${assetWidth}`} />
              <Skeleton className="h-3 w-28" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ContentPaginationSkeleton() {
  return (
    <div
      aria-label="Loading content pagination"
      aria-busy="true"
      className="mt-4 flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <Skeleton className="h-4 w-28" />
      <div className="flex items-center gap-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-[76px]" />
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-8" />
      </div>
    </div>
  );
}
