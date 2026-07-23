'use client';

import { Eye, FileText } from 'lucide-react';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { Skeleton } from '@/components/shared/Card';
import type { DeliverableSubmission } from '@/lib/api/deliverables';

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatFileSize(value: string) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes <= 0) return null;
  if (bytes < 1024 * 1024) {
    return `${Math.max(Math.round(bytes / 1024), 1)} KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function reviewStatus(submission: DeliverableSubmission) {
  if (submission.latestReview?.decision === 'approved') {
    return { label: 'Approved', tone: 'green' as const };
  }
  if (submission.latestReview) {
    return { label: 'Changes requested', tone: 'amber' as const };
  }
  return { label: 'Awaiting review', tone: 'blue' as const };
}

export function DeliverableSubmissionVersions({
  submissions,
  totalItems,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  onPreview,
}: {
  submissions: DeliverableSubmission[];
  totalItems: number;
  isLoading: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  onPreview: (submission: DeliverableSubmission) => void;
}) {
  return (
    <section className="min-w-0 rounded-2xl border border-line bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-semibold text-ink">
            <FileText className="h-4 w-4 text-bid" />
            Submission versions
          </div>
          <p className="mt-1 text-xs text-ink-muted">
            Select any version to preview it securely inside BID Hub.
          </p>
        </div>
        {!isLoading ? (
          <span className="rounded-full bg-surface-subtle px-2.5 py-1 text-xs font-medium text-ink-muted">
            {totalItems}
          </span>
        ) : null}
      </div>

      {isLoading ? (
        <SubmissionVersionsSkeleton />
      ) : submissions.length ? (
        <div className="scrollbar-thin mt-4 grid max-h-72 gap-2 overflow-y-auto pr-1">
          {submissions.map((item, index) => {
            const version = Math.max(totalItems - index, 1);
            const fileSize = formatFileSize(item.file.sizeBytes);
            const status = reviewStatus(item);

            return (
              <button
                key={item.id}
                type="button"
                aria-label={`Preview version ${version}: ${item.file.originalFilename}`}
                onClick={() => onPreview(item)}
                className="group flex w-full items-center gap-3 rounded-xl border border-line bg-surface-subtle px-3 py-3 text-left outline-none transition hover:border-bid/40 hover:bg-bid-light/45 focus-visible:border-bid focus-visible:ring-2 focus-visible:ring-bid/20"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-card text-xs font-semibold text-ink-muted ring-1 ring-line transition group-hover:text-bid group-hover:ring-bid/30">
                  v{version}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="max-w-full truncate text-sm font-medium text-ink transition group-hover:text-bid">
                      {item.file.originalFilename}
                    </span>
                    {index === 0 ? (
                      <span className="shrink-0 rounded-full bg-success-light px-2 py-0.5 text-[11px] font-medium text-success">
                        Latest
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-1 block text-xs text-ink-muted">
                    Submitted {formatDate(item.submittedAt)}
                    {fileSize ? ` · ${fileSize}` : ''}
                  </span>
                  {item.note ? (
                    <span className="mt-1 block truncate text-xs text-ink-faint">
                      {item.note}
                    </span>
                  ) : null}
                </span>
                <span className="hidden shrink-0 sm:block">
                  <Badge tone={status.tone}>{status.label}</Badge>
                </span>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line bg-card text-ink-muted transition group-hover:border-bid/35 group-hover:text-bid">
                  <Eye className="h-4 w-4" />
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 grid min-h-28 place-items-center rounded-xl border border-dashed border-line bg-surface-subtle px-4 text-center">
          <div>
            <span className="mx-auto grid h-9 w-9 place-items-center rounded-lg bg-card text-ink-faint">
              <FileText className="h-5 w-5" />
            </span>
            <p className="mt-2 text-sm text-ink-muted">
              No submission versions are available.
            </p>
          </div>
        </div>
      )}

      {hasNextPage ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="mt-3 w-full"
          isLoading={isFetchingNextPage}
          onClick={onLoadMore}
        >
          Load earlier versions
        </Button>
      ) : null}
    </section>
  );
}

function SubmissionVersionsSkeleton() {
  return (
    <div
      className="mt-4 grid gap-2"
      aria-label="Loading submission versions"
      aria-busy="true"
    >
      {Array.from({ length: 2 }, (_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 rounded-xl border border-line bg-surface-subtle p-3"
        >
          <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
        </div>
      ))}
    </div>
  );
}
