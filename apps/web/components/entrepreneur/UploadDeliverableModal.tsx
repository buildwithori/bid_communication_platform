'use client';

import * as React from 'react';
import { AlertTriangle, CheckCircle2, Clock3, FileText, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { FormAutocomplete, FormField, FormTextarea } from '@/components/shared/FormField';
import { Modal } from '@/components/shared/Modal';
import {
  useLazyDeliverableInstances,
  useSubmitDeliverableMutation,
  type DeliverableInstance,
  type DeliverableStatus,
} from '@/lib/api/deliverables';
import { useDirectFileUploadMutation } from '@/lib/api/files';
import type { BadgeTone } from '@/types';

const statusMeta: Record<DeliverableStatus, { label: string; tone: BadgeTone; helper: string }> = {
  not_submitted: { label: 'Not submitted', tone: 'amber', helper: 'Upload the required file for BID review.' },
  overdue: { label: 'Overdue', tone: 'red', helper: 'This requirement is past its due date.' },
  submitted: { label: 'Submitted', tone: 'blue', helper: 'BID is reviewing the latest upload.' },
  changes_required: { label: 'Changes required', tone: 'amber', helper: 'Upload a revised file after addressing BID feedback.' },
  approved: { label: 'Approved', tone: 'green', helper: 'BID has accepted this deliverable.' },
};

function formatDate(value?: string | null) {
  if (!value) return 'No due date';
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isOpenRequirement(item: DeliverableInstance) {
  return item.status === 'not_submitted' || item.status === 'overdue' || item.status === 'changes_required';
}

export function UploadDeliverableModal({
  open,
  onOpenChange,
  deliverable,
  programmeId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deliverable?: DeliverableInstance | null;
  programmeId?: string;
}) {
  const [selectedId, setSelectedId] = React.useState(deliverable?.id ?? '');
  const [file, setFile] = React.useState<File | null>(null);
  const [note, setNote] = React.useState('');
  const requirements = useLazyDeliverableInstances({
    programmeId,
    take: 20,
    enabled: open && !deliverable,
  });
  const eligible = React.useMemo(
    () => requirements.rows.filter(isOpenRequirement),
    [requirements.rows],
  );
  const selected = deliverable ?? eligible.find((item) => item.id === selectedId) ?? null;
  const isResubmission = selected?.status === 'changes_required';
  const upload = useDirectFileUploadMutation();
  const submit = useSubmitDeliverableMutation({
    onSuccess: () => {
      toast.success(isResubmission ? 'Deliverable resubmitted' : 'Deliverable submitted for review');
      resetAndClose();
    },
  });
  const isSaving = upload.isPending || submit.isPending;

  function resetAndClose() {
    setSelectedId(deliverable?.id ?? '');
    setFile(null);
    setNote('');
    upload.reset();
    onOpenChange(false);
  }

  function requestClose() {
    if (!isSaving) resetAndClose();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !file || isSaving) return;
    if (file.size > 25 * 1024 * 1024) {
      toast.error('Files must be 25 MB or smaller.');
      return;
    }
    try {
      const asset = await upload.mutateAsync({ file, usage: 'deliverable_submission' });
      await submit.mutateAsync({ instanceId: selected.id, fileAssetId: asset.id, note: note.trim() || undefined });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed. Please try again.');
    }
  }

  return (
    <Modal open={open} onOpenChange={(next) => !next && requestClose()} title={isResubmission ? 'Resubmit deliverable' : 'Upload deliverable'} width="wide">
      <form onSubmit={handleSubmit} className="space-y-4">
        {!deliverable && (
          <FormField label="BID requirement" className="mb-0">
            <FormAutocomplete
              value={selectedId}
              onValueChange={setSelectedId}
              placeholder={requirements.isLoading ? 'Loading requirements...' : 'Select a deliverable requirement'}
              searchPlaceholder="Search loaded requirements..."
              emptyMessage="No open requirements found."
              isLoading={requirements.isLoading}
              hasMore={requirements.hasNextPage}
              onLoadMore={() => requirements.fetchNextPage()}
              options={eligible.map((item) => ({
                value: item.id,
                label: item.deliverable,
                description: item.programme.name + ' · ' + statusMeta[item.status].label + ' · Due ' + formatDate(item.dueDate) + (item.periodStart && item.periodEnd ? ' · Period ' + formatDate(item.periodStart) + ' – ' + formatDate(item.periodEnd) : ''),
              }))}
            />
          </FormField>
        )}

        {selected ? (
          <div className="rounded-xl border border-line bg-surface-subtle p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-bid-light text-bid">
                  {isResubmission ? <AlertTriangle className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                </span>
                <div className="min-w-0">
                  <div className="font-semibold text-ink">{selected.deliverable}</div>
                  <div className="mt-1 text-sm text-ink-muted">{selected.programme.name}</div>
                  {selected.periodStart && selected.periodEnd && (
                    <div className="mt-1 text-sm text-ink-muted">Reporting period {formatDate(selected.periodStart)} – {formatDate(selected.periodEnd)}</div>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge tone={statusMeta[selected.status].tone}>{statusMeta[selected.status].label}</Badge>
                    <span className="text-sm text-ink-muted">Due {formatDate(selected.dueDate)}</span>
                  </div>
                </div>
              </div>
              {selected.latestSubmission && (
                <div className="rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink-muted">
                  <div className="font-medium text-ink">Latest upload</div>
                  <div className="max-w-[230px] truncate">{selected.latestSubmission.file.originalFilename}</div>
                  <div>{formatDate(selected.latestSubmission.submittedAt)}</div>
                </div>
              )}
            </div>
            <div className="mt-3 flex items-start gap-2 text-sm text-ink-muted">
              {selected.status === 'submitted' ? <Clock3 className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
              <span>{statusMeta[selected.status].helper}</span>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-line bg-surface-subtle px-4 py-5 text-sm text-ink-muted">
            Select a BID requirement before uploading. The file will be attached to that requirement for review.
          </div>
        )}

        {isResubmission && selected?.latestReview && (
          <div className="rounded-xl border border-warning/20 bg-warning-light px-4 py-3">
            <div className="text-sm font-semibold text-warning-dark">Current BID feedback to address</div>
            <p className="mt-2 text-sm leading-6 text-warning-dark">{selected.latestReview.feedback}</p>
          </div>
        )}

        <FormField label="File" className="mb-0">
          <label className="flex w-full cursor-pointer flex-col items-center rounded-xl border-[1.5px] border-dashed border-line-strong px-5 py-6 text-center transition-colors hover:border-bid hover:bg-bid-light">
            <UploadCloud className="mb-1 h-6 w-6 text-bid" />
            <span className="text-sm font-medium text-ink">{file?.name ?? (isResubmission ? 'Attach revised file' : 'Choose file for review')}</span>
            <span className="mt-1 text-xs text-ink-muted">PDF, PPTX, DOCX, or XLSX up to 25 MB</span>
            <input
              type="file"
              className="sr-only"
              accept=".pdf,.pptx,.docx,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              disabled={!selected || isSaving}
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>
        </FormField>

        {upload.isPending && (
          <div className="rounded-lg bg-bid-light px-3 py-2 text-sm text-bid-dark">
            Uploading {upload.progress.percent}%
          </div>
        )}

        <FormField label="Message to BID reviewer" optional className="mb-0">
          <FormTextarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} placeholder={isResubmission ? 'Briefly explain what changed in this version...' : 'Add any context the reviewer should know...'} />
        </FormField>

        <Button type="submit" className="w-full" disabled={!selected || !file} isLoading={isSaving} loadingLabel={upload.isPending ? 'Uploading file...' : 'Submitting...'}>
          {isResubmission ? 'Resubmit for review' : 'Submit for review'}
        </Button>
      </form>
    </Modal>
  );
}
