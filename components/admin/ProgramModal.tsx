'use client';

import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@/components/shared/Modal';
import { FormField, FormInput, FormSelect, FormTextarea, FormRow2 } from '@/components/shared/FormField';
import { Button } from '@/components/shared/Button';
import { DatePicker } from '@/components/shared/DatePicker';
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
      accessType: program?.accessType ?? 'assigned',
      startDate: program?.startDate ?? '',
      endDate: program?.endDate ?? '',
      maxEntrepreneurs: program ? String(program.maxEntrepreneurs) : '20',
      publishState: program?.publishedAt ? 'published' : 'draft',
      description: program?.description ?? '',
    },
  });

  const onSubmit = (values: ProgramForm) => {
    if (isEdit && program) {
      updateProgram(program.id, {
        name: values.name,
        accessType: values.accessType,
        startDate: values.startDate,
        endDate: values.endDate,
        maxEntrepreneurs: Number(values.maxEntrepreneurs) || 20,
        publishedAt: values.publishState === 'published'
          ? program.publishedAt ?? new Date().toISOString()
          : undefined,
        description: values.description,
      });
    } else {
      addProgram(values);
    }
    onOpenChange(false);
    form.reset();
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={mode === 'edit' ? 'Edit programme' : 'New program'} width="wide">
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField label="Program name" error={form.formState.errors.name?.message}>
          <FormInput
            placeholder="e.g. Women Economic Empowerment Programme"
            {...form.register('name')}
          />
        </FormField>
        <FormField label="Access">
          <FormSelect
            value={form.watch('accessType')}
            onValueChange={(value) => form.setValue('accessType', value as ProgramForm['accessType'], { shouldValidate: true })}
            options={[
              { value: 'assigned', label: 'Assigned programme' },
              { value: 'free', label: 'Free programme' },
            ]}
          />
          <p className="mt-1.5 text-xs leading-5 text-ink-muted">
            Free programmes are available to every entrepreneur. Assigned programmes require enrolment.
          </p>
        </FormField>
        <FormRow2>
          <FormField label="Start date" error={form.formState.errors.startDate?.message}>
            <Controller
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <DatePicker
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />
          </FormField>
          <FormField label="End date" error={form.formState.errors.endDate?.message}>
            <Controller
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <DatePicker
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />
          </FormField>
        </FormRow2>
        <FormField label="Max entrepreneurs">
          <FormInput type="number" {...form.register('maxEntrepreneurs')} />
        </FormField>
        <FormField label="Publishing">
          <FormSelect
            value={form.watch('publishState')}
            onValueChange={(value) => form.setValue('publishState', value as ProgramForm['publishState'], { shouldValidate: true })}
            options={[
              { value: 'draft', label: 'Save as draft' },
              { value: 'published', label: 'Publish programme' },
            ]}
          />
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
