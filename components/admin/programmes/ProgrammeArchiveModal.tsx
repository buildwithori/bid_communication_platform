'use client';

import * as React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/shared/Button';
import { FormField, FormTextarea } from '@/components/shared/FormField';
import { Modal } from '@/components/shared/Modal';
import { Notice } from '@/components/shared/PageHeader';
import { getProgrammeStatus, getProgrammeStatusLabel } from '@/lib/programme-status';
import type { Program } from '@/types';

export function ProgrammeArchiveModal({
  open,
  onOpenChange,
  program,
  onArchive,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  program?: Program;
  onArchive: (program: Program, reason: string) => void;
}) {
  const [reason, setReason] = React.useState('');

  React.useEffect(() => {
    if (!open) setReason('');
  }, [open]);

  if (!program) return null;

  const status = getProgrammeStatus(program);

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Archive programme" width="wide">
      <div className="space-y-4">
        <Notice>
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
            <div>
              <div className="font-medium text-ink">
                {program.name} is currently {getProgrammeStatusLabel(status).toLowerCase()}.
              </div>
              <p className="mt-1 text-sm leading-6 text-ink-muted">
                Archived programmes stay available for audit and reporting, but are hidden from default programme operations.
              </p>
            </div>
          </div>
        </Notice>
        <FormField label="Archive reason">
          <FormTextarea
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="e.g. Cohort completed and records are ready for historical reporting."
          />
        </FormField>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={reason.trim().length < 3}
            onClick={() => {
              onArchive(program, reason.trim());
              onOpenChange(false);
            }}
          >
            Archive programme
          </Button>
        </div>
      </div>
    </Modal>
  );
}
