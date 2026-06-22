'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@/components/shared/Modal';
import { FormField, FormInput, FormTextarea, FormRow2 } from '@/components/shared/FormField';
import { Button } from '@/components/shared/Button';
import { programSchema, type ProgramForm } from '@/lib/forms/schemas';
import { useAdminStore } from '@/lib/stores/admin-store';
import type { Program } from '@/types';

export function ProgramModal({
  open,
  onOpenChange,
  mode = 'add',
  program,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: 'add' | 'edit';
  program?: Program;
}) {
  const { addProgram, updateProgram } = useAdminStore();
  const isEdit = mode === 'edit' && program;

  const form = useForm<ProgramForm>({
    resolver: zodResolver(programSchema),
    defaultValues: {
      name: program?.name ?? '',
      startDate: program?.startDate ?? '',
      endDate: program?.endDate ?? '',
      maxEntrepreneurs: program ? String(program.maxEntrepreneurs) : '20',
      description: program?.description ?? '',
    },
  });

  const onSubmit = (values: ProgramForm) => {
    if (isEdit && program) {
      updateProgram(program.id, {
        name: values.name,
        startDate: values.startDate,
        endDate: values.endDate,
        maxEntrepreneurs: Number(values.maxEntrepreneurs) || 20,
        description: values.description,
      });
    } else {
      addProgram(values);
    }
    onOpenChange(false);
    form.reset();
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={mode === 'edit' ? 'Edit programme' : 'New program'}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField label="Program name" error={form.formState.errors.name?.message}>
          <FormInput
            placeholder="e.g. Women Economic Empowerment Programme"
            {...form.register('name')}
          />
        </FormField>
        <FormRow2>
          <FormField label="Start date" error={form.formState.errors.startDate?.message}>
            <FormInput type="date" {...form.register('startDate')} />
          </FormField>
          <FormField label="End date" error={form.formState.errors.endDate?.message}>
            <FormInput type="date" {...form.register('endDate')} />
          </FormField>
        </FormRow2>
        <FormField label="Max entrepreneurs">
          <FormInput type="number" {...form.register('maxEntrepreneurs')} />
        </FormField>
        <FormField label="Description" optional>
          <FormTextarea rows={2} placeholder="Brief program description…" {...form.register('description')} />
        </FormField>
        <Button type="submit" className="w-full">
          {mode === 'edit' ? 'Save changes' : 'Create program'}
        </Button>
      </form>
    </Modal>
  );
}
