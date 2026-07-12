'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@/components/shared/Modal';
import { FormAutocomplete, FormField } from '@/components/shared/FormField';
import { Notice } from '@/components/shared/PageHeader';
import { Button } from '@/components/shared/Button';
import { useAdminStore } from '@/lib/stores/admin-store';
import { reuseModuleSchema, type ReuseModuleForm } from '@/lib/forms/schemas';

export function ReuseModuleModal({
  open,
  onOpenChange,
  programId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programId: string;
}) {
  const { modules } = useAdminStore();
  const form = useForm<ReuseModuleForm>({
    resolver: zodResolver(reuseModuleSchema),
    defaultValues: { moduleId: '' },
  });
  const reusable = modules;

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Reuse existing module">
      <form
        onSubmit={form.handleSubmit(() => {
          onOpenChange(false);
          form.reset({ moduleId: '' });
          import('sonner').then(({ toast }) => toast.success('Module added to programme!'));
        })}
      >
        <FormField label="Select module to add into this programme" error={form.formState.errors.moduleId?.message}>
          <FormAutocomplete
            value={form.watch('moduleId')}
            onValueChange={(value) => form.setValue('moduleId', value, { shouldValidate: true })}
            options={reusable.map((m) => ({
              value: m.id,
              label: m.title,
              description: m.reuseCount ? `Used in ${m.reuseCount} programmes` : undefined,
            }))}
            placeholder="Search reusable modules"
            searchPlaceholder="Search modules..."
          />
        </FormField>
        <Notice>
          This adds the same module (and its content) into this programme too — edits to
          the content will apply everywhere it&apos;s used.
        </Notice>
        <Button type="submit" className="w-full">
          Add module
        </Button>
      </form>
    </Modal>
  );
}
