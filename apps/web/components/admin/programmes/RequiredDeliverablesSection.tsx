'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { CardHeader } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { Modal } from '@/components/shared/Modal';
import { Notice } from '@/components/shared/PageHeader';
import { FormAutocomplete, FormField, FormInput, FormSelect } from '@/components/shared/FormField';
import { DatePicker } from '@/components/shared/DatePicker';
import {
  DataTable,
  RowActions,
  TableEmptyState,
  TableFilterInput,
  TablePagination,
  TableToolbar,
  type Column,
} from '@/components/shared/DataTable';
import { listBusinessStages, type BusinessStageRecord } from '@/lib/api/settings';
import {
  createProgrammeDeliverableRule,
  listProgrammeDeliverableRules,
  updateProgrammeDeliverableRule,
  type ProgrammeDeliverableRecurringCadence,
  type ProgrammeDeliverableRule,
  type UpsertProgrammeDeliverableRulePayload,
} from '@/lib/api/programmes';
import { requiredDeliverableSchema, type RequiredDeliverableForm } from '@/lib/forms/schemas';
import type { Module } from '@/types';

interface RequiredDeliverable {
  id: string;
  name: string;
  due: string;
  dueHelper: string;
  dueType: RequiredDeliverableForm['dueType'];
  dueDate?: string;
  moduleRule?: string;
  recurringCadence?: string;
  requiredFor: string;
  submitted: string;
  source: ProgrammeDeliverableRule;
}

const ALL_ENTREPRENEURS = 'all';

const dueTypeOptions = [
  { value: 'fixed-date', label: 'Fixed date' },
  { value: 'module-completion', label: 'After module completion' },
  { value: 'recurring', label: 'Recurring' },
];

const recurringOptions = [
  { value: 'Monthly', label: 'Monthly' },
  { value: 'Quarterly', label: 'Quarterly' },
  { value: 'Every 6 months', label: 'Every 6 months' },
];

const recurringToApi: Record<string, ProgrammeDeliverableRecurringCadence> = {
  Monthly: 'monthly',
  Quarterly: 'quarterly',
  'Every 6 months': 'six_monthly',
};

const recurringToUi: Record<ProgrammeDeliverableRecurringCadence, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  six_monthly: 'Every 6 months',
};

