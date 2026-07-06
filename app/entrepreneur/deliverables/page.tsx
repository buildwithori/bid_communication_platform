'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { FileText } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import {
  TableFilterInput,
  TablePagination,
  TableToolbar,
} from '@/components/shared/DataTable';
import { UploadDeliverableModal } from '@/components/entrepreneur/UploadDeliverableModal';
import { programs } from '@/lib/mock-data/programs';
import { deliverableGroups } from '@/lib/mock-data';
import { useEntrepreneurStore } from '@/lib/stores/entrepreneur-store';
import { cn } from '@/lib/utils';
import type { Deliverable, Program } from '@/types';
import { routes } from '@/lib/routes';

const groupProgrammeMap: Record<string, Program | undefined> = {};
programs.forEach((p) => {
  const grp = deliverableGroups.find((g) => g.programmeId === p.id);
  if (grp) groupProgrammeMap[grp.id] = p;
});

export default function DeliverablesPage() {
  const router = useRouter();
  const { deliverables } = useEntrepreneurStore();
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'pending' | 'done'>('all');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(6);

  const filteredGroups = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return deliverableGroups.filter((group) => {
      const items = getDeliverablesForGroup(group, deliverables);
      const pending = items.some((item) => item.status === 'pending' || item.status === 'overdue' || item.status === 'changes-requested');
      const done = items.some((item) => item.status === 'reviewed');
      const program = groupProgrammeMap[group.id];
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'pending' && pending) ||
        (statusFilter === 'done' && done && !pending);
      const matchesQuery =
        !needle ||
        [group.label, program?.description ?? '', ...items.map((item) => item.name)]
          .join(' ')
          .toLowerCase()
          .includes(needle);
      return matchesStatus && matchesQuery;
    });
  }, [deliverables, query, statusFilter]);

  React.useEffect(() => {
    setPage(1);
  }, [query, statusFilter, pageSize]);

  const pageRows = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredGroups.slice(start, start + pageSize);
  }, [filteredGroups, page, pageSize]);

  return (
    <>
      <PageHeader
        title="Deliverables"
        description="Browse deliverables by programme, or view general deliverables"
        actions={
          <Button onClick={() => setUploadOpen(true)}>+ Upload deliverable</Button>
        }
      />
      <TableToolbar>
        <div>
          <div className="text-sm font-medium text-ink">Find the work you need to submit</div>
          <div className="mt-0.5 text-sm text-ink-muted">
            {filteredGroups.length} deliverable group{filteredGroups.length === 1 ? '' : 's'} shown.
          </div>
        </div>
        <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-[240px_160px]">
          <TableFilterInput
            icon
            placeholder="Search deliverables..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
            className="h-9 rounded-lg border border-black/[0.1] bg-white px-3 text-sm font-normal text-ink shadow-sm outline-none focus:border-bid focus:ring-2 focus:ring-bid/10"
          >
            <option value="all">All statuses</option>
            <option value="pending">Has pending work</option>
            <option value="done">Completed</option>
          </select>
        </div>
      </TableToolbar>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {pageRows.map((g) => {
          const program = groupProgrammeMap[g.id];
          const items = getDeliverablesForGroup(g, deliverables);
          const pending = items.filter((d) => d.status === 'pending' || d.status === 'overdue').length;
          const changes = items.filter((d) => d.status === 'changes-requested').length;
          const submitted = items.filter((d) => d.status === 'submitted').length;
          const done = items.filter((d) => d.status === 'reviewed').length;
          const accentBg =
            g.accent === 'bid' ? 'bg-bid-light' : g.accent === 'info' ? 'bg-info-light' : 'bg-success-light';
          return (
            <Card
              key={g.id}
              accent={g.accent}
              onClick={() => router.push(routes.entrepreneur.deliverableGroup(g.id))}
              className={cn('cursor-pointer transition-colors hover:border-bid')}
            >
              <div
                className={cn(
                  'mb-3 flex h-[38px] w-[38px] items-center justify-center rounded-[9px]',
                  accentBg,
                )}
              >
                <FileText
                  className={cn(
                    'h-[18px] w-[18px]',
                    g.accent === 'bid' ? 'text-bid' : g.accent === 'info' ? 'text-info' : 'text-success',
                  )}
                  strokeWidth={1.5}
                />
              </div>
              <div className="mb-1 text-[13px] font-medium">{g.label}</div>
              <div className="mb-2.5 text-[10px] text-ink-muted">
                {program?.description ?? 'Not tied to a specific programme'}
              </div>
              {changes > 0 ? (
                <Badge tone="amber">{changes} changes required</Badge>
              ) : pending > 0 ? (
                <Badge tone="amber">{pending} not submitted</Badge>
              ) : submitted > 0 ? (
                <Badge tone="blue">{submitted} under review</Badge>
              ) : (
                <Badge tone="brand">{done} done</Badge>
              )}
            </Card>
          );
        })}
      </div>
      <TablePagination
        page={page}
        pageSize={pageSize}
        totalItems={filteredGroups.length}
        pageSizeOptions={[6, 12, 24]}
        onPageChange={setPage}
        onPageSizeChange={(next) => {
          setPageSize(next);
          setPage(1);
        }}
      />

      <UploadDeliverableModal open={uploadOpen} onOpenChange={setUploadOpen} />
    </>
  );
}

function getDeliverablesForGroup(
  group: (typeof deliverableGroups)[number],
  deliverables: Deliverable[],
) {
  if (group.id === 'g-general') {
    return deliverables.filter((item) => item.group === 'general');
  }
  return deliverables.filter((item) => item.programmeId === group.programmeId);
}
