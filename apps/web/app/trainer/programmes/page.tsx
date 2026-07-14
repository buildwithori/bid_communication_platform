'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, FileText, PlayCircle, Wrench } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { MetricGrid } from '@/components/shared/MetricGrid';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardHeader } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { ProgressBar } from '@/components/shared/ProgressBar';
import {
  DataTable,
  RowActions,
  TableEmptyState,
  TableFilterAutocomplete,
  TableFilterInput,
  TablePagination,
  TableToolbar,
  type Column,
} from '@/components/shared/DataTable';
import { listProgrammes, type ProgrammeLifecycle, type ProgrammeListItem } from '@/lib/api/programmes';
import { routes } from '@/lib/routes';
import type { BadgeTone } from '@/types';

const ALL_FILTER = 'all';

const lifecycleMeta: Record<ProgrammeLifecycle, { label: string; tone: BadgeTone }> = {
  draft: { label: 'Draft', tone: 'neutral' },
  scheduled: { label: 'Scheduled', tone: 'blue' },
  active: { label: 'Active', tone: 'green' },
  completed: { label: 'Completed', tone: 'neutral' },
  archived: { label: 'Archived', tone: 'neutral' },
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function learnerCount(programme: ProgrammeListItem) {
  return programme.learnerProgress.trackedLearners || programme.enrollment.active;
}

function average(values: number[]) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function StatusBadge({ programme }: { programme: ProgrammeListItem }) {
  const meta = lifecycleMeta[programme.lifecycle];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export default function TrainerProgrammesPage() {
  const router = useRouter();
  const programmesQuery = useQuery({
    queryKey: ['programmes', 'trainer-directory'],
    queryFn: () => listProgrammes({ take: 100 }),
  });

  const programmes = React.useMemo<ProgrammeListItem[]>(
    () => ((programmesQuery.data?.items ?? []) as ProgrammeListItem[]).filter((programme) => programme.lifecycle !== 'archived'),
    [programmesQuery.data?.items],
  );

  const [query, setQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<typeof ALL_FILTER | ProgrammeLifecycle>(ALL_FILTER);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  const openProgramme = React.useCallback((programme: ProgrammeListItem) => {
    router.push(routes.trainer.programme(programme.id));
  }, [router]);

  const filteredProgrammes = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return programmes.filter((programme) => {
      const lifecycle = lifecycleMeta[programme.lifecycle];
      const matchesStatus = statusFilter === ALL_FILTER || programme.lifecycle === statusFilter;
      const matchesSearch =
        !needle ||
        [
          programme.name,
          programme.description,
          lifecycle.label,
          programme.accessType,
          String(learnerCount(programme)),
          String(programme.modules.total),
          String(programme.content.total),
        ]
          .join(' ')
          .toLowerCase()
          .includes(needle);

      return matchesStatus && matchesSearch;
    });
  }, [programmes, query, statusFilter]);

  React.useEffect(() => {
    setPage(1);
  }, [query, statusFilter, pageSize]);

  const pageRows = React.useMemo(
    () => filteredProgrammes.slice((page - 1) * pageSize, page * pageSize),
    [filteredProgrammes, page, pageSize],
  );

  const totalLearners = programmes.reduce((sum, programme) => sum + learnerCount(programme), 0);
  const totalModules = programmes.reduce((sum, programme) => sum + programme.modules.total, 0);
  const totalContentAssets = programmes.reduce((sum, programme) => sum + programme.content.total, 0);
  const avgProgress = average(programmes.map((programme) => programme.learnerProgress.average));

  const columns = React.useMemo<Column<ProgrammeListItem>[]>(
    () => [
      {
        key: 'action',
        header: 'Action',
        cell: (programme) => (
          <RowActions
            actions={[
              { label: 'Open programme', onSelect: () => openProgramme(programme) },
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
            className="block min-w-[340px] max-w-[560px] rounded-lg text-left outline-none transition hover:text-bid focus-visible:ring-2 focus-visible:ring-bid/20"
          >
            <span className="block font-semibold text-ink transition-colors group-hover:text-bid">{programme.name}</span>
            <span className="mt-1 line-clamp-2 text-sm leading-5 text-ink-muted">{programme.description}</span>
          </button>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        cell: (programme) => <StatusBadge programme={programme} />,
      },
      {
        key: 'learners',
        header: 'My entrepreneurs',
        cell: (programme) => (
          <div className="min-w-[150px]">
            <div className="font-medium text-ink">{learnerCount(programme)} entrepreneurs</div>
            <div className="mt-1 text-sm text-ink-muted">{programme.learnerProgress.trackedLearners} with progress</div>
          </div>
        ),
      },
      {
        key: 'progress',
        header: 'Learning progress',
        cell: (programme) => (
          <div className="min-w-[190px]">
            <ProgressBar value={programme.learnerProgress.average} width="100%" className="h-2" />
            <div className="mt-1 text-sm text-ink-muted">{programme.learnerProgress.average}% average</div>
          </div>
        ),
      },
      {
        key: 'curriculum',
        header: 'Curriculum',
        cell: (programme) => (
          <div className="min-w-[260px] text-sm text-ink-muted">
            <div className="flex flex-wrap gap-1.5">
              <Badge tone="neutral"><BookOpen className="h-3.5 w-3.5" /> {programme.modules.total} modules</Badge>
              <Badge tone="blue"><PlayCircle className="h-3.5 w-3.5" /> {programme.content.videos} videos</Badge>
              <Badge tone="neutral"><FileText className="h-3.5 w-3.5" /> {programme.content.pdfs} PDFs</Badge>
              <Badge tone="brand"><Wrench className="h-3.5 w-3.5" /> {programme.content.tools} tools</Badge>
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

  return (
    <>
      <PageHeader
        title="My programmes"
        description="Programmes connected to the learning content you support."
      />
      <MetricGrid columns={4}>
        <StatCard label="Programmes" value={programmes.length} subline="Programmes you support" dotColor="bid" accent="bid" />
        <StatCard label="My entrepreneurs" value={totalLearners} subline="Learners connected to these programmes" dotColor="info" accent="info" />
        <StatCard label="Learning assets" value={totalContentAssets} subline={`${totalModules} modules`} dotColor="warning" accent="warning" />
        <StatCard label="Avg. progress" value={`${avgProgress}%`} subline="Across tracked learners" dotColor="success" accent="success" />
      </MetricGrid>

      <Card className="mt-4">
        <CardHeader
          title="Programme directory"
          description={`${filteredProgrammes.length} programmes in this view`}
        />
        <TableToolbar>
          <div>
            <div className="text-sm font-medium text-ink">Filter programmes</div>
            <div className="mt-0.5 text-sm text-ink-muted">
              Search by programme, status, learner count, or content count.
            </div>
          </div>
          <div className="grid w-full gap-2 md:grid-cols-[minmax(220px,1fr)_170px] lg:w-[560px]">
            <TableFilterInput
              icon
              placeholder="Search programmes..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <TableFilterAutocomplete
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}
              options={[
                { value: ALL_FILTER, label: 'All statuses' },
                { value: 'active', label: 'Active' },
                { value: 'scheduled', label: 'Scheduled' },
                { value: 'draft', label: 'Draft' },
                { value: 'completed', label: 'Completed' },
              ]}
              placeholder="All statuses"
              searchPlaceholder="Search statuses..."
            />
          </div>
        </TableToolbar>
        {programmesQuery.isLoading ? (
          <TableEmptyState title="Loading programmes" description="Fetching the programmes connected to your content." />
        ) : programmesQuery.isError ? (
          <TableEmptyState title="Programmes could not be loaded" description="Refresh the page or try again shortly." />
        ) : (
          <DataTable
            columns={columns}
            rows={pageRows}
            rowKey={(programme) => programme.id}
            rowProps={(programme) => ({
              onDoubleClick: () => openProgramme(programme),
            })}
            emptyMessage="No programmes match these filters."
            tableClassName="min-w-[1120px]"
          />
        )}
        <TablePagination
          page={page}
          pageSize={pageSize}
          totalItems={filteredProgrammes.length}
          pageSizeOptions={[10, 25, 50]}
          onPageChange={setPage}
          onPageSizeChange={(next) => {
            setPageSize(next);
            setPage(1);
          }}
        />
      </Card>
    </>
  );
}
