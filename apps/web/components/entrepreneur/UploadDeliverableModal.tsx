'use client';

import { AlertTriangle, CheckCircle2, Clock3, FileText, UploadCloud } from 'lucide-react';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Modal } from '@/components/shared/Modal';
import { FormAutocomplete, FormField, FormTextarea } from '@/components/shared/FormField';
import { Button } from '@/components/shared/Button';
import { Badge } from '@/components/shared/Badge';
import { deliverableSchema, type DeliverableForm } from '@/lib/forms/schemas';
import { submitDeliverableInstance } from '@/lib/api/deliverables';
import { createDirectUpload } from '@/lib/api/files';
import { useEntrepreneurStore } from '@/lib/stores/entrepreneur-store';
import { deliverableGroups } from '@/lib/mock-data';
import type { BadgeTone, Deliverable, DeliverableStatus } from '@/types';

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const SUPPORTED_EXTENSIONS = ['pdf', 'ppt', 'pptx', 'doc', 'docx', 'xls', 'xlsx', 'csv'];
const mimeByExtension: Record<string, string> = {
  pdf: 'application/pdf',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
};

const statusMeta: Record<DeliverableStatus, { label: string; tone: BadgeTone; helper: string }> = {
  pending: { label: 'Not submitted', tone: 'amber', helper: 'Upload the required file for BID review.' },
  overdue: { label: 'Overdue', tone: 'red', helper: 'This requirement is past its due date.' },
  submitted: { label: 'Submitted', tone: 'blue', helper: 'BID is reviewing the latest upload.' },
  'changes-requested': { label: 'Changes required', tone: 'amber', helper: 'Upload a revised file after addressing BID feedback.' },
  reviewed: { label: 'Approved', tone: 'green', helper: 'BID has accepted this deliverable.' },
};

function formatDate(value?: string) {
  if (!value) return 'No due date';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function latestFeedback(deliverable?: Deliverable | null) {
  if (!deliverable?.feedbackHistory?.length) return deliverable?.reviewFeedback;
  return [...deliverable.feedbackHistory].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )[0]?.message;
}

function fileExtension(fileName: string) {
  return fileName.split('.').pop()?.toLowerCase() ?? '';
}

