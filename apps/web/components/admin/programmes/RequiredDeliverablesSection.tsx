'use client';

import * as React from 'react';
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
  TableFilterInput,
  TablePagination,
  TableToolbar,
  type Column,
} from '@/components/shared/DataTable';
import { stages } from '@/lib/mock-data/definitions';
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
}

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

function formatDueDate(value?: string) {
  if (!value) return 'No date selected';
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function dueLabel(values: RequiredDeliverableForm) {
  if (values.dueType === 'fixed-date') return formatDueDate(values.dueDate);
  if (values.dueType === 'module-completion') return `After ${values.moduleRule}`;
  return values.recurringCadence ?? 'Recurring';
}

function dueHelper(values: RequiredDeliverableForm) {
  if (values.dueType === 'fixed-date') return 'One deadline for everyone in the selected audience.';
  if (values.dueType === 'module-completion') return 'Due when the learner reaches this curriculum point.';
  return 'A new submission is expected for every reporting period.';
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

export function RequiredDeliverablesSection({ programName, modules = [] }: { programName: string; modules?: Module[] }) {
  const requiredForOptions = [
    { value: 'All entrepreneurs in this programme', label: 'All entrepreneurs in this programme' },
    ...stages.map((stage) => ({
      value: `${stage.label} stage only`,
      label: `${stage.label} stage only`,
      description: stage.definition,
    })),
  ];
  const moduleOptions = modules.map((module, index) => ({
    value: module.title,
    label: `${index + 1}. ${module.title}`,
    description: module.description,
  }));
  const [rows, setRows] = React.useState<RequiredDeliverable[]>([
    { id: 'rd1', name: 'Business Model Canvas', due: 'After Business Model Canvas Deep Dive', dueHelper: 'Due when the learner completes the module.', dueType: 'module-completion', moduleRule: 'Business Model Canvas Deep Dive', requiredFor: 'All entrepreneurs', submitted: '14 / 18' },
    { id: 'rd2', name: 'Financial Statements', due: 'Quarterly', dueHelper: 'A new file is expected each quarter.', dueType: 'recurring', recurringCadence: 'Quarterly', requiredFor: 'All entrepreneurs', submitted: '11 / 18' },
    { id: 'rd3', name: 'Pitch Deck v2', due: 'Apr 28, 2025', dueHelper: 'One deadline for growth and scale entrepreneurs.', dueType: 'fixed-date', dueDate: '2025-04-28', requiredFor: 'Growth & Scale stage', submitted: '6 / 14' },
  ]);
  const [addOpen, setAddOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<RequiredDeliverable | null>(null);
  const [query, setQuery] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(5);
  const addForm = useForm<RequiredDeliverableForm>({
    resolver: zodResolver(requiredDeliverableSchema),
    defaultValues: {
      name: '',
      due: '',
      dueType: 'fixed-date',
      dueDate: '',
      moduleRule: '',
      recurringCadence: 'Quarterly',
      requiredFor: 'All entrepreneurs in this programme',
    },
  });
  const editForm = useForm<RequiredDeliverableForm>({
    resolver: zodResolver(requiredDeliverableSchema),
    defaultValues: { name: '', due: '', dueType: 'fixed-date', dueDate: '', moduleRule: '', recurringCadence: 'Quarterly', requiredFor: '' },
  });

  const filteredRows = React.useMemo(() => {
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
                  due: deliverable.due,
                  dueType: deliverable.dueType,
                  dueDate: deliverable.dueDate ?? '',
                  moduleRule: deliverable.moduleRule ?? '',
                  recurringCadence: deliverable.recurringCadence ?? 'Quarterly',
                  requiredFor: deliverable.requiredFor,
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
        <DataTable columns={columns} rows={pageRows} rowKey={(d) => d.id} emptyMessage="No required deliverables defined yet." />
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
        <form
          onSubmit={addForm.handleSubmit((values) => {
            setRows((current) => [
              ...current,
              {
                id: `rd-${Date.now()}`,
                name: values.name,
                due: dueLabel(values),
                dueHelper: dueHelper(values),
                dueType: values.dueType,
                dueDate: values.dueDate,
                moduleRule: values.moduleRule,
                recurringCadence: values.recurringCadence,
                requiredFor: values.requiredFor.replace('in this programme', '').trim(),
                submitted: '0 / 0',
              },
            ]);
            toast.success('Deliverable type added');
            addForm.reset({
              name: '',
              due: '',
              dueType: 'fixed-date',
              dueDate: '',
              moduleRule: '',
              recurringCadence: 'Quarterly',
              requiredFor: 'All entrepreneurs in this programme',
            });
            setAddOpen(false);
          })}
        >
          <FormField label="Deliverable name" error={addForm.formState.errors.name?.message}>
            <FormInput
              placeholder="e.g. Business Model Canvas, Pitch Deck"
              {...addForm.register('name')}
            />
          </FormField>
          <DueRuleFields
            form={addForm}
            moduleOptions={moduleOptions}
            errors={addForm.formState.errors}
          />
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
            Once added, entrepreneurs in this programme will see this deliverable in their
            profile with an upload prompt.
          </Notice>
          <Button type="submit" className="w-full">
            Add deliverable
          </Button>
        </form>
      </Modal>

      <Modal
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
        title="Edit deliverable type"
      >
        <form
          onSubmit={editForm.handleSubmit((values) => {
            if (!editTarget) return;
            setRows((current) =>
              current.map((row) =>
                row.id === editTarget.id
                  ? {
                      ...row,
                      name: values.name,
                      due: dueLabel(values),
                      dueHelper: dueHelper(values),
                      dueType: values.dueType,
                      dueDate: values.dueDate,
                      moduleRule: values.moduleRule,
                      recurringCadence: values.recurringCadence,
                      requiredFor: values.requiredFor,
                    }
                  : row,
              ),
            );
            setEditTarget(null);
            toast.success('Deliverable type updated');
          })}
        >
          <FormField label="Deliverable name" error={editForm.formState.errors.name?.message}>
            <FormInput {...editForm.register('name')} />
          </FormField>
          <DueRuleFields
            form={editForm}
            moduleOptions={moduleOptions}
            errors={editForm.formState.errors}
          />
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
          <Button type="submit" className="w-full">
            Save deliverable
          </Button>
        </form>
      </Modal>
    </>
  );
}
