'use client';

import * as React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { MetricGrid } from '@/components/shared/MetricGrid';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardHeader } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { Avatar } from '@/components/shared/Avatar';
import { ProgressBar } from '@/components/shared/ProgressBar';
import {
  DataTable,
  RowActions,
  TableFilterInput,
  TableFilterSelect,
  TablePagination,
  TableToolbar,
  type Column,
} from '@/components/shared/DataTable';
import { ViewEntrepreneurModal } from '@/components/admin/ViewEntrepreneurModal';
import { entrepreneurs } from '@/lib/mock-data/entrepreneurs';
import { programById } from '@/lib/mock-data/programs';
import { sectorById, stageById } from '@/lib/mock-data/definitions';
import type { Entrepreneur } from '@/types';

const currentTrainerId = 't-kofi';
const today = new Date('2026-07-07');
const ALL = 'all';

function daysSince(value?: string) {
  if (!value) return null;
  return Math.max(Math.floor((today.getTime() - new Date(value).getTime()) / 86_400_000), 0);
}

function getFollowUp(entrepreneur: Entrepreneur) {
  const updateAge = daysSince(entrepreneur.lastUpdateAt);
  if (entrepreneur.metrics.trainingProgress < 50) return { label: 'Low progress', tone: 'amber' as const };
  if (updateAge == null || updateAge > 60) return { label: 'Update overdue', tone: 'red' as const };
  return { label: 'On track', tone: 'green' as const };
}

