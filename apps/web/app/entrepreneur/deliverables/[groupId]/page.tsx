'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, AlertTriangle, CheckCircle2, Clock3, FileText, MessageSquareText, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader, Skeleton } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { DataTable, RowActions, TableFilterInput, TableFilterSelect, TablePagination, TableToolbar, type Column } from '@/components/shared/DataTable';
import { UploadDeliverableModal } from '@/components/entrepreneur/UploadDeliverableModal';
import { Modal } from '@/components/shared/Modal';
import {
  useDeliverableFeedbackQuery,
  useDeliverableInstanceQuery,
  useDeliverableInstancesPage,
  useDeliverableSubmissionsQuery,
  useMarkDeliverableReviewReadMutation,
  type DeliverableFeedback,
  type DeliverableInstance,
  type DeliverableStatus,
} from '@/lib/api/deliverables';
import { useProgrammeDetailQuery } from '@/lib/api/programmes';
import { routes } from '@/lib/routes';
import type { BadgeTone } from '@/types';

const ALL = 'all';
const statusMeta: Record<DeliverableStatus, { label: string; tone: BadgeTone; helper: string }> = {
  not_submitted: { label: 'Not submitted', tone: 'amber', helper: 'Upload required' },
  overdue: { label: 'Overdue', tone: 'red', helper: 'Upload as soon as possible' },
  submitted: { label: 'Submitted', tone: 'blue', helper: 'Waiting for BID review' },
  changes_required: { label: 'Changes required', tone: 'amber', helper: 'Review feedback and resubmit' },
  approved: { label: 'Approved', tone: 'green', helper: 'Accepted by BID' },
};

