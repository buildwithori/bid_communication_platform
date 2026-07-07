'use client';

import * as React from 'react';
import { BookOpen, FileText, Layers3, PlayCircle, Users } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { MetricGrid } from '@/components/shared/MetricGrid';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardHeader } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { DataTable, RowActions, TablePagination, type Column } from '@/components/shared/DataTable';
import { entrepreneurs } from '@/lib/mock-data/entrepreneurs';
import { contentItems, modulesForProgram, programById } from '@/lib/mock-data/programs';
import type { Program } from '@/types';

const currentTrainerId = 't-kofi';

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getProgramStats(program: Program) {
  const modules = modulesForProgram(program.id);
  const items = modules.flatMap((module) => module.contentItemIds.map((id) => contentItems.find((item) => item.id === id)).filter(Boolean) as typeof contentItems);
  return {
    modules,
    videos: items.filter((item) => item.type === 'video').length,
    files: items.filter((item) => item.type === 'pdf').length,
    tools: items.filter((item) => item.type === 'tool').length,
  };
}

export default function TrainerProgrammesPage() {
  const assigned = React.useMemo(() => entrepreneurs.filter((entrepreneur) => entrepreneur.trainerId === currentTrainerId), []);
  const programmes = React.useMemo(() => {
    const ids = Array.from(new Set(assigned.map((entrepreneur) => entrepreneur.programmeId).filter(Boolean) as string[]));
    return ids.map((id) => programById(id)).filter(Boolean) as Program[];
  }, [assigned]);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const pageRows = programmes.slice((page - 1) * pageSize, page * pageSize);
  const avgProgress = Math.round(programmes.reduce((sum, programme) => sum + programme.progress, 0) / Math.max(programmes.length, 1));
  const totalModules = programmes.reduce((sum, programme) => sum + modulesForProgram(programme.id).length, 0);

  const columns: Column<Program>[] = [
    {
      key: 'action',
      header: 'Action',
      cell: (programme) => <RowActions actions={[{ label: 'Open programme context', onSelect: () => {} }]} />,
      className: 'w-[84px]',
    },
    {
      key: 'programme',
      header: 'Programme',
      cell: (programme) => (
        <div className="min-w-[280px]">
          <div className="font-medium text-ink">{programme.name}</div>
          <div className="mt-1 line-clamp-2 text-sm leading-5 text-ink-muted">{programme.description}</div>
        </div>
      ),
    },
    {
      key: 'assigned',
      header: 'My entrepreneurs',
      cell: (programme) => assigned.filter((entrepreneur) => entrepreneur.programmeId === programme.id).length,
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
      key: 'modules',
      header: 'Learning assets',
      cell: (programme) => {
        const stats = getProgramStats(programme);
        return `${stats.modules.length} modules · ${stats.videos} videos · ${stats.files + stats.tools} files/tools`;
      },
    },
    {
      key: 'timeline',
      header: 'Timeline',
      cell: (programme) => `${formatDate(programme.startDate)} - ${formatDate(programme.endDate)}`,
    },
  ];

  return (
    <>
      <PageHeader title="My Programmes" description="Programmes where you support at least one entrepreneur." />
      <MetricGrid columns={4}>
        <StatCard label="Programmes" value={programmes.length} subline="In your trainer scope" dotColor="bid" accent="bid" />
        <StatCard label="Assigned entrepreneurs" value={assigned.length} subline="Across these programmes" dotColor="info" accent="info" />
        <StatCard label="Modules" value={totalModules} subline="Curriculum to reference" dotColor="warning" accent="warning" />
        <StatCard label="Avg. progress" value={`${avgProgress}%`} subline="Programme completion" dotColor="success" accent="success" />
      </MetricGrid>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        {programmes.map((programme) => {
          const stats = getProgramStats(programme);
          const assignedCount = assigned.filter((entrepreneur) => entrepreneur.programmeId === programme.id).length;
          return (
            <Card key={programme.id} accent={programme.accent}>
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-ink">{programme.name}</div>
                  <p className="mt-2 text-sm leading-6 text-ink-muted">{programme.description}</p>
                </div>
                <Badge tone={programme.status === 'active' ? 'green' : 'neutral'}>{programme.status}</Badge>
              </div>
              <ProgressBar value={programme.progress} width="100%" className="h-2" />
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <MiniStat icon={Users} label="My entrepreneurs" value={assignedCount} />
                <MiniStat icon={BookOpen} label="Modules" value={stats.modules.length} />
                <MiniStat icon={PlayCircle} label="Videos" value={stats.videos} />
                <MiniStat icon={FileText} label="Files/tools" value={stats.files + stats.tools} />
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="mt-4">
        <CardHeader title="Programme context" description="Use this to understand the curriculum and timing behind your assigned entrepreneurs." />
        <DataTable columns={columns} rows={pageRows} rowKey={(programme) => programme.id} emptyMessage="No programmes assigned to this trainer." tableClassName="min-w-[1000px]" />
        <TablePagination page={page} pageSize={pageSize} totalItems={programmes.length} onPageChange={setPage} onPageSizeChange={(next) => { setPageSize(next); setPage(1); }} />
      </Card>
    </>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: typeof Layers3; label: string; value: number }) {
  return (
    <div className="rounded-lg bg-surface-subtle px-3 py-2">
      <div className="flex items-center gap-1.5 text-xs text-ink-muted"><Icon className="h-3.5 w-3.5" />{label}</div>
      <div className="mt-1 text-lg font-semibold text-ink">{value}</div>
    </div>
  );
}
