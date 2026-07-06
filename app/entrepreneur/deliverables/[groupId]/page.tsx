'use client';

import * as React from 'react';
import { notFound } from 'next/navigation';
import { AlertCircle, AlertTriangle, CheckCircle2, Clock3, MessageSquareText, UploadCloud } from 'lucide-react';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { PageHeader } from '@/components/shared/PageHeader';
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
import { UploadDeliverableModal } from '@/components/entrepreneur/UploadDeliverableModal';
import { useEntrepreneurStore } from '@/lib/stores/entrepreneur-store';
import { deliverableGroups } from '@/lib/mock-data';
import { routes } from '@/lib/routes';
import { Modal } from '@/components/shared/Modal';
import type { BadgeTone, Deliverable, DeliverableFeedback, DeliverableStatus } from '@/types';

const statusMeta: Record<DeliverableStatus, { label: string; tone: BadgeTone; helper: string }> = {
  pending: { label: 'Not submitted', tone: 'amber', helper: 'Upload required' },
  overdue: { label: 'Overdue', tone: 'red', helper: 'Upload as soon as possible' },
  submitted: { label: 'Submitted', tone: 'blue', helper: 'Waiting for BID review' },
  'changes-requested': { label: 'Changes required', tone: 'amber', helper: 'Review feedback and resubmit' },
  reviewed: { label: 'Approved', tone: 'green', helper: 'Accepted by BID' },
};

