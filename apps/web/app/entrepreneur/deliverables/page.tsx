'use client';

import { useDebouncedValue } from '@/lib/search';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowRight, CalendarClock, FileText, MessageSquareText, UploadCloud } from 'lucide-react';
import { UploadDeliverableModal } from '@/components/entrepreneur/UploadDeliverableModal';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { Card, CardHeader } from '@/components/shared/Card';
import { TableEmptyState, TableFilterAutocomplete, TableFilterInput, TableFilterSelect, TablePagination, TableToolbar } from '@/components/shared/DataTable';
import { MetricGrid } from '@/components/shared/MetricGrid';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { useDeliverableGroupsPage, useLazyDeliverableGroups, type DeliverableGroup, type DeliverableGroupQuery } from '@/lib/api/deliverables';
import { routes } from '@/lib/routes';
import type { BadgeTone } from '@/types';

const ALL = 'all';
type StatusFilter = typeof ALL | NonNullable<DeliverableGroupQuery['view']>;

function formatDate(value?: string | null) {
  if (!value) return 'No open due date';
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function primaryBadge(group: DeliverableGroup): { label: string; tone: BadgeTone } {
  if (group.counts.changes_required > 0) return { label: group.counts.changes_required + ' changes required', tone: 'amber' };
  if (group.counts.overdue > 0) return { label: group.counts.overdue + ' overdue', tone: 'red' };
  if (group.needsAction > 0) return { label: group.needsAction + ' to submit', tone: 'amber' };
  if (group.counts.submitted > 0) return { label: group.counts.submitted + ' under review', tone: 'blue' };
  return { label: group.counts.approved + ' approved', tone: 'green' };
}

export default function DeliverablesPage() {
  const router = useRouter();
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const debouncedQuery = useDebouncedValue(query.trim());
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>(ALL);
  const [programmeFilter, setProgrammeFilter] = React.useState(ALL);
  const [pageSize, setPageSize] = React.useState(6);
  const [lookupOpen, setLookupOpen] = React.useState(false);
  const [lookupSearch, setLookupSearch] = React.useState('');
  const groups = useDeliverableGroupsPage({
    search: debouncedQuery || undefined,
    programmeId: programmeFilter === ALL ? undefined : programmeFilter,
    view: statusFilter === ALL ? undefined : statusFilter,
    take: pageSize,
  });
  const lookup = useLazyDeliverableGroups({ enabled: lookupOpen, search: lookupSearch || undefined, take: 20 });
  const summary = groups.summary;
  const needsAction = (summary?.not_submitted ?? 0) + (summary?.overdue ?? 0) + (summary?.changes_required ?? 0);

  function resetFilters() {
    setQuery('');
    setStatusFilter(ALL);
    setProgrammeFilter(ALL);
    groups.resetPagination();
  }

  return (
    <>
      <PageHeader
        title="Deliverables"
        description="Track work to submit, BID feedback, and approved submissions."
        actions={<Button onClick={() => setUploadOpen(true)}><UploadCloud className="h-4 w-4" />Upload deliverable</Button>}
      />

      <MetricGrid>
        <StatCard label="Required" value={summary ? summary.not_submitted + summary.overdue + summary.submitted + summary.changes_required + summary.approved : '—'} dotColor="bid" />
        <StatCard label="Needs action" value={summary ? needsAction : '—'} dotColor="warning" />
        <StatCard label="Under review" value={summary?.submitted ?? '—'} dotColor="info" />
        <StatCard label="Approved" value={summary?.approved ?? '—'} dotColor="success" />
      </MetricGrid>

      {groups.unreadFeedbackTotal > 0 && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-warning/20 bg-warning-light px-4 py-3 text-sm text-warning-dark">
          <MessageSquareText className="h-4 w-4 shrink-0" />
          {groups.unreadFeedbackTotal} deliverable{groups.unreadFeedbackTotal === 1 ? ' has' : 's have'} new BID feedback.
        </div>
      )}

      <Card className="mt-4">
        <CardHeader title="Deliverable workspace" description={groups.isLoading ? 'Loading programme groups...' : groups.totalItems + ' programme group' + (groups.totalItems === 1 ? '' : 's') + ' in this view'} />
        <TableToolbar>
          <div>
            <div className="text-sm font-medium text-ink">Find the work you need to submit</div>
            <div className="mt-0.5 text-sm text-ink-muted">Search and filter without loading every deliverable.</div>
          </div>
          <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-[minmax(220px,280px)_minmax(180px,220px)_minmax(170px,200px)]">
            <TableFilterInput icon placeholder="Search deliverables..." value={query} onChange={(event) => { setQuery(event.target.value); groups.resetPagination(); }} />
            <TableFilterAutocomplete
              value={programmeFilter}
              onValueChange={(value) => { setProgrammeFilter(value); groups.resetPagination(); }}
              options={[{ value: ALL, label: 'All programmes' }, ...lookup.rows.map((group) => ({ value: group.id, label: group.name }))]}
              placeholder="All programmes"
              searchPlaceholder="Search programmes..."
              emptyMessage="No programme found."
              onOpenChange={setLookupOpen}
              onSearchChange={setLookupSearch}
              isLoading={lookup.isLoading}
              hasMore={lookup.hasNextPage}
              onLoadMore={() => lookup.fetchNextPage()}
            />
            <TableFilterSelect value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as StatusFilter); groups.resetPagination(); }}>
              <option value={ALL}>All statuses</option>
              <option value="needs_action">Needs action</option>
              <option value="under_review">Under review</option>
              <option value="approved">Fully approved</option>
            </TableFilterSelect>
          </div>
        </TableToolbar>

        {groups.isLoading ? (
          <DeliverableGroupsSkeleton />
        ) : groups.isError ? (
          <TableEmptyState title="Deliverables could not be loaded" description={groups.error.message} action={<Button variant="outline" onClick={() => groups.refetch()}>Try again</Button>} />
        ) : groups.rows.length ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {groups.rows.map((group: DeliverableGroup, index: number) => {
              const badge = primaryBadge(group);
              const completion = group.total ? Math.round((group.counts.approved / group.total) * 100) : 0;
              const accent = index % 3 === 0 ? 'bg-bid-light text-bid' : index % 3 === 1 ? 'bg-info-light text-info' : 'bg-success-light text-success';
              return (
                <button key={group.id} type="button" onClick={() => router.push(routes.entrepreneur.deliverableGroup(group.id))} className="group rounded-2xl border border-line bg-card p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-bid/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bid/30">
                  <div className="flex items-start justify-between gap-3">
                    <span className={'grid h-11 w-11 place-items-center rounded-xl ' + accent}><FileText className="h-5 w-5" /></span>
                    <Badge tone={badge.tone}>{badge.label}</Badge>
                  </div>
                  <h2 className="mt-4 text-lg font-semibold text-ink">{group.name}</h2>
                  <p className="mt-1 text-sm leading-6 text-ink-muted">{group.accessType === 'free' ? 'Free programme deliverables and BID feedback.' : 'Assigned programme submissions, feedback, and approvals.'}</p>
                  <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-surface-subtle p-3 text-center">
                    <div><div className="text-lg font-semibold text-ink">{group.total}</div><div className="text-xs text-ink-muted">Required</div></div>
                    <div><div className="text-lg font-semibold text-warning-dark">{group.needsAction}</div><div className="text-xs text-ink-muted">Action</div></div>
                    <div><div className="text-lg font-semibold text-success-dark">{group.counts.approved}</div><div className="text-xs text-ink-muted">Approved</div></div>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-ink-muted"><span>Completion</span><span>{completion}%</span></div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-subtle"><div className="h-full rounded-full bg-success transition-all" style={{ width: completion + '%' }} /></div>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4 text-sm">
                    <span className="flex items-center gap-2 text-ink-muted"><CalendarClock className="h-4 w-4" />{formatDate(group.nextDueDate)}</span>
                    <span className="flex items-center gap-1 font-medium text-bid">Open workspace<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></span>
                  </div>
                  {group.unreadFeedback > 0 && <div className="mt-3 flex items-center gap-2 text-sm font-medium text-warning-dark"><AlertCircle className="h-4 w-4" />{group.unreadFeedback} new feedback item{group.unreadFeedback === 1 ? '' : 's'}</div>}
                </button>
              );
            })}
          </div>
        ) : (
          <TableEmptyState title="No deliverable groups match this view" description="Adjust the filters or clear the search." action={<Button variant="outline" onClick={resetFilters}>Clear filters</Button>} />
        )}

        <TablePagination page={groups.page} pageSize={pageSize} pageSizeOptions={[6, 12, 24]} totalItems={groups.totalItems} onPageChange={groups.setPage} onPageSizeChange={(next) => { setPageSize(next); groups.resetPagination(); }} />
      </Card>

      <UploadDeliverableModal open={uploadOpen} onOpenChange={setUploadOpen} />
    </>
  );
}

function DeliverableGroupsSkeleton() {
  return <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-[310px] animate-pulse rounded-2xl border border-line bg-surface-subtle" />)}</div>;
}
