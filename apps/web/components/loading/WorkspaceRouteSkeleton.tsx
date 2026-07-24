'use client';

import { useSearchParams } from 'next/navigation';
import { ContentLibrarySkeleton } from '@/components/admin/content/ContentLibrarySkeleton';
import {
  AdminDashboardSkeleton,
  EntrepreneurDashboardSkeleton,
  TrainerDashboardSkeleton,
} from '@/components/dashboard/DashboardSkeletons';
import { ProfilePageSkeleton } from '@/components/entrepreneur/profile/ProfileLoadingSkeletons';
import { EntrepreneurToolsPageSkeleton } from '@/components/entrepreneur/tools/EntrepreneurToolsSkeletons';
import {
  ProgrammePlayerPageSkeleton,
  TrainingLibrarySkeleton,
} from '@/components/entrepreneur/training/TrainingLibrarySkeletons';
import { HealthPageSkeleton } from '@/components/health/HealthPageSkeleton';
import { ReportingPageSkeleton } from '@/components/reporting/ReportingPageSkeleton';
import { Card, Skeleton, TableSkeleton } from '@/components/shared/Card';
import { contentLibraryTabFromQuery } from '@/lib/content-library-tabs';
import { entrepreneurProfileTabFromQuery } from '@/lib/entrepreneur-profile-tabs';
import { entrepreneurToolsTabFromQuery } from '@/lib/entrepreneur-tools-tabs';

export type SkeletonWorkspaceRole = 'admin' | 'trainer' | 'entrepreneur';

export function WorkspaceRouteSkeleton({
  role,
  pathname,
}: {
  role: SkeletonWorkspaceRole;
  pathname: string;
}) {
  const searchParams = useSearchParams();
  return (
    <WorkspaceRouteSkeletonContent
      role={role}
      pathname={pathname}
      tab={searchParams.get('tab')}
    />
  );
}

export function WorkspaceRouteSkeletonFallback({
  role,
  pathname,
}: {
  role: SkeletonWorkspaceRole;
  pathname: string;
}) {
  return (
    <WorkspaceRouteSkeletonContent
      role={role}
      pathname={pathname}
      tab={null}
    />
  );
}

function WorkspaceRouteSkeletonContent({
  role,
  pathname,
  tab,
}: {
  role: SkeletonWorkspaceRole;
  pathname: string;
  tab: string | null;
}) {
  if (pathname.endsWith('/dashboard')) {
    if (role === 'admin') return <AdminDashboardSkeleton />;
    if (role === 'trainer') return <TrainerDashboardSkeleton />;
    return <EntrepreneurDashboardSkeleton />;
  }

  if (pathname === '/admin/content') {
    return (
      <ContentLibrarySkeleton
        activeType={contentLibraryTabFromQuery(tab)}
      />
    );
  }

  if (pathname === '/entrepreneur/profile') {
    return (
      <ProfilePageSkeleton
        tab={entrepreneurProfileTabFromQuery(tab)}
      />
    );
  }

  if (pathname === '/entrepreneur/tools') {
    return (
      <EntrepreneurToolsPageSkeleton
        tab={entrepreneurToolsTabFromQuery(tab)}
      />
    );
  }

  if (pathname === '/entrepreneur/training') {
    return <TrainingLibrarySkeleton />;
  }

  if (/^\/entrepreneur\/training\/[^/]+/.test(pathname)) {
    return <ProgrammePlayerPageSkeleton />;
  }

  if (pathname === '/admin/reporting') return <ReportingPageSkeleton />;
  if (pathname === '/admin/health') return <HealthPageSkeleton />;

  if (
    /^\/(?:admin|trainer)\/program(?:s|mes)\/[^/]+/.test(pathname)
  ) {
    return (
      <ProgrammeDetailSkeleton
        tab={tab ?? (role === 'admin' ? 'curriculum' : 'overview')}
        trainer={role === 'trainer'}
      />
    );
  }

  if (pathname === '/entrepreneur/schedule') return <ScheduleSkeleton />;

  if (
    pathname.endsWith('/sessions') ||
    pathname.endsWith('/deliverable-reviews') ||
    pathname.endsWith('/tool-requests') ||
    pathname === '/entrepreneur/deliverables'
  ) {
    const title = pathname.endsWith('/sessions')
      ? 'Sessions'
      : pathname.endsWith('/tool-requests')
        ? 'Tool requests'
        : 'Deliverables';
    return <ManagementQueueSkeleton title={title} />;
  }

  if (/^\/entrepreneur\/deliverables\/[^/]+/.test(pathname)) {
    return <DeliverableDetailSkeleton />;
  }

  if (
    pathname.endsWith('/settings') &&
    (role === 'admin' || role === 'trainer')
  ) {
    return (
      <AccountSettingsSkeleton
        notifications={tab === 'notifications'}
      />
    );
  }

  if (pathname === '/admin/settings/company') {
    return <CompanySettingsSkeleton />;
  }

  const compact =
    pathname.startsWith('/admin/settings/');

  return (
    <DirectorySkeleton
      title={titleForPath(pathname)}
      metrics={!compact}
      columns={columnsForPath(pathname)}
    />
  );
}

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

