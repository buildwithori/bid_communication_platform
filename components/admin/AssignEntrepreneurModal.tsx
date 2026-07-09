'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@/components/shared/Modal';
import { FormAutocomplete, FormField, FormInput } from '@/components/shared/FormField';
import { Button } from '@/components/shared/Button';
import { Badge } from '@/components/shared/Badge';
import { assignToProgramSchema, type AssignToProgramForm } from '@/lib/forms/schemas';
import { useAdminStore } from '@/lib/stores/admin-store';
import { getAssignedProgrammes, getEntrepreneurAssignedProgrammes } from '@/lib/programme-access';
import type { Entrepreneur } from '@/types';

export function AssignEntrepreneurModal({
  open,
  onOpenChange,
  entrepreneur,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entrepreneur: Entrepreneur;
}) {
  const { assignEntrepreneur, entrepreneurs, programs, removeProgrammeEnrollment } = useAdminStore();
  const currentEntrepreneur = entrepreneurs.find((item) => item.id === entrepreneur.id) ?? entrepreneur;
  const existingProgrammes = getEntrepreneurAssignedProgrammes(currentEntrepreneur, programs);
  const existingProgrammeIds = existingProgrammes.map((program) => program.id);
  const availableProgrammes = getAssignedProgrammes(programs).filter((program) => !existingProgrammeIds.includes(program.id));
  const nextProgrammeId = availableProgrammes[0]?.id ?? '';
  const form = useForm<AssignToProgramForm>({
    resolver: zodResolver(assignToProgramSchema),
    defaultValues: {
      entrepreneurId: currentEntrepreneur.id,
      programmeId: nextProgrammeId,
    },
  });

  React.useEffect(() => {
    form.setValue('entrepreneurId', currentEntrepreneur.id);
    form.setValue('programmeId', nextProgrammeId);
  }, [currentEntrepreneur.id, form, nextProgrammeId]);

  const onSubmit = (values: AssignToProgramForm) => {
    assignEntrepreneur(values);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Manage programmes" width="wide">
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col">
        <FormField label="Entrepreneur">
          <FormInput
            disabled
            value={`${currentEntrepreneur.representative} – ${currentEntrepreneur.businessName}`}
          />
        </FormField>

        <div className="mb-4 rounded-xl border border-line bg-white p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-ink">Current programmes</div>
              <div className="mt-0.5 text-sm text-ink-muted">
                Remove a programme when the entrepreneur should no longer use it.
              </div>
            </div>
            <Badge tone="neutral">{existingProgrammes.length}</Badge>
          </div>

          <div className="mt-3 grid gap-2">
            {existingProgrammes.length > 0 ? (
              existingProgrammes.map((program) => (
                <div
                  key={program.id}
                  className="flex flex-col gap-2 rounded-lg border border-line bg-surface-subtle px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-ink">{program.name}</div>
                    <div className="mt-0.5 text-xs text-ink-muted">
                      Active programme
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-danger/30 text-danger hover:bg-danger/10 hover:text-danger-dark"
                    onClick={() => removeProgrammeEnrollment(currentEntrepreneur.id, program.id)}
                  >
                    Remove
                  </Button>
                </div>
              ))
            ) : (
              <div className="rounded-lg bg-surface-subtle px-3 py-4 text-sm text-ink-muted">
                No programme yet.
              </div>
            )}
          </div>
        </div>

        <FormField label="Add programme">
          <FormAutocomplete
            value={form.watch('programmeId')}
            onValueChange={(v) => form.setValue('programmeId', v)}
            options={availableProgrammes.map((p) => ({ value: p.id, label: p.name }))}
            placeholder="Search programme"
            searchPlaceholder="Search programmes..."
            emptyMessage="No additional programme available."
          />
          {availableProgrammes.length === 0 && (
            <p className="mt-1.5 text-xs leading-5 text-ink-muted">
              This entrepreneur is already in every programme in this view.
            </p>
          )}
        </FormField>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
          <Button type="submit" className="sm:min-w-[220px]" disabled={availableProgrammes.length === 0}>
            Add programme
          </Button>
        </div>
      </form>
    </Modal>
  );
}
