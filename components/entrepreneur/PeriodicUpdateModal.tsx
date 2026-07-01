'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@/components/shared/Modal';
import { FormField, FormInput, FormRow2, FormSelect, FormTextarea } from '@/components/shared/FormField';
import { Button } from '@/components/shared/Button';
import {
  periodicUpdateSchema,
  type PeriodicUpdateForm,
} from '@/lib/forms/schemas';
import { useEntrepreneurStore } from '@/lib/stores/entrepreneur-store';

export function PeriodicUpdateModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { submitPeriodicUpdate } = useEntrepreneurStore();
  const form = useForm<PeriodicUpdateForm>({
    resolver: zodResolver(periodicUpdateSchema),
    defaultValues: {
      period: 'Q1 2025 (Jan–Mar)',
      jobsWomen: '0',
      jobsMen: '0',
      fundsMobilisedUsd: '0',
      notes: '',
    },
  });

  const onSubmit = (values: PeriodicUpdateForm) => {
    submitPeriodicUpdate(values);
    onOpenChange(false);
    form.reset();
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Periodic update — jobs & funding">
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField label="Period">
          <FormSelect
            value={form.watch('period')}
            onValueChange={(v) => form.setValue('period', v)}
            options={[
              { value: 'Q1 2025 (Jan–Mar)', label: 'Q1 2025 (Jan–Mar)' },
              { value: 'Q2 2025 (Apr–Jun)', label: 'Q2 2025 (Apr–Jun)' },
            ]}
          />
        </FormField>
        <FormRow2>
          <FormField label="Jobs created — women">
            <FormInput type="number" {...form.register('jobsWomen')} />
          </FormField>
          <FormField label="Jobs created — men">
            <FormInput type="number" {...form.register('jobsMen')} />
          </FormField>
        </FormRow2>
        <FormField label="Funds mobilised this period (USD)">
          <FormInput type="number" {...form.register('fundsMobilisedUsd')} />
        </FormField>
        <FormField label="Notes" optional>
          <FormTextarea rows={2} placeholder="Any context for this update…" {...form.register('notes')} />
        </FormField>
        <Button type="submit" className="mt-1 w-full">
          Submit update
        </Button>
      </form>
    </Modal>
  );
}
