'use client';

import * as React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@/components/shared/Modal';
import { FormAutocomplete, FormField, FormInput } from '@/components/shared/FormField';
import { Button } from '@/components/shared/Button';
import { DatePicker } from '@/components/shared/DatePicker';
import { fundingRoundSchema, type FundingRoundForm } from '@/lib/forms/schemas';
import type { FundingRound } from '@/types';

export function FundingRoundModal({
  open,
  onOpenChange,
  round,
  goalOptions = [],
  programmeOptions = [],
  onSubmitRound,
  isSubmitting = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  round?: FundingRound | null;
  goalOptions?: Array<{ value: string; label: string; description?: string }>;
  programmeOptions?: Array<{ value: string; label: string; description?: string }>;
  onSubmitRound: (values: FundingRoundForm, round?: FundingRound | null) => Promise<void> | void;
  isSubmitting?: boolean;
}) {
  const form = useForm<FundingRoundForm>({
    resolver: zodResolver(fundingRoundSchema),
    defaultValues: {
      name: round?.name ?? '',
      amountUsd: round ? String(round.amountUsd) : '',
      date: round?.date ?? '',
      source: round?.source ?? '',
      programmeId: round?.programmeId ?? 'unattributed',
      goalId: round?.goalId ?? 'none',
    },
  });

  React.useEffect(() => {
    if (!open) return;
    form.reset({
      name: round?.name ?? '',
      amountUsd: round ? String(round.amountUsd) : '',
      date: round?.date ?? '',
      source: round?.source ?? '',
      programmeId: round?.programmeId ?? 'unattributed',
      goalId: round?.goalId ?? 'none',
    });
  }, [form, open, round]);

  const onSubmit = async (values: FundingRoundForm) => {
    await onSubmitRound(values, round);
    onOpenChange(false);
    form.reset();
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={round ? 'Edit funding round' : 'Add funding round'}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField label="Round name" error={form.formState.errors.name?.message}>
          <FormInput placeholder="e.g. Pre-seed, Seed, Series A" {...form.register('name')} />
        </FormField>
        <FormField label="Amount (USD)" error={form.formState.errors.amountUsd?.message}>
          <FormInput placeholder="e.g. 50000" {...form.register('amountUsd')} />
        </FormField>
        <FormField label="Date" error={form.formState.errors.date?.message}>
          <Controller
            control={form.control}
            name="date"
            render={({ field }) => (
              <DatePicker
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />
        </FormField>
        <FormField label="Source" optional>
          <FormInput
            placeholder="e.g. BID grant, angel investor, bank loan"
            {...form.register('source')}
          />
        </FormField>
        <FormField label="Programme attribution" optional>
          <FormAutocomplete
            value={form.watch('programmeId') ?? 'unattributed'}
            onValueChange={(value) => form.setValue('programmeId', value, { shouldValidate: true })}
            options={[
              {
                value: 'unattributed',
                label: 'Company-wide / unattributed',
                description: 'Do not count this round under a programme',
              },
              ...programmeOptions,
            ]}
            placeholder="Select programme attribution"
            searchPlaceholder="Search programmes..."
            emptyMessage="No programme found."
          />
        </FormField>
        <FormField label="Linked fundraising goal" optional>
          <FormAutocomplete
            value={form.watch('goalId') ?? 'none'}
            onValueChange={(value) => form.setValue('goalId', value, { shouldValidate: true })}
            options={[
              { value: 'none', label: 'Not linked to a goal' },
              ...goalOptions,
            ]}
            placeholder="Select fundraising goal"
            searchPlaceholder="Search fundraising goals..."
            emptyMessage="No fundraising goal found."
          />
        </FormField>
        <Button type="submit" className="mt-1 w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : round ? 'Save changes' : 'Add round'}
        </Button>
      </form>
    </Modal>
  );
}
