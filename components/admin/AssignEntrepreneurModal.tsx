'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@/components/shared/Modal';
import { FormAutocomplete, FormField, FormInput } from '@/components/shared/FormField';
import { Button } from '@/components/shared/Button';
import { assignToProgramSchema, type AssignToProgramForm } from '@/lib/forms/schemas';
import { useAdminStore } from '@/lib/stores/admin-store';
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
  const { assignEntrepreneur, programs, trainers } = useAdminStore();
  const form = useForm<AssignToProgramForm>({
    resolver: zodResolver(assignToProgramSchema),
    defaultValues: {
      entrepreneurId: entrepreneur.id,
      programmeId: programs[0]?.id ?? '',
      trainerId: 'none',
    },
  });

  const onSubmit = (values: AssignToProgramForm) => {
    assignEntrepreneur(values);
    onOpenChange(false);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Assign entrepreneur">
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col">
        <FormField label="Entrepreneur">
          <FormInput
            disabled
            value={`${entrepreneur.representative} – ${entrepreneur.businessName}`}
          />
        </FormField>
        <FormField label="Programme">
          <FormAutocomplete
            value={form.watch('programmeId')}
            onValueChange={(v) => form.setValue('programmeId', v)}
            options={programs.map((p) => ({ value: p.id, label: p.name }))}
            placeholder="Search programme"
            searchPlaceholder="Search programmes..."
          />
        </FormField>
        <FormField label="Trainer" optional>
          <FormAutocomplete
            value={form.watch('trainerId') ?? 'none'}
            onValueChange={(v) => form.setValue('trainerId', v)}
            options={[
              { value: 'none', label: 'Unassigned' },
              ...trainers.map((t) => ({
                value: t.id,
                label: t.fullName,
                description: `${t.role} · ${t.metrics.entrepreneursCount} assigned`,
              })),
            ]}
            placeholder="Search trainer"
            searchPlaceholder="Search trainers..."
          />
        </FormField>
        <Button type="submit" className="w-full">
          Confirm assignment
        </Button>
      </form>
    </Modal>
  );
}
