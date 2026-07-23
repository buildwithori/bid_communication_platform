'use client';

import { useDebouncedValue } from '@/lib/search';
import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { MessageSquareText } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { Card, CardHeader, Skeleton } from '@/components/shared/Card';
import { DataTable, RowActions, TableEmptyState, TableFilterAutocomplete, TableFilterInput, TableFilterSelect, TablePagination, TableToolbar, type Column } from '@/components/shared/DataTable';
import { FormField, FormTextarea } from '@/components/shared/FormField';
import { MetricGrid } from '@/components/shared/MetricGrid';
import { Modal } from '@/components/shared/Modal';
import { Notice, PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { DeliverableFilePreviewModal } from '@/components/deliverables/DeliverableFilePreviewModal';
import { DeliverableSubmissionVersions } from '@/components/deliverables/DeliverableSubmissionVersions';
import { UpdateDeliverableDueDateModal } from '@/components/deliverables/UpdateDeliverableDueDateModal';
import {
  useDeliverableFeedbackQuery,
  useDeliverableInstanceQuery,
  useDeliverableReviewQueuePage,
  useDeliverableReviewSummaryQuery,
  useDeliverableSubmissionsQuery,
  useReviewDeliverableMutation,
  useUpdateDeliverableDueDateMutation,
  type DeliverableFeedback,
  type DeliverableReviewQueueItem,
  type DeliverableSubmission,
  type DeliverableStatus,
} from '@/lib/api/deliverables';
import { useLazyProgrammesLookup } from '@/lib/api/programmes';
import { deliverableReviewSchema, type DeliverableReviewForm } from '@/lib/forms/schemas';
import { mapDeliverableReviewRow, reviewLabel, reviewTone, type DeliverableReviewRow, type DeliverableReviewStatus } from '@/lib/deliverables/review-queue';

const ALL = 'all';
type ReviewStatusFilter = typeof ALL | DeliverableReviewStatus | 'overdue';
const reviewStatusFilters: ReviewStatusFilter[] = [
  ALL,
  'pending-review',
  'changes-requested',
  'approved',
  'overdue',
];

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function submissionPreviewRow(
  review: DeliverableReviewRow,
  submission: DeliverableSubmission,
): DeliverableReviewRow {
  return {
    ...review,
    submissionId: submission.id,
    fileId: submission.file.id,
    fileName: submission.file.originalFilename,
    fileMimeType: submission.file.mimeType,
    fileSizeBytes: submission.file.sizeBytes,
    submittedAt: submission.submittedAt,
  };
}

function apiFilters(status: ReviewStatusFilter): { status?: DeliverableStatus; overdue?: boolean } {
  if (status === 'pending-review') return { status: 'submitted' };
  if (status === 'changes-requested') return { status: 'changes_required' };
  if (status === 'approved') return { status: 'approved' };
  if (status === 'overdue') return { overdue: true };
  return {};
}

export function DeliverableReviewQueuePage({ role }: { role: 'admin' | 'trainer' }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const linkedDeliverableId = searchParams.get('deliverableId');
  const linkedDeliverable = useDeliverableInstanceQuery(linkedDeliverableId);
  const [active, setActive] = React.useState<DeliverableReviewRow | null>(null);
  const linkedItem = linkedDeliverable.data as DeliverableReviewQueueItem | undefined;
  const linkedRow = linkedItem ? mapDeliverableReviewRow(linkedItem) : null;
  const displayedReview = active ?? linkedRow;
  function closeActive() {
    setActive(null);
    if (linkedDeliverableId) router.replace(role === 'admin' ? '/admin/deliverable-reviews' : '/trainer/deliverable-reviews');
  }
  const [previewTarget, setPreviewTarget] = React.useState<DeliverableReviewRow | null>(null);
  const [dueDateTarget, setDueDateTarget] = React.useState<DeliverableReviewRow | null>(null);
  const [query, setQuery] = React.useState('');
  const debouncedQuery = useDebouncedValue(query.trim());
  const requestedStatus = searchParams.get('status') as ReviewStatusFilter | null;
  const [statusFilter, setStatusFilter] = React.useState<ReviewStatusFilter>(
    requestedStatus && reviewStatusFilters.includes(requestedStatus)
      ? requestedStatus
      : ALL,
  );
  const [programmeFilter, setProgrammeFilter] = React.useState(ALL);
  const [pageSize, setPageSize] = React.useState(10);
  const [programmeSearch, setProgrammeSearch] = React.useState('');
  const queue = useDeliverableReviewQueuePage({
    search: debouncedQuery || undefined,
    programmeId: programmeFilter === ALL ? undefined : programmeFilter,
    take: pageSize,
    ...apiFilters(statusFilter),
  });
  const reviewSummary = useDeliverableReviewSummaryQuery();
  const programmes = useLazyProgrammesLookup({ enabled: true, search: programmeSearch || undefined, take: 20 });
  const rows = React.useMemo(() => queue.rows.map(mapDeliverableReviewRow), [queue.rows]);
  const summary = reviewSummary.data?.summary;
  const today = new Date();

  const reviewMutation = useReviewDeliverableMutation({
    onSuccess: (review) => {
      toast.success(review.decision === 'approved' ? 'Deliverable approved' : 'Feedback sent to entrepreneur');
      closeActive();
    },
    onError: (error) => toast.error(error.message),
  });
  const dueDateMutation = useUpdateDeliverableDueDateMutation({
    onSuccess: () => {
      toast.success('Due date override saved and added to the audit trail');
      setDueDateTarget(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const columns: Column<DeliverableReviewRow>[] = [
    {
      key: 'actions',
      header: 'Action',
      className: 'w-[84px]',
      cell: (row) => <RowActions actions={[
        { label: 'Preview file', onSelect: () => setPreviewTarget(row), disabled: !row.fileId },
        { label: row.status === 'pending-review' ? 'Review deliverable' : 'View review history', onSelect: () => setActive(row) },
        { label: 'Override due date', onSelect: () => setDueDateTarget(row) },
      ]} />,
    },
    {
      key: 'deliverable',
      header: 'Deliverable',
      cell: (row) => (
        <button type="button" onClick={() => setActive(row)} className="block min-w-[250px] rounded-lg text-left outline-none transition hover:text-bid focus-visible:ring-2 focus-visible:ring-bid/20">
          <span className="block font-semibold text-ink">{row.deliverable}</span>
          <span className="mt-1 block max-w-[280px] truncate text-sm text-ink-muted">{row.fileName}</span>
          {row.periodStart && row.periodEnd && <span className="mt-1 block text-xs text-ink-faint">{formatDate(row.periodStart)} – {formatDate(row.periodEnd)}</span>}
          {row.latestFeedback && <span className="mt-1 block text-sm text-ink-muted">Feedback {row.feedbackReadAt ? 'read ' + formatDate(row.feedbackReadAt) : 'unread'}</span>}
        </button>
      ),
    },
    {
      key: 'entrepreneur',
      header: 'Entrepreneur',
      cell: (row) => <div className="min-w-[190px]"><div className="font-medium text-ink">{row.businessName}</div><div className="mt-1 text-sm text-ink-muted">{row.entrepreneur}</div></div>,
    },
    { key: 'programme', header: 'Programme', cell: (row) => <span className="block min-w-[210px]">{row.programme}</span> },
    {
      key: 'timing',
      header: 'Submitted / due',
      cell: (row) => {
        const isLate = row.status !== 'approved' && new Date(row.dueAt) < today;
        return <div className="min-w-[180px]"><div className="text-sm font-medium text-ink">Submitted {formatDate(row.submittedAt)}</div><div className={isLate ? 'mt-1 text-sm font-medium text-danger' : 'mt-1 text-sm text-ink-muted'}>Due {formatDate(row.dueAt)}</div><div className="mt-1 line-clamp-1 text-xs text-ink-faint">{row.dueSource === 'manual-override' ? 'Manual override' : 'Programme rule'} · {row.dueRule}</div><div className="mt-1 text-xs text-ink-faint">{row.waitingDays ?? 0} day{row.waitingDays === 1 ? '' : 's'} waiting</div></div>;
      },
    },
    { key: 'status', header: 'Status', cell: (row) => <Badge tone={reviewTone(row, today)}>{reviewLabel(row, today)}</Badge> },
  ];

  return (
    <>
      <PageHeader title="Deliverable reviews" description={role === 'trainer' ? 'Review submitted work from entrepreneurs in your programme scope.' : 'Central queue for submitted entrepreneur work and BID feedback.'} />
      <Notice>{role === 'trainer' ? 'This queue is automatically scoped to programmes where you own learning content. Review decisions create feedback entrepreneurs can read and resubmit against.' : 'Approve deliverables, request changes, review version history, and adjust entrepreneur-specific due dates before work counts as completed.'}</Notice>

      <MetricGrid>
        <StatCard label="Pending review" value={summary?.submitted ?? '—'} dotColor="warning" />
        <StatCard label="Changes required" value={summary?.changes_required ?? '—'} dotColor="info" />
        <StatCard label="Overdue review" value={reviewSummary.data?.overdueReviewCount ?? '—'} dotColor="bid" />
        <StatCard label="Approved" value={summary?.approved ?? '—'} dotColor="success" />
      </MetricGrid>

      <Card className="mt-4">
        <CardHeader title="Review queue" description={queue.isLoading ? 'Loading submitted work...' : queue.totalItems + ' submitted file' + (queue.totalItems === 1 ? '' : 's') + ' in this view'} />
        <TableToolbar>
          <div><div className="text-sm font-medium text-ink">Filter review queue</div><div className="mt-0.5 text-sm text-ink-muted">Search by entrepreneur, file, deliverable, programme, or feedback.</div></div>
          <div className="grid w-full gap-2 lg:w-auto lg:grid-cols-[260px_190px_230px]">
            <TableFilterInput icon placeholder="Search reviews..." value={query} onChange={(event) => { setQuery(event.target.value); queue.resetPagination(); }} />
            <TableFilterSelect value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as ReviewStatusFilter); queue.resetPagination(); }}>
              <option value={ALL}>All statuses</option>
              <option value="pending-review">Pending review</option>
              <option value="changes-requested">Changes required</option>
              <option value="approved">Approved</option>
              <option value="overdue">Overdue review</option>
            </TableFilterSelect>
            <TableFilterAutocomplete
              value={programmeFilter}
              onValueChange={(value) => { setProgrammeFilter(value); queue.resetPagination(); }}
              options={[{ value: ALL, label: 'All programmes' }, ...programmes.rows.map((programme) => ({ value: programme.id, label: programme.name }))]}
              placeholder="All programmes"
              searchPlaceholder="Search programmes..."
              emptyMessage="No programme found."
              onSearchChange={setProgrammeSearch}
              isLoading={programmes.isLoading}
              hasMore={programmes.hasNextPage}
              onLoadMore={() => programmes.fetchNextPage()}
            />
          </div>
        </TableToolbar>

        {queue.isLoading || queue.isPlaceholderData ? <ReviewQueueSkeleton /> : queue.isError ? <TableEmptyState title="Review queue could not be loaded" description={queue.error.message} action={<Button variant="outline" onClick={() => queue.refetch()}>Try again</Button>} /> : <DataTable columns={columns} rows={rows} rowKey={(row) => row.id} emptyMessage="No submitted deliverables match this view." tableClassName="min-w-[1180px]" />}
        <TablePagination page={queue.page} pageSize={pageSize} totalItems={queue.totalItems} onPageChange={queue.setPage} onPageSizeChange={(next) => { setPageSize(next); queue.resetPagination(); }} />
      </Card>

      <Modal open={Boolean(linkedDeliverableId) && !displayedReview} onOpenChange={(open) => !open && closeActive()} title="Deliverable details" width="wide">
        {linkedDeliverable.isLoading ? <div className="space-y-3"><Skeleton className="h-24 w-full" /><Skeleton className="h-36 w-full" /></div> : null}
        {linkedDeliverable.isError ? <Notice>This deliverable is unavailable or outside your review scope.</Notice> : null}
      </Modal>
      <ReviewDeliverableModal
        key={displayedReview?.id ?? 'review'}
        review={displayedReview}
        isSaving={reviewMutation.isPending}
        onClose={() => !reviewMutation.isPending && closeActive()}
        onPreviewSubmission={(review, submission) =>
          setPreviewTarget(submissionPreviewRow(review, submission))
        }
        onReview={(submissionId, decision, feedback) =>
          reviewMutation.mutate({ submissionId, decision, feedback })
        }
      />
      <DeliverableFilePreviewModal file={previewTarget} onClose={() => setPreviewTarget(null)} />
      <UpdateDeliverableDueDateModal key={dueDateTarget?.id ?? 'due-date'} review={dueDateTarget} isSaving={dueDateMutation.isPending} onClose={() => !dueDateMutation.isPending && setDueDateTarget(null)} onSave={(instanceId, dueDate, reason) => dueDateMutation.mutate({ instanceId, dueDate, reason })} />
    </>
  );
}

function ReviewDeliverableModal({
  review,
  isSaving,
  onClose,
  onPreviewSubmission,
  onReview,
}: {
  review: DeliverableReviewRow | null;
  isSaving: boolean;
  onClose: () => void;
  onPreviewSubmission: (
    review: DeliverableReviewRow,
    submission: DeliverableSubmission,
  ) => void;
  onReview: (
    submissionId: string,
    decision: 'approved' | 'changes_required',
    feedback?: string,
  ) => void;
}) {
  const form = useForm<DeliverableReviewForm>({ resolver: zodResolver(deliverableReviewSchema), defaultValues: { feedback: '' } });
  const feedback = useDeliverableFeedbackQuery(review?.id ?? null, Boolean(review));
  const submissions = useDeliverableSubmissionsQuery(review?.id ?? null, Boolean(review));
  const canReview = review?.status === 'pending-review' && Boolean(review.submissionId);

  return (
    <Modal open={Boolean(review)} onOpenChange={(open) => !open && !isSaving && onClose()} title={review ? (canReview ? 'Review ' : 'Review history — ') + review.deliverable : 'Review deliverable'} width="xl">
      {review && (
        <form onSubmit={form.handleSubmit((values) => { if (review.submissionId) onReview(review.submissionId, 'changes_required', values.feedback); })}>
          <div className="mb-4 rounded-xl border border-line bg-surface-subtle px-4 py-4"><div className="font-semibold text-ink">{review.fileName}</div><div className="mt-1 text-sm text-ink-muted">Submitted by {review.businessName} for {review.programme}</div><div className="mt-1 text-sm text-ink-muted">Submitted {formatDate(review.submittedAt)} · Due {formatDate(review.dueAt)} · {review.dueSource === 'manual-override' ? 'Manual override' : 'Programme rule'}</div>{review.periodStart && review.periodEnd && <div className="mt-1 text-sm text-ink-muted">Reporting period {formatDate(review.periodStart)} – {formatDate(review.periodEnd)}</div>}</div>

          <ReviewHistory
            feedback={feedback}
            submissions={submissions}
            onPreview={(submission) => onPreviewSubmission(review, submission)}
          />

          {canReview ? (
            <>
              <FormField label="Feedback to entrepreneur" optional error={form.formState.errors.feedback?.message}><FormTextarea rows={4} maxLength={2000} placeholder="Required when requesting changes; optional for approval..." {...form.register('feedback')} /></FormField>
              <div className="flex flex-col gap-2 sm:flex-row"><Button type="submit" variant="outline" className="flex-1" isLoading={isSaving} loadingLabel="Sending feedback...">Request changes</Button><Button type="button" className="flex-1" isLoading={isSaving} loadingLabel="Approving..." onClick={() => { if (review.submissionId) onReview(review.submissionId, 'approved', form.getValues('feedback').trim() || undefined); }}>Approve deliverable</Button></div>
            </>
          ) : <div className="flex justify-end"><Button type="button" variant="outline" onClick={onClose}>Close history</Button></div>}
        </form>
      )}
    </Modal>
  );
}

function ReviewHistory({
  feedback,
  submissions,
  onPreview,
}: {
  feedback: ReturnType<typeof useDeliverableFeedbackQuery>;
  submissions: ReturnType<typeof useDeliverableSubmissionsQuery>;
  onPreview: (submission: DeliverableSubmission) => void;
}) {
  return (
    <div className="mb-5 grid gap-4 lg:grid-cols-2">
      <section className="min-w-0 rounded-2xl border border-line bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 font-semibold text-ink">
              <MessageSquareText className="h-4 w-4 text-bid" />
              Feedback history
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              Decisions and guidance shared with the entrepreneur.
            </p>
          </div>
          {!feedback.isLoading ? (
            <span className="rounded-full bg-surface-subtle px-2.5 py-1 text-xs font-medium text-ink-muted">
              {feedback.totalItems}
            </span>
          ) : null}
        </div>
        {feedback.isLoading ? (
          <HistoryListSkeleton />
        ) : feedback.rows.length ? (
          <div className="scrollbar-thin mt-4 grid max-h-72 gap-2 overflow-y-auto pr-1">
            {feedback.rows.map((item: DeliverableFeedback) => (
              <div key={item.id} className="rounded-xl border border-line bg-surface-subtle px-3.5 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
                  <span className="font-medium text-ink">{item.reviewer.name}</span>
                  <span>{formatDate(item.createdAt)}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-ink">
                  {item.feedback || 'No written feedback was added.'}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <HistoryEmptyState
            icon={<MessageSquareText className="h-5 w-5" />}
            message="No feedback has been recorded yet."
          />
        )}
        {feedback.hasNextPage ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="mt-3 w-full"
            isLoading={feedback.isFetchingNextPage}
            onClick={() => feedback.fetchNextPage()}
          >
            Load earlier feedback
          </Button>
        ) : null}
      </section>

      <DeliverableSubmissionVersions
        submissions={submissions.rows}
        totalItems={submissions.totalItems}
        isLoading={submissions.isLoading}
        hasNextPage={Boolean(submissions.hasNextPage)}
        isFetchingNextPage={submissions.isFetchingNextPage}
        onLoadMore={() => void submissions.fetchNextPage()}
        onPreview={onPreview}
      />
    </div>
  );
}

function HistoryListSkeleton() {
  return (
    <div className="mt-4 grid gap-2" aria-label="Loading history" aria-busy="true">
      {Array.from({ length: 2 }, (_, index) => (
        <div key={index} className="flex items-center gap-3 rounded-xl border border-line bg-surface-subtle p-3">
          <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function HistoryEmptyState({
  icon,
  message,
}: {
  icon: React.ReactNode;
  message: string;
}) {
  return (
    <div className="mt-4 grid min-h-28 place-items-center rounded-xl border border-dashed border-line bg-surface-subtle px-4 text-center">
      <div>
        <span className="mx-auto grid h-9 w-9 place-items-center rounded-lg bg-card text-ink-faint">
          {icon}
        </span>
        <p className="mt-2 text-sm text-ink-muted">{message}</p>
      </div>
    </div>
  );
}

function ReviewQueueSkeleton() {
  return <div className="space-y-2">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-20 animate-pulse rounded-xl bg-surface-subtle" />)}</div>;
}
