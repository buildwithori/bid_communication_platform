'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Layers3,
  PlayCircle,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { ProgramModal } from '@/components/admin/ProgramModal';
import { ProgrammeArchiveModal } from '@/components/admin/programmes/ProgrammeArchiveModal';
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
import { PageHeader, Notice } from '@/components/shared/PageHeader';
import { ProgressBar } from '@/components/shared/ProgressBar';
import {
  useArchiveProgrammeMutation,
  useProgrammeSummaryQuery,
  useProgrammesPage,
  usePublishProgrammeMutation,
  useRestoreProgrammeMutation,
  type ProgrammeAccessType,
  type ProgrammeLifecycle,
  type ProgrammeListItem,
} from '@/lib/api/programmes';
import { routes } from '@/lib/routes';

type StatusFilter = 'current' | 'all' | ProgrammeLifecycle;
type AccessFilter = 'all' | ProgrammeAccessType;

export default function AdminProgramsPage() {
  const router = useRouter();
  const [addProgramOpen, setAddProgramOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<ProgrammeListItem | null>(
    null,
  );
  const [archiveTarget, setArchiveTarget] =
    React.useState<ProgrammeListItem | null>(null);
  const [search, setSearch] = React.useState('');
  const deferredSearch = React.useDeferredValue(search);
  const [status, setStatus] = React.useState<StatusFilter>('current');
  const [access, setAccess] = React.useState<AccessFilter>('all');
  const [pageSize, setPageSize] = React.useState(8);

  const directory = useProgrammesPage({
    search: deferredSearch.trim() || undefined,
    lifecycle:
      status === 'current' || status === 'all' ? undefined : status,
    includeArchived: status === 'all' ? true : undefined,
    accessType: access === 'all' ? undefined : access,
    take: pageSize,
  });
  const summary = useProgrammeSummaryQuery();
  const publishProgramme = usePublishProgrammeMutation({
    onSuccess: () => toast.success('Programme published.'),
    onError: (error) => toast.error(error.message),
  });
  const restoreProgramme = useRestoreProgrammeMutation({
    onSuccess: () => toast.success('Programme restored.'),
    onError: (error) => toast.error(error.message),
  });
  const archiveProgramme = useArchiveProgrammeMutation({
    onSuccess: () => toast.success('Programme archived.'),
    onError: (error) => toast.error(error.message),
  });
  const resetPagination = directory.resetPagination;

  React.useEffect(() => {
    resetPagination();
  }, [access, deferredSearch, pageSize, resetPagination, status]);

  const openProgrammeWorkspace = React.useCallback(
    (programme: ProgrammeListItem) => {
      router.push(routes.admin.program(programme.id));
    },
    [router],
  );

  const getRowActions = React.useCallback(
    (programme: ProgrammeListItem) => {
      const isLifecyclePending =
        publishProgramme.isPending || restoreProgramme.isPending;

      return [
        {
          label: 'Open workspace',
          onSelect: () => openProgrammeWorkspace(programme),
        },
        ...(programme.lifecycle !== 'archived'
          ? [
              {
                label:
                  programme.lifecycle === 'completed'
                    ? 'Edit timeline'
                    : 'Edit programme',
                onSelect: () => setEditTarget(programme),
              },
            ]
          : []),
        'separator' as const,
        ...(programme.lifecycle === 'draft'
          ? [
              {
                label: 'Publish programme',
                disabled: isLifecyclePending,
                onSelect: () => publishProgramme.mutate(programme.id),
              },
            ]
          : []),
        ...(programme.lifecycle === 'completed'
          ? [
              {
                label: 'Archive programme',
                destructive: true,
                disabled: archiveProgramme.isPending,
                onSelect: () => setArchiveTarget(programme),
              },
            ]
          : []),
        ...(programme.lifecycle === 'archived'
          ? [
              {
                label: 'Restore programme',
                disabled: isLifecyclePending,
                onSelect: () => restoreProgramme.mutate(programme.id),
              },
            ]
          : []),
      ];
    },
    [
      archiveProgramme.isPending,
      openProgrammeWorkspace,
      publishProgramme,
      restoreProgramme,
    ],
  );

  const columns = React.useMemo<Column<ProgrammeListItem>[]>(
    () => [
      {
        key: 'actions',
        header: 'Action',
        cell: (programme) => <RowActions actions={getRowActions(programme)} />,
        className: 'w-[84px]',
      },
      {
        key: 'programme',
        header: 'Programme',
        cell: (programme) => (
          <button
            type="button"
            onClick={() => openProgrammeWorkspace(programme)}
            className="block max-w-[340px] rounded-lg text-left outline-none transition hover:text-bid focus-visible:ring-2 focus-visible:ring-bid/20"
          >
            <span className="block text-sm font-semibold text-ink">
              {programme.name}
            </span>
            <span className="mt-1 block line-clamp-2 text-xs leading-5 text-ink-muted">
              {programme.description}
            </span>
          </button>
        ),
        className: 'min-w-[280px]',
      },
      {
        key: 'status',
        header: 'Status',
        cell: (programme) => <ProgrammeStatusBadge status={programme.lifecycle} />,
      },
      {
        key: 'access',
        header: 'Access',
        cell: (programme) => (
          <Badge tone={programme.accessType === 'free' ? 'blue' : 'brand'}>
            {programme.accessType === 'free' ? 'Free' : 'Assigned'}
          </Badge>
        ),
      },
      {
        key: 'enrollment',
        header: 'Enrollment',
        cell: (programme) => {
          if (programme.accessType === 'free') {
            return (
              <span className="text-sm text-ink-muted">
                Available to all entrepreneurs
              </span>
            );
          }
          const percentage = Math.round(
            (programme.enrollment.active /
              Math.max(programme.enrollment.capacity, 1)) *
              100,
          );
          return (
            <div className="min-w-[150px]">
              <div className="mb-1 flex items-center justify-between gap-2 text-xs text-ink-muted">
                <span>
                  {programme.enrollment.active} / {programme.enrollment.capacity}
                </span>
                <span>{percentage}%</span>
              </div>
              <ProgressBar value={percentage} width="100%" className="h-1.5" />
            </div>
          );
        },
      },
      {
        key: 'modules',
        header: 'Modules',
        cell: (programme) => programme.modules.total,
      },
      {
        key: 'content',
        header: 'Content',
        cell: (programme) => programme.content.total,
      },
      {
        key: 'progress',
        header: 'Progress',
        cell: (programme) => (
          <div className="min-w-[140px]">
            <div className="mb-1 text-xs font-medium text-ink">
              {programme.learnerProgress.average}%
            </div>
            <ProgressBar
              value={programme.learnerProgress.average}
              width="100%"
              className="h-1.5"
            />
          </div>
        ),
      },
      {
        key: 'timeline',
        header: 'Timeline',
        cell: (programme) => (
          <span className="whitespace-nowrap text-sm text-ink-muted">
            {formatProgrammeDate(programme.startDate)} -{' '}
            {formatProgrammeDate(programme.endDate)}
          </span>
        ),
      },
    ],
    [getRowActions, openProgrammeWorkspace],
  );

  if (directory.isLoading && !directory.data) {
    return <ProgrammesPageSkeleton />;
  }

  if (directory.isError) {
    return (
      <>
        <PageHeader
          title="Programmes"
          description="Build curricula, organize modules, and manage the learning content entrepreneurs will see."
        />
        <Card>
          <Notice>
            Programmes could not be loaded. {directory.error.message}
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
        title="Programmes"
        description="Build curricula, organize modules, and manage the learning content entrepreneurs will see."
        actions={
          <Button onClick={() => setAddProgramOpen(true)}>+ New programme</Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ProgramMetric
          icon={BookOpen}
          label="Programmes"
          value={metricValue(metrics?.programmes.total, summary.isLoading)}
          subline={`${metrics?.programmes.active ?? 0} active`}
        />
        <ProgramMetric
          icon={Layers3}
          label="Modules"
          value={metricValue(metrics?.modules.total, summary.isLoading)}
          subline="Across all programmes"
        />
        <ProgramMetric
          icon={Users}
          label="Entrepreneurs"
          value={metricValue(metrics?.enrollment.active, summary.isLoading)}
          subline="Currently enrolled"
        />
        <ProgramMetric
          icon={PlayCircle}
          label="Avg. progress"
          value={
            summary.isLoading
              ? '...'
              : `${metrics?.learnerProgress.average ?? 0}%`
          }
          subline="Learner completion"
        />
      </div>

      <Card className="mt-4">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-ink">Programme directory</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Search, filter, and open the programme workspace from one scalable list.
          </p>
        </div>
        <TableToolbar>
          <div>
            <div className="text-sm font-medium text-ink">Find programmes</div>
            <div className="mt-0.5 text-sm text-ink-muted">
              {directory.totalItems} programme
              {directory.totalItems === 1 ? '' : 's'} in this view
              {directory.isFetching ? ' · Updating...' : ''}
            </div>
          </div>
          <div className="grid w-full gap-2 lg:w-[720px] lg:grid-cols-[minmax(220px,1fr)_160px_170px]">
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
              <option value="current">Current programmes</option>
              <option value="all">All programmes</option>
              <option value="active">Active</option>
              <option value="scheduled">Scheduled</option>
              <option value="draft">Draft</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </TableFilterSelect>
            <TableFilterSelect
              value={access}
              onChange={(event) =>
                setAccess(event.target.value as AccessFilter)
              }
            >
              <option value="all">All access</option>
              <option value="assigned">Assigned</option>
              <option value="free">Free</option>
            </TableFilterSelect>
          </div>
        </TableToolbar>
        <DataTable
          columns={columns}
          rows={directory.rows}
          rowKey={(programme) => programme.id}
          emptyMessage="No programmes match this search."
          tableClassName="min-w-[1060px]"
        />
        <TablePagination
          page={directory.page}
          pageSize={pageSize}
          totalItems={directory.totalItems}
          pageSizeOptions={[8, 16, 32]}
          onPageChange={directory.setPage}
          onPageSizeChange={setPageSize}
        />
      </Card>

      <ProgramModal
        open={addProgramOpen}
        onOpenChange={setAddProgramOpen}
      />
      {editTarget ? (
        <ProgramModal
          open
          onOpenChange={(open) => {
            if (!open) setEditTarget(null);
          }}
          mode="edit"
          program={editTarget}
        />
      ) : null}
      <ProgrammeArchiveModal
        open={Boolean(archiveTarget)}
        onOpenChange={(open) => {
          if (!open) setArchiveTarget(null);
        }}
        program={archiveTarget ?? undefined}
        isPending={archiveProgramme.isPending}
        onArchive={async (programme, reason) =>
          void (await archiveProgramme.mutateAsync({ id: programme.id, reason }))
        }
      />
    </>
  );
}

function ProgrammesPageSkeleton() {
  return (
    <>
      <PageHeader
        title="Programmes"
        description="Build curricula, organize modules, and manage the learning content entrepreneurs will see."
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index} padding="sm">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="mt-3 h-4 w-28" />
          </Card>
        ))}
      </div>
      <div className="mt-4">
        <TableSkeleton columns={9} rows={8} />
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

function ProgramMetric({
  icon: Icon,
  label,
  value,
  subline,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  subline: string;
}) {
  return (
    <Card padding="sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-bid-light text-bid">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xl font-semibold text-ink">{value}</div>
          <div className="text-sm font-medium text-ink">{label}</div>
          <div className="text-xs text-ink-muted">{subline}</div>
        </div>
      </div>
    </Card>
  );
}

const formatProgrammeDate = (date: string) =>
  new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });

const metricValue = (value: number | undefined, loading: boolean) =>
  loading ? '...' : (value ?? 0);
