'use client';

import { useDebouncedValue } from '@/lib/search';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  FileSpreadsheet,
  FileText,
  PlayCircle,
  Wrench,
} from 'lucide-react';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { Card, Skeleton, TableSkeleton } from '@/components/shared/Card';
import {
  DataTable,
  RowActions,
  TableFilterInput,
  TableFilterSelect,
  TablePagination,
  TableToolbar,
  type Column,
} from '@/components/shared/DataTable';
import { MetricGrid } from '@/components/shared/MetricGrid';
import { Notice, PageHeader } from '@/components/shared/PageHeader';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { StatCard } from '@/components/shared/StatCard';
import {
  useProgrammeSummaryQuery,
  useProgrammesPage,
  type ProgrammeLifecycle,
  type ProgrammeListItem,
} from '@/lib/api/programmes';
import { routes } from '@/lib/routes';

type StatusFilter =
  | 'all'
  | Exclude<ProgrammeLifecycle, 'archived'>;

export default function TrainerProgrammesPage() {
  const router = useRouter();
  const [search, setSearch] = React.useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [status, setStatus] = React.useState<StatusFilter>('all');
  const [pageSize, setPageSize] = React.useState(10);
  const directory = useProgrammesPage({
    search: debouncedSearch.trim() || undefined,
    lifecycle: status === 'all' ? undefined : status,
    take: pageSize,
  });
  const summary = useProgrammeSummaryQuery();
  const resetPagination = directory.resetPagination;

  React.useEffect(() => {
    resetPagination();
  }, [debouncedSearch, pageSize, resetPagination, status]);

  const openProgramme = React.useCallback(
    (programme: ProgrammeListItem) => {
      router.push(routes.trainer.programme(programme.id));
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
                label: 'Open programme',
                onSelect: () => openProgramme(programme),
              },
            ]}
          />
        ),
        className: 'w-[84px]',
      },
      {
        key: 'programme',
        header: 'Programme',
        cell: (programme) => (
          <button
            type="button"
            onClick={() => openProgramme(programme)}
            className="block min-w-[320px] max-w-[500px] rounded-lg text-left outline-none transition hover:text-bid focus-visible:ring-2 focus-visible:ring-bid/20"
          >
            <span className="block font-semibold text-ink transition-colors group-hover:text-bid">
              {programme.name}
            </span>
            <span className="mt-1 line-clamp-2 text-sm leading-5 text-ink-muted">
              {programme.description}
            </span>
          </button>
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
        key: 'entrepreneurs',
        header: 'My entrepreneurs',
        cell: (programme) => programme.enrollment.active,
      },
      {
        key: 'progress',
        header: 'Programme progress',
        cell: (programme) => (
          <div className="min-w-[180px]">
            <ProgressBar
              value={programme.learnerProgress.average}
              width="100%"
              className="h-2"
            />
            <div className="mt-1 text-sm text-ink-muted">
              {programme.learnerProgress.average}% average completion
            </div>
          </div>
        ),
      },
      {
        key: 'curriculum',
        header: 'Curriculum',
        cell: (programme) => (
          <div className="min-w-[240px] text-sm text-ink-muted">
            <div className="flex flex-wrap gap-1.5">
              <Badge tone="neutral">
                <BookOpen className="h-3.5 w-3.5" />
                {programme.modules.total} modules
              </Badge>
              <Badge tone="blue">
                <PlayCircle className="h-3.5 w-3.5" />
                {programme.content.videos} videos
              </Badge>
              <Badge tone="neutral">
                <FileText className="h-3.5 w-3.5" />
                {programme.content.pdfs} PDFs
              </Badge>
              <Badge tone="green">
                <FileSpreadsheet className="h-3.5 w-3.5" />
                {programme.content.excels} Excel
              </Badge>
              <Badge tone="brand">
                <Wrench className="h-3.5 w-3.5" />
                {programme.content.tools} tools
              </Badge>
            </div>
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
    return <TrainerProgrammesSkeleton />;
  }

  if (directory.isError) {
    return (
      <>
        <PageHeader
          title="My programmes"
          description="Programmes connected to the learning content you support."
        />
        <Card>
          <Notice>
            Your programmes could not be loaded. {directory.error.message}
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

  const metrics = summary.data;

  return (
    <>
      <PageHeader
        title="My programmes"
        description="Programmes connected to the learning content you support."
      />
      <MetricGrid columns={4}>
        <StatCard
          label="Programmes"
          value={metricValue(metrics?.programmes.total, summary.isLoading)}
          subline={`${metrics?.programmes.active ?? 0} active`}
          dotColor="bid"
          accent="bid"
        />
        <StatCard
          label="My entrepreneurs"
          value={metricValue(metrics?.entrepreneurs.active, summary.isLoading)}
          subline="Across your programme portfolio"
          dotColor="info"
          accent="info"
        />
        <StatCard
          label="Learning assets"
          value={metricValue(metrics?.content.total, summary.isLoading)}
          subline={`${metrics?.modules.total ?? 0} modules`}
          dotColor="warning"
          accent="warning"
        />
        <StatCard
          label="Assets I support"
          value={metricValue(metrics?.content.owned, summary.isLoading)}
          subline={`${metrics?.learnerProgress.average ?? 0}% average progress`}
          dotColor="success"
          accent="success"
        />
      </MetricGrid>

      <Card className="mt-4">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-ink">
            Programme directory
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Open the read-only curriculum and programme context for the learning
            assets you support.
          </p>
        </div>
        <TableToolbar>
          <div>
            <div className="text-sm font-medium text-ink">
              Find programmes
            </div>
            <div className="mt-0.5 text-sm text-ink-muted">
              {directory.totalItems} programme
              {directory.totalItems === 1 ? '' : 's'} in this view
              {directory.isFetching ? ' - Updating...' : ''}
            </div>
          </div>
          <div className="grid w-full gap-2 md:grid-cols-[minmax(220px,1fr)_180px] lg:w-[580px]">
            <TableFilterInput
              icon
              placeholder="Search by name or description..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <TableFilterSelect
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as StatusFilter)
              }
            >
              <option value="all">All programmes</option>
              <option value="active">Active</option>
              <option value="scheduled">Scheduled</option>
              <option value="draft">Draft</option>
              <option value="completed">Completed</option>
            </TableFilterSelect>
          </div>
        </TableToolbar>
        {directory.isPlaceholderData ? (
          <TableSkeleton rows={Math.min(pageSize, 6)} columns={7} />
        ) : (
          <DataTable
            columns={columns}
            rows={directory.rows}
            rowKey={(programme) => programme.id}
            rowProps={(programme) => ({
              onDoubleClick: () => openProgramme(programme),
            })}
            emptyMessage="No programmes match this search."
            tableClassName="min-w-[1120px]"
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

function TrainerProgrammesSkeleton() {
  return (
    <>
      <PageHeader
        title="My programmes"
        description="Programmes connected to the learning content you support."
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index} padding="sm">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="mt-3 h-4 w-36" />
          </Card>
        ))}
      </div>
      <div className="mt-4">
        <TableSkeleton columns={7} rows={8} />
      </div>
    </>
  );
}

function ProgrammeStatusBadge({
  status,
}: {
  status: ProgrammeLifecycle;
}) {
  const tones = {
    draft: 'neutral',
    scheduled: 'blue',
    active: 'green',
    completed: 'amber',
    archived: 'red',
  } as const;
  const labels = {
    draft: 'Draft',
    scheduled: 'Scheduled',
    active: 'Active',
    completed: 'Completed',
    archived: 'Archived',
  };

  return <Badge tone={tones[status]}>{labels[status]}</Badge>;
}

function metricValue(value: number | undefined, loading: boolean) {
  if (loading) return '...';
  return value ?? 0;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