function DirectorySkeleton({
  title,
  metrics = true,
  columns = 7,
}: {
  title: string;
  metrics?: boolean;
  columns?: number;
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
            <Skeleton className="h-3 w-64" />
          </div>
          <div className="flex flex-1 flex-wrap justify-end gap-2">
            <Skeleton className="h-10 w-full sm:w-64" />
            <Skeleton className="h-10 w-44" />
            <Skeleton className="h-10 w-44" />
          </div>
        </div>
        <TableSkeleton rows={7} columns={columns} />
        <Skeleton className="mt-4 h-14 w-full rounded-xl" />
      </Card>
    </div>
  );
}

function ManagementQueueSkeleton({ title }: { title: string }) {
  return (
    <div className="space-y-5" aria-label={`Loading ${title}`} aria-busy="true">
      <PageHeadingSkeleton />
      <MetricSkeletons />
      <Card>
        <div className="mb-4 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="mb-4 h-20 w-full rounded-xl" />
        <TableSkeleton rows={6} columns={7} />
        <Skeleton className="mt-4 h-14 w-full rounded-xl" />
      </Card>
    </div>
  );
}

function ProgrammeDetailSkeleton({
  tab,
  trainer,
}: {
  tab: string;
  trainer: boolean;
}) {
  const tableTab =
    tab === 'curriculum' || tab === 'deliverables' || tab === 'entrepreneurs';
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

function ScheduleSkeleton() {
  return (
    <div className="space-y-5" aria-label="Loading schedule" aria-busy="true">
      <PageHeadingSkeleton />
      <Card className="grid gap-5 xl:grid-cols-[390px_1fr]">
        <div className="space-y-4">
          <div className="flex justify-between">
            <Skeleton className="h-6 w-32" />
            <div className="flex gap-2"><Skeleton className="h-9 w-16" /><Skeleton className="h-9 w-20" /></div>
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
      <Card><Skeleton className="h-6 w-32" /><div className="mt-4 grid gap-4 lg:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-28 w-full" />)}</div></Card>
    </div>
  );
}

function AccountSettingsSkeleton({ notifications }: { notifications: boolean }) {
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
                {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-11 w-full" />)}
              </div>
              <Skeleton className="h-10 w-32" />
            </Card>
            <Card><Skeleton className="h-6 w-40" /><Skeleton className="mt-5 h-28 w-full" /></Card>
          </div>
        </>
      )}
    </div>
  );
}

function CompanySettingsSkeleton() {
  return (
    <div className="space-y-5" aria-label="Loading company settings" aria-busy="true">
      <PageHeadingSkeleton action={false} />
      <MetricSkeletons count={3} />
      {Array.from({ length: 4 }, (_, index) => (
        <Card key={index} className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full max-w-xl" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }, (_, field) => <Skeleton key={field} className="h-11 w-full" />)}
          </div>
        </Card>
      ))}
    </div>
  );
}

function DeliverableDetailSkeleton() {
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

function titleForPath(pathname: string) {
  const segment = pathname.split('/').filter(Boolean).at(-1) ?? 'workspace';
  return segment
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function columnsForPath(pathname: string) {
  if (pathname.includes('entrepreneur-tools')) return 8;
  if (pathname.endsWith('/entrepreneurs')) return 9;
  if (pathname.endsWith('/trainers')) return 8;
  if (pathname.endsWith('/admins')) return 6;
  if (pathname.endsWith('/programs') || pathname.endsWith('/programmes')) return 8;
  return 5;
}
