'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@/components/shared/Modal';
import { FormAutocomplete, FormField, FormInput, FormRow2, FormTextarea } from '@/components/shared/FormField';
import { DateRangePicker } from '@/components/shared/DatePicker';
import { Button } from '@/components/shared/Button';
import {
  periodicUpdateSchema,
  type PeriodicUpdateForm,
} from '@/lib/forms/schemas';

export function PeriodicUpdateModal({
  open,
  onOpenChange,
  defaultProgrammeId,
  programmeOptions = [],
  onSubmitUpdate,
  isSubmitting = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProgrammeId: string;
  programmeOptions?: Array<{ value: string; label: string; description?: string }>;
  onSubmitUpdate: (values: PeriodicUpdateForm) => Promise<void> | void;
  isSubmitting?: boolean;
}) {
  const form = useForm<PeriodicUpdateForm>({
    resolver: zodResolver(periodicUpdateSchema),
    defaultValues: {
      programmeId: defaultProgrammeId,
      periodStart: '',
      periodEnd: '',
      jobsWomen: '0',
      jobsMen: '0',
      notes: '',
    },
  });

  const attributionOptions = [
    {
      value: 'company-wide',
      label: 'Company-wide / not programme-specific',
      description: 'Use this when jobs were not created through one programme',
    },
    ...programmeOptions,
  ];

  const onSubmit = async (values: PeriodicUpdateForm) => {
    await onSubmitUpdate(values);
    onOpenChange(false);
    form.reset({
      programmeId: defaultProgrammeId,
      periodStart: '',
      periodEnd: '',
      jobsWomen: '0',
      jobsMen: '0',
      notes: '',
    });
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Submit impact update" width="wide">
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="mb-4 rounded-xl border border-line bg-surface-subtle p-4">
          <div className="text-sm font-semibold text-ink">Report progress for one period</div>
          <p className="mt-1 text-sm leading-6 text-ink-muted">
            Share jobs created for the selected reporting period. Funding impact is tracked from fundraising history so BID does not double count capital raised.
          </p>
        </div>
        <FormField label="Reporting scope" error={form.formState.errors.programmeId?.message}>
          <FormAutocomplete
            value={form.watch('programmeId')}
            onValueChange={(value) => form.setValue('programmeId', value, { shouldValidate: true })}
            options={attributionOptions}
            placeholder="Choose reporting scope"
            searchPlaceholder="Search programmes..."
            emptyMessage="No programme found."
          />
        </FormField>
        <FormField
          label="Reporting period"
          error={form.formState.errors.periodStart?.message ?? form.formState.errors.periodEnd?.message}
        >
          <DateRangePicker
            startValue={form.watch('periodStart')}
            endValue={form.watch('periodEnd')}
            onChange={(value) => {
              form.setValue('periodStart', value.start, { shouldValidate: true });
              form.setValue('periodEnd', value.end, { shouldValidate: true });
            }}
            placeholder="Select reporting date range"
          />
        </FormField>
        <FormRow2>
          <FormField label="Women jobs created">
            <FormInput type="number" {...form.register('jobsWomen')} />
          </FormField>
          <FormField label="Men jobs created">
            <FormInput type="number" {...form.register('jobsMen')} />
          </FormField>
        </FormRow2>
        <FormField label="Update notes" optional>
          <FormTextarea
            rows={3}
            placeholder="Mention key wins, hiring context, or anything BID should know about this period."
            {...form.register('notes')}
          />
        </FormField>
        <Button type="submit" className="mt-1 w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Submit update'}
        </Button>
      </form>
    </Modal>
  );
}