function formatDueDate(value?: string | null) {
  if (!value) return 'No date selected';
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function dueLabel(values: RequiredDeliverableForm, moduleOptions: Array<{ value: string; label: string }>) {
  if (values.dueType === 'fixed-date') return formatDueDate(values.dueDate);
  if (values.dueType === 'module-completion') {
    const module = moduleOptions.find((option) => option.value === values.moduleRule);
    return `After ${module?.label.replace(/^\d+\.\s*/, '') ?? 'selected module'}`;
  }
  return values.recurringCadence ?? 'Recurring';
}

function dueHelper(values: RequiredDeliverableForm) {
  if (values.dueType === 'fixed-date') return 'One deadline for everyone in the selected audience.';
  if (values.dueType === 'module-completion') return 'Due when each learner completes the selected module.';
  return 'A new submission is expected for each configured reporting period.';
}

function mapRuleToRow(rule: ProgrammeDeliverableRule): RequiredDeliverable {
  const dueType =
    rule.dueType === 'fixed_date'
      ? 'fixed-date'
      : rule.dueType === 'module_completion'
        ? 'module-completion'
        : 'recurring';
  const recurringCadence = rule.recurringCadence ? recurringToUi[rule.recurringCadence] : undefined;
  const values: RequiredDeliverableForm = {
    name: rule.name,
    due: dueType,
    dueType,
    dueDate: rule.dueDate?.slice(0, 10) ?? '',
    moduleRule: rule.dueAfterModule?.id ?? '',
    recurringCadence,
    requiredFor: rule.requiredForScope === 'stage' ? rule.requiredStage?.id ?? '' : ALL_ENTREPRENEURS,
  };

  return {
    id: rule.id,
    name: rule.name,
    due: dueLabel(values, rule.dueAfterModule ? [{ value: rule.dueAfterModule.id, label: rule.dueAfterModule.title }] : []),
    dueHelper: dueHelper(values),
    dueType,
    dueDate: values.dueDate,
    moduleRule: values.moduleRule,
    recurringCadence,
    requiredFor: rule.requiredForScope === 'stage' ? `${rule.requiredStage?.name ?? 'Selected stage'} stage` : 'All entrepreneurs',
    submitted: `${rule.submittedCount} / ${rule.assignedCount}`,
    source: rule,
  };
}

function toPayload(values: RequiredDeliverableForm): UpsertProgrammeDeliverableRulePayload & { name: string } {
  const isStageSpecific = values.requiredFor !== ALL_ENTREPRENEURS;
  const dueType =
    values.dueType === 'fixed-date'
      ? 'fixed_date'
      : values.dueType === 'module-completion'
        ? 'module_completion'
        : 'recurring';

  return {
    name: values.name,
    dueType,
    dueDate: values.dueType === 'fixed-date' ? values.dueDate : undefined,
    dueAfterModuleId: values.dueType === 'module-completion' ? values.moduleRule : undefined,
    recurringCadence: values.dueType === 'recurring' ? recurringToApi[values.recurringCadence ?? 'Quarterly'] : undefined,
    requiredForScope: isStageSpecific ? 'stage' : 'all',
    requiredStageId: isStageSpecific ? values.requiredFor : undefined,
    active: true,
  };
}

function DueRuleFields({
  form,
  moduleOptions,
  errors,
}: {
  form: ReturnType<typeof useForm<RequiredDeliverableForm>>;
  moduleOptions: Array<{ value: string; label: string; description?: string }>;
  errors: ReturnType<typeof useForm<RequiredDeliverableForm>>['formState']['errors'];
}) {
  const dueType = form.watch('dueType');

  return (
    <>
      <FormField label="Due rule" error={errors.dueType?.message || errors.due?.message}>
        <FormSelect
          value={dueType}
          onValueChange={(value) => {
            const nextType = value as RequiredDeliverableForm['dueType'];
            form.setValue('dueType', nextType, { shouldValidate: true });
            form.setValue('due', nextType, { shouldValidate: true });
          }}
          options={dueTypeOptions}
        />
      </FormField>
      {dueType === 'fixed-date' ? (
        <FormField label="Due date" error={errors.dueDate?.message}>
          <DatePicker
            value={form.watch('dueDate')}
            onChange={(value) => form.setValue('dueDate', value, { shouldValidate: true })}
          />
        </FormField>
      ) : null}
      {dueType === 'module-completion' ? (
        <FormField label="Due after" error={errors.moduleRule?.message}>
          <FormAutocomplete
            value={form.watch('moduleRule') ?? ''}
            onValueChange={(value) => form.setValue('moduleRule', value, { shouldValidate: true })}
            options={moduleOptions}
            placeholder="Select module"
            searchPlaceholder="Search modules..."
            emptyMessage="No module found."
          />
        </FormField>
      ) : null}
      {dueType === 'recurring' ? (
        <FormField label="Cadence" error={errors.recurringCadence?.message}>
          <FormSelect
            value={form.watch('recurringCadence') ?? 'Quarterly'}
            onValueChange={(value) => form.setValue('recurringCadence', value, { shouldValidate: true })}
            options={recurringOptions}
          />
        </FormField>
      ) : null}
    </>
  );
}

export function RequiredDeliverablesSection({
  programmeId,
  programName,
  modules = [],
}: {
  programmeId: string;
  programName: string;
  modules?: Module[];
}) {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<RequiredDeliverable | null>(null);
  const [query, setQuery] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(5);

  const rulesQuery = useQuery({
    queryKey: ['programme-deliverable-rules', programmeId],
    queryFn: () => listProgrammeDeliverableRules(programmeId),
  });
  const stagesQuery = useQuery({
    queryKey: ['business-stages', 'active'],
    queryFn: () => listBusinessStages({ active: true }),
  });

  const moduleOptions = React.useMemo(
    () => modules.map((module, index) => ({
      value: module.id,
      label: `${index + 1}. ${module.title}`,
      description: module.description,
    })),
    [modules],
  );
  const requiredForOptions = React.useMemo(
    () => [
      { value: ALL_ENTREPRENEURS, label: 'All entrepreneurs in this programme' },
      ...(stagesQuery.data ?? []).map((stage: BusinessStageRecord) => ({
        value: stage.id,
        label: `${stage.name} stage only`,
        description: stage.definition,
      })),
    ],
    [stagesQuery.data],
  );

  const rows = React.useMemo<RequiredDeliverable[]>(
    () => (rulesQuery.data?.items ?? []).map(mapRuleToRow),
    [rulesQuery.data],
  );

  const addForm = useForm<RequiredDeliverableForm>({
    resolver: zodResolver(requiredDeliverableSchema),
    defaultValues: {
      name: '',
      due: '',
      dueType: 'fixed-date',
      dueDate: '',
      moduleRule: '',
      recurringCadence: 'Quarterly',
      requiredFor: ALL_ENTREPRENEURS,
    },
  });
  const editForm = useForm<RequiredDeliverableForm>({
    resolver: zodResolver(requiredDeliverableSchema),
    defaultValues: { name: '', due: '', dueType: 'fixed-date', dueDate: '', moduleRule: '', recurringCadence: 'Quarterly', requiredFor: ALL_ENTREPRENEURS },
  });

  const invalidateRules = () => queryClient.invalidateQueries({ queryKey: ['programme-deliverable-rules', programmeId] });
  const createMutation = useMutation({
    mutationFn: (values: RequiredDeliverableForm) => createProgrammeDeliverableRule(programmeId, toPayload(values) as ReturnType<typeof toPayload> & { dueType: NonNullable<UpsertProgrammeDeliverableRulePayload['dueType']> }),
    onSuccess: () => {
      void invalidateRules();
      toast.success('Deliverable rule added');
      addForm.reset({ name: '', due: '', dueType: 'fixed-date', dueDate: '', moduleRule: '', recurringCadence: 'Quarterly', requiredFor: ALL_ENTREPRENEURS });
      setAddOpen(false);
    },
  });
  const updateMutation = useMutation({
    mutationFn: ({ ruleId, values }: { ruleId: string; values: RequiredDeliverableForm }) => updateProgrammeDeliverableRule(programmeId, ruleId, toPayload(values)),
    onSuccess: () => {
      void invalidateRules();
      toast.success('Deliverable rule updated');
      setEditTarget(null);
    },
  });

  const filteredRows = React.useMemo<RequiredDeliverable[]>(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) =>
      [row.name, row.due, row.dueHelper, row.requiredFor, row.submitted]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }, [query, rows]);

  React.useEffect(() => {
    setPage(1);
  }, [query, pageSize]);

  const pageRows = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  const columns: Column<RequiredDeliverable>[] = [
    {
      key: 'actions',
      header: 'Action',
      cell: (deliverable) => (
        <RowActions
          actions={[
            {
              label: 'Edit deliverable',
              onSelect: () => {
                setEditTarget(deliverable);
                editForm.reset({
                  name: deliverable.name,
                  due: deliverable.dueType,
                  dueType: deliverable.dueType,
                  dueDate: deliverable.dueDate ?? '',
                  moduleRule: deliverable.moduleRule ?? '',
                  recurringCadence: deliverable.recurringCadence ?? 'Quarterly',
                  requiredFor: deliverable.source.requiredForScope === 'stage' ? deliverable.source.requiredStage?.id ?? '' : ALL_ENTREPRENEURS,
                });
              },
            },
          ]}
        />
      ),
      className: 'w-[84px]',
    },
    { key: 'name', header: 'Deliverable', cell: (d) => d.name },
    {
      key: 'due',
      header: 'Due rule',
      cell: (d) => (
        <div className="min-w-[220px]">
          <div className="font-medium text-ink">{d.due}</div>
          <div className="mt-1 text-sm text-ink-muted">{d.dueHelper}</div>
        </div>
      ),
    },
    { key: 'req', header: 'Required for', cell: (d) => d.requiredFor },
    { key: 'sub', header: 'Submitted so far', cell: (d) => d.submitted },
  ];

  return (
    <>
      <div className="mt-5">
        <CardHeader
          title={`Required deliverables - ${programName}`}
          actions={
            <Button size="sm" onClick={() => setAddOpen(true)}>
              + Add deliverable type
            </Button>
          }
        />
        <Notice>
          These are the deliverables entrepreneurs in this programme are asked to submit.
          They show up on each entrepreneur&apos;s profile and in their My Deliverables view.
        </Notice>
        <TableToolbar>
          <div>
            <div className="text-sm font-medium text-ink">Search required deliverables</div>
            <div className="mt-0.5 text-sm text-ink-muted">
              Filter by deliverable, due rule, audience, or submission count.
            </div>
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
        {rulesQuery.isLoading ? (
          <TableEmptyState title="Loading deliverable rules" description="Fetching required submissions for this programme." />
        ) : (
          <DataTable columns={columns} rows={pageRows} rowKey={(d) => d.id} emptyMessage={rulesQuery.isError ? 'Deliverable rules could not be loaded.' : 'No required deliverables defined yet.'} />
        )}
        <TablePagination
          page={page}
          pageSize={pageSize}
          totalItems={filteredRows.length}
          pageSizeOptions={[5, 10, 25]}
          onPageChange={setPage}
          onPageSizeChange={(next) => {
            setPageSize(next);
            setPage(1);
          }}
        />
      </div>

      <Modal open={addOpen} onOpenChange={setAddOpen} title="Add deliverable type">
        <form onSubmit={addForm.handleSubmit((values) => createMutation.mutate(values))}>
          <FormField label="Deliverable name" error={addForm.formState.errors.name?.message}>
            <FormInput placeholder="e.g. Business Model Canvas, Pitch Deck" {...addForm.register('name')} />
          </FormField>
          <DueRuleFields form={addForm} moduleOptions={moduleOptions} errors={addForm.formState.errors} />
          <FormField label="Required for" error={addForm.formState.errors.requiredFor?.message}>
            <FormAutocomplete
              value={addForm.watch('requiredFor')}
              onValueChange={(value) => addForm.setValue('requiredFor', value, { shouldValidate: true })}
              options={requiredForOptions}
              placeholder="Select who must submit"
              searchPlaceholder="Search stage rules..."
              emptyMessage="No stage rule found."
            />
          </FormField>
          <Notice>
            Fixed-date rules create due items for existing eligible entrepreneurs. Module-completion rules create due items when each learner completes that module.
          </Notice>
          <Button type="submit" className="w-full" disabled={createMutation.isPending}>
            Add deliverable
          </Button>
        </form>
      </Modal>

      <Modal open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)} title="Edit deliverable type">
        <form
          onSubmit={editForm.handleSubmit((values) => {
            if (!editTarget) return;
            updateMutation.mutate({ ruleId: editTarget.id, values });
          })}
        >
          <FormField label="Deliverable name" error={editForm.formState.errors.name?.message}>
            <FormInput {...editForm.register('name')} />
          </FormField>
          <DueRuleFields form={editForm} moduleOptions={moduleOptions} errors={editForm.formState.errors} />
          <FormField label="Required for" error={editForm.formState.errors.requiredFor?.message}>
            <FormAutocomplete
              value={editForm.watch('requiredFor')}
              onValueChange={(value) => editForm.setValue('requiredFor', value, { shouldValidate: true })}
              options={requiredForOptions}
              placeholder="Select who must submit"
              searchPlaceholder="Search stage rules..."
              emptyMessage="No stage rule found."
            />
          </FormField>
          <Button type="submit" className="w-full" disabled={updateMutation.isPending}>
            Save deliverable
          </Button>
        </form>
      </Modal>
    </>
  );
}