export default function TrainerEntrepreneursPage() {
  const [query, setQuery] = React.useState('');
  const [programmeFilter, setProgrammeFilter] = React.useState(ALL);
  const [followUpFilter, setFollowUpFilter] = React.useState(ALL);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [viewTarget, setViewTarget] = React.useState<Entrepreneur | null>(null);

  const assigned = React.useMemo(
    () => entrepreneurs.filter((entrepreneur) => entrepreneur.trainerId === currentTrainerId),
    [],
  );
  const programmeOptions = React.useMemo(
    () => Array.from(new Set(assigned.map((entrepreneur) => entrepreneur.programmeId).filter(Boolean) as string[])),
    [assigned],
  );
  const needsAttention = assigned.filter((entrepreneur) => getFollowUp(entrepreneur).tone !== 'green').length;
  const avgTraining = Math.round(assigned.reduce((sum, entrepreneur) => sum + entrepreneur.metrics.trainingProgress, 0) / Math.max(assigned.length, 1));
  const submittedDeliverables = assigned.reduce((sum, entrepreneur) => sum + entrepreneur.metrics.deliverablesDone, 0);

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return assigned.filter((entrepreneur) => {
      const followUp = getFollowUp(entrepreneur);
      const matchesQuery = !needle || [
        entrepreneur.businessName,
        entrepreneur.representative,
        entrepreneur.email,
        sectorById[entrepreneur.sector]?.label ?? entrepreneur.sector,
        stageById[entrepreneur.stage]?.label ?? entrepreneur.stage,
        programById(entrepreneur.programmeId)?.name ?? '',
      ].join(' ').toLowerCase().includes(needle);
      const matchesProgramme = programmeFilter === ALL || entrepreneur.programmeId === programmeFilter;
      const matchesFollowUp = followUpFilter === ALL || followUp.label === followUpFilter;
      return matchesQuery && matchesProgramme && matchesFollowUp;
    });
  }, [assigned, followUpFilter, programmeFilter, query]);

  React.useEffect(() => {
    setPage(1);
  }, [query, programmeFilter, followUpFilter, pageSize]);

  const pageRows = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const columns: Column<Entrepreneur>[] = [
    {
      key: 'action',
      header: 'Action',
      cell: (entrepreneur) => <RowActions actions={[{ label: 'View profile', onSelect: () => setViewTarget(entrepreneur) }]} />,
      className: 'w-[84px]',
    },
    {
      key: 'business',
      header: 'Business',
      cell: (entrepreneur) => (
        <button type="button" onClick={() => setViewTarget(entrepreneur)} className="flex min-w-[250px] items-center gap-3 rounded-lg text-left outline-none transition hover:text-bid focus-visible:ring-2 focus-visible:ring-bid/20">
          <Avatar initials={entrepreneur.initials} size={32} />
          <span className="min-w-0">
            <span className="block font-medium text-ink">{entrepreneur.businessName}</span>
            <span className="mt-1 block text-sm text-ink-muted">{entrepreneur.representative}</span>
          </span>
        </button>
      ),
    },
    {
      key: 'programme',
      header: 'Programme',
      cell: (entrepreneur) => <span className="min-w-[220px] block">{programById(entrepreneur.programmeId)?.name ?? 'Not assigned'}</span>,
    },
    {
      key: 'stage',
      header: 'Stage / sector',
      cell: (entrepreneur) => (
        <div className="flex min-w-[180px] flex-wrap gap-1.5">
          <Badge tone={stageById[entrepreneur.stage]?.color ?? 'neutral'}>{stageById[entrepreneur.stage]?.label ?? entrepreneur.stage}</Badge>
          <Badge tone={sectorById[entrepreneur.sector]?.color ?? 'neutral'}>{sectorById[entrepreneur.sector]?.label ?? entrepreneur.sector}</Badge>
        </div>
      ),
    },
    {
      key: 'progress',
      header: 'Training',
      cell: (entrepreneur) => (
        <div className="min-w-[180px]">
          <ProgressBar value={entrepreneur.metrics.trainingProgress} width="100%" className="h-2" />
          <div className="mt-1 text-sm text-ink-muted">{entrepreneur.metrics.trainingProgress}% complete</div>
        </div>
      ),
    },
    {
      key: 'deliverables',
      header: 'Deliverables',
      cell: (entrepreneur) => `${entrepreneur.metrics.deliverablesDone}/${entrepreneur.metrics.deliverablesTotal}`,
    },
    {
      key: 'followup',
      header: 'Follow-up',
      cell: (entrepreneur) => {
        const followUp = getFollowUp(entrepreneur);
        return <Badge tone={followUp.tone}>{followUp.label}</Badge>;
      },
    },
  ];

  return (
    <>
      <PageHeader title="My Entrepreneurs" description="Your assigned entrepreneur portfolio, progress, and coaching follow-ups." />

      <MetricGrid columns={4}>
        <StatCard label="Assigned" value={assigned.length} subline="Entrepreneurs in your portfolio" dotColor="bid" accent="bid" />
        <StatCard label="Need attention" value={needsAttention} subline="Low progress or overdue updates" dotColor="warning" accent="warning" />
        <StatCard label="Avg. progress" value={`${avgTraining}%`} subline="Training completion" dotColor="success" accent="success" />
        <StatCard label="Deliverables approved" value={submittedDeliverables} subline="Across assigned entrepreneurs" dotColor="info" accent="info" />
      </MetricGrid>

      <Card className="mt-4">
        <CardHeader title="Assigned portfolio" description={`${filtered.length} entrepreneur${filtered.length === 1 ? '' : 's'} in this view`} />
        <TableToolbar>
          <div>
            <div className="text-sm font-medium text-ink">Filter entrepreneurs</div>
            <div className="mt-0.5 text-sm text-ink-muted">Search by business, representative, programme, stage, or sector.</div>
          </div>
          <div className="grid w-full gap-2 lg:w-auto lg:grid-cols-[280px_220px_180px]">
            <TableFilterInput icon placeholder="Search entrepreneurs..." value={query} onChange={(event) => setQuery(event.target.value)} />
            <TableFilterSelect value={programmeFilter} onChange={(event) => setProgrammeFilter(event.target.value)}>
              <option value={ALL}>All programmes</option>
              {programmeOptions.map((programmeId) => <option key={programmeId} value={programmeId}>{programById(programmeId)?.name}</option>)}
            </TableFilterSelect>
            <TableFilterSelect value={followUpFilter} onChange={(event) => setFollowUpFilter(event.target.value)}>
              <option value={ALL}>All follow-ups</option>
              <option value="On track">On track</option>
              <option value="Low progress">Low progress</option>
              <option value="Update overdue">Update overdue</option>
            </TableFilterSelect>
          </div>
        </TableToolbar>
        <DataTable columns={columns} rows={pageRows} rowKey={(entrepreneur) => entrepreneur.id} emptyMessage="No assigned entrepreneurs match this view." tableClassName="min-w-[1120px]" />
        <TablePagination page={page} pageSize={pageSize} totalItems={filtered.length} onPageChange={setPage} onPageSizeChange={(next) => { setPageSize(next); setPage(1); }} />
      </Card>

      {viewTarget && <ViewEntrepreneurModal open={!!viewTarget} onOpenChange={(open) => !open && setViewTarget(null)} entrepreneur={viewTarget} />}
    </>
  );
}
