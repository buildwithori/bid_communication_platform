'use client';

import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@/components/shared/Modal';
import { FormField, FormInput } from '@/components/shared/FormField';
import { Button } from '@/components/shared/Button';
import { DatePicker } from '@/components/shared/DatePicker';
import { fundingRoundSchema, type FundingRoundForm } from '@/lib/forms/schemas';
import { useEntrepreneurStore } from '@/lib/stores/entrepreneur-store';

export function FundingRoundModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { addFundingRound } = useEntrepreneurStore();
  const form = useForm<FundingRoundForm>({
    resolver: zodResolver(fundingRoundSchema),
    defaultValues: { name: '', amountUsd: '', date: '', source: '' },
  });

  const onSubmit = (values: FundingRoundForm) => {
    addFundingRound(values);
    onOpenChange(false);
    form.reset();
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Add funding round">
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
        <Button type="submit" className="mt-1 w-full">
          Add round
        </Button>
      </form>
    </Modal>
  );
}
