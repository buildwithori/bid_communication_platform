'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@/components/shared/Modal';
import { FormAutocomplete, FormField, FormInput, FormTextarea } from '@/components/shared/FormField';
import { Notice } from '@/components/shared/PageHeader';
import { Button } from '@/components/shared/Button';
import { Tabs } from '@/components/shared/Tabs';
import { moduleSchema, reuseModuleSchema, type ModuleForm, type ReuseModuleForm } from '@/lib/forms/schemas';
import { useAdminStore } from '@/lib/stores/admin-store';

type ModuleMode = 'create' | 'reuse';

export function ModuleModal({
  open,
  onOpenChange,
  programId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programId: string;
}) {
  const { addModule, addExistingModuleToProgram, modules, programs } = useAdminStore();
  const [mode, setMode] = React.useState<ModuleMode>('create');
  const currentProgram = programs.find((program) => program.id === programId);
  const reusableModules = modules.filter((module) => !currentProgram?.moduleIds.includes(module.id));
  const form = useForm<ModuleForm>({
    resolver: zodResolver(moduleSchema),
    defaultValues: { title: '', description: '' },
  });
  const reuseForm = useForm<ReuseModuleForm>({
    resolver: zodResolver(reuseModuleSchema),
    defaultValues: { moduleId: '' },
  });

  const onSubmit = (values: ModuleForm) => {
    addModule(programId, values.title, values.description);
    onOpenChange(false);
    form.reset();
  };

  const onReuseSubmit = (values: ReuseModuleForm) => {
    addExistingModuleToProgram(programId, values.moduleId);
    onOpenChange(false);
    reuseForm.reset({ moduleId: '' });
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="New module">
      <Tabs
        value={mode}
        onChange={setMode}
        tabs={[
          { value: 'create', label: 'Create new' },
          { value: 'reuse', label: 'Reuse existing' },
        ]}
        className="mb-4 w-full"
      />

      {mode === 'create' ? (
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FormField label="Module title" error={form.formState.errors.title?.message}>
            <FormInput placeholder="e.g. Legal Structures for Startups" {...form.register('title')} />
          </FormField>
          <FormField label="Description" optional>
            <FormTextarea rows={2} {...form.register('description')} />
          </FormField>
          <Notice>
            After creating the module, use Manage content to add chapters with videos, PDFs and tools.
          </Notice>
          <Button type="submit" className="w-full">
            Create module
          </Button>
        </form>
      ) : (
        <form onSubmit={reuseForm.handleSubmit(onReuseSubmit)}>
          <FormField label="Existing module" error={reuseForm.formState.errors.moduleId?.message}>
            <FormAutocomplete
              value={reuseForm.watch('moduleId')}
              onValueChange={(value) => reuseForm.setValue('moduleId', value, { shouldValidate: true })}
              options={reusableModules.map((module) => ({
                value: module.id,
                label: module.title,
                description: module.reuseCount ? `Used in ${module.reuseCount} programmes` : 'Single programme',
              }))}
              placeholder="Search reusable modules"
              searchPlaceholder="Search modules..."
              emptyMessage="No reusable modules available."
            />
          </FormField>
          <Notice>
            Reusing a module adds the same learning path and content to this programme.
            Content changes apply everywhere that module is used.
          </Notice>
          <Button type="submit" className="w-full" disabled={reusableModules.length === 0}>
            Add module
          </Button>
        </form>
      )}
    </Modal>
  );
}
