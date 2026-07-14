'use client';

import { Download, ExternalLink, FileText } from 'lucide-react';
import { Button } from '@/components/shared/Button';
import { Modal } from '@/components/shared/Modal';
import type { DeliverableReviewRow } from '@/lib/deliverables/review-queue';

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatFileSize(value?: string | null) {
  if (!value) return null;
  const size = Number(value);
  if (!Number.isFinite(size) || size <= 0) return null;
  if (size < 1024 * 1024) return `${Math.max(Math.round(size / 1024), 1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function isPdf(review: DeliverableReviewRow) {
  return review.fileMimeType === 'application/pdf' || review.fileName.toLowerCase().endsWith('.pdf');
}

export function DeliverableFilePreviewModal({
  review,
  onClose,
}: {
  review: DeliverableReviewRow | null;
  onClose: () => void;
}) {
  const fileSize = formatFileSize(review?.fileSizeBytes);
  const canRenderPdf = review ? isPdf(review) && Boolean(review.fileUrl) : false;

  return (
    <Modal
      open={!!review}
      onOpenChange={(open) => !open && onClose()}
      title={review ? `Preview ${review.fileName}` : 'Preview file'}
      width="media"
    >
      {review && (
        <div className="space-y-4">
          <div className="rounded-xl border border-line bg-surface-subtle p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex min-w-0 gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-bid-light text-bid">
                  <FileText className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <div className="text-lg font-semibold text-ink">{review.deliverable}</div>
                  <div className="mt-1 break-words text-sm text-ink-muted">{review.fileName}</div>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-ink-muted">
                    <span>{review.businessName}</span>
                    <span>{review.programme}</span>
                    <span>Submitted {formatDate(review.submittedAt)}</span>
                    {fileSize && <span>{fileSize}</span>}
                  </div>
                </div>
              </div>
              {review.fileUrl && (
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button asChild variant="outline">
                    <a href={review.fileUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      Open
                    </a>
                  </Button>
                  <Button asChild>
                    <a href={review.fileUrl} download>
                      <Download className="h-4 w-4" />
                      Download
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </div>

          {canRenderPdf ? (
            <div className="overflow-hidden rounded-xl border border-line bg-white">
              <iframe title={review.fileName} src={review.fileUrl ?? ''} className="h-[68vh] w-full bg-white" />
            </div>
          ) : review.fileUrl ? (
            <div className="grid min-h-[360px] place-items-center rounded-xl border border-dashed border-line bg-surface-subtle p-8 text-center">
              <div>
                <FileText className="mx-auto h-10 w-10 text-ink-faint" />
                <div className="mt-4 text-base font-semibold text-ink">Preview is not available for this file type</div>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-muted">
                  Open or download the file to review it in the appropriate application.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid min-h-[360px] place-items-center rounded-xl border border-dashed border-line bg-surface-subtle p-8 text-center">
              <div>
                <FileText className="mx-auto h-10 w-10 text-ink-faint" />
                <div className="mt-4 text-base font-semibold text-ink">No file URL available</div>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-muted">
                  The submission record exists, but the file is not ready for preview yet.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
