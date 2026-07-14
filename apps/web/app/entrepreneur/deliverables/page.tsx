'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ArrowRight, CalendarClock, CheckCircle2, Clock3, FileText, MessageSquareText, UploadCloud } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { MetricGrid } from '@/components/shared/MetricGrid';
import { StatCard } from '@/components/shared/StatCard';
import {
  TableEmptyState,
  TableFilterAutocomplete,
  TableFilterInput,
  TableFilterSelect,
  TablePagination,
  TableToolbar,
} from '@/components/shared/DataTable';
import { UploadDeliverableModal } from '@/components/entrepreneur/UploadDeliverableModal';
import { listDeliverableInstances, type DeliverableInstance } from '@/lib/api/deliverables';
import {
  getEntrepreneurDeliverableGroups,
  mapDeliverableInstanceToEntrepreneurDeliverable,
  type EntrepreneurDeliverableGroup,
} from '@/lib/deliverables/entrepreneur';
import { cn } from '@/lib/utils';
import type { BadgeTone, Deliverable, DeliverableStatus } from '@/types';
import { routes } from '@/lib/routes';

type StatusFilter = 'all' | 'needs-action' | 'under-review' | 'approved';

type GroupSummary = {
  total: number;
  needsAction: number;
  overdue: number;
  changes: number;
  submitted: number;
  approved: number;
  unreadFeedback: number;
  nextDue?: Deliverable;
};

const statusMeta: Record<DeliverableStatus, { label: string; tone: BadgeTone }> = {
  pending: { label: 'Not submitted', tone: 'amber' },
  overdue: { label: 'Overdue', tone: 'red' },
  submitted: { label: 'Under review', tone: 'blue' },
  'changes-requested': { label: 'Changes required', tone: 'amber' },
  reviewed: { label: 'Approved', tone: 'green' },
};

