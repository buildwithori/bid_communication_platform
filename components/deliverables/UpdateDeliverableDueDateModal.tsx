'use client';

import * as React from 'react';
import { Modal } from '@/components/shared/Modal';
import { Button } from '@/components/shared/Button';
import { FormField } from '@/components/shared/FormField';
import { DatePicker } from '@/components/shared/DatePicker';
import type { DeliverableReview } from '@/lib/mock-data/admin-workflows';

function formatDate(value?: string) {
  if (!value) return 'No due date';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function UpdateDeliverableDueDateModal({
  review,
  onClose,
  onSave,
}: {
  review: DeliverableReview | null;
  onClose: () => void;
  onSave: (reviewId: string, dueAt: string) => void;
}) {
  const [dueAt, setDueAt] = React.useState('');

  React.useEffect(() => {
    setDueAt(review?.dueAt ?? '');
  }, [review]);

  const hasChanged = Boolean(review && dueAt && dueAt !== review.dueAt);

  return (
    <Modal
      open={!!review}
      onOpenChange={(open) => !open && onClose()}
      title="Override due date"
    >
      {review ? (
        <div>
          <div className="mb-4 rounded-xl border border-line bg-surface-subtle px-4 py-3">
            <div className="text-sm font-semibold text-ink">{review.deliverable}</div>
            <div className="mt-1 text-sm text-ink-muted">
              {review.businessName} - {review.programme}
            </div>
            <div className="mt-2 text-sm text-ink-muted">
              Current due date: <span className="font-medium text-ink">{formatDate(review.dueAt)}</span>
            </div>
            <div className="mt-1 text-sm text-ink-muted">
              Source: <span className="font-medium text-ink">{review.dueSource === 'manual-override' ? 'Manual override' : 'Programme deliverable rule'}</span>
            </div>
            <div className="mt-1 text-sm text-ink-muted">
              Programme rule: <span className="font-medium text-ink">{review.dueRule}</span>
            </div>
          </div>

          <FormField label="Override due date">
            <DatePicker value={dueAt} onChange={setDueAt} />
          </FormField>
          <p className="-mt-2 mb-4 text-sm leading-6 text-ink-muted">
            This changes the due date for this entrepreneur's deliverable only. It does not change the programme deliverable rule.
          </p>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!hasChanged}
              onClick={() => {
                if (!review || !dueAt) return;
                onSave(review.id, dueAt);
              }}
            >
              Save override
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
