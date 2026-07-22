'use client';

import { useDebouncedValue } from '@/lib/search';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  BookOpen,
  FileText,
  Layers3,
  PlayCircle,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { Card } from '@/components/shared/Card';
import { TrainingLibrarySkeleton } from '@/components/entrepreneur/training/TrainingLibrarySkeletons';
import {
  DataTable,
  RowActions,
  TableEmptyState,
  TableFilterInput,
  TableFilterSelect,
  TablePagination,
  TableToolbar,
  type Column,
} from '@/components/shared/DataTable';
import { Notice, PageHeader } from '@/components/shared/PageHeader';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { useTrainingCatalogueSummaryQuery } from '@/lib/api/learning';
import {
  useProgrammesPage,
  type ProgrammeAccessType,
  type ProgrammeLifecycle,
  type ProgrammeListItem,
} from '@/lib/api/programmes';
import { routes } from '@/lib/routes';
import type { BadgeTone } from '@/types';

type AccessFilter = 'all' | ProgrammeAccessType;
type AvailabilityFilter = 'current' | 'all';
type ProgressFilter = 'all' | 'not_started' | 'in_progress' | 'completed';

export default function TrainingLibraryPage() {
  const router = useRouter();
  const [search, setSearch] = React.useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [availability, setAvailability] =
    React.useState<AvailabilityFilter>('current');
  const [access, setAccess] = React.useState<AccessFilter>('all');
  const [progress, setProgress] = React.useState<ProgressFilter>('all');
  const [pageSize, setPageSize] = React.useState(10);
  const directory = useProgrammesPage({
    search: debouncedSearch.trim() || undefined,
    lifecycle: availability === 'current' ? 'active' : undefined,
    accessType: access === 'all' ? undefined : access,
    progressStatus: progress === 'all' ? undefined : progress,
    take: pageSize,
  });
  const continueLearning = useProgrammesPage({
    lifecycle: 'active',
    progressStatus: 'in_progress',
    take: 1,
  });
  const firstAvailable = useProgrammesPage({ lifecycle: 'active', take: 1 });
  const summary = useTrainingCatalogueSummaryQuery();
  const resetPagination = directory.resetPagination;

  React.useEffect(() => {
    resetPagination();
  }, [
    access,
    availability,
    debouncedSearch,
    pageSize,
    progress,
    resetPagination,
  ]);

  const openProgramme = React.useCallback(
    (programme: ProgrammeListItem) => {
      router.push(routes.entrepreneur.trainingProgram(programme.id));
    },
    [router],
  );

  const columns = React.useMemo<Column<ProgrammeListItem>[]>(
    () => [
      {
        key: 'action',
        header: 'Action',
        cell: (programme) => (
          <RowActions
            actions={[
              {
                label:
                  programme.learnerProgress.average > 0
                    ? 'Continue learning'
                    : 'Open learning path',
                onSelect: () => openProgramme(programme),
              },
            ]}
          />
        ),
        className: 'w-[84px]',
      },
      {
        key: 'learning',
        header: 'Learning path',
        cell: (programme) => (
          <button
            type="button"
            onClick={() => openProgramme(programme)}
            className="flex min-w-[340px] max-w-[620px] items-start gap-3 rounded-lg text-left outline-none transition hover:text-bid focus-visible:ring-2 focus-visible:ring-bid/20"
          >
            <span
              className={
                'mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl ' +
                (programme.accessType === 'free'
                  ? 'bg-info-light text-info'
                  : 'bg-bid-light text-bid')
              }
            >
              <BookOpen className="h-4.5 w-4.5" />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold text-ink">
                {programme.name}
              </span>
              <span className="mt-1 line-clamp-2 block text-sm leading-5 text-ink-muted">
                {programme.description}
              </span>
              {programme.nextLearning ? (
                <span className="mt-2 block text-xs font-medium text-bid">
                  Next: {programme.nextLearning.moduleTitle}
                </span>
              ) : null}
            </span>
          </button>
        ),
      },
      {
        key: 'type',
        header: 'Access',
        cell: (programme) => (
          <Badge tone={programme.accessType === 'free' ? 'blue' : 'brand'}>
            {programme.accessType === 'free'
              ? 'Free programme'
              : 'Programme access'}
          </Badge>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        cell: (programme) => (
          <ProgrammeStatusBadge status={programme.lifecycle} />
        ),
      },
      {
        key: 'progress',
        header: 'Progress',
        cell: (programme) => (
          <div className="min-w-[180px]">
            <ProgressBar
              value={programme.learnerProgress.average}
              width="100%"
              className="h-2"
            />
            <div className="mt-1 text-sm text-ink-muted">
              {programme.learnerProgress.average}% complete
            </div>
          </div>
        ),
      },
      {
        key: 'contents',
        header: 'Contents',
        cell: (programme) => (
          <div className="flex min-w-[270px] flex-wrap gap-1.5">
            <Badge tone="neutral">{programme.modules.total} modules</Badge>
            <Badge tone="blue">
              <PlayCircle className="h-3.5 w-3.5" />
              {programme.content.videos} videos
            </Badge>
            <Badge tone="neutral">
              <FileText className="h-3.5 w-3.5" />
              {programme.content.pdfs} PDFs
            </Badge>
            <Badge tone="brand">
              <Wrench className="h-3.5 w-3.5" />
              {programme.content.tools} tools
            </Badge>
          </div>
        ),
      },
      {
        key: 'timeline',
        header: 'Timeline',
        cell: (programme) => (
          <span className="whitespace-nowrap text-sm text-ink-muted">
            {formatDate(programme.startDate)} - {formatDate(programme.endDate)}
          </span>
        ),
      },
    ],
    [openProgramme],
  );

  if (directory.isLoading && !directory.data) {
    return <TrainingLibrarySkeleton />;
  }

  if (directory.isError) {
    return (
      <>
        <PageHeader
          title="Training Library"
          description="Continue your programme learning and use free BID programmes anytime."
        />
        <Card>
          <Notice>
            Your training library could not be loaded. {directory.error.message}
          </Notice>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => void directory.refetch()}
          >
            Try again
          </Button>
        </Card>
      </>
    );
  }

  const heroProgramme =
    continueLearning.rows[0] ?? firstAvailable.rows[0] ?? directory.rows[0];
  const metrics = summary.data?.programmes;

  return (
    <>
      <PageHeader
        title="Training Library"
        description="Continue your programme learning and use free BID programmes anytime."
      />

      <Card padding="lg" className="mb-4">
        {heroProgramme ? (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge tone="brand">
                  {heroProgramme.learnerProgress.average > 0
                    ? 'Continue learning'
                    : 'Start learning'}
                </Badge>
                <Badge
                  tone={heroProgramme.accessType === 'free' ? 'blue' : 'brand'}
                >
                  {heroProgramme.accessType === 'free'
                    ? 'Free programme'
                    : 'Programme access'}
                </Badge>
                <ProgrammeStatusBadge status={heroProgramme.lifecycle} />
              </div>
              <h2 className="text-2xl font-semibold leading-tight text-ink">
                {heroProgramme.name}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-muted">
                {heroProgramme.description}
              </p>

              <div className="mt-5 max-w-2xl">
                <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-ink">Programme progress</span>
                  <span className="text-ink-muted">
                    {heroProgramme.learnerProgress.average}% complete
                  </span>
                </div>
                <ProgressBar
                  value={heroProgramme.learnerProgress.average}
                  width="100%"
                  className="h-2.5"
                />
              </div>

              <div className="mt-5 rounded-xl border border-line bg-surface-subtle px-4 py-3">
                <div className="text-sm text-ink-muted">Next learning</div>
                <div className="mt-1 font-semibold text-ink">
                  {heroProgramme.nextLearning?.moduleTitle ??
                    'All available content completed'}
                </div>
                {heroProgramme.nextLearning ? (
                  <p className="mt-1 text-sm leading-6 text-ink-muted">
                    {heroProgramme.nextLearning.contentTitle}
                  </p>
                ) : null}
              </div>

              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <Button
                  onClick={() => openProgramme(heroProgramme)}
                >
                  {heroProgramme.learnerProgress.average > 0
                    ? 'Continue learning'
                    : 'Open learning path'}
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setAccess('free');
                    directory.resetPagination();
                  }}
                >
                  Browse free programmes
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <LearningSummary
                icon={Layers3}
                label="Modules"
                value={heroProgramme.modules.total}
              />
              <LearningSummary
                icon={PlayCircle}
                label="Videos"
                value={heroProgramme.content.videos}
              />
              <LearningSummary
                icon={FileText}
                label="Files and tools"
                value={
                  heroProgramme.content.pdfs + heroProgramme.content.tools
                }
              />
            </div>
          </div>
        ) : (
          <div className="py-10 text-center">
            <BookOpen className="mx-auto h-10 w-10 text-ink-faint" />
            <h2 className="mt-4 text-xl font-semibold text-ink">
              No learning paths are available yet
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-ink-muted">
              Published free programmes and programmes granted to you will appear
              here.
            </p>
          </div>
        )}
      </Card>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <LearningStat
          label="Programmes"
          value={summary.isLoading ? '...' : metrics?.total ?? 0}
          helper={(metrics?.assigned ?? 0) + ' with programme access'}
          tone="brand"
        />
        <LearningStat
          label="Free programmes"
          value={summary.isLoading ? '...' : metrics?.free ?? 0}
          helper="Available to every entrepreneur"
          tone="blue"
        />
        <LearningStat
          label="Continue"
          value={summary.isLoading ? '...' : metrics?.inProgress ?? 0}
          helper="Learning already started"
          tone="amber"
        />
        <LearningStat
          label="Completed"
          value={summary.isLoading ? '...' : metrics?.completed ?? 0}
          helper="Finished learning paths"
          tone="green"
        />
      </div>

      <Card>
        <div className="mb-4">
          <h2 className="text-base font-semibold text-ink">
            Learning catalogue
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            {directory.totalItems} learning path
            {directory.totalItems === 1 ? '' : 's'} in this view
            {directory.isFetching ? ' - Updating...' : ''}
          </p>
        </div>
        <TableToolbar>
          <div>
            <div className="text-sm font-medium text-ink">
              Find learning content
            </div>
            <div className="mt-0.5 text-sm text-ink-muted">
              Search your programme access and free programmes from one catalogue.
            </div>
          </div>
          <div className="table-toolbar-search-filters grid w-full gap-2">
            <TableFilterInput
              icon
              placeholder="Search learning paths..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onClear={() => setSearch('')}
            />
            <TableFilterSelect
              value={availability}
              onChange={(event) =>
                setAvailability(event.target.value as AvailabilityFilter)
              }
            >
              <option value="current">Current learning</option>
              <option value="all">All learning</option>
            </TableFilterSelect>
            <TableFilterSelect
              value={access}
              onChange={(event) =>
                setAccess(event.target.value as AccessFilter)
              }
            >
              <option value="all">All access</option>
              <option value="assigned">Programme access</option>
              <option value="free">Free programmes</option>
            </TableFilterSelect>
            <TableFilterSelect
              value={progress}
              onChange={(event) =>
                setProgress(event.target.value as ProgressFilter)
              }
            >
              <option value="all">All progress</option>
              <option value="in_progress">Continue</option>
              <option value="not_started">Not started</option>
              <option value="completed">Completed</option>
            </TableFilterSelect>
          </div>
        </TableToolbar>

        {directory.rows.length > 0 ? (
          <DataTable
            columns={columns}
            rows={directory.rows}
            rowKey={(programme) => programme.id}
            rowProps={(programme) => ({
              onDoubleClick: () => openProgramme(programme),
            })}
            emptyMessage="No learning paths match your filters."
            tableClassName="min-w-[1180px]"
          />
        ) : (
          <TableEmptyState
            title="No learning paths found"
            description="Try changing the search, learning, access, or progress filter."
          />
        )}
        <TablePagination
          page={directory.page}
          pageSize={pageSize}
          totalItems={directory.totalItems}
          pageSizeOptions={[10, 25, 50]}
          onPageChange={directory.setPage}
          onPageSizeChange={setPageSize}
        />
      </Card>
    </>
  );
}

