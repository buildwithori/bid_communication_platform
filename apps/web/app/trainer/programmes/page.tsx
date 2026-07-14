'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
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
  TableFilterAutocomplete,
  TableFilterInput,
  TablePagination,
  TableToolbar,
  type Column,
} from '@/components/shared/DataTable';
import { entrepreneurs } from '@/lib/mock-data/entrepreneurs';
import { contentItems, modulesForProgram } from '@/lib/mock-data/programs';
import { getProgrammeStatus, getProgrammeStatusLabel, getProgrammeStatusTone } from '@/lib/programme-status';
import { entrepreneurHasProgramme } from '@/lib/programme-access';
import { getTrainerProgrammes, trainerSupportsEntrepreneur } from '@/lib/content-trainer-access';
import { routes } from '@/lib/routes';
import type { ContentItem, Program, ProgramStatus } from '@/types';

const currentTrainerId = 't-kofi';
const ALL_FILTER = 'all';

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getProgramStats(program: Program) {
  const modules = modulesForProgram(program.id);
  const items = modules.flatMap((module) =>
    module.contentItemIds
      .map((id) => contentItems.find((item) => item.id === id))
      .filter(Boolean) as ContentItem[],
  );

  return {
    modules,
    items,
    videos: items.filter((item) => item.type === 'video').length,
    files: items.filter((item) => item.type === 'pdf').length,
    tools: items.filter((item) => item.type === 'tool').length,
    modulesWithoutContent: modules.filter((module) => module.contentItemIds.length === 0).length,
  };
}

function StatusBadge({ program }: { program: Program }) {
  const status = getProgrammeStatus(program);

  return (
    <Badge tone={getProgrammeStatusTone(status)}>
      {getProgrammeStatusLabel(status)}
    </Badge>
  );
}

export default function TrainerProgrammesPage() {
  const router = useRouter();
  const assigned = React.useMemo(
    () => entrepreneurs.filter((entrepreneur) => trainerSupportsEntrepreneur(currentTrainerId, entrepreneur)),
    [],
  );
  const programmes = React.useMemo(() => getTrainerProgrammes(currentTrainerId), []);

  const [query, setQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<typeof ALL_FILTER | ProgramStatus>(ALL_FILTER);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  const openProgramme = React.useCallback((programme: Program) => {
    router.push(routes.trainer.programme(programme.id));
  }, [router]);

  const filteredProgrammes = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return programmes.filter((programme) => {
      const stats = getProgramStats(programme);
      const derivedStatus = getProgrammeStatus(programme);
      const assignedCount = assigned.filter((entrepreneur) => entrepreneurHasProgramme(entrepreneur, programme.id)).length;
      const matchesStatus = statusFilter === ALL_FILTER || derivedStatus === statusFilter;
      const matchesSearch =
        !needle ||
        [
          programme.name,
          programme.description,
          getProgrammeStatusLabel(derivedStatus),
          String(assignedCount),
          String(stats.modules.length),
          ...stats.modules.map((module) => module.title),
        ]
          .join(' ')
          .toLowerCase()
          .includes(needle);

      return matchesStatus && matchesSearch;
    });
  }, [assigned, programmes, query, statusFilter]);

  React.useEffect(() => {
    setPage(1);
  }, [query, statusFilter, pageSize]);

  const pageRows = React.useMemo(
    () => filteredProgrammes.slice((page - 1) * pageSize, page * pageSize),
    [filteredProgrammes, page, pageSize],
  );
  const avgProgress = Math.round(programmes.reduce((sum, programme) => sum + programme.progress, 0) / Math.max(programmes.length, 1));
  const totalModules = programmes.reduce((sum, programme) => sum + modulesForProgram(programme.id).length, 0);
  const totalContentAssets = programmes.reduce((sum, programme) => sum + getProgramStats(programme).items.length, 0);
  const contentOwned = programmes.reduce((sum, programme) => {
    const stats = getProgramStats(programme);
    return sum + stats.items.filter((item) => item.trainerId === currentTrainerId).length;
  }, 0);

  const columns: Column<Program>[] = [
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
          className="block min-w-[320px] max-w-[500px] rounded-lg text-left outline-none transition hover:text-bid focus-visible:ring-2 focus-visible:ring-bid/20"
        >
          <span className="block font-semibold text-ink transition-colors group-hover:text-bid">{programme.name}</span>
          <span className="mt-1 line-clamp-2 text-sm leading-5 text-ink-muted">{programme.description}</span>
        </button>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (programme) => <StatusBadge program={programme} />,
    },
    {
      key: 'assigned',
      header: 'My entrepreneurs',
      cell: (programme) => assigned.filter((entrepreneur) => entrepreneurHasProgramme(entrepreneur, programme.id)).length,
    },
    {
      key: 'progress',
      header: 'Programme progress',
      cell: (programme) => (
        <div className="min-w-[180px]">
          <ProgressBar value={programme.progress} width="100%" className="h-2" />
          <div className="mt-1 text-sm text-ink-muted">{programme.progress}% complete</div>
        </div>
      ),
    },
    {
      key: 'curriculum',
      header: 'Curriculum',
      cell: (programme) => {
        const stats = getProgramStats(programme);
        return (
          <div className="min-w-[240px] text-sm text-ink-muted">
            <div className="flex flex-wrap gap-1.5">
              <Badge tone="neutral"><BookOpen className="h-3.5 w-3.5" /> {stats.modules.length} modules</Badge>
              <Badge tone="blue"><PlayCircle className="h-3.5 w-3.5" /> {stats.videos} videos</Badge>
              <Badge tone="neutral"><FileText className="h-3.5 w-3.5" /> {stats.files} files</Badge>
              <Badge tone="brand"><Wrench className="h-3.5 w-3.5" /> {stats.tools} tools</Badge>
            </div>
          </div>
        );
      },
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
  ];

  return (
    <>
      <PageHeader
        title="My programmes"
        description="Programmes connected to the learning content you support."
      />
      <MetricGrid columns={4}>
        <StatCard label="Programmes" value={programmes.length} subline="Programmes you support" dotColor="bid" accent="bid" />
        <StatCard label="My entrepreneurs" value={assigned.length} subline="Inferred from programme access" dotColor="info" accent="info" />
        <StatCard label="Learning assets" value={totalContentAssets} subline={`${totalModules} modules`} dotColor="warning" accent="warning" />
        <StatCard label="Content you own" value={contentOwned} subline={`${avgProgress}% average progress`} dotColor="success" accent="success" />
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
              Search by programme, module, status, or entrepreneur count.
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
                { value: 'archived', label: 'Archived' },
              ]}
              placeholder="All statuses"
              searchPlaceholder="Search statuses..."
            />
          </div>
        </TableToolbar>
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
