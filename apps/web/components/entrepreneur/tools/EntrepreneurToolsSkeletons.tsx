import { Card, Skeleton } from "@/components/shared/Card";
import { PageHeader } from "@/components/shared/PageHeader";
import type { EntrepreneurToolsTab } from "@/lib/entrepreneur-tools-tabs";

function TabsSkeleton({ activeTab }: { activeTab: EntrepreneurToolsTab }) {
  const widths = [86, 112, 132, 102, 104];
  const activeIndex = ["all", "pdf", "excel", "online", "requests"].indexOf(
    activeTab,
  );

  return (
    <div
      aria-label="Loading tool categories"
      aria-busy="true"
      className="mb-4 flex min-h-12 w-fit max-w-full gap-1 overflow-hidden rounded-xl border border-border bg-card p-1"
    >
      {widths.map((width, index) => (
        <Skeleton
          key={width}
          className={index === activeIndex ? "h-9 bg-bid-light" : "h-9"}
          style={{ width }}
        />
      ))}
    </div>
  );
}

export function ToolsPaginationSkeleton() {
  return (
    <div
      aria-label="Loading pagination"
      aria-busy="true"
      className="mt-4 flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <Skeleton className="h-4 w-28" />
      <div className="flex items-center gap-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-8 rounded-lg" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
    </div>
  );
}

export function ToolGridSkeleton({ cards = 9 }: { cards?: number }) {
  return (
    <div
      aria-label="Loading entrepreneur tools"
      aria-busy="true"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
    >
      {Array.from({ length: cards }, (_, index) => (
        <div
          key={index}
          className="flex min-h-[150px] flex-col rounded-xl border border-border bg-card p-5"
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-4/5" />
        </div>
      ))}
    </div>
  );
}

export function ToolRequestTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div
      aria-label="Loading tool requests"
      aria-busy="true"
      className="overflow-x-auto rounded-xl border border-border bg-card"
    >
      <div className="min-w-[920px]">
        <div className="grid grid-cols-[64px_minmax(280px,1.5fr)_150px_180px_180px] gap-5 border-b border-line bg-surface-subtle/80 px-5 py-4">
          {["Action", "Request", "Tool area", "Timeline", "Status"].map(
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
            className="grid min-h-[76px] grid-cols-[64px_minmax(280px,1.5fr)_150px_180px_180px] items-center gap-5 border-b border-line/80 px-5 py-3 last:border-0"
          >
            <Skeleton className="h-9 w-9 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-52" />
              <Skeleton className="h-3 w-4/5" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-6 w-28 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

function CatalogueToolbarSkeleton() {
  return (
    <div className="mb-4 flex flex-col gap-3 rounded-xl border border-border bg-surface-subtle p-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-48" />
      </div>
      <Skeleton className="h-9 w-full sm:w-[320px]" />
    </div>
  );
}

function RequestsHeaderSkeleton() {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div className="space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Skeleton className="h-6 w-24 rounded-full" />
    </div>
  );
}

function RequestsToolbarSkeleton() {
  return (
    <div className="mb-4 flex flex-col gap-3 rounded-xl border border-border bg-surface-subtle p-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-64 max-w-full" />
      </div>
      <div className="grid w-full gap-2 lg:w-auto lg:grid-cols-[260px_180px_180px]">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    </div>
  );
}

export function ToolsCataloguePanelSkeleton({
  includeToolbar = true,
  cards = 9,
}: {
  includeToolbar?: boolean;
  cards?: number;
}) {
  return (
    <Card>
      {includeToolbar ? <CatalogueToolbarSkeleton /> : null}
      <ToolGridSkeleton cards={cards} />
      <ToolsPaginationSkeleton />
    </Card>
  );
}

export function ToolRequestsPanelSkeleton({
  includeChrome = true,
  rows = 5,
}: {
  includeChrome?: boolean;
  rows?: number;
}) {
  return (
    <Card>
      {includeChrome ? (
        <>
          <RequestsHeaderSkeleton />
          <RequestsToolbarSkeleton />
        </>
      ) : null}
      <ToolRequestTableSkeleton rows={rows} />
      <ToolsPaginationSkeleton />
    </Card>
  );
}

export function EntrepreneurToolsPageSkeleton({
  tab,
}: {
  tab: EntrepreneurToolsTab;
}) {
  return (
    <>
      <PageHeader
        title="Entrepreneur Tools"
        description="PDF resources, Excel workbooks, and online tools available to your business"
        actions={<Skeleton className="h-9 w-36" />}
      />
      <TabsSkeleton activeTab={tab} />
      {tab === "requests" ? (
        <ToolRequestsPanelSkeleton />
      ) : (
        <ToolsCataloguePanelSkeleton />
      )}
    </>
  );
}
