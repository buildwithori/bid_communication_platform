'use client';

import { useDebouncedValue } from '@/lib/search';
import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { CardHeader, TableSkeleton } from '@/components/shared/Card';
import {
  DataTable,
  RowActions,
  TableFilterInput,
  TablePagination,
  TableToolbar,
  type Column,
} from '@/components/shared/DataTable';
import { DatePicker } from '@/components/shared/DatePicker';
import { DestructiveActionModal } from '@/components/shared/DestructiveActionModal';
import {
  FormAutocomplete,
  FormField,
  FormInput,
  FormSelect,
} from '@/components/shared/FormField';
import { Modal } from '@/components/shared/Modal';
import { Notice } from '@/components/shared/PageHeader';
import {
  useCreateProgrammeDeliverableRuleMutation,
  useDeleteProgrammeDeliverableRuleMutation,
  useLazyProgrammeModules,
  useProgrammeDeliverableRulesPage,
  useUpdateProgrammeDeliverableRuleMutation,
  type ProgrammeDeliverableDueType,
  type ProgrammeDeliverableRecurringCadence,
  type ProgrammeDeliverableRule,
  type UpsertProgrammeDeliverableRulePayload,
} from '@/lib/api/programmes';
import { useLazyBusinessStagesQuery } from '@/lib/api/settings';
import {
  requiredDeliverableSchema,
  type RequiredDeliverableForm,
} from '@/lib/forms/schemas';

const ALL = 'all';
const dueTypeOptions = [
  { value: 'fixed-date', label: 'Fixed date' },
  { value: 'module-completion', label: 'After module completion' },
  { value: 'recurring', label: 'Recurring' },
];
const recurringOptions = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'six_monthly', label: 'Every 6 months' },
];

function defaults(rule?: ProgrammeDeliverableRule | null): RequiredDeliverableForm {
  return {
    name: rule?.name ?? '',
    dueType: rule ? toFormDueType(rule.dueType) : 'fixed-date',
    dueDate: rule?.dueDate?.slice(0, 10) ?? '',
    moduleRule: rule?.dueAfterModule?.id ?? '',
    recurringCadence: rule?.recurringCadence ?? 'quarterly',
    requiredFor: rule?.requiredStage?.id ?? ALL,
  };
}

function toFormDueType(type: ProgrammeDeliverableDueType) {
  if (type === 'fixed_date') return 'fixed-date' as const;
  if (type === 'module_completion') return 'module-completion' as const;
  return 'recurring' as const;
}

function toApiDueType(type: RequiredDeliverableForm['dueType']): ProgrammeDeliverableDueType {
  if (type === 'fixed-date') return 'fixed_date';
  if (type === 'module-completion') return 'module_completion';
  return 'recurring';
}

function toPayload(values: RequiredDeliverableForm): UpsertProgrammeDeliverableRulePayload {
  const dueType = toApiDueType(values.dueType);
  return {
    name: values.name.trim(),
    dueType,
    dueDate: dueType === 'fixed_date' ? values.dueDate : undefined,
    dueAfterModuleId: dueType === 'module_completion' ? values.moduleRule : undefined,
    recurringCadence:
      dueType === 'recurring'
        ? (values.recurringCadence as ProgrammeDeliverableRecurringCadence)
        : undefined,
    requiredForScope: values.requiredFor === ALL ? 'all' : 'stage',
    requiredStageId: values.requiredFor === ALL ? undefined : values.requiredFor,
  };
}

function dueLabel(rule: ProgrammeDeliverableRule) {
  if (rule.dueType === 'fixed_date') {
    return rule.dueDate
      ? new Date(rule.dueDate).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : 'Date not configured';
  }
  if (rule.dueType === 'module_completion') {
    return rule.dueAfterModule
      ? `After ${rule.dueAfterModule.title}`
      : 'Module not configured';
  }
  return recurringOptions.find((option) => option.value === rule.recurringCadence)?.label
    ?? 'Recurring';
}

function dueHelper(rule: ProgrammeDeliverableRule) {
  if (rule.dueType === 'fixed_date') return 'One programme deadline for the selected audience.';
  if (rule.dueType === 'module_completion') return 'Due after the learner completes this module.';
  return 'A separate submission is generated for every reporting period.';
}

function uniqueOptions(
  options: Array<{ value: string; label: string; description?: string }>,
) {
  return Array.from(new Map(options.map((option) => [option.value, option])).values());
}

