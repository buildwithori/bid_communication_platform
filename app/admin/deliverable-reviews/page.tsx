'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { PageHeader, Notice } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { MetricGrid } from '@/components/shared/MetricGrid';
import { Card, CardHeader } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import {
  DataTable,
  RowActions,
  TableFilterInput,
  TableFilterSelect,
  TablePagination,
  TableToolbar,
  type Column,
} from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import { FormField, FormTextarea } from '@/components/shared/FormField';
import { deliverableReviewSchema, type DeliverableReviewForm } from '@/lib/forms/schemas';
import {
  deliverableReviews,
  deliverableReviewStatusMeta,
  type DeliverableReview,
  type DeliverableReviewStatus,
} from '@/lib/mock-data/admin-workflows';

const today = new Date('2026-07-07');

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function daysBetween(start: string, end: Date) {
  const startDate = new Date(start);
  return Math.max(Math.floor((end.getTime() - startDate.getTime()) / 86_400_000), 0);
}

export default function DeliverableReviewsPage() {
  const [reviews, setReviews] = React.useState(deliverableReviews);
  const [active, setActive] = React.useState<DeliverableReview | null>(null);
  const [query, setQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'all' | DeliverableReviewStatus>('all');
  const [programmeFilter, setProgrammeFilter] = React.useState('all');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  const updateStatus = (id: string, status: DeliverableReviewStatus, feedback?: string) => {
    setReviews((rows) =>
      rows.map((row) =>
        row.id === id
          ? {
              ...row,
              status,
              reviewer: 'Ama Darko',
              latestFeedback: feedback?.trim() || row.latestFeedback,
              feedbackReadAt: status === 'changes-requested' ? undefined : row.feedbackReadAt,
            }
          : row,
      ),
    );
    toast.success(status === 'approved' ? 'Deliverable approved' : 'Feedback sent to entrepreneur');
  };

  const pending = reviews.filter((row) => row.status === 'pending-review').length;
  const changes = reviews.filter((row) => row.status === 'changes-requested').length;
  const overdue = reviews.filter((row) => row.status !== 'approved' && new Date(row.dueAt) < today).length;
  const programmeOptions = React.useMemo(
    () => Array.from(new Set(reviews.map((row) => row.programme))).sort(),
    [reviews],
  );
  const filteredReviews = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return reviews.filter((row) => {
      const matchesQuery =
        !needle ||
        [row.deliverable, row.fileName, row.businessName, row.entrepreneur, row.programme]
          .join(' ')
          .toLowerCase()
          .includes(needle);
      const matchesStatus = statusFilter === 'all' || row.status === statusFilter;
      const matchesProgramme = programmeFilter === 'all' || row.programme === programmeFilter;
      return matchesQuery && matchesStatus && matchesProgramme;
    });
  }, [programmeFilter, query, reviews, statusFilter]);

  React.useEffect(() => {
    setPage(1);
  }, [programmeFilter, query, statusFilter, pageSize]);

  const pageRows = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredReviews.slice(start, start + pageSize);
  }, [filteredReviews, page, pageSize]);

  const columns: Column<DeliverableReview>[] = [
    {
      key: 'actions',
      header: 'Action',
      cell: (row) => (
        <RowActions
          actions={[
            { label: 'Preview file', onSelect: () => toast.success('Opening file preview...') },
            { label: row.status === 'approved' ? 'View review' : 'Review deliverable', onSelect: () => setActive(row) },
          ]}
        />
      ),
      className: 'w-[84px]',
    },
    {
      key: 'deliverable',
      header: 'Deliverable',
      cell: (row) => (
        <button
          type="button"
          onClick={() => setActive(row)}
          className="block min-w-[230px] rounded-lg text-left outline-none transition hover:text-bid focus-visible:ring-2 focus-visible:ring-bid/20"
        >
          <span className="block font-semibold text-ink">{row.deliverable}</span>
          <span className="mt-1 block text-sm text-ink-muted">{row.fileName}</span>
          {row.latestFeedback && (
            <span className="mt-1 block text-sm text-ink-muted">
              Feedback {row.feedbackReadAt ? `read ${formatDate(row.feedbackReadAt)}` : 'unread'}
            </span>
          )}
        </button>
      ),
    },
    {
      key: 'entrepreneur',
      header: 'Entrepreneur',
      cell: (row) => (
        <div>
          <div>{row.businessName}</div>
          <div className="text-sm text-ink-muted">{row.entrepreneur}</div>
        </div>
      ),
    },
    { key: 'programme', header: 'Programme', cell: (row) => row.programme },
    {
      key: 'submitted',
      header: 'Submitted',
      cell: (row) => (
        <div>
          <div>{formatDate(row.submittedAt)}</div>
          <div className="text-sm text-ink-muted">
            {daysBetween(row.submittedAt, today)} day{daysBetween(row.submittedAt, today) === 1 ? '' : 's'} waiting
          </div>
        </div>
      ),
    },
    {
      key: 'due',
      header: 'Due date',
      cell: (row) => {
        const isLate = row.status !== 'approved' && new Date(row.dueAt) < today;
        return (
          <div>
            <div>{formatDate(row.dueAt)}</div>
            {isLate && <div className="text-sm font-medium text-danger">Late</div>}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => {
        const meta = deliverableReviewStatusMeta[row.status];
        return <Badge tone={meta.tone}>{meta.label}</Badge>;
      },
    },
  ];

  return (
    <>
      <PageHeader
        title="Deliverable reviews"
        description="Central queue for submitted entrepreneur work and BID feedback"
      />
      <Notice>
        This is the missing operational bridge between entrepreneur uploads and admin
        reporting. BID can approve deliverables, request changes, and keep a review
        trail before items count as completed.
      </Notice>

      <MetricGrid>
        <StatCard label="Pending review" value={pending} dotColor="warning" />
        <StatCard label="Changes required" value={changes} dotColor="info" />
        <StatCard label="Overdue review" value={overdue} dotColor="bid" />
      </MetricGrid>

      <Card className="mt-4">
        <CardHeader
          title="Review queue"
          description={`${filteredReviews.length} submitted file${filteredReviews.length === 1 ? '' : 's'} in this view`}
        />
        <TableToolbar>
          <div>
            <div className="text-sm font-medium text-ink">Filter review queue</div>
            <div className="mt-0.5 text-sm text-ink-muted">
              Search by entrepreneur, file, deliverable, or programme.
            </div>
          </div>
          <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-[260px_180px_220px]">
            <TableFilterInput
              icon
              placeholder="Search reviews..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <TableFilterSelect
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
            >
              <option value="all">All statuses</option>
              {Object.entries(deliverableReviewStatusMeta).map(([value, meta]) => (
                <option key={value} value={value}>{meta.label}</option>
              ))}
            </TableFilterSelect>
            <TableFilterSelect
              value={programmeFilter}
              onChange={(event) => setProgrammeFilter(event.target.value)}
            >
              <option value="all">All programmes</option>
              {programmeOptions.map((programme) => (
                <option key={programme} value={programme}>{programme}</option>
              ))}
            </TableFilterSelect>
          </div>
        </TableToolbar>
        <DataTable columns={columns} rows={pageRows} rowKey={(row) => row.id} />
        <TablePagination
          page={page}
          pageSize={pageSize}
          totalItems={filteredReviews.length}
          onPageChange={setPage}
          onPageSizeChange={(next) => {
            setPageSize(next);
            setPage(1);
          }}
        />
      </Card>

      <ReviewModal
        review={active}
        onClose={() => setActive(null)}
        onApprove={(id) => {
          updateStatus(id, 'approved');
          setActive(null);
        }}
        onRequestChanges={(id, feedback) => {
          updateStatus(id, 'changes-requested', feedback);
          setActive(null);
        }}
      />
    </>
  );
}

function ReviewModal({
  review,
  onClose,
  onApprove,
  onRequestChanges,
}: {
  review: DeliverableReview | null;
  onClose: () => void;
  onApprove: (id: string) => void;
  onRequestChanges: (id: string, feedback: string) => void;
}) {
  const form = useForm<DeliverableReviewForm>({
    resolver: zodResolver(deliverableReviewSchema),
    defaultValues: { feedback: '' },
  });

  React.useEffect(() => {
    if (review) form.reset({ feedback: '' });
  }, [form, review]);

  return (
    <Modal
      open={!!review}
      onOpenChange={(open) => !open && onClose()}
      title={review ? `Review ${review.deliverable}` : 'Review deliverable'}
      width="wide"
    >
      {review && (
        <form
          onSubmit={form.handleSubmit((values) => {
            onRequestChanges(review.id, values.feedback);
          })}
        >
          <div className="mb-4 rounded-lg border border-line bg-surface px-4 py-4">
            <div className="font-semibold">{review.fileName}</div>
            <div className="mt-1 text-sm text-ink-muted">
              Submitted by {review.businessName} for {review.programme}
            </div>
            <div className="mt-1 text-sm text-ink-muted">
              Submitted {formatDate(review.submittedAt)} · Due {formatDate(review.dueAt)}
            </div>
          </div>
          {review.latestFeedback && (
            <div className="mb-4 rounded-xl border border-warning/20 bg-warning-light px-4 py-3">
              <div className="text-sm font-semibold text-warning-dark">Latest feedback sent to entrepreneur</div>
              <p className="mt-2 text-sm leading-6 text-warning-dark">{review.latestFeedback}</p>
              <div className="mt-2 text-xs text-warning-dark/80">
                {review.feedbackReadAt ? `Read by entrepreneur ${formatDate(review.feedbackReadAt)}` : 'Not read yet'}
              </div>
            </div>
          )}
          <FormField label="Feedback to entrepreneur" error={form.formState.errors.feedback?.message}>
            <FormTextarea
              rows={4}
              placeholder="Add review notes, required changes, or approval comments..."
              {...form.register('feedback')}
            />
          </FormField>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" variant="outline" className="flex-1">
              Request changes
            </Button>
            <Button type="button" className="flex-1" onClick={() => onApprove(review.id)}>
              Approve deliverable
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
