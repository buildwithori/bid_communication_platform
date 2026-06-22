'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@/components/shared/Modal';
import { FormField, FormInput, FormTextarea } from '@/components/shared/FormField';
import { Notice } from '@/components/shared/PageHeader';
import { Button } from '@/components/shared/Button';
import { moduleSchema, type ModuleForm } from '@/lib/forms/schemas';
import { useAdminStore } from '@/lib/stores/admin-store';

export function ModuleModal({
  open,
  onOpenChange,
  programId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programId: string;
}) {
  const { addModule } = useAdminStore();
  const form = useForm<ModuleForm>({
    resolver: zodResolver(moduleSchema),
    defaultValues: { title: '', description: '' },
  });

  const onSubmit = (values: ModuleForm) => {
    addModule(programId, values.title, values.description);
    onOpenChange(false);
    form.reset();
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="New module">
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField label="Module title" error={form.formState.errors.title?.message}>
          <FormInput placeholder="e.g. Legal Structures for Startups" {...form.register('title')} />
        </FormField>
        <FormField label="Description" optional>
          <FormTextarea rows={2} {...form.register('description')} />
        </FormField>
        <Notice>
          After creating the module, use &quot;Manage content&quot; to add chapters with
          videos, PDFs and tools.
        </Notice>
        <Button type="submit" className="w-full">
          Create module
        </Button>
      </form>
    </Modal>
  );
}