export function RequiredDeliverablesSection({
  programmeId,
  programName,
  readOnly = false,
}: {
  programmeId: string;
  programName: string;
  readOnly?: boolean;
}) {
  const [query, setQuery] = React.useState('');
  const debouncedQuery = useDebouncedValue(query);
  const [pageSize, setPageSize] = React.useState(5);
  const [addOpen, setAddOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<ProgrammeDeliverableRule | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<ProgrammeDeliverableRule | null>(null);
  const [stageLookup, setStageLookup] = React.useState({ search: '' });
  const [moduleLookup, setModuleLookup] = React.useState({ search: '' });
  const modalOpen = addOpen || Boolean(editTarget);
  const rules = useProgrammeDeliverableRulesPage(programmeId, {
    search: debouncedQuery || undefined,
    take: pageSize,
  });
  const stages = useLazyBusinessStagesQuery({
    enabled: modalOpen,
    search: stageLookup.search || undefined,
    active: true,
    take: 20,
  });
  const modules = useLazyProgrammeModules({
    programmeId,
    enabled: modalOpen,
    search: moduleLookup.search || undefined,
    take: 20,
  });
  const addForm = useForm<RequiredDeliverableForm>({
    resolver: zodResolver(requiredDeliverableSchema),
    defaultValues: defaults(),
  });
  const editForm = useForm<RequiredDeliverableForm>({
    resolver: zodResolver(requiredDeliverableSchema),
    defaultValues: defaults(),
  });
  const createRule = useCreateProgrammeDeliverableRuleMutation({
    onSuccess: () => {
      toast.success('Deliverable type added');
      addForm.reset(defaults());
      setAddOpen(false);
    },
    onError: (error) => toast.error(error.message),
  });
  const updateRule = useUpdateProgrammeDeliverableRuleMutation({
    onSuccess: () => {
      toast.success('Deliverable type updated');
      setEditTarget(null);
    },
    onError: (error) => toast.error(error.message),
  });
  const deleteRule = useDeleteProgrammeDeliverableRuleMutation({
    onSuccess: () => {
      toast.success('Deliverable deleted');
      setDeleteTarget(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const resetRulePagination = rules.resetPagination;
  React.useEffect(() => {
    resetRulePagination();
  }, [debouncedQuery, pageSize, resetRulePagination]);

  const stageOptions = uniqueOptions([
    { value: ALL, label: 'All entrepreneurs in this programme' },
    ...(editTarget?.requiredStage
      ? [{ value: editTarget.requiredStage.id, label: `${editTarget.requiredStage.name} stage only` }]
      : []),
    ...(stages.data?.pages.flatMap((page) => page.items) ?? []).map((stage) => ({
      value: stage.id,
      label: `${stage.name} stage only`,
      description: stage.definition,
    })),
  ]);
  const moduleOptions = uniqueOptions([
    ...(editTarget?.dueAfterModule
      ? [{ value: editTarget.dueAfterModule.id, label: editTarget.dueAfterModule.title }]
      : []),
    ...modules.rows.map((module) => ({
      value: module.id,
      label: module.title,
      description: module.description,
    })),
  ]);

  const openAdd = () => {
    if (readOnly) return;
    addForm.reset(defaults());
    setStageLookup({ search: '' });
    setModuleLookup({ search: '' });
    setAddOpen(true);
  };
  const openEdit = (rule: ProgrammeDeliverableRule) => {
    if (readOnly) return;
    editForm.reset(defaults(rule));
    setStageLookup({ search: '' });
    setModuleLookup({ search: '' });
    setEditTarget(rule);
  };
  const columns: Column<ProgrammeDeliverableRule>[] = [];
  if (!readOnly) {
    columns.push({
      key: 'actions',
      header: 'Action',
      className: 'w-[84px]',
      cell: (rule) => (
        <RowActions
          actions={[
            { label: 'Edit deliverable', onSelect: () => openEdit(rule) },
            'separator',
            {
              label: 'Delete deliverable',
              destructive: true,
              onSelect: () => setDeleteTarget(rule),
            },
          ]}
        />
      ),
    });
  }
  columns.push(
    {
      key: 'name',
      header: 'Deliverable',
      cell: (rule) => (
        <div className="min-w-[180px]">
          <div className="font-medium text-ink">{rule.name}</div>
          {!rule.active && <Badge tone="neutral">Inactive</Badge>}
        </div>
      ),
    },
    {
      key: 'due',
      header: 'Due rule',
      cell: (rule) => (
        <div className="min-w-[220px]">
          <div className="font-medium text-ink">{dueLabel(rule)}</div>
          <div className="mt-1 text-sm text-ink-muted">{dueHelper(rule)}</div>
        </div>
      ),
    },
    {
      key: 'required',
      header: 'Required for',
      cell: (rule) => rule.requiredStage?.name ?? 'All entrepreneurs',
    },
    {
      key: 'submitted',
      header: 'Submitted so far',
      cell: (rule) => `${rule.submittedCount} / ${rule.assignedCount}`,
    },
  );

  return (
    <>
      <div className="mt-5">
        <CardHeader
          title={`Required deliverables - ${programName}`}
          actions={
            readOnly ? undefined : (
              <Button size="sm" onClick={openAdd}>+ Add deliverable type</Button>
            )
          }
        />
        {readOnly ? (
          <Notice>
            Restore this programme before managing deliverable types.
          </Notice>
        ) : null}
        <Notice>
          These rules generate entrepreneur-specific requirements and reporting-period submissions.
        </Notice>
        <TableToolbar>
          <div>
            <div className="text-sm font-medium text-ink">Search required deliverables</div>
            <div className="mt-0.5 text-sm text-ink-muted">Search by deliverable name.</div>
          </div>
          <div className="w-full sm:w-[320px]">
            <TableFilterInput
              icon
              placeholder="Search deliverables..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </TableToolbar>
        {rules.isLoading ? (
          <TableSkeleton rows={5} columns={5} />
        ) : rules.isError ? (
          <Notice>{rules.error.message}</Notice>
        ) : (
          <DataTable
            columns={columns}
            rows={rules.rows}
            rowKey={(rule) => rule.id}
            emptyMessage="No required deliverables defined yet."
          />
        )}
        <TablePagination
          page={rules.page}
          pageSize={pageSize}
          totalItems={rules.totalItems}
          pageSizeOptions={[5, 10, 25]}
          onPageChange={rules.setPage}
          onPageSizeChange={(next) => setPageSize(next)}
        />
      </div>

      {!readOnly ? (
        <>
          <RuleModal
            title="Add deliverable type"
            open={addOpen}
            form={addForm}
            stageOptions={stageOptions}
            moduleOptions={moduleOptions}
            stages={stages}
            modules={modules}
            setStageLookup={setStageLookup}
            setModuleLookup={setModuleLookup}
            isSaving={createRule.isPending}
            submitLabel="Add deliverable"
            onClose={() => !createRule.isPending && setAddOpen(false)}
            onSubmit={(values) => createRule.mutate({
              programmeId,
              payload: { ...toPayload(values), name: values.name.trim(), dueType: toApiDueType(values.dueType) },
            })}
          />
          <RuleModal
            title="Edit deliverable type"
            open={Boolean(editTarget)}
            form={editForm}
            stageOptions={stageOptions}
            moduleOptions={moduleOptions}
            stages={stages}
            modules={modules}
            setStageLookup={setStageLookup}
            setModuleLookup={setModuleLookup}
            isSaving={updateRule.isPending}
            submitLabel="Save deliverable"
            onClose={() => !updateRule.isPending && setEditTarget(null)}
            onSubmit={(values) => editTarget && updateRule.mutate({
              programmeId,
              ruleId: editTarget.id,
              payload: toPayload(values),
            })}
          />
          <DestructiveActionModal
            open={Boolean(deleteTarget)}
            onOpenChange={(open) => {
              if (!open) setDeleteTarget(null);
            }}
            title="Delete deliverable"
            resourceName={deleteTarget?.name ?? ''}
            description="This permanently removes the deliverable requirement and all entrepreneur work generated from it."
            consequences={[
              `${deleteTarget?.assignedCount ?? 0} assigned requirement${deleteTarget?.assignedCount === 1 ? '' : 's'} will be removed.`,
              deleteTarget?.submittedCount
                ? `${deleteTarget.submittedCount} submitted record${deleteTarget.submittedCount === 1 ? '' : 's'}, including uploaded files and reviews, will be permanently deleted.`
                : 'Any submission history, uploaded files, and reviews for this requirement will be permanently deleted.',
              'Future recurring requirements and reminders from this deliverable will stop.',
            ]}
            confirmLabel="Delete deliverable"
            isPending={deleteRule.isPending}
            onConfirm={async () => {
              if (!deleteTarget) return;
              await deleteRule.mutateAsync({
                programmeId,
                ruleId: deleteTarget.id,
                confirmation: deleteTarget.name,
              });
            }}
          />
        </>
      ) : null}
    </>
  );
}

type LookupState = { search: string };

function RuleModal({
  title,
  open,
  form,
  stageOptions,
  moduleOptions,
  stages,
  modules,
  setStageLookup,
  setModuleLookup,
  isSaving,
  submitLabel,
  onClose,
  onSubmit,
}: {
  title: string;
  open: boolean;
  form: ReturnType<typeof useForm<RequiredDeliverableForm>>;
  stageOptions: Array<{ value: string; label: string; description?: string }>;
  moduleOptions: Array<{ value: string; label: string; description?: string }>;
  stages: ReturnType<typeof useLazyBusinessStagesQuery>;
  modules: ReturnType<typeof useLazyProgrammeModules>;
  setStageLookup: React.Dispatch<React.SetStateAction<LookupState>>;
  setModuleLookup: React.Dispatch<React.SetStateAction<LookupState>>;
  isSaving: boolean;
  submitLabel: string;
  onClose: () => void;
  onSubmit: (values: RequiredDeliverableForm) => void;
}) {
  const dueType = useWatch({ control: form.control, name: 'dueType', defaultValue: 'fixed-date' });
  return (
    <Modal open={open} onOpenChange={(next) => !next && onClose()} title={title}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField label="Deliverable name" error={form.formState.errors.name?.message}>
          <FormInput placeholder="e.g. Business Model Canvas, Pitch Deck" {...form.register('name')} />
        </FormField>
        <FormField label="Due rule" error={form.formState.errors.dueType?.message}>
          <Controller
            control={form.control}
            name="dueType"
            render={({ field }) => (
              <FormSelect
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value);
                  form.clearErrors(['dueDate', 'moduleRule', 'recurringCadence']);
                }}
                options={dueTypeOptions}
              />
            )}
          />
        </FormField>
        {dueType === 'fixed-date' && (
          <FormField label="Due date" error={form.formState.errors.dueDate?.message}>
            <Controller
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <DatePicker value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
              )}
            />
          </FormField>
        )}
        {dueType === 'module-completion' && (
          <FormField label="Due after" error={form.formState.errors.moduleRule?.message}>
            <Controller
              control={form.control}
              name="moduleRule"
              render={({ field }) => (
                <FormAutocomplete
                  value={field.value ?? ''}
                  onValueChange={field.onChange}
                  options={moduleOptions}
                  placeholder="Select module"
                  searchPlaceholder="Search programme modules..."
                  emptyMessage="No programme module found."
                  isLoading={modules.isFetching}
                  onSearchChange={(search) => setModuleLookup((state) => ({ ...state, search }))}
                  hasMore={Boolean(modules.hasNextPage)}
                  onLoadMore={() => void modules.fetchNextPage()}
                />
              )}
            />
          </FormField>
        )}
        {dueType === 'recurring' && (
          <FormField label="Cadence" error={form.formState.errors.recurringCadence?.message}>
            <Controller
              control={form.control}
              name="recurringCadence"
              render={({ field }) => (
                <FormSelect
                  value={field.value ?? 'quarterly'}
                  onValueChange={field.onChange}
                  options={recurringOptions}
                />
              )}
            />
          </FormField>
        )}
        <FormField label="Required for" error={form.formState.errors.requiredFor?.message}>
          <Controller
            control={form.control}
            name="requiredFor"
            render={({ field }) => (
              <FormAutocomplete
                value={field.value}
                onValueChange={field.onChange}
                options={stageOptions}
                placeholder="Select who must submit"
                searchPlaceholder="Search business stages..."
                emptyMessage="No active business stage found."
                isLoading={stages.isFetching}
                onSearchChange={(search) => setStageLookup((state) => ({ ...state, search }))}
                hasMore={Boolean(stages.hasNextPage)}
                onLoadMore={() => void stages.fetchNextPage()}
              />
            )}
          />
        </FormField>
        <Notice>
          Saving this rule updates backend-managed requirements and creates applicable instances.
        </Notice>
        <Button
          type="submit"
          className="w-full"
          isLoading={isSaving}
          loadingLabel="Saving deliverable..."
        >
          {submitLabel}
        </Button>
      </form>
    </Modal>
  );
}
