'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@/components/shared/Modal';
import {
  FormField,
  FormAutocomplete,
  FormInput,
  FormSelect,
  FormRow2,
} from '@/components/shared/FormField';
import { Button } from '@/components/shared/Button';
import {
  entrepreneurSchema,
  type EntrepreneurForm,
} from '@/lib/forms/schemas';
import { useAdminStore } from '@/lib/stores/admin-store';
import { sectors } from '@/lib/mock-data/definitions';
import type { Entrepreneur } from '@/types';

const programmeOptions = (ids: string[]) => ids;
const trainerOptions = ['none', 't-kofi', 't-esi', 't-james'];

export function EntrepreneurModal({
  open,
  onOpenChange,
  mode = 'add',
  entrepreneur,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: 'add' | 'edit';
  entrepreneur?: Entrepreneur;
}) {
  const { addEntrepreneur, updateEntrepreneur, programs, trainers } = useAdminStore();

  const isEdit = mode === 'edit' && entrepreneur;

  const form = useForm<EntrepreneurForm>({
    resolver: zodResolver(entrepreneurSchema),
    defaultValues: {
      businessName: entrepreneur?.businessName ?? '',
      representative: entrepreneur?.representative ?? '',
      email: entrepreneur?.email ?? '',
      phone: entrepreneur?.phone ?? '',
      country: entrepreneur?.country ?? 'Ghana',
      sector: entrepreneur?.sector ?? 'fintech',
      stage: entrepreneur?.stage ?? 'idea',
      goalType: entrepreneur?.goal.type ?? 'fundraising',
      goalAmountUsd: entrepreneur?.goal.amountUsd ? String(entrepreneur.goal.amountUsd) : '',
      programmeId: entrepreneur?.programmeId ?? 'none',
      trainerId: entrepreneur?.trainerId ?? 'none',
    },
  });

  const goalType = form.watch('goalType');

  const onSubmit = (values: EntrepreneurForm) => {
    if (isEdit && entrepreneur) {
      updateEntrepreneur(entrepreneur.id, {
        businessName: values.businessName,
        representative: values.representative,
        email: values.email,
        phone: values.phone ?? '',
        country: values.country,
        sector: values.sector as Entrepreneur['sector'],
        stage: values.stage,
        goal: {
          type: values.goalType,
          amountUsd: values.goalAmountUsd ? Number(values.goalAmountUsd) : undefined,
          description: entrepreneur.goal.description,
        },
        programmeId: values.programmeId && values.programmeId !== 'none' ? values.programmeId : undefined,
        trainerId: values.trainerId && values.trainerId !== 'none' ? values.trainerId : undefined,
      });
    } else {
      addEntrepreneur(values);
    }
    onOpenChange(false);
    form.reset();
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={mode === 'edit' ? 'Edit entrepreneur' : 'Add entrepreneur'}
      width="md"
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col">
        <FormField label="Business name" error={form.formState.errors.businessName?.message}>
          <FormInput placeholder="e.g. PayBridge Africa Ltd" {...form.register('businessName')} />
        </FormField>
        <FormRow2>
          <FormField label="Representative name" error={form.formState.errors.representative?.message}>
            <FormInput placeholder="e.g. Amara Osei" {...form.register('representative')} />
          </FormField>
          <FormField label="Email" error={form.formState.errors.email?.message}>
            <FormInput type="email" placeholder="amara@example.com" {...form.register('email')} />
          </FormField>
        </FormRow2>
        <FormRow2>
          <FormField label="Phone number">
            <FormInput placeholder="+233 24 555 0000" {...form.register('phone')} />
          </FormField>
          <FormField label="Country">
            <FormSelect
              value={form.watch('country')}
              onValueChange={(v) => form.setValue('country', v as 'Ghana' | 'Nigeria' | 'Kenya')}
              options={[
                { value: 'Ghana', label: 'Ghana' },
                { value: 'Nigeria', label: 'Nigeria' },
                { value: 'Kenya', label: 'Kenya' },
              ]}
            />
          </FormField>
        </FormRow2>
        <FormRow2>
          <FormField label="Sector">
            <FormSelect
              value={form.watch('sector')}
              onValueChange={(v) => form.setValue('sector', v)}
              options={sectors.map((s) => ({ value: s.id, label: s.label }))}
            />
          </FormField>
          <FormField label="Stage">
            <FormSelect
              value={form.watch('stage')}
              onValueChange={(v) => form.setValue('stage', v as 'idea' | 'growth' | 'scale')}
              options={[
                { value: 'idea', label: 'Idea' },
                { value: 'growth', label: 'Growth' },
                { value: 'scale', label: 'Scale' },
              ]}
            />
          </FormField>
        </FormRow2>
        <FormField label="Current need / goal">
          <FormSelect
            value={form.watch('goalType')}
            onValueChange={(v) => form.setValue('goalType', v as 'fundraising' | 'programme-completion' | 'milestone')}
            options={[
              { value: 'fundraising', label: 'Fundraising' },
              { value: 'programme-completion', label: 'Programme completion' },
              { value: 'milestone', label: 'Milestone completion' },
            ]}
          />
        </FormField>
        {goalType === 'fundraising' && (
          <FormField label="Amount to raise (USD)">
            <FormInput placeholder="e.g. 500000" {...form.register('goalAmountUsd')} />
          </FormField>
        )}
        <FormRow2>
          <FormField label="Programme" optional>
            <FormAutocomplete
              value={form.watch('programmeId') ?? 'none'}
              onValueChange={(v) => form.setValue('programmeId', v)}
              options={[
                { value: 'none', label: 'Leave unassigned' },
                ...programs.map((p) => ({ value: p.id, label: p.name })),
              ]}
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
        </FormRow2>
        <Button type="submit" className="mt-1 w-full">
          {mode === 'edit' ? 'Save changes' : 'Add entrepreneur'}
        </Button>
      </form>
    </Modal>
  );
}
