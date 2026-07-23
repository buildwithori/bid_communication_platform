'use client';

import * as React from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Modal } from '@/components/shared/Modal';
import { FormField, FormInput, FormSelect, FormTextarea, FormRow2 } from '@/components/shared/FormField';
import { Button } from '@/components/shared/Button';
import { DatePicker } from '@/components/shared/DatePicker';
import { nextDateValue } from '@/lib/date-values';
import { programSchema, type ProgramForm } from '@/lib/forms/schemas';
import {
  useCreateProgrammeMutation,
  usePublishProgrammeMutation,
  useUpdateProgrammeMutation,
  type ProgrammeAccessType,
} from '@/lib/api/programmes';

type EditableProgramme = {
  id: string;
  name: string;
  description?: string | null;
  accessType: ProgrammeAccessType;
  startDate: string;
  endDate: string;
  maxEntrepreneurs: number;
  publishedAt?: string | null;
};

export function ProgramModal({
  open,
  onOpenChange,
  mode = 'add',
  program,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: 'add' | 'edit';
  program?: EditableProgramme;
}) {
  const isEdit = mode === 'edit' && Boolean(program);
  const isPublishedProgram = Boolean(program?.publishedAt);
  const createProgramme = useCreateProgrammeMutation();
  const updateProgramme = useUpdateProgrammeMutation();
  const publishProgramme = usePublishProgrammeMutation();
  const isPending =
    createProgramme.isPending ||
    updateProgramme.isPending ||
    publishProgramme.isPending;

  const form = useForm<ProgramForm>({
    resolver: zodResolver(programSchema),
    defaultValues: programmeDefaults(program),
  });
  const accessType = useWatch({ control: form.control, name: 'accessType' });
  const publishState = useWatch({ control: form.control, name: 'publishState' });
  const startDate = useWatch({ control: form.control, name: 'startDate' });

  React.useEffect(() => {
    if (open) form.reset(programmeDefaults(program));
  }, [form, open, program]);

  const onSubmit = async (values: ProgramForm) => {
    try {
      const payload = {
        name: values.name,
        accessType: values.accessType,
        startDate: values.startDate,
        endDate: values.endDate,
        maxEntrepreneurs: Number(values.maxEntrepreneurs),
        description: values.description,
      };

      if (isEdit && program) {
        await updateProgramme.mutateAsync({ id: program.id, payload });
        if (!isPublishedProgram && values.publishState === 'published') {
          await publishProgramme.mutateAsync(program.id);
        }
        toast.success('Programme updated.');
      } else {
        await createProgramme.mutateAsync({
          ...payload,
          publishState: values.publishState,
        });
        toast.success(
          values.publishState === 'published'
            ? 'Programme created and published.'
            : 'Programme draft created.',
        );
      }

      onOpenChange(false);
      form.reset(programmeDefaults());
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Unable to save programme.',
      );
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isPending) onOpenChange(nextOpen);
      }}
      title={mode === 'edit' ? 'Edit programme' : 'New programme'}
      width="wide"
    >
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField label="Programme name" error={form.formState.errors.name?.message}>
          <FormInput
            placeholder="e.g. Women Economic Empowerment Programme"
            {...form.register('name')}
          />
        </FormField>
        <FormField label="Access">
          <FormSelect
            value={accessType}
            onValueChange={(value) =>
              form.setValue('accessType', value as ProgramForm['accessType'], {
                shouldValidate: true,
              })
            }
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
                  onChange={(value) => {
                    field.onChange(value);
                    const endDate = form.getValues('endDate');
                    if (endDate && endDate <= value) {
                      form.setValue('endDate', '', {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    }
                  }}
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
                  minDate={startDate ? nextDateValue(startDate) : undefined}
                />
              )}
            />
          </FormField>
        </FormRow2>
        <FormField
          label="Max entrepreneurs"
          error={form.formState.errors.maxEntrepreneurs?.message}
        >
          <FormInput
            type="number"
            min={1}
            max={1000000}
            {...form.register('maxEntrepreneurs')}
          />
        </FormField>
        {isPublishedProgram ? (
          <FormField label="Publishing">
            <div className="rounded-xl border border-border bg-surface-subtle px-4 py-3 text-sm text-ink">
              Published
              <p className="mt-1 text-xs leading-5 text-ink-muted">
                Published programmes stay published. Completed programmes can be archived from the directory.
              </p>
            </div>
          </FormField>
        ) : (
          <FormField label="Publishing">
            <FormSelect
              value={publishState}
              onValueChange={(value) =>
                form.setValue(
                  'publishState',
                  value as ProgramForm['publishState'],
                  { shouldValidate: true },
                )
              }
              options={[
                { value: 'draft', label: 'Save as draft' },
                { value: 'published', label: 'Publish programme' },
              ]}
            />
          </FormField>
        )}
        <FormField label="Description" optional>
          <FormTextarea
            rows={2}
            placeholder="Brief programme description..."
            {...form.register('description')}
          />
        </FormField>
        <Button
          type="submit"
          className="w-full"
          isLoading={isPending}
          loadingLabel={mode === 'edit' ? 'Saving changes...' : 'Creating programme...'}
        >
          {mode === 'edit' ? 'Save changes' : 'Create programme'}
        </Button>
      </form>
    </Modal>
  );
}

function programmeDefaults(program?: EditableProgramme): ProgramForm {
  return {
    name: program?.name ?? '',
    accessType: program?.accessType ?? 'assigned',
    startDate: toDateInput(program?.startDate),
    endDate: toDateInput(program?.endDate),
    maxEntrepreneurs: program ? String(program.maxEntrepreneurs) : '20',
    publishState: program?.publishedAt ? 'published' : 'draft',
    description: program?.description ?? '',
  };
}

const toDateInput = (value?: string) => (value ? value.slice(0, 10) : '');
