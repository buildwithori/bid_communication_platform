'use client';

import * as React from 'react';
import { Download, FileText, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/shared/Button';
import { Modal } from '@/components/shared/Modal';
import { useSignedFileUrlQuery } from '@/lib/api/files';
import { cn } from '@/lib/utils';

export type DeliverableFilePreviewTarget = {
  deliverable: string;
  fileName: string;
  fileMimeType: string | null;
  fileId: string | null;
  fileSizeBytes: string | null;
  businessName: string;
  programme: string;
  submittedAt: string;
};

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

function isPdf(file: DeliverableFilePreviewTarget) {
  return file.fileMimeType === 'application/pdf' || file.fileName.toLowerCase().endsWith('.pdf');
}

function PdfPreviewLoading({ fileName }: { fileName: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute inset-0 z-10 overflow-hidden bg-surface-subtle"
    >
      <div className="flex h-11 items-center gap-3 border-b border-line bg-card px-4">
        <div className="h-3 w-7 animate-pulse rounded bg-surface-strong" />
        <div className="h-3 w-28 animate-pulse rounded bg-surface-strong" />
        <div className="ml-auto h-3 w-20 animate-pulse rounded bg-surface-strong" />
      </div>
      <div className="absolute inset-x-0 bottom-0 top-11 grid place-items-center overflow-hidden p-6">
        <div className="absolute inset-x-[12%] top-7 h-[calc(100%-3.5rem)] animate-pulse rounded-lg border border-line bg-card shadow-sm" />
        <div className="relative z-10 rounded-2xl border border-bid/20 bg-card/95 px-6 py-5 text-center shadow-lg backdrop-blur">
          <div className="relative mx-auto grid h-12 w-12 place-items-center rounded-xl bg-bid-light text-bid">
            <FileText className="h-5 w-5" />
            <LoaderCircle className="absolute -inset-1 h-14 w-14 animate-spin text-bid/70" />
          </div>
          <p className="mt-4 text-sm font-semibold text-ink">Preparing document preview</p>
          <p className="mt-1 max-w-xs truncate text-xs text-ink-muted">{fileName}</p>
        </div>
      </div>
      <span className="sr-only">Loading {fileName}</span>
    </div>
  );
}

function PdfPreviewFrame({ fileName, fileUrl }: { fileName: string; fileUrl: string }) {
  const [loaded, setLoaded] = React.useState(false);

  return (
    <div className="relative h-[68vh] min-h-[360px] overflow-hidden rounded-xl border border-line bg-card">
      <iframe
        title={fileName}
        src={fileUrl}
        onLoad={() => setLoaded(true)}
        className={cn(
          'absolute inset-0 h-full w-full bg-white transition-opacity duration-300 motion-reduce:transition-none',
          loaded ? 'opacity-100' : 'opacity-0',
        )}
      />
      {!loaded ? <PdfPreviewLoading fileName={fileName} /> : null}
    </div>
  );
}

export function DeliverableFilePreviewModal({
  file,
  onClose,
}: {
  file: DeliverableFilePreviewTarget | null;
  onClose: () => void;
}) {
  const fileSize = formatFileSize(file?.fileSizeBytes);
  const signedFile = useSignedFileUrlQuery(file?.fileId ?? undefined, Boolean(file));
  const fileUrl = signedFile.data?.download.url ?? null;
  const canRenderPdf = file ? isPdf(file) && Boolean(fileUrl) : false;

  return (
    <Modal
      open={!!file}
      onOpenChange={(open) => !open && onClose()}
      title={file ? `Preview ${file.fileName}` : 'Preview file'}
      width="media"
    >
      {file && (
        <div className="space-y-4">
          <div className="rounded-xl border border-line bg-surface-subtle p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex min-w-0 gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-bid-light text-bid">
                  <FileText className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <div className="text-lg font-semibold text-ink">{file.deliverable}</div>
                  <div className="mt-1 break-words text-sm text-ink-muted">{file.fileName}</div>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-ink-muted">
                    <span>{file.businessName}</span>
                    <span>{file.programme}</span>
                    <span>Submitted {formatDate(file.submittedAt)}</span>
                    {fileSize && <span>{fileSize}</span>}
                  </div>
                </div>
              </div>
              {fileUrl && (
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button asChild>
                    <a href={fileUrl} download>
                      <Download className="h-4 w-4" />
                      Download
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </div>

          {signedFile.isLoading ? (
            <div className="relative h-[68vh] min-h-[360px] overflow-hidden rounded-xl border border-line">
              <PdfPreviewLoading fileName={file.fileName} />
            </div>
          ) : canRenderPdf ? (
            <PdfPreviewFrame
              key={`${file.fileId}:${fileUrl}`}
              fileName={file.fileName}
              fileUrl={fileUrl ?? ''}
            />
          ) : fileUrl ? (
            <div className="grid min-h-[360px] place-items-center rounded-xl border border-dashed border-line bg-surface-subtle p-8 text-center">
              <div>
                <FileText className="mx-auto h-10 w-10 text-ink-faint" />
                <div className="mt-4 text-base font-semibold text-ink">Preview is not available for this file type</div>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-muted">
                  Download the file to review it in the appropriate application.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid min-h-[360px] place-items-center rounded-xl border border-dashed border-line bg-surface-subtle p-8 text-center">
              <div>
                <FileText className="mx-auto h-10 w-10 text-ink-faint" />
                <div className="mt-4 text-base font-semibold text-ink">File preview unavailable</div>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-muted">
                  The file is still processing or its secure preview link could not be created. Try again shortly.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
