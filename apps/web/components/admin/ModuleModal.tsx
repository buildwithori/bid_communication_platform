'use client';

import * as React from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Modal } from '@/components/shared/Modal';
import {
  FormAutocomplete,
  FormField,
  FormInput,
  FormTextarea,
} from '@/components/shared/FormField';
import { Notice } from '@/components/shared/PageHeader';
import { Button } from '@/components/shared/Button';
import { Tabs } from '@/components/shared/Tabs';
import {
  moduleSchema,
  reuseModuleSchema,
  type ModuleForm,
  type ReuseModuleForm,
} from '@/lib/forms/schemas';
import {
  useCreateProgrammeModuleMutation,
  useLazyReusableProgrammeModules,
  useReuseProgrammeModuleMutation,
} from '@/lib/api/programmes';

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
  const [mode, setMode] = React.useState<ModuleMode>('create');
  const [reuseSearch, setReuseSearch] = React.useState('');
  const reusableModules = useLazyReusableProgrammeModules({
    programmeId: programId,
    enabled: open && mode === 'reuse',
    search: reuseSearch.trim() || undefined,
    take: 20,
  });
  const createModule = useCreateProgrammeModuleMutation();
  const reuseModule = useReuseProgrammeModuleMutation();
  const isPending = createModule.isPending || reuseModule.isPending;

  const form = useForm<ModuleForm>({
    resolver: zodResolver(moduleSchema),
    defaultValues: { title: '', description: '' },
  });
  const reuseForm = useForm<ReuseModuleForm>({
    resolver: zodResolver(reuseModuleSchema),
    defaultValues: { moduleId: '' },
  });
  const reusableModuleId = useWatch({
    control: reuseForm.control,
    name: 'moduleId',
  });

  const close = () => {
    onOpenChange(false);
    setReuseSearch('');
    form.reset();
    reuseForm.reset({ moduleId: '' });
  };

  const onSubmit = async (values: ModuleForm) => {
    try {
      await createModule.mutateAsync({
        programmeId: programId,
        payload: {
          title: values.title,
          description: values.description,
          isReusable: true,
        },
      });
      toast.success('Module created.');
      close();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Unable to create module.',
      );
    }
  };

  const onReuseSubmit = async (values: ReuseModuleForm) => {
    try {
      await reuseModule.mutateAsync({
        programmeId: programId,
        moduleId: values.moduleId,
      });
      toast.success('Reusable module added.');
      close();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Unable to reuse module.',
      );
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isPending) {
          if (nextOpen) onOpenChange(true);
          else close();
        }
      }}
      title="New module"
    >
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
          <FormField
            label="Module title"
            error={form.formState.errors.title?.message}
          >
            <FormInput
              placeholder="e.g. Legal Structures for Startups"
              {...form.register('title')}
            />
          </FormField>
          <FormField
            label="Description"
            optional
            error={form.formState.errors.description?.message}
          >
            <FormTextarea rows={2} {...form.register('description')} />
          </FormField>
          <Notice>
            After creating the module, use Manage content to add videos, PDFs, and tools.
          </Notice>
          <Button
            type="submit"
            className="w-full"
            isLoading={createModule.isPending}
            loadingLabel="Creating module..."
          >
            Create module
          </Button>
        </form>
      ) : (
        <form onSubmit={reuseForm.handleSubmit(onReuseSubmit)}>
          <FormField
            label="Existing module"
            error={reuseForm.formState.errors.moduleId?.message}
          >
            <FormAutocomplete
              value={reusableModuleId}
              onValueChange={(value) =>
                reuseForm.setValue('moduleId', value, {
                  shouldValidate: true,
                })
              }
              options={reusableModules.rows.map((module) => ({
                value: module.id,
                label: module.title,
                description: `${module.contentItems} content item${module.contentItems === 1 ? '' : 's'} · used in ${module.programmeUses} programme${module.programmeUses === 1 ? '' : 's'}`,
              }))}
              placeholder="Search reusable modules"
              searchPlaceholder="Search modules..."
              emptyMessage="No reusable modules available."
              onSearchChange={setReuseSearch}
              isLoading={
                reusableModules.isLoading ||
                reusableModules.isFetchingNextPage
              }
              hasMore={Boolean(reusableModules.hasNextPage)}
              onLoadMore={() => void reusableModules.fetchNextPage()}
            />
          </FormField>
          <Notice>
            Reusing a module adds the same learning path and content to this programme.
            Content changes apply everywhere that module is used.
          </Notice>
          <Button
            type="submit"
            className="w-full"
            isLoading={reuseModule.isPending}
            loadingLabel="Adding module..."
          >
            Add module
          </Button>
        </form>
      )}
    </Modal>
  );
}
