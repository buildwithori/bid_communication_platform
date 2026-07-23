import { Card, Skeleton } from "@/components/shared/Card";

export function HealthPageSkeleton() {
  return (
    <div aria-label="Loading system health" aria-busy="true" className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-5 w-full max-w-xl sm:w-[520px]" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>

      <Card className="relative overflow-hidden">
        <div className="flex min-h-44 flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div className="space-y-3">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-10 w-72 max-w-full" />
            <Skeleton className="h-4 w-64 max-w-full" />
          </div>
          <Skeleton className="h-28 w-28 shrink-0 rounded-full" />
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index} className="space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-48 max-w-full" />
            <Skeleton className="h-3 w-24" />
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.8fr)]">
        <Card className="space-y-4">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-4 w-72 max-w-full" />
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </Card>
        <div className="space-y-4">
          <Card className="space-y-4">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </Card>
          <Card className="space-y-4">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-24 w-full" />
          </Card>
        </div>
      </div>
    </div>
  );
}
