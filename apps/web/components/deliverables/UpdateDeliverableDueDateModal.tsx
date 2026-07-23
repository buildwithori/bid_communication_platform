'use client';

import * as React from 'react';
import { Button } from '@/components/shared/Button';
import { DatePicker } from '@/components/shared/DatePicker';
import { FormField, FormTextarea } from '@/components/shared/FormField';
import { Modal } from '@/components/shared/Modal';
import { localDateValue } from '@/lib/date-values';
import type { DeliverableReviewRow } from '@/lib/deliverables/review-queue';

function formatDate(value?: string) {
  if (!value) return 'No due date';
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function dateInput(value?: string) {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

export function UpdateDeliverableDueDateModal({
  review,
  onClose,
  onSave,
  isSaving = false,
}: {
  review: DeliverableReviewRow | null;
  onClose: () => void;
  onSave: (reviewId: string, dueAt: string, reason?: string) => void;
  isSaving?: boolean;
}) {
  const [dueAt, setDueAt] = React.useState(dateInput(review?.dueAt));
  const [reason, setReason] = React.useState('');
  const hasChanged = Boolean(review && dueAt && dueAt !== dateInput(review.dueAt));

  return (
    <Modal open={Boolean(review)} onOpenChange={(open) => !open && !isSaving && onClose()} title="Override due date">
      {review ? (
        <div>
          <div className="mb-4 rounded-xl border border-line bg-surface-subtle px-4 py-3">
            <div className="text-sm font-semibold text-ink">{review.deliverable}</div>
            <div className="mt-1 text-sm text-ink-muted">{review.businessName} - {review.programme}</div>
            <div className="mt-2 text-sm text-ink-muted">Current due date: <span className="font-medium text-ink">{formatDate(review.dueAt)}</span></div>
            <div className="mt-1 text-sm text-ink-muted">Source: <span className="font-medium text-ink">{review.dueSource === 'manual-override' ? 'Manual override' : 'Programme deliverable rule'}</span></div>
            <div className="mt-1 text-sm text-ink-muted">Programme rule: <span className="font-medium text-ink">{review.dueRule}</span></div>
          </div>

          <FormField label="Override due date">
            <DatePicker
              value={dueAt}
              minDate={localDateValue()}
              onChange={setDueAt}
            />
          </FormField>
          <FormField label="Reason" optional>
            <FormTextarea rows={3} value={reason} maxLength={300} onChange={(event) => setReason(event.target.value)} placeholder="Explain why this entrepreneur-specific due date is changing..." />
          </FormField>
          <p className="-mt-2 mb-4 text-sm leading-6 text-ink-muted">This changes the due date for this entrepreneur&apos;s deliverable only. It does not change the programme deliverable rule, and the change is recorded in the audit log.</p>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" disabled={isSaving} onClick={onClose}>Cancel</Button>
            <Button type="button" disabled={!hasChanged} isLoading={isSaving} loadingLabel="Saving override..." onClick={() => { if (dueAt) onSave(review.id, dueAt, reason.trim() || undefined); }}>Save override</Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
