'use client';

import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@/components/shared/Modal';
import {
  FormField,
  FormAutocomplete,
  FormInput,
  FormRow2,
} from '@/components/shared/FormField';
import { Button } from '@/components/shared/Button';
import {
  entrepreneurSchema,
  type EntrepreneurForm,
} from '@/lib/forms/schemas';
import { useAdminStore } from '@/lib/stores/admin-store';
import { countries, programmeGoalTypes, sectors, stages } from '@/lib/mock-data/definitions';
import { getAssignedProgrammes } from '@/lib/programme-access';
import type { Entrepreneur } from '@/types';

const activeGoalTypes = programmeGoalTypes.filter((goalType) => goalType.active);

function goalTypeRequiresTarget(value: string) {
  return programmeGoalTypes.find((goalType) => goalType.id === value)?.requiresTargetAmount ?? false;
}

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
  const { addEntrepreneur, updateEntrepreneur, programs } = useAdminStore();
  const assignableProgrammes = getAssignedProgrammes(programs);

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
      goalType: entrepreneur?.goal.type ?? activeGoalTypes[0]?.id ?? '',
      goalAmountUsd: entrepreneur?.goal.amountUsd ? String(entrepreneur.goal.amountUsd) : '',
      programmeId: entrepreneur?.programmeId ?? '',
    },
  });

  const country = useWatch({ control: form.control, name: 'country' });
  const sector = useWatch({ control: form.control, name: 'sector' });
  const stage = useWatch({ control: form.control, name: 'stage' });
  const goalType = useWatch({ control: form.control, name: 'goalType' });
  const programmeId = useWatch({ control: form.control, name: 'programmeId' });

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
      width="wide"
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
            <FormAutocomplete
              value={country}
              onValueChange={(v) => form.setValue('country', v as EntrepreneurForm['country'])}
              options={countries.map((country) => ({ value: country, label: country }))}
              placeholder="Select country"
              searchPlaceholder="Search countries..."
              emptyMessage="No country found."
            />
          </FormField>
        </FormRow2>
        <FormRow2>
          <FormField label="Sector">
            <FormAutocomplete
              value={sector}
              onValueChange={(v) => form.setValue('sector', v)}
              options={sectors.map((s) => ({ value: s.id, label: s.label }))}
              placeholder="Select sector"
              searchPlaceholder="Search sectors..."
              emptyMessage="No sector found."
            />
          </FormField>
          <FormField label="Stage">
            <FormAutocomplete
              value={stage}
              onValueChange={(v) => form.setValue('stage', v)}
              options={stages.map((stage) => ({
                value: stage.id,
                label: stage.label,
                description: stage.definition,
              }))}
              placeholder="Select stage"
              searchPlaceholder="Search stages..."
              emptyMessage="No stage found."
            />
          </FormField>
        </FormRow2>
        {!isEdit && (
          <>
            <FormField label="Primary goal type">
              <FormAutocomplete
                value={goalType}
                onValueChange={(v) => form.setValue('goalType', v, { shouldValidate: true })}
                options={activeGoalTypes.map((goalTypeOption) => ({
                  value: goalTypeOption.id,
                  label: goalTypeOption.label,
                  description: goalTypeOption.description,
                }))}
                placeholder="Select goal type"
                searchPlaceholder="Search goal types..."
                emptyMessage="No goal type found."
              />
            </FormField>
            {goalTypeRequiresTarget(goalType) && (
              <FormField label="Amount to raise (USD)">
                <FormInput placeholder="e.g. 500000" {...form.register('goalAmountUsd')} />
              </FormField>
            )}
          </>
        )}
        {!isEdit && (
          <FormField label="Initial programme" optional>
            <FormAutocomplete
              value={programmeId ?? ''}
              onValueChange={(v) => form.setValue('programmeId', v)}
              options={assignableProgrammes.map((p) => ({ value: p.id, label: p.name }))}
              placeholder="Select programme"
              searchPlaceholder="Search programmes..."
              emptyMessage="No programme found."
            />
            <p className="mt-1.5 text-xs leading-5 text-ink-muted">
              Choose the first programme this entrepreneur should start with.
            </p>
          </FormField>
        )}
        <Button type="submit" className="mt-1 w-full">
          {mode === 'edit' ? 'Save changes' : 'Add entrepreneur'}
        </Button>
      </form>
    </Modal>
  );
}