function mimeTypeForFile(file: File) {
  return file.type || mimeByExtension[fileExtension(file.name)] || 'application/octet-stream';
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.max(Math.round(size / 1024), 1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function validateSelectedFile(file: File) {
  const extension = fileExtension(file.name);
  if (!SUPPORTED_EXTENSIONS.includes(extension)) {
    return 'Upload a PDF, PowerPoint, Word, Excel, or CSV file.';
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return 'File must be 25 MB or smaller.';
  }
  return null;
}

async function uploadFileForDeliverable(file: File) {
  const directUpload = await createDirectUpload({
    originalFilename: file.name,
    mimeType: mimeTypeForFile(file),
    sizeBytes: file.size,
    usage: 'deliverable_submission',
  });

  if (directUpload.upload.provider === 'digitalocean_spaces') {
    const response = await fetch(directUpload.upload.url, {
      method: directUpload.upload.method,
      headers: directUpload.upload.headers,
      body: file,
    });

    if (!response.ok) {
      throw new Error('The file could not be uploaded. Please try again.');
    }
  }

  return directUpload.file;
}

export function UploadDeliverableModal({
  open,
  onOpenChange,
  deliverable,
  groupId,
  deliverableOptions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deliverable?: Deliverable | null;
  groupId?: string;
  deliverableOptions?: Deliverable[];
}) {
  const queryClient = useQueryClient();
  const { deliverables, submitDeliverable } = useEntrepreneurStore();
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const sourceDeliverables = deliverableOptions ?? deliverables;
  const usesApiDeliverables = Boolean(deliverableOptions);
  const activeGroup = React.useMemo(
    () => (groupId ? deliverableGroups.find((group) => group.id === groupId) : undefined),
    [groupId],
  );
  const eligibleDeliverables = React.useMemo(
    () =>
      sourceDeliverables.filter((item) => {
        const matchesGroup =
          !groupId ||
          (deliverableOptions
            ? item.programmeId === groupId || item.group === 'general'
            : activeGroup?.id === 'g-general'
              ? item.group === 'general'
              : item.programmeId === activeGroup?.programmeId);
        const needsSubmission = item.status === 'pending' || item.status === 'overdue' || item.status === 'changes-requested';
        return matchesGroup && needsSubmission;
      }),
    [activeGroup, deliverableOptions, groupId, sourceDeliverables],
  );

  const form = useForm<DeliverableForm>({
    resolver: zodResolver(deliverableSchema),
    defaultValues: { deliverableId: '', name: '', fileName: '', notes: '' },
  });
  const selectedDeliverableId = form.watch('deliverableId');
  const selectedDeliverable =
    deliverable ?? eligibleDeliverables.find((item) => item.id === selectedDeliverableId) ?? null;
  const isResubmission = selectedDeliverable?.status === 'changes-requested';
  const currentFeedback = latestFeedback(selectedDeliverable);
  const canSubmit = !!selectedDeliverable && !!selectedFile;

  React.useEffect(() => {
    if (!open) return;
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    form.reset({
      deliverableId: deliverable?.id ?? '',
      name: deliverable?.name ?? '',
      fileName: '',
      notes: '',
    });
  }, [deliverable, form, open]);

  const submitMutation = useMutation({
    mutationFn: async (values: DeliverableForm) => {
      if (!selectedFile) throw new Error('Choose the file you want to submit.');
      const uploadedFile = await uploadFileForDeliverable(selectedFile);
      return submitDeliverableInstance(values.deliverableId, {
        fileAssetId: uploadedFile.id,
        note: values.notes,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['deliverable-instances', 'entrepreneur'] });
      toast.success('Deliverable submitted for review');
      onOpenChange(false);
      form.reset();
      setSelectedFile(null);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Could not submit deliverable.');
    },
  });

  const onSubmit = (values: DeliverableForm) => {
    if (!selectedFile) {
      toast.error('Choose the file you want to submit.');
      return;
    }

    if (usesApiDeliverables) {
      submitMutation.mutate(values);
      return;
    }

    submitDeliverable(values);
    onOpenChange(false);
    form.reset();
    setSelectedFile(null);
  };

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;

    const error = validateSelectedFile(file);
    if (error) {
      toast.error(error);
      event.target.value = '';
      setSelectedFile(null);
      form.setValue('fileName', '', { shouldValidate: true });
      return;
    }

    setSelectedFile(file);
    form.setValue('fileName', file.name, { shouldValidate: true });
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={isResubmission ? 'Resubmit deliverable' : 'Upload deliverable'}
      width="wide"
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {!deliverable && (
          <FormField
            label="BID requirement"
            error={form.formState.errors.deliverableId?.message}
            className="mb-0"
          >
            <FormAutocomplete
              value={form.watch('deliverableId') ?? ''}
              onValueChange={(value) => {
                const selected = eligibleDeliverables.find((item) => item.id === value);
                form.setValue('deliverableId', value, { shouldValidate: true });
                if (selected) {
                  form.setValue('name', selected.name);
                  form.setValue('fileName', '', { shouldValidate: true });
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }
              }}
              placeholder={eligibleDeliverables.length ? 'Select a deliverable requirement' : 'No open requirements'}
              searchPlaceholder="Search requirements..."
              emptyMessage="No open deliverables match that search."
              disabled={eligibleDeliverables.length === 0}
              options={eligibleDeliverables.map((item) => ({
                value: item.id,
                label: item.name,
                description: `${item.groupLabel} - ${statusMeta[item.status].label} - Due ${formatDate(item.dueDate)}`,
              }))}
            />
          </FormField>
        )}

        {selectedDeliverable ? (
          <div className="rounded-xl border border-line bg-surface-subtle p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-bid-light text-bid">
                  {isResubmission ? <AlertTriangle className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                </span>
                <div className="min-w-0">
                  <div className="font-semibold text-ink">{selectedDeliverable.name}</div>
                  <div className="mt-1 text-sm text-ink-muted">{selectedDeliverable.groupLabel}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge tone={statusMeta[selectedDeliverable.status].tone}>
                      {statusMeta[selectedDeliverable.status].label}
                    </Badge>
                    <span className="text-sm text-ink-muted">
                      Due {formatDate(selectedDeliverable.dueDate)}
                    </span>
                  </div>
                </div>
              </div>
              {selectedDeliverable.submittedAt && (
                <div className="rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink-muted">
                  <div className="font-medium text-ink">Latest upload</div>
                  <div>{selectedDeliverable.fileName}</div>
                  <div>{formatDate(selectedDeliverable.submittedAt)}</div>
                </div>
              )}
            </div>
            <div className="mt-3 flex items-start gap-2 text-sm text-ink-muted">
              {selectedDeliverable.status === 'submitted' ? (
                <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <span>{statusMeta[selectedDeliverable.status].helper}</span>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-line bg-surface-subtle px-4 py-5 text-sm text-ink-muted">
            Select a BID requirement before uploading. The submitted file will be attached to that requirement for review.
          </div>
        )}

        {isResubmission && currentFeedback && (
          <div className="rounded-xl border border-warning/20 bg-warning-light px-4 py-3">
            <div className="text-sm font-semibold text-warning-dark">Current BID feedback to address</div>
            <p className="mt-2 text-sm leading-6 text-warning-dark">{currentFeedback}</p>
          </div>
        )}

        <input type="hidden" {...form.register('name')} />
        <input type="hidden" {...form.register('fileName')} />
        <input
          ref={fileInputRef}
          type="file"
          className="sr-only"
          accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.csv"
          onChange={onFileChange}
        />
        <button
          type="button"
          disabled={!selectedDeliverable || submitMutation.isPending}
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full flex-col items-center rounded-xl border-[1.5px] border-dashed border-line-strong px-5 py-6 text-center transition-colors hover:border-bid hover:bg-bid-light disabled:pointer-events-none disabled:opacity-60"
          aria-label="Choose deliverable file"
        >
          <UploadCloud className="mx-auto mb-2 h-6 w-6 text-bid" />
          <span className="text-sm font-semibold text-ink">
            {selectedFile ? selectedFile.name : isResubmission ? 'Choose revised file' : 'Choose file'}
          </span>
          <span className="mt-1 text-xs text-ink-muted">
            {selectedFile ? `${formatFileSize(selectedFile.size)} - Ready to submit` : 'PDF, PowerPoint, Word, Excel, or CSV up to 25 MB'}
          </span>
        </button>
        {form.formState.errors.fileName?.message && (
          <p className="text-sm text-danger">{form.formState.errors.fileName.message}</p>
        )}

        <FormField label="Message to BID reviewer" optional className="mb-0">
          <FormTextarea
            rows={3}
            placeholder={isResubmission ? 'Briefly explain what changed in this version...' : 'Add any context the reviewer should know...'}
            {...form.register('notes')}
          />
        </FormField>

        <Button type="submit" className="w-full" disabled={!canSubmit || submitMutation.isPending}>
          {submitMutation.isPending ? 'Submitting...' : isResubmission ? 'Resubmit for review' : 'Submit for review'}
        </Button>
      </form>
    </Modal>
  );
}
