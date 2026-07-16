import { Skeleton } from "@/components/shared/Card";

function DashboardSkeleton({ metrics }: { metrics: number }) {
  return (
    <div aria-label="Loading dashboard" className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className={metrics === 4 ? "grid gap-4 md:grid-cols-2 xl:grid-cols-4" : "grid gap-4 md:grid-cols-3"}>
        {Array.from({ length: metrics }, (_, index) => (
          <Skeleton key={index} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-[380px] rounded-xl" />
        <Skeleton className="h-[380px] rounded-xl" />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-[320px] rounded-xl" />
        <Skeleton className="h-[320px] rounded-xl" />
      </div>
    </div>
  );
}

export function AdminDashboardSkeleton() {
  return <DashboardSkeleton metrics={4} />;
}
export function TrainerDashboardSkeleton() {
  return <DashboardSkeleton metrics={4} />;
}
export function EntrepreneurDashboardSkeleton() {
  return <DashboardSkeleton metrics={3} />;
}
