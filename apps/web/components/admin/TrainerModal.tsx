'use client';

import * as React from 'react';
import { Controller, useForm } from 'react-hook-form';
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
import { Badge } from '@/components/shared/Badge';
import { DatePicker } from '@/components/shared/DatePicker';
import { trainerSchema, type TrainerForm } from '@/lib/forms/schemas';
import { useAdminStore } from '@/lib/stores/admin-store';
import { sectors } from '@/lib/mock-data/definitions';
import type { SectorId, Trainer } from '@/types';

function parseSectorSpecialisms(value?: string): SectorId[] {
  const validSectorIds = new Set<string>(sectors.map((sector) => sector.id));
  return (value ?? '')
    .split(',')
    .map((specialism) => specialism.trim())
    .filter((specialism): specialism is SectorId => validSectorIds.has(specialism));
}

function isSectorId(value: string): value is SectorId {
  return sectors.some((sector) => sector.id === value);
}

export function TrainerModal({
  open,
  onOpenChange,
  mode = 'add',
  trainer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: 'add' | 'edit';
  trainer?: Trainer;
}) {
  const { addTrainer, updateTrainer } = useAdminStore();
  const isEdit = mode === 'edit' && trainer;

  const form = useForm<TrainerForm>({
    resolver: zodResolver(trainerSchema),
    defaultValues: {
      firstName: trainer ? trainer.fullName.split(' ')[0] : '',
      lastName: trainer ? trainer.fullName.split(' ').slice(1).join(' ') : '',
      email: trainer?.email ?? '',
      role: trainer?.role ?? 'Mentor',
      accessLevel: trainer?.accessLevel ?? 'full',
      accessExpiresOn: trainer?.accessExpiresOn ?? '',
      specialisms: trainer?.specialisms.join(', ') ?? '',
      maxEntrepreneurs: trainer ? String(trainer.maxEntrepreneurs) : '10',
    },
  });

  const accessLevel = form.watch('accessLevel');
  const selectedSpecialisms = parseSectorSpecialisms(form.watch('specialisms'));

  const setSpecialisms = (nextSpecialisms: string[]) => {
    form.setValue('specialisms', nextSpecialisms.join(', '), { shouldValidate: true });
  };

  const addSpecialism = (value: string) => {
    if (!isSectorId(value) || selectedSpecialisms.includes(value)) return;
    setSpecialisms([...selectedSpecialisms, value]);
  };

  const removeSpecialism = (value: string) => {
    setSpecialisms(selectedSpecialisms.filter((specialism) => specialism !== value));
  };

  const onSubmit = (values: TrainerForm) => {
    if (isEdit && trainer) {
      updateTrainer(trainer.id, {
        fullName: `${values.firstName} ${values.lastName}`,
        email: values.email,
        role: values.role,
        accessLevel: values.accessLevel,
        accessExpiresOn: values.accessLevel === 'guest' ? values.accessExpiresOn : undefined,
        specialisms: parseSectorSpecialisms(values.specialisms),
      });
    } else {
      addTrainer(values);
    }
    onOpenChange(false);
    form.reset();
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={mode === 'edit' ? `Edit trainer${trainer ? ` – ${trainer.fullName}` : ''}` : 'Add trainer'}
      width="wide"
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col">
        <FormRow2>
          <FormField label="First name" error={form.formState.errors.firstName?.message}>
            <FormInput placeholder="First name" {...form.register('firstName')} />
          </FormField>
          <FormField label="Last name" error={form.formState.errors.lastName?.message}>
            <FormInput placeholder="Last name" {...form.register('lastName')} />
          </FormField>
        </FormRow2>
        <FormField label="Email" error={form.formState.errors.email?.message}>
          <FormInput type="email" placeholder="trainer@example.com" {...form.register('email')} />
        </FormField>
        <FormField label="Role">
          <FormSelect
            value={form.watch('role')}
            onValueChange={(v) => form.setValue('role', v as TrainerForm['role'])}
            options={[
              { value: 'Mentor', label: 'Mentor' },
              { value: 'Trainer', label: 'Trainer' },
              { value: 'Guest Expert', label: 'Guest Expert' },
              { value: 'Investment Analyst', label: 'Investment Analyst' },
            ]}
          />
        </FormField>
        <FormField label="Access level">
          <FormSelect
            value={form.watch('accessLevel')}
            onValueChange={(v) => form.setValue('accessLevel', v as 'full' | 'guest')}
            options={[
              { value: 'full', label: 'Full access' },
              { value: 'guest', label: 'Guest — temporary access' },
            ]}
          />
        </FormField>
        {accessLevel === 'guest' && (
          <FormField label="Access expires">
            <Controller
              control={form.control}
              name="accessExpiresOn"
              render={({ field }) => (
                <DatePicker
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />
          </FormField>
        )}
        <FormField label="Specialisms">
          <FormAutocomplete
            value=""
            onValueChange={addSpecialism}
            options={sectors
              .filter((sector) => !selectedSpecialisms.includes(sector.id))
              .map((sector) => ({ value: sector.id, label: sector.label }))}
            placeholder="Add sector specialism"
            searchPlaceholder="Search sectors..."
            emptyMessage="No sector found."
          />
          {selectedSpecialisms.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {selectedSpecialisms.map((specialism) => {
                const sector = sectors.find((item) => item.id === specialism);
                return (
                  <button
                    key={specialism}
                    type="button"
                    onClick={() => removeSpecialism(specialism)}
                    className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-bid/20"
                    aria-label={`Remove ${sector?.label ?? specialism}`}
                  >
                    <Badge tone={sector?.color ?? 'neutral'}>{sector?.label ?? specialism} ×</Badge>
                  </button>
                );
              })}
            </div>
          )}
        </FormField>
        <FormField label="Max entrepreneurs">
          <FormInput type="number" {...form.register('maxEntrepreneurs')} />
        </FormField>

        <Button type="submit" className="w-full">
          {mode === 'edit' ? 'Save changes' : 'Add trainer'}
        </Button>
      </form>
    </Modal>
  );
}
