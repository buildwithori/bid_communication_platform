'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@/components/shared/Modal';
import {
  FormField,
  FormInput,
  FormSelect,
  FormRow2,
} from '@/components/shared/FormField';
import { Button } from '@/components/shared/Button';
import { Notice } from '@/components/shared/PageHeader';
import { trainerSchema, type TrainerForm } from '@/lib/forms/schemas';
import { useAdminStore } from '@/lib/stores/admin-store';
import type { Trainer } from '@/types';

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
  const [calProvider, setCalProvider] = React.useState<'google' | 'calendly' | 'none'>(
    trainer?.calendarProvider ?? 'none',
  );
  const [calLink, setCalLink] = React.useState(trainer?.calendarLink ?? '');

  const onSubmit = (values: TrainerForm) => {
    if (isEdit && trainer) {
      updateTrainer(trainer.id, {
        fullName: `${values.firstName} ${values.lastName}`,
        email: values.email,
        role: values.role,
        accessLevel: values.accessLevel,
        accessExpiresOn: values.accessLevel === 'guest' ? values.accessExpiresOn : undefined,
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
            <FormInput type="date" {...form.register('accessExpiresOn')} />
          </FormField>
        )}
        <FormField label="Specialisms (comma separated)">
          <FormInput placeholder="e.g. Fintech, Fundraising, Strategy" {...form.register('specialisms')} />
        </FormField>
        <FormField label="Max entrepreneurs">
          <FormInput type="number" {...form.register('maxEntrepreneurs')} />
        </FormField>

        <div className="my-3 h-px bg-line" />

        <FormField label="Calendar integration" optional>
          <FormSelect
            value={calProvider}
            onValueChange={(v) => {
              setCalProvider(v as typeof calProvider);
              if (v === 'google') setCalLink('');
              if (v === 'none') setCalLink('');
            }}
            options={[
              { value: 'google', label: 'Google Calendar' },
              { value: 'calendly', label: 'Calendly' },
              { value: 'none', label: 'Not connected' },
            ]}
          />
        </FormField>
        {calProvider === 'calendly' && (
          <FormField label="Calendly link">
            <FormInput
              placeholder="e.g. calendly.com/kofi-bid"
              value={calLink}
              onChange={(e) => setCalLink(e.target.value)}
            />
          </FormField>
        )}
        {calProvider === 'google' && (
          <FormField label="Google Calendar email">
            <FormInput
              placeholder="calendar@gmail.com"
              value={calLink}
              onChange={(e) => setCalLink(e.target.value)}
            />
          </FormField>
        )}
        <Notice>
          Entrepreneurs can book any available slot on this trainer&apos;s connected
          calendar. If no calendar is connected, each booking request must be
          confirmed manually by the trainer.
        </Notice>

        <Button type="submit" className="w-full">
          {mode === 'edit' ? 'Save changes' : 'Add trainer'}
        </Button>
      </form>
    </Modal>
  );
}