function formatDate(value?: string) {
  if (!value) return 'No due date';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

async function fetchEntrepreneurDeliverableInstances() {
  const firstPage = await listDeliverableInstances({ take: 100 });
  const items: DeliverableInstance[] = [...firstPage.items];
  let cursor = firstPage.nextCursor;

  while (cursor) {
    const nextPage = await listDeliverableInstances({ take: 100, cursor });
    items.push(...nextPage.items);
    cursor = nextPage.nextCursor;
  }

  return items;
}

function getDeliverablesForGroup(
  group: EntrepreneurDeliverableGroup,
  deliverables: Deliverable[],
) {
  return deliverables.filter((item) => item.programmeId === group.programmeId);
}

function isNeedsAction(deliverable: Deliverable) {
  return deliverable.status === 'pending' || deliverable.status === 'overdue' || deliverable.status === 'changes-requested';
}

function hasUnreadFeedback(deliverable: Deliverable) {
  return deliverable.feedbackHistory?.some((feedback) => !feedback.readAt) ?? false;
}

function getGroupSummary(items: Deliverable[]): GroupSummary {
  const actionableItems = items.filter(isNeedsAction);
  const nextDue = actionableItems
    .filter((item) => item.dueDate)
    .sort((left, right) => new Date(left.dueDate ?? '').getTime() - new Date(right.dueDate ?? '').getTime())[0];

  return {
    total: items.length,
    needsAction: actionableItems.length,
    overdue: items.filter((item) => item.status === 'overdue').length,
    changes: items.filter((item) => item.status === 'changes-requested').length,
    submitted: items.filter((item) => item.status === 'submitted').length,
    approved: items.filter((item) => item.status === 'reviewed').length,
    unreadFeedback: items.filter(hasUnreadFeedback).length,
    nextDue,
  };
}

function getPrimaryBadge(summary: GroupSummary) {
  if (summary.changes > 0) return { label: `${summary.changes} changes required`, tone: 'amber' as BadgeTone };
  if (summary.overdue > 0) return { label: `${summary.overdue} overdue`, tone: 'red' as BadgeTone };
  if (summary.needsAction > 0) return { label: `${summary.needsAction} to submit`, tone: 'amber' as BadgeTone };
  if (summary.submitted > 0) return { label: `${summary.submitted} under review`, tone: 'blue' as BadgeTone };
  if (summary.approved > 0) return { label: `${summary.approved} approved`, tone: 'green' as BadgeTone };
  return { label: 'No deliverables yet', tone: 'neutral' as BadgeTone };
}

function matchesStatus(summary: GroupSummary, filter: StatusFilter) {
  if (filter === 'all') return true;
  if (filter === 'needs-action') return summary.needsAction > 0;
  if (filter === 'under-review') return summary.submitted > 0;
  return summary.total > 0 && summary.approved === summary.total;
}

export default function DeliverablesPage() {
  const router = useRouter();
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('all');
  const [groupFilter, setGroupFilter] = React.useState('all');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(6);

  const deliverablesQuery = useQuery({
    queryKey: ['deliverable-instances', 'entrepreneur'],
    queryFn: fetchEntrepreneurDeliverableInstances,
  });

  const apiInstances = deliverablesQuery.data ?? [];
  const deliverables = React.useMemo(
    () => apiInstances.map(mapDeliverableInstanceToEntrepreneurDeliverable),
    [apiInstances],
  );
  const accessibleGroups = React.useMemo(
    () => getEntrepreneurDeliverableGroups(apiInstances),
    [apiInstances],
  );

  const groupOptions = React.useMemo(
    () => accessibleGroups.map((group) => ({ value: group.id, label: group.label })),
    [accessibleGroups],
  );

  const summaries = React.useMemo(() => {
    return new Map(accessibleGroups.map((group) => [group.id, getGroupSummary(getDeliverablesForGroup(group, deliverables))]));
  }, [accessibleGroups, deliverables]);

  const totalRequired = React.useMemo(
    () => accessibleGroups.reduce((count, group) => count + (summaries.get(group.id)?.total ?? 0), 0),
    [accessibleGroups, summaries],
  );
  const needsAction = React.useMemo(
    () => accessibleGroups.reduce((count, group) => count + (summaries.get(group.id)?.needsAction ?? 0), 0),
    [accessibleGroups, summaries],
  );
  const underReview = React.useMemo(
    () => accessibleGroups.reduce((count, group) => count + (summaries.get(group.id)?.submitted ?? 0), 0),
    [accessibleGroups, summaries],
  );
  const approved = React.useMemo(
    () => accessibleGroups.reduce((count, group) => count + (summaries.get(group.id)?.approved ?? 0), 0),
    [accessibleGroups, summaries],
  );

  const filteredGroups = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return accessibleGroups.filter((group) => {
      const items = getDeliverablesForGroup(group, deliverables);
      const summary = summaries.get(group.id) ?? getGroupSummary(items);
      const matchesGroup = groupFilter === 'all' || group.id === groupFilter;
      const matchesCurrentStatus = matchesStatus(summary, statusFilter);
      const matchesQuery =
        !needle ||
        [
          group.label,
          group.description,
          ...items.map((item) => `${item.name} ${item.fileName ?? ''} ${item.notes ?? ''}`),
          ...items.flatMap((item) => item.feedbackHistory?.map((feedback) => feedback.message) ?? []),
        ]
          .join(' ')
          .toLowerCase()
          .includes(needle);
      return matchesGroup && matchesCurrentStatus && matchesQuery;
    });
  }, [accessibleGroups, deliverables, groupFilter, query, statusFilter, summaries]);

  React.useEffect(() => {
    setPage(1);
  }, [groupFilter, query, statusFilter, pageSize]);

  const pageRows = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredGroups.slice(start, start + pageSize);
  }, [filteredGroups, page, pageSize]);

  return (
    <>
      <PageHeader
        title="Deliverables"
        description="Track work to submit, BID feedback, and approved submissions."
        actions={
          <Button onClick={() => setUploadOpen(true)}>
            <UploadCloud className="h-4 w-4" />
            Upload deliverable
          </Button>
        }
      />

      <MetricGrid>
        <StatCard label="Required" value={totalRequired} dotColor="bid" />
        <StatCard label="Needs action" value={needsAction} dotColor="warning" />
        <StatCard label="Under review" value={underReview} dotColor="info" />
        <StatCard label="Approved" value={approved} dotColor="success" />
      </MetricGrid>

      <Card className="mt-4">
        <CardHeader
          title="Deliverable workspace"
          description={`${filteredGroups.length} programme${filteredGroups.length === 1 ? '' : 's'} in this view`}
        />
        <TableToolbar>
          <div>
            <div className="text-sm font-medium text-ink">Find the work you need to submit</div>
            <div className="mt-0.5 text-sm text-ink-muted">
              Search by programme, deliverable, file, or feedback.
            </div>
          </div>
          <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-[minmax(220px,280px)_minmax(180px,220px)_minmax(170px,200px)]">
            <TableFilterInput
              icon
              placeholder="Search deliverables..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <TableFilterAutocomplete
              value={groupFilter}
              onValueChange={setGroupFilter}
              options={[{ value: 'all', label: 'All programmes' }, ...groupOptions]}
              placeholder="All programmes"
              searchPlaceholder="Search programmes..."
              emptyMessage="No programme found."
            />
            <TableFilterSelect
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            >
              <option value="all">All statuses</option>
              <option value="needs-action">Needs action</option>
              <option value="under-review">Under review</option>
              <option value="approved">Approved</option>
            </TableFilterSelect>
          </div>
        </TableToolbar>

        {deliverablesQuery.isLoading ? (
          <TableEmptyState title="Loading deliverables" description="Fetching your submission requirements." />
        ) : pageRows.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {pageRows.map((group) => {
              const items = getDeliverablesForGroup(group, deliverables);
              const summary = summaries.get(group.id) ?? getGroupSummary(items);
              const primaryBadge = getPrimaryBadge(summary);
              const nextDue = summary.nextDue;
              const accentBg =
                group.accent === 'bid' ? 'bg-bid-light text-bid' : group.accent === 'info' ? 'bg-info-light text-info' : 'bg-success-light text-success';
              const completion = summary.total > 0 ? Math.round((summary.approved / summary.total) * 100) : 0;

              return (
                <button
                  type="button"
                  key={group.id}
                  onClick={() => router.push(routes.entrepreneur.deliverableGroup(group.id))}
                  className={cn(
                    'group flex min-h-[252px] flex-col rounded-xl border border-black/[0.08] bg-white p-5 text-left shadow-[0_14px_34px_rgba(26,26,26,0.045)] transition hover:border-bid/40 hover:shadow-[0_18px_42px_rgba(26,26,26,0.07)] focus:outline-none focus:ring-2 focus:ring-bid/20',
                    group.accent === 'bid' && 'border-l-[3px] border-l-bid',
                    group.accent === 'info' && 'border-l-[3px] border-l-info',
                    group.accent === 'success' && 'border-l-[3px] border-l-success',
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-xl', accentBg)}>
                      <FileText className="h-5 w-5" strokeWidth={1.7} />
                    </span>
                    <Badge tone={primaryBadge.tone}>{primaryBadge.label}</Badge>
                  </div>

                  <div className="mt-4 min-w-0">
                    <div className="text-base font-semibold leading-6 text-ink transition-colors group-hover:text-bid">
                      {group.label}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-ink-muted">
                      {group.description}
                    </p>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <MiniMetric label="Action" value={summary.needsAction} tone={summary.needsAction > 0 ? 'warning' : 'neutral'} />
                    <MiniMetric label="Review" value={summary.submitted} tone={summary.submitted > 0 ? 'info' : 'neutral'} />
                    <MiniMetric label="Approved" value={summary.approved} tone={summary.approved > 0 ? 'success' : 'neutral'} />
                  </div>

                  <div className="mt-4 rounded-xl border border-line bg-surface-subtle px-3 py-3">
                    {nextDue ? (
                      <div className="flex items-start gap-2">
                        <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-ink">Next due: {nextDue.name}</div>
                          <div className="mt-0.5 text-sm text-ink-muted">{formatDate(nextDue.dueDate)}</div>
                        </div>
                      </div>
                    ) : summary.unreadFeedback > 0 ? (
                      <div className="flex items-start gap-2">
                        <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                        <div>
                          <div className="text-sm font-medium text-ink">New feedback available</div>
                          <div className="mt-0.5 text-sm text-ink-muted">Open this programme to review BID feedback.</div>
                        </div>
                      </div>
                    ) : summary.submitted > 0 ? (
                      <div className="flex items-start gap-2">
                        <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-info" />
                        <div>
                          <div className="text-sm font-medium text-ink">Waiting for BID review</div>
                          <div className="mt-0.5 text-sm text-ink-muted">Submitted work is in the review queue.</div>
                        </div>
                      </div>
                    ) : summary.total > 0 && summary.approved === summary.total ? (
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                        <div>
                          <div className="text-sm font-medium text-ink">All deliverables approved</div>
                          <div className="mt-0.5 text-sm text-ink-muted">No action needed right now.</div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" />
                        <div>
                          <div className="text-sm font-medium text-ink">No required deliverables yet</div>
                          <div className="mt-0.5 text-sm text-ink-muted">BID has not added submissions here.</div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-auto pt-4">
                    <div className="mb-2 h-2 overflow-hidden rounded-full bg-surface-subtle">
                      <div className="h-full rounded-full bg-bid" style={{ width: `${completion}%` }} />
                    </div>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-ink-muted">{completion}% approved</span>
                      <span className="inline-flex items-center gap-1 font-medium text-bid">
                        Open programme <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <TableEmptyState
            title={deliverablesQuery.isError ? 'Deliverables could not be loaded' : 'No deliverable programmes found'}
            description={deliverablesQuery.isError ? 'Please refresh the page and try again.' : 'Try changing the search term or status filter.'}
          />
        )}

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
      </Card>

      <UploadDeliverableModal open={uploadOpen} onOpenChange={setUploadOpen} deliverableOptions={deliverables} />
    </>
  );
}

function MiniMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'warning' | 'info' | 'success' | 'neutral';
}) {
  const toneClass = {
    warning: 'text-warning-dark bg-warning-light',
    info: 'text-info bg-info-light',
    success: 'text-success-dark bg-success-light',
    neutral: 'text-ink-muted bg-surface-subtle',
  }[tone];

  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2">
      <div className="text-xs text-ink-muted">{label}</div>
      <div className={cn('mt-1 inline-flex min-w-7 justify-center rounded-md px-2 py-0.5 text-sm font-semibold', toneClass)}>
        {value}
      </div>
    </div>
  );
}