function ProgrammeStatusBadge({ status }: { status: ProgrammeLifecycle }) {
  const meta: Record<ProgrammeLifecycle, { label: string; tone: BadgeTone }> = {
    draft: { label: 'Draft', tone: 'neutral' },
    scheduled: { label: 'Scheduled', tone: 'blue' },
    active: { label: 'Active', tone: 'green' },
    completed: { label: 'Completed', tone: 'amber' },
    archived: { label: 'Archived', tone: 'red' },
  };
  return <Badge tone={meta[status].tone}>{meta[status].label}</Badge>;
}

function LearningSummary({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface-subtle p-4">
      <div className="flex items-center gap-2 text-sm text-ink-muted">
        <Icon className="h-4 w-4 text-bid" />
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-ink">{value}</div>
    </div>
  );
}

function LearningStat({
  label,
  value,
  helper,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  helper: string;
  tone: 'brand' | 'blue' | 'amber' | 'green';
}) {
  const toneClass = {
    brand: 'border-t-bid',
    blue: 'border-t-info',
    amber: 'border-t-warning',
    green: 'border-t-success',
  }[tone];
  return (
    <Card className={'border-t-2 ' + toneClass} padding="sm">
      <div className="text-sm text-ink-muted">{label}</div>
      <div className="mt-1 text-3xl font-semibold text-ink">{value}</div>
      <div className="mt-2 text-xs text-ink-muted">{helper}</div>
    </Card>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
