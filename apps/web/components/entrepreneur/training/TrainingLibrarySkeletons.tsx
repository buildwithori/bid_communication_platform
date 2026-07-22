'use client';

import { Card, Skeleton } from '@/components/shared/Card';
import { PageHeader } from '@/components/shared/PageHeader';
import { ProgrammeCoursePlayerSkeleton } from '@/components/learning/ProgrammeCoursePlayer';

const catalogueColumns = [
  'w-12',
  'min-w-[250px]',
  'w-28',
  'w-24',
  'min-w-[160px]',
  'min-w-[220px]',
  'min-w-[150px]',
] as const;

export function TrainingLibrarySkeleton() {
  return (
    <div aria-label="Loading training library" aria-busy="true">
      <PageHeader
        title="Training Library"
        description="Continue your programme learning and use free BID programmes anytime."
      />

      <Card padding="lg" className="mb-4">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0">
            <div className="mb-3 flex gap-2">
              <Skeleton className="h-6 w-28 rounded-full" />
              <Skeleton className="h-6 w-32 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <Skeleton className="h-8 w-full max-w-lg" />
            <div className="mt-3 space-y-2">
              <Skeleton className="h-4 w-full max-w-3xl" />
              <Skeleton className="h-4 w-4/5 max-w-2xl" />
            </div>

            <div className="mt-5 max-w-2xl">
              <div className="mb-2 flex justify-between gap-3">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-2.5 w-full rounded-full" />
            </div>

            <div className="mt-5 rounded-xl border border-line bg-surface-subtle px-4 py-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-2 h-5 w-64 max-w-full" />
              <Skeleton className="mt-2 h-4 w-80 max-w-full" />
            </div>

            <div className="mt-5 flex gap-2">
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-10 w-48" />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            {Array.from({ length: 3 }, (_, index) => (
              <div
                key={index}
                className="rounded-xl border border-line bg-surface-subtle p-4"
              >
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-3 h-7 w-12" />
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index} className="space-y-2 border-t-[3px] border-t-line">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-40 max-w-full" />
          </Card>
        ))}
      </div>

      <CatalogueSkeleton />
    </div>
  );
}

function CatalogueSkeleton() {
  return (
    <Card>
      <Skeleton className="h-5 w-40" />
      <Skeleton className="mt-2 h-4 w-56" />

      <div className="mt-4 flex flex-wrap items-start gap-3 rounded-xl border border-border bg-surface-subtle/70 p-3">
        <div className="min-w-[220px] flex-1">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="mt-2 h-4 w-full max-w-md" />
        </div>
        <div className="grid w-full gap-2 lg:w-[720px] lg:grid-cols-[minmax(220px,1fr)_190px_180px]">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <div className="min-w-[1180px]">
            <div className="grid grid-cols-[84px_minmax(300px,1fr)_140px_110px_200px_290px_180px] gap-4 border-b border-line bg-surface-subtle/80 px-5 py-3">
              {catalogueColumns.map((width, index) => (
                <Skeleton key={index} className={`h-3 ${width}`} />
              ))}
            </div>
            {Array.from({ length: 6 }, (_, row) => (
              <div
                key={row}
                className="grid min-h-[92px] grid-cols-[84px_minmax(300px,1fr)_140px_110px_200px_290px_180px] items-center gap-4 border-b border-line/80 px-5 py-4 last:border-b-0"
              >
                <Skeleton className="h-9 w-9" />
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/5" />
                    <Skeleton className="h-3 w-4/5" />
                  </div>
                </div>
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-2 w-36 rounded-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="flex gap-1.5">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-4 w-40" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-9 w-9" />
        </div>
      </div>
    </Card>
  );
}

export function ProgrammePlayerPageSkeleton() {
  return (
    <div aria-label="Loading programme" aria-busy="true">
      <div className="mb-4 flex items-center gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-44" />
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <Skeleton className="h-9 w-full max-w-lg" />
          <Skeleton className="mt-3 h-4 w-full max-w-3xl" />
          <Skeleton className="mt-2 h-4 w-3/5 max-w-xl" />
        </div>
        <Skeleton className="h-10 w-44 shrink-0" />
      </div>

      <Card padding="lg" accent="bid" className="mb-4">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <div>
            <div className="flex gap-2">
              <Skeleton className="h-6 w-32 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <div className="mt-4 flex justify-between gap-3">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="mt-2 h-2.5 w-full rounded-full" />
            <Skeleton className="mt-3 h-4 w-44" />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="min-w-[104px] rounded-xl border border-line bg-surface-subtle px-3 py-3"
              >
                <Skeleton className="h-4 w-4" />
                <Skeleton className="mt-2 h-7 w-10" />
                <Skeleton className="mt-1 h-3 w-14" />
              </div>
            ))}
          </div>
        </div>
      </Card>

      <ProgrammeCoursePlayerSkeleton />

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-3 h-4 w-full max-w-3xl" />
          <Skeleton className="mt-2 h-4 w-4/5 max-w-2xl" />
        </Card>
        <Card>
          <Skeleton className="h-5 w-36" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-4/5" />
          <Skeleton className="mt-4 h-10 w-full" />
        </Card>
      </div>
    </div>
  );
}