function formatDate(value?: string | null) {
  if (!value) return 'No due date';
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isActionable(item: DeliverableInstance) {
  return item.status === 'not_submitted' || item.status === 'overdue' || item.status === 'changes_required';
}

export default function DeliverableListPage({ params }: { params: { groupId: string } }) {
  const programmeId = params.groupId;
  const router = useRouter();
  const searchParams = useSearchParams();
  const linkedDeliverableId = searchParams.get('deliverableId');
  const linkedDeliverable = useDeliverableInstanceQuery(linkedDeliverableId);
  const programme = useProgrammeDetailQuery(programmeId);
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [uploadTarget, setUploadTarget] = React.useState<DeliverableInstance | null>(null);
  const [historyTarget, setHistoryTarget] = React.useState<DeliverableInstance | null>(null);
  const linkedHistory = linkedDeliverable.data as DeliverableInstance | undefined;
  const displayedHistory = historyTarget ?? linkedHistory ?? null;
  function closeHistory() {
    setHistoryTarget(null);
    if (linkedDeliverableId) router.replace(`/entrepreneur/deliverables/${programmeId}`);
  }
  const [query, setQuery] = React.useState('');
  const deferredQuery = React.useDeferredValue(query.trim());
  const [statusFilter, setStatusFilter] = React.useState<typeof ALL | DeliverableStatus>(ALL);
  const [pageSize, setPageSize] = React.useState(10);
  const instances = useDeliverableInstancesPage({
    programmeId,
    search: deferredQuery || undefined,
    status: statusFilter === ALL ? undefined : statusFilter,
    take: pageSize,
  });
  const summary = instances.summary;
  const needsAction = (summary?.not_submitted ?? 0) + (summary?.overdue ?? 0) + (summary?.changes_required ?? 0);

  function openUpload(item?: DeliverableInstance) {
    setUploadTarget(item ?? null);
    setUploadOpen(true);
  }

  const columns: Column<DeliverableInstance>[] = [
    {
      key: 'actions',
      header: 'Action',
      className: 'w-[84px]',
      cell: (item) => {
        const actions = [] as Array<{ label: string; onSelect: () => void; disabled?: boolean }>;
        if (item.latestReview) actions.push({ label: 'View history', onSelect: () => setHistoryTarget(item) });
        if (isActionable(item)) actions.push({ label: item.status === 'changes_required' ? 'Resubmit file' : 'Upload file', onSelect: () => openUpload(item) });
        if (!actions.length) actions.push({ label: 'Awaiting BID review', onSelect: () => undefined, disabled: true });
        return <RowActions actions={actions} />;
      },
    },
    {
      key: 'deliverable',
      header: 'Deliverable',
      cell: (item) => {
        const meta = statusMeta[item.status];
        const Icon = item.status === 'approved' ? CheckCircle2 : item.status === 'submitted' ? Clock3 : AlertCircle;
        return (
          <div className="flex min-w-[270px] items-start gap-3">
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-bid-light text-bid"><Icon className="h-4 w-4" /></span>
            <div className="min-w-0">
              <div className="font-semibold text-ink">{item.deliverable}</div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
                <span>{meta.helper}</span>
                {item.periodStart && item.periodEnd && (
                  <span>{formatDate(item.periodStart)} – {formatDate(item.periodEnd)}</span>
                )}
                {item.hasUnreadFeedback && <Badge tone="amber">New feedback</Badge>}
                {item.submissionCount > 1 && <Badge tone="neutral">{item.submissionCount} versions</Badge>}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'due',
      header: 'Due date',
      cell: (item) => (
        <div className="min-w-[150px]">
          <div className="text-sm text-ink">{formatDate(item.dueDate)}</div>
          <div className="mt-1 text-xs text-ink-muted">{item.dueSource === 'manual_override' ? 'Manual override' : 'Programme rule'}</div>
        </div>
      ),
    },
    {
      key: 'submission',
      header: 'Latest submission',
      cell: (item) => (
        <div className="min-w-[230px]">
          <div className="truncate text-sm font-medium text-ink">{item.latestSubmission?.file.originalFilename ?? 'No file uploaded'}</div>
          <div className="mt-1 text-sm text-ink-muted">{item.latestSubmission ? 'Submitted ' + formatDate(item.latestSubmission.submittedAt) : 'Awaiting upload'}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (item) => <Badge tone={statusMeta[item.status].tone}>{statusMeta[item.status].label}</Badge>,
    },
  ];

  if (programme.isLoading || instances.isLoading) return <DeliverableWorkspaceSkeleton />;

  return (
    <>
      <Breadcrumb items={[{ label: 'Deliverables', href: routes.entrepreneur.deliverables }, { label: programme.data?.name ?? 'Programme' }]} />
      <PageHeader
        title={programme.data?.name ?? 'Programme deliverables'}
        description="Track required submissions, BID feedback, and approval status."
        actions={<Button onClick={() => openUpload()}><UploadCloud className="h-4 w-4" />Upload deliverable</Button>}
      />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card padding="sm"><div className="text-sm text-ink-muted">Required</div><div className="mt-1 text-2xl font-semibold">{instances.totalItems}</div></Card>
        <Card padding="sm"><div className="text-sm text-ink-muted">Needs action</div><div className="mt-1 text-2xl font-semibold text-warning-dark">{needsAction}</div></Card>
        <Card padding="sm"><div className="text-sm text-ink-muted">Approved</div><div className="mt-1 text-2xl font-semibold text-success-dark">{summary?.approved ?? 0}</div></Card>
      </div>

      <Card>
        <CardHeader title="Submission queue" description={(summary?.submitted ?? 0) + ' submitted, ' + needsAction + ' still needing entrepreneur action'} />
        <TableToolbar>
          <div><div className="text-sm font-medium text-ink">Find a deliverable</div><div className="mt-0.5 text-sm text-ink-muted">Search by requirement, file name, or programme.</div></div>
          <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-[260px_190px]">
            <TableFilterInput icon placeholder="Search deliverables..." value={query} onChange={(event) => { setQuery(event.target.value); instances.resetPagination(); }} />
            <TableFilterSelect value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as typeof statusFilter); instances.resetPagination(); }}>
              <option value={ALL}>All statuses</option>
              {Object.entries(statusMeta).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
            </TableFilterSelect>
          </div>
        </TableToolbar>
        {instances.isError ? (
          <div className="rounded-xl border border-danger/20 bg-danger-light p-4 text-sm text-danger">{instances.error.message}</div>
        ) : (
          <DataTable columns={columns} rows={instances.rows} rowKey={(item) => item.id} emptyMessage="No deliverables match this view." />
        )}
        <TablePagination page={instances.page} pageSize={pageSize} totalItems={instances.totalItems} onPageChange={instances.setPage} onPageSizeChange={(next) => { setPageSize(next); instances.resetPagination(); }} />
      </Card>

      <Modal open={Boolean(linkedDeliverableId) && !displayedHistory} onOpenChange={(open) => !open && closeHistory()} title="Deliverable details" width="wide">
        {linkedDeliverable.isLoading ? <div className="space-y-3"><Skeleton className="h-24 w-full" /><Skeleton className="h-36 w-full" /></div> : null}
        {linkedDeliverable.isError ? <div className="rounded-xl border border-danger/20 bg-danger-light p-4 text-sm text-danger">This deliverable is unavailable or outside your access scope.</div> : null}
      </Modal>
      <UploadDeliverableModal key={uploadTarget?.id ?? 'new-deliverable'} open={uploadOpen} onOpenChange={setUploadOpen} deliverable={uploadTarget} programmeId={programmeId} />
      <DeliverableHistoryModal deliverable={displayedHistory} onClose={closeHistory} onResubmit={(item) => { closeHistory(); openUpload(item); }} />
    </>
  );
}

function DeliverableHistoryModal({ deliverable, onClose, onResubmit }: { deliverable: DeliverableInstance | null; onClose: () => void; onResubmit: (item: DeliverableInstance) => void }) {
  const feedback = useDeliverableFeedbackQuery(deliverable?.id ?? null, Boolean(deliverable));
  const submissions = useDeliverableSubmissionsQuery(deliverable?.id ?? null, Boolean(deliverable));
  const markRead = useMarkDeliverableReviewReadMutation({ onError: (error) => toast.error(error.message) });
  const unread = feedback.rows.filter((item) => !item.readAt);

  async function markUnread() {
    if (!unread.length || markRead.isPending) return;
    await Promise.all(unread.map((item) => markRead.mutateAsync(item.id)));
  }

  async function closeAndMarkRead() {
    await markUnread();
    onClose();
  }

  return (
    <Modal open={Boolean(deliverable)} onOpenChange={(open) => { if (!open) void closeAndMarkRead(); }} title={deliverable ? 'History — ' + deliverable.deliverable : 'Deliverable history'} width="wide">
      {deliverable && (
        <div className="space-y-5">
          <div className="grid gap-3 rounded-xl border border-line bg-surface-subtle p-4 sm:grid-cols-[1fr_auto]">
            <div><div className="text-sm font-medium text-ink">Review status</div><div className="mt-2 flex flex-wrap items-center gap-2"><Badge tone={statusMeta[deliverable.status].tone}>{statusMeta[deliverable.status].label}</Badge>{unread.length > 0 && <Badge tone="amber">{unread.length} new</Badge>}</div></div>
            {deliverable.status === 'changes_required' && <div className="flex max-w-[280px] items-start gap-2 rounded-lg border border-warning/20 bg-warning-light px-3 py-2 text-sm text-warning-dark"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>Changes are required before BID can approve this deliverable.</span></div>}
          </div>

          <section>
            <div className="mb-3"><div className="text-sm font-semibold text-ink">BID feedback</div><div className="mt-0.5 text-sm text-ink-muted">Paginated review notes across every submitted version.</div></div>
            {feedback.isLoading ? <div className="h-28 animate-pulse rounded-xl bg-surface-subtle" /> : feedback.rows.length ? (
              <div className="grid gap-3">{feedback.rows.map((item: DeliverableFeedback, index: number) => <FeedbackCard key={item.id} item={item} current={index === 0} />)}</div>
            ) : <div className="rounded-xl border border-dashed border-line p-5 text-sm text-ink-muted">No feedback has been recorded yet.</div>}
            {feedback.hasNextPage && <Button className="mt-3" variant="outline" isLoading={feedback.isFetchingNextPage} onClick={() => feedback.fetchNextPage()}>Load earlier feedback</Button>}
          </section>

          <section>
            <div className="mb-3"><div className="text-sm font-semibold text-ink">Submission versions</div><div className="mt-0.5 text-sm text-ink-muted">Every upload remains available as part of the review trail.</div></div>
            {submissions.isLoading ? <div className="h-24 animate-pulse rounded-xl bg-surface-subtle" /> : (
              <div className="grid gap-2">{submissions.rows.map((item, index) => <div key={item.id} className="flex flex-col gap-2 rounded-xl border border-line bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-bid-light text-bid"><FileText className="h-4 w-4" /></span><div><div className="font-medium text-ink">{item.file.originalFilename}</div><div className="mt-0.5 text-sm text-ink-muted">{index === 0 ? 'Latest version · ' : ''}Submitted {formatDate(item.submittedAt)}</div>{item.note && <p className="mt-1 text-sm text-ink-muted">{item.note}</p>}</div></div><Badge tone={item.latestReview?.decision === 'approved' ? 'green' : item.latestReview ? 'amber' : 'blue'}>{item.latestReview?.decision === 'approved' ? 'Approved' : item.latestReview ? 'Changes requested' : 'Awaiting review'}</Badge></div>)}</div>
            )}
            {submissions.hasNextPage && <Button className="mt-3" variant="outline" isLoading={submissions.isFetchingNextPage} onClick={() => submissions.fetchNextPage()}>Load earlier versions</Button>}
          </section>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" isLoading={markRead.isPending} loadingLabel="Marking feedback read..." onClick={() => void closeAndMarkRead()}>Close</Button>
            {deliverable.status === 'changes_required' && <Button type="button" disabled={markRead.isPending} onClick={() => { void markUnread().then(() => onResubmit(deliverable)); }}>Resubmit deliverable</Button>}
          </div>
        </div>
      )}
    </Modal>
  );
}

function FeedbackCard({ item, current }: { item: DeliverableFeedback; current: boolean }) {
  return <div className="rounded-xl border border-bid/15 bg-card px-4 py-4 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-start gap-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-bid-light text-bid"><MessageSquareText className="h-4 w-4" /></span><div><div className="text-sm font-semibold text-ink">{current ? 'Current feedback' : item.reviewer.name}</div><div className="mt-0.5 text-sm text-ink-muted">{item.reviewer.name} · {formatDate(item.createdAt)} · {item.submission.file.originalFilename}</div></div></div><Badge tone={item.readAt ? 'neutral' : 'amber'}>{item.readAt ? 'Read' : 'New feedback'}</Badge></div><p className="mt-4 text-sm leading-6 text-ink">{item.feedback}</p></div>;
}

function DeliverableWorkspaceSkeleton() {
  return <div className="space-y-4"><div className="h-20 animate-pulse rounded-xl bg-surface-subtle" /><div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-24 animate-pulse rounded-xl bg-surface-subtle" />)}</div><div className="h-[430px] animate-pulse rounded-xl bg-surface-subtle" /></div>;
}
