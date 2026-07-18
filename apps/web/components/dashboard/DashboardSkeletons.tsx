import { Skeleton } from "@/components/shared/Card";
import { cn } from "@/lib/utils";

type DashboardRole = "admin" | "trainer" | "entrepreneur";

function DashboardSkeleton({ role }: { role: DashboardRole }) {
  if (role === "admin") return <AdminLayout />;
  if (role === "trainer") return <TrainerLayout />;
  return <EntrepreneurLayout />;
}

function HeadingSkeleton({ actions = 0 }: { actions?: number }) {
  return (
    <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-2">
        <Skeleton className="h-7 w-56 max-w-[70vw]" />
        <Skeleton className="h-4 w-[420px] max-w-full" />
      </div>
      {actions > 0 ? (
        <div className="flex gap-2">
          {Array.from({ length: actions }, (_, index) => (
            <Skeleton key={index} className="h-10 w-32" />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MetricsSkeleton({ count }: { count: 3 | 4 }) {
  return (
    <div className={cn("grid gap-4", count === 3 ? "md:grid-cols-3" : "md:grid-cols-2 xl:grid-cols-4")}>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="relative overflow-hidden rounded-xl border border-border bg-surface-panel px-5 py-4 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-0.5 bg-muted" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-2.5 w-2.5 rounded-full" />
            <Skeleton className="h-3.5 w-24" />
          </div>
          <Skeleton className="mt-3 h-8 w-20" />
          <Skeleton className="mt-2 h-3 w-36 max-w-full" />
        </div>
      ))}
    </div>
  );
}

function PanelSkeleton({ className, rows = 0 }: { className?: string; rows?: number }) {
  return (
    <section className={cn("rounded-xl border border-border bg-surface-panel p-5 shadow-sm", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-64 max-w-full" />
        </div>
        <Skeleton className="h-7 w-20" />
      </div>
      {rows > 0 ? (
        <div className="mt-5 space-y-3">
          {Array.from({ length: rows }, (_, index) => (
            <div key={index} className="flex items-center gap-3 rounded-lg bg-muted/55 p-3">
              <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-3.5 w-3/5" />
                <Skeleton className="h-3 w-2/5" />
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </div>
      ) : (
        <div className="relative mt-5 h-[250px] overflow-hidden rounded-lg bg-muted/30 px-4 pb-4 pt-6">
          <div className="absolute inset-x-4 top-1/4 h-px bg-line/60" />
          <div className="absolute inset-x-4 top-2/4 h-px bg-line/60" />
          <div className="absolute inset-x-4 top-3/4 h-px bg-line/60" />
          <div className="flex h-full items-end gap-3">
            {[42, 68, 54, 82, 62, 88, 72].map((height, index) => (
              <Skeleton key={index} className="flex-1 rounded-b-none rounded-t-md" style={{ height: `${height}%` }} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function TablePanelSkeleton() {
  return (
    <section className="mt-4 overflow-hidden rounded-xl border border-border bg-surface-panel shadow-sm">
      <div className="flex flex-col gap-4 border-b border-border p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2"><Skeleton className="h-4 w-36" /><Skeleton className="h-3 w-72 max-w-full" /></div>
        <div className="flex flex-wrap gap-2"><Skeleton className="h-10 w-56" /><Skeleton className="h-10 w-40" /><Skeleton className="h-10 w-40" /></div>
      </div>
      <div className="divide-y divide-border">
        <div className="grid grid-cols-4 gap-5 bg-muted/45 px-5 py-3">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-3 w-20" />)}</div>
        {Array.from({ length: 5 }, (_, row) => (
          <div key={row} className="grid grid-cols-4 gap-5 px-5 py-4">{Array.from({ length: 4 }, (_, col) => <Skeleton key={col} className="h-4 w-full max-w-32" />)}</div>
        ))}
      </div>
    </section>
  );
}

function AdminLayout() {
  return <><HeadingSkeleton /><MetricsSkeleton count={4} /><div className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_0.85fr]"><PanelSkeleton className="min-h-[380px]" /><PanelSkeleton className="min-h-[380px]" /></div><div className="mt-4 grid gap-4 xl:grid-cols-[1fr_0.9fr]"><PanelSkeleton className="min-h-[430px]" /><PanelSkeleton className="min-h-[430px]" rows={4} /></div><TablePanelSkeleton /></>;
}

function TrainerLayout() {
  return <><HeadingSkeleton /><MetricsSkeleton count={4} /><div className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]"><PanelSkeleton className="min-h-[380px]" /><PanelSkeleton className="min-h-[380px]" /></div><div className="mt-4 grid gap-4 xl:grid-cols-2"><PanelSkeleton className="min-h-[330px]" /><PanelSkeleton className="min-h-[330px]" /></div><PanelSkeleton className="mt-4 min-h-[245px]" rows={3} /></>;
}

function EntrepreneurLayout() {
  return <><HeadingSkeleton actions={2} /><MetricsSkeleton count={3} /><div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]"><PanelSkeleton className="min-h-[360px]" /><PanelSkeleton className="min-h-[360px]" rows={4} /></div><div className="mt-4 grid gap-4 xl:grid-cols-[minmax(360px,0.85fr)_minmax(0,1.15fr)]"><PanelSkeleton className="min-h-[240px]" rows={2} /><PanelSkeleton className="min-h-[240px]" rows={2} /></div></>;
}

export function AdminDashboardSkeleton() {
  return <div aria-label="Loading admin dashboard" aria-busy="true"><DashboardSkeleton role="admin" /></div>;
}
export function TrainerDashboardSkeleton() {
  return <div aria-label="Loading trainer dashboard" aria-busy="true"><DashboardSkeleton role="trainer" /></div>;
}
export function EntrepreneurDashboardSkeleton() {
  return <div aria-label="Loading entrepreneur dashboard" aria-busy="true"><DashboardSkeleton role="entrepreneur" /></div>;
}
