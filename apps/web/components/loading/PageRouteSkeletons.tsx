import { Card, Skeleton, TableSkeleton } from '@/components/shared/Card';
import { AuthShell } from '@/components/auth/AuthShell';

function PageHeadingSkeleton({ action = true }: { action?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56 max-w-[65vw]" />
        <Skeleton className="h-4 w-[480px] max-w-[80vw]" />
      </div>
      {action ? <Skeleton className="h-10 w-32 shrink-0" /> : null}
    </div>
  );
}

function MetricSkeletons({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid gap-4 sm:grid-cols-2 ${count > 2 ? 'xl:grid-cols-4' : ''}`}>
      {Array.from({ length: count }, (_, index) => (
        <Card key={index} className="space-y-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-3 w-36" />
        </Card>
      ))}
    </div>
  );
}

export function DirectoryPageSkeleton({
  title,
  metrics = true,
  columns = 7,
  filters = 3,
}: {
  title: string;
  metrics?: boolean;
  columns?: number;
  filters?: number;
}) {
  return (
    <div className="space-y-5" aria-label={`Loading ${title}`} aria-busy="true">
      <PageHeadingSkeleton />
      {metrics ? <MetricSkeletons /> : null}
      <Card>
        <div className="mb-4 space-y-2">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-border bg-muted/40 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-64 max-w-full" />
          </div>
          <div className="flex flex-1 flex-wrap justify-end gap-2">
            <Skeleton className="h-10 w-full sm:w-64" />
            {Array.from({ length: Math.max(0, filters - 1) }, (_, index) => (
              <Skeleton key={index} className="h-10 w-44" />
            ))}
          </div>
        </div>
        <TableSkeleton rows={7} columns={columns} />
        <Skeleton className="mt-4 h-14 w-full rounded-xl" />
      </Card>
    </div>
  );
}

export function ManagementQueuePageSkeleton({
  title,
  columns = 7,
  metrics = 4,
}: {
  title: string;
  columns?: number;
  metrics?: number;
}) {
  return (
    <div className="space-y-5" aria-label={`Loading ${title}`} aria-busy="true">
      <PageHeadingSkeleton />
      <MetricSkeletons count={metrics} />
      <Card>
        <div className="mb-4 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="mb-4 h-20 w-full rounded-xl" />
        <TableSkeleton rows={6} columns={columns} />
        <Skeleton className="mt-4 h-14 w-full rounded-xl" />
      </Card>
    </div>
  );
}

export function ProgrammeDetailPageSkeleton({
  tab,
  trainer = false,
}: {
  tab: string;
  trainer?: boolean;
}) {
  const tableTab =
    tab === 'curriculum' ||
    tab === 'deliverables' ||
    tab === 'entrepreneurs' ||
    tab === 'readiness';
  return (
    <div className="space-y-4" aria-label="Loading programme workspace" aria-busy="true">
      <div className="space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Card className="space-y-5" accent="bid" padding="lg">
        <div className="flex justify-between gap-5">
          <div className="flex-1 space-y-3">
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-32 rounded-full" />
            </div>
            <Skeleton className="h-8 w-full max-w-xl" />
            <Skeleton className="h-4 w-full max-w-3xl" />
          </div>
          <Skeleton className="hidden h-28 w-64 xl:block" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-24 w-full" />
          ))}
        </div>
      </Card>
      <Card>
        <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row">
          <div className="space-y-2">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </div>
          <Skeleton className="h-11 w-full lg:w-[520px]" />
        </div>
        {tab === 'preview' ? (
          <Skeleton className="h-[560px] w-full" />
        ) : tableTab ? (
          <>
            <Skeleton className="mb-4 h-20 w-full" />
            <TableSkeleton rows={6} columns={trainer ? 6 : 5} />
          </>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-28 w-full" />
              ))}
            </div>
            <Skeleton className="h-60 w-full" />
          </div>
        )}
      </Card>
    </div>
  );
}

export function SchedulePageSkeleton() {
  return (
    <div className="space-y-5" aria-label="Loading schedule" aria-busy="true">
      <PageHeadingSkeleton />
      <Card className="grid gap-5 xl:grid-cols-[390px_1fr]">
        <div className="space-y-4">
          <div className="flex justify-between">
            <Skeleton className="h-6 w-32" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-16" />
              <Skeleton className="h-9 w-20" />
            </div>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 42 }, (_, index) => (
              <Skeleton key={index} className="aspect-square w-full rounded-lg" />
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-6 w-44" />
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-28 w-full" />
          ))}
        </div>
      </Card>
      <Card>
        <Skeleton className="h-6 w-32" />
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-28 w-full" />
          ))}
        </div>
      </Card>
    </div>
  );
}

export function AccountSettingsPageSkeleton({
  notifications,
}: {
  notifications: boolean;
}) {
  return (
    <div className="space-y-5" aria-label="Loading settings" aria-busy="true">
      <PageHeadingSkeleton action={false} />
      <Skeleton className="h-11 w-72" />
      {notifications ? (
        <Card>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="mt-2 h-4 w-96 max-w-full" />
          <div className="mt-5 space-y-1">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-20 w-full" />
            ))}
          </div>
        </Card>
      ) : (
        <>
          <MetricSkeletons count={3} />
          <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
            <Card className="space-y-4">
              <Skeleton className="h-6 w-40" />
              <div className="grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 6 }, (_, index) => (
                  <Skeleton key={index} className="h-11 w-full" />
                ))}
              </div>
              <Skeleton className="h-10 w-32" />
            </Card>
            <Card>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="mt-5 h-28 w-full" />
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

export function CompanySettingsPageSkeleton() {
  return (
    <div className="space-y-5" aria-label="Loading company settings" aria-busy="true">
      <PageHeadingSkeleton action={false} />
      <MetricSkeletons count={3} />
      {Array.from({ length: 4 }, (_, index) => (
        <Card key={index} className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full max-w-xl" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }, (_, field) => (
              <Skeleton key={field} className="h-11 w-full" />
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

export function DeliverableDetailPageSkeleton() {
  return (
    <div className="space-y-5" aria-label="Loading deliverable details" aria-busy="true">
      <Skeleton className="h-5 w-52" />
      <PageHeadingSkeleton />
      <MetricSkeletons count={3} />
      <Card>
        <Skeleton className="h-20 w-full" />
        <TableSkeleton className="mt-4" rows={5} columns={5} />
      </Card>
    </div>
  );
}

export function AuthPageSkeleton({
  fields = 4,
  splitFields = false,
}: {
  fields?: number;
  splitFields?: boolean;
}) {
  return (
    <div className="space-y-5" aria-label="Loading authentication page" aria-busy="true">
      <Skeleton className="h-6 w-44 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-9 w-4/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <Skeleton className="h-12 w-full" />
      <div className={splitFields ? 'grid gap-4 sm:grid-cols-2' : 'space-y-4'}>
        {Array.from({ length: fields }, (_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-11 w-full" />
          </div>
        ))}
      </div>
      <Skeleton className="h-11 w-full" />
    </div>
  );
}

export function AuthRoutePageSkeleton({
  title,
  fields = 4,
  splitFields = false,
}: {
  title: string;
  fields?: number;
  splitFields?: boolean;
}) {
  return (
    <AuthShell title={title}>
      <AuthPageSkeleton fields={fields} splitFields={splitFields} />
    </AuthShell>
  );
}

export function LegalPageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-5 py-10" aria-label="Loading document" aria-busy="true">
      <Skeleton className="h-10 w-2/3 max-w-xl" />
      <Skeleton className="h-5 w-1/3" />
      {Array.from({ length: 5 }, (_, index) => (
        <Card key={index} className="space-y-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-4/5" />
        </Card>
      ))}
    </div>
  );
}