function formatDate(value?: string) {
  if (!value) return 'No due date';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function isActionable(deliverable: Deliverable) {
  return deliverable.status === 'pending' || deliverable.status === 'overdue' || deliverable.status === 'changes-requested';
}

function getFeedbackHistory(deliverable: Deliverable): DeliverableFeedback[] {
  if (deliverable.feedbackHistory?.length) return deliverable.feedbackHistory;
  if (!deliverable.reviewFeedback) return [];
  return [
    {
      id: `${deliverable.id}-feedback`,
      message: deliverable.reviewFeedback,
      reviewer: deliverable.reviewer ?? 'BID team',
      createdAt: deliverable.submittedAt ?? new Date().toISOString().slice(0, 10),
    },
  ];
}

function getUnreadFeedback(deliverable: Deliverable) {
  return getFeedbackHistory(deliverable).filter((feedback) => !feedback.readAt);
}

export default function DeliverableListPage({
  params,
}: {
  params: { groupId: string };
}) {
  const { deliverables, markDeliverableFeedbackRead } = useEntrepreneurStore();
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [targetDeliverable, setTargetDeliverable] = React.useState<Deliverable | null>(null);
  const [feedbackTarget, setFeedbackTarget] = React.useState<Deliverable | null>(null);
  const [query, setQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'all' | DeliverableStatus>('all');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const group = deliverableGroups.find((item) => item.id === params.groupId);
  if (!group) return notFound();

  const groupItems = React.useMemo(() => {
    if (group.id === 'g-general') {
      return deliverables.filter((item) => item.group === 'general');
    }
    return deliverables.filter((item) => item.programmeId === group.programmeId);
  }, [deliverables, group.id, group.programmeId]);

  const filteredItems = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return groupItems.filter((item) => {
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchesQuery =
        !needle ||
        [
          item.name,
          item.fileName ?? '',
          item.notes ?? '',
          ...getFeedbackHistory(item).map((feedback) => feedback.message),
        ]
          .join(' ')
          .toLowerCase()
          .includes(needle);
      return matchesStatus && matchesQuery;
    });
  }, [groupItems, query, statusFilter]);

  React.useEffect(() => {
    setPage(1);
  }, [query, statusFilter, pageSize]);

  const pageRows = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, page, pageSize]);

  const requiredCount = groupItems.length;
  const approvedCount = groupItems.filter((item) => item.status === 'reviewed').length;
  const needsWorkCount = groupItems.filter(isActionable).length;
  const submittedCount = groupItems.filter((item) => item.status === 'submitted').length;
  const newFeedbackCount = groupItems.filter((item) => getUnreadFeedback(item).length > 0).length;

  const openUpload = (deliverable?: Deliverable) => {
    setTargetDeliverable(deliverable ?? null);
    setUploadOpen(true);
  };

  const columns: Column<Deliverable>[] = [
    {
      key: 'actions',
      header: 'Action',
      cell: (deliverable) => {
        const feedback = getFeedbackHistory(deliverable);
        const canUpload = deliverable.status === 'pending' || deliverable.status === 'overdue';
        const canViewFeedback = deliverable.status === 'changes-requested' || feedback.length > 0;
        const label = canViewFeedback ? 'View feedback' : canUpload ? 'Upload file' : 'Awaiting review';
        return (
          <RowActions
            actions={[
              {
                label,
                onSelect: () => (canViewFeedback ? setFeedbackTarget(deliverable) : openUpload(deliverable)),
                disabled: !canViewFeedback && !canUpload,
              },
            ]}
          />
        );
      },
      className: 'w-[84px]',
    },
    {
      key: 'deliverable',
      header: 'Deliverable',
      cell: (deliverable) => {
        const meta = statusMeta[deliverable.status];
        const Icon = deliverable.status === 'reviewed' ? CheckCircle2 : deliverable.status === 'submitted' ? Clock3 : AlertCircle;
        const feedback = getFeedbackHistory(deliverable);
        const unreadFeedback = getUnreadFeedback(deliverable);
        return (
          <div className="flex min-w-[260px] items-start gap-3">
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-bid-light text-bid">
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="font-semibold text-ink">{deliverable.name}</div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
                <span>{meta.helper}</span>
                {unreadFeedback.length > 0 && (
                  <Badge tone="amber">New feedback</Badge>
                )}
                {feedback.length > 0 && unreadFeedback.length === 0 && (
                  <Badge tone="neutral">Feedback read</Badge>
                )}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'due',
      header: 'Due date',
      cell: (deliverable) => (
        <span className="whitespace-nowrap text-sm text-ink-muted">{formatDate(deliverable.dueDate)}</span>
      ),
    },
    {
      key: 'submission',
      header: 'Submission',
      cell: (deliverable) => (
        <div className="min-w-[220px]">
          <div className="text-sm font-medium text-ink">
            {deliverable.fileName ?? 'No file uploaded'}
          </div>
          <div className="mt-1 text-sm text-ink-muted">
            {deliverable.submittedAt ? `Submitted ${formatDate(deliverable.submittedAt)}` : 'Awaiting upload'}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (deliverable) => {
        const meta = statusMeta[deliverable.status];
        return <Badge tone={meta.tone}>{meta.label}</Badge>;
      },
    },
  ];

  return (
    <>
      <Breadcrumb
        items={[
          { label: 'Deliverables', href: routes.entrepreneur.deliverables },
          { label: group.label },
        ]}
      />
      <PageHeader
        title={group.label}
        description="Track required submissions, BID feedback, and approval status."
        actions={
          <Button onClick={() => openUpload()}>
            <UploadCloud className="h-4 w-4" />
            Upload deliverable
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card padding="sm">
          <div className="text-sm text-ink-muted">Required</div>
          <div className="mt-1 text-2xl font-semibold">{requiredCount}</div>
        </Card>
        <Card padding="sm">
          <div className="text-sm text-ink-muted">Needs action</div>
          <div className="mt-1 text-2xl font-semibold text-warning-dark">{needsWorkCount}</div>
        </Card>
        <Card padding="sm">
          <div className="text-sm text-ink-muted">Approved</div>
          <div className="mt-1 text-2xl font-semibold text-success-dark">{approvedCount}</div>
        </Card>
      </div>
      {newFeedbackCount > 0 && (
        <div className="mb-4 rounded-xl border border-warning/20 bg-warning-light px-4 py-3 text-sm text-warning-dark">
          {newFeedbackCount} deliverable{newFeedbackCount === 1 ? ' has' : 's have'} new BID feedback waiting to be read.
        </div>
      )}

      <Card>
        <CardHeader
          title="Submission queue"
          description={`${submittedCount} submitted, ${needsWorkCount} still needing entrepreneur action`}
        />
        <TableToolbar>
          <div>
            <div className="text-sm font-medium text-ink">Find a deliverable</div>
            <div className="mt-0.5 text-sm text-ink-muted">
              Search by requirement, file name, notes, or feedback.
            </div>
          </div>
          <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-[260px_190px]">
            <TableFilterInput
              icon
              placeholder="Search deliverables..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <TableFilterSelect
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
            >
              <option value="all">All statuses</option>
              {Object.entries(statusMeta).map(([value, meta]) => (
                <option key={value} value={value}>{meta.label}</option>
              ))}
            </TableFilterSelect>
          </div>
        </TableToolbar>
        <DataTable
          columns={columns}
          rows={pageRows}
          rowKey={(deliverable) => deliverable.id}
          emptyMessage="No deliverables match this view."
        />
        <TablePagination
          page={page}
          pageSize={pageSize}
          totalItems={filteredItems.length}
          onPageChange={setPage}
          onPageSizeChange={(next) => {
            setPageSize(next);
            setPage(1);
          }}
        />
      </Card>

      <UploadDeliverableModal
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        deliverable={targetDeliverable}
        groupId={group.id}
      />
      <FeedbackHistoryModal
        deliverable={feedbackTarget}
        onClose={() => setFeedbackTarget(null)}
        onMarkRead={(deliverableId, ids) => markDeliverableFeedbackRead(deliverableId, ids)}
        onResubmit={(deliverable) => {
          setFeedbackTarget(null);
          openUpload(deliverable);
        }}
      />
    </>
  );
}

function FeedbackHistoryModal({
  deliverable,
  onClose,
  onMarkRead,
  onResubmit,
}: {
  deliverable: Deliverable | null;
  onClose: () => void;
  onMarkRead: (deliverableId: string, ids: string[]) => void;
  onResubmit: (deliverable: Deliverable) => void;
}) {
  const feedback = React.useMemo(
    () =>
      deliverable
        ? [...getFeedbackHistory(deliverable)].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          )
        : [],
    [deliverable],
  );
  const unreadIds = React.useMemo(
    () => feedback.filter((item) => !item.readAt).map((item) => item.id),
    [feedback],
  );
  const currentFeedback = feedback[0];
  const previousFeedback = feedback.slice(1);

  const closeAndMarkRead = () => {
    if (deliverable && unreadIds.length > 0) {
      onMarkRead(deliverable.id, unreadIds);
    }
    onClose();
  };

  return (
    <Modal
      open={!!deliverable}
      onOpenChange={(open) => !open && closeAndMarkRead()}
      title={deliverable ? `Feedback — ${deliverable.name}` : 'Feedback'}
      width="wide"
    >
      {deliverable && (
        <div>
          <div className="mb-4 grid gap-3 rounded-xl border border-line bg-surface-subtle p-4 sm:grid-cols-[1fr_auto]">
            <div>
              <div className="text-sm font-medium text-ink">Review status</div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge tone={statusMeta[deliverable.status].tone}>
                  {statusMeta[deliverable.status].label}
                </Badge>
                {unreadIds.length > 0 && <Badge tone="amber">{unreadIds.length} new</Badge>}
              </div>
              <div className="mt-2 text-sm text-ink-muted">
                {deliverable.fileName ?? 'No file uploaded yet'}
              </div>
            </div>
            {deliverable.status === 'changes-requested' && (
              <div className="flex max-w-[260px] items-start gap-2 rounded-lg border border-warning/20 bg-warning-light px-3 py-2 text-sm text-warning-dark">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Changes are required before BID can approve this deliverable.</span>
              </div>
            )}
          </div>

          {currentFeedback && (
            <div className="mb-4 rounded-xl border border-bid/20 bg-white px-4 py-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-bid-light text-bid">
                    <MessageSquareText className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-ink">Current feedback</div>
                    <div className="mt-0.5 text-sm text-ink-muted">
                      {currentFeedback.reviewer} · {formatDate(currentFeedback.createdAt)}
                    </div>
                  </div>
                </div>
                <Badge tone={currentFeedback.readAt ? 'neutral' : 'amber'}>
                  {currentFeedback.readAt ? 'Read' : 'New feedback'}
                </Badge>
              </div>
              <p className="mt-4 text-sm leading-6 text-ink">{currentFeedback.message}</p>
              {currentFeedback.readAt && (
                <div className="mt-3 text-xs text-ink-muted">
                  Read {formatDate(currentFeedback.readAt)}
                </div>
              )}
            </div>
          )}

          {previousFeedback.length > 0 && (
            <>
              <div className="mb-3">
                <div className="text-sm font-semibold text-ink">Previous feedback</div>
                <div className="mt-0.5 text-sm text-ink-muted">
                  Earlier BID review notes for this deliverable.
                </div>
              </div>

              <div className="grid gap-3">
                {previousFeedback.map((item) => {
                  const wasUnread = !item.readAt;
                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border border-black/[0.08] bg-white px-4 py-3 shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="font-medium text-ink">{item.reviewer}</div>
                          <div className="mt-0.5 text-sm text-ink-muted">
                            {formatDate(item.createdAt)}
                          </div>
                        </div>
                        <Badge tone={wasUnread ? 'amber' : 'neutral'}>
                          {wasUnread ? 'New feedback' : 'Read'}
                        </Badge>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-ink">{item.message}</p>
                      {item.readAt && (
                        <div className="mt-3 text-xs text-ink-muted">
                          Read {formatDate(item.readAt)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={closeAndMarkRead}>
              Close
            </Button>
            {deliverable.status === 'changes-requested' && (
              <Button
                type="button"
                onClick={() => {
                  if (unreadIds.length > 0) {
                    onMarkRead(deliverable.id, unreadIds);
                  }
                  onResubmit(deliverable);
                }}
              >
                Resubmit deliverable
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
