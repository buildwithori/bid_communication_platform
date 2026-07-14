'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import {
  DataTable,
  RowActions,
  TableFilterInput,
  TablePagination,
  TableToolbar,
  type Column,
} from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import { FormField, FormInput, FormTextarea } from '@/components/shared/FormField';
import {
  programmeGoalTypeSchema,
  type ProgrammeGoalTypeForm,
} from '@/lib/forms/schemas';
import {
  programmeGoalTypes as seedGoalTypes,
  type ProgrammeGoalType,
} from '@/lib/mock-data/definitions';

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default function AdminGoalTypesPage() {
  const [goalTypes, setGoalTypes] = React.useState<ProgrammeGoalType[]>(seedGoalTypes);
  const [query, setQuery] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [activeGoalType, setActiveGoalType] = React.useState<ProgrammeGoalType | null>(null);

  const filteredGoalTypes = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return goalTypes;
    return goalTypes.filter((goalType) =>
      [
        goalType.label,
        goalType.id,
        goalType.description,
        goalType.requiresTargetAmount ? 'monetary target amount' : 'non monetary',
        goalType.active ? 'active' : 'inactive',
      ]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }, [goalTypes, query]);

  React.useEffect(() => {
    setPage(1);
  }, [query, pageSize]);

  const pageRows = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredGoalTypes.slice(start, start + pageSize);
  }, [filteredGoalTypes, page, pageSize]);

  const upsertGoalType = (values: ProgrammeGoalTypeForm, current?: ProgrammeGoalType | null) => {
    const nextGoalType: ProgrammeGoalType = {
      id: current?.id ?? slugify(values.label),
      label: values.label.trim(),
      description: values.description?.trim() || 'No description added yet.',
      requiresTargetAmount: !!values.requiresTargetAmount,
      active: current?.active ?? true,
    };

    setGoalTypes((items) =>
      current
        ? items.map((item) => (item.id === current.id ? nextGoalType : item))
        : [nextGoalType, ...items],
    );
    setCreateOpen(false);
    setActiveGoalType(null);
  };

  const toggleActive = (goalType: ProgrammeGoalType) => {
    setGoalTypes((items) =>
      items.map((item) =>
        item.id === goalType.id ? { ...item, active: !item.active } : item,
      ),
    );
  };

  const columns: Column<ProgrammeGoalType>[] = [
    {
      key: 'action',
      header: 'Action',
      cell: (goalType) => (
        <RowActions
          actions={[
            { label: 'Edit goal type', onSelect: () => setActiveGoalType(goalType) },
            {
              label: goalType.active ? 'Deactivate' : 'Activate',
              onSelect: () => toggleActive(goalType),
            },
          ]}
        />
      ),
      className: 'w-[84px]',
    },
    {
      key: 'name',
      header: 'Goal type',
      cell: (goalType) => (
        <button
          type="button"
          onClick={() => setActiveGoalType(goalType)}
          className="text-left font-medium text-ink transition hover:text-bid focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bid/20"
        >
          {goalType.label}
        </button>
      ),
    },
    {
      key: 'key',
      header: 'Key',
      cell: (goalType) => <span className="font-mono text-xs text-ink-muted">{goalType.id}</span>,
    },
    {
      key: 'description',
      header: 'Description',
      cell: (goalType) => (
        <p className="max-w-2xl text-sm leading-6 text-ink-muted">{goalType.description}</p>
      ),
    },
    {
      key: 'target',
      header: 'Target amount',
      cell: (goalType) => (
        <Badge tone={goalType.requiresTargetAmount ? 'blue' : 'neutral'}>
          {goalType.requiresTargetAmount ? 'Required' : 'Not required'}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (goalType) => (
        <Badge tone={goalType.active ? 'green' : 'neutral'}>
          {goalType.active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Goal types"
        description="Manage the goal types entrepreneurs can attach to programme goals."
      />

      <Card>
        <CardHeader
          title="Programme goal type list"
          description={`${filteredGoalTypes.length} goal type${filteredGoalTypes.length === 1 ? '' : 's'} in this view`}
          actions={<Button onClick={() => setCreateOpen(true)}>+ Add goal type</Button>}
        />
        <TableToolbar>
          <div>
            <div className="text-sm font-medium text-ink">Search goal types</div>
            <div className="mt-0.5 text-sm text-ink-muted">
              Find goal types by name, key, target behaviour, status, or description.
            </div>
          </div>
          <TableFilterInput
            icon
            className="w-full sm:w-[320px]"
            placeholder="Search goal types..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </TableToolbar>
        <DataTable
          columns={columns}
          rows={pageRows}
          rowKey={(goalType) => goalType.id}
          emptyMessage="No goal types match this search."
          tableClassName="min-w-[980px]"
        />
        <TablePagination
          page={page}
          pageSize={pageSize}
          totalItems={filteredGoalTypes.length}
          onPageChange={setPage}
          onPageSizeChange={(next) => {
            setPageSize(next);
            setPage(1);
          }}
        />
      </Card>

      <GoalTypeModal
        title="Add goal type"
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={(values) => upsertGoalType(values)}
      />
      <GoalTypeModal
        title={activeGoalType ? `Edit ${activeGoalType.label}` : 'Edit goal type'}
        open={!!activeGoalType}
        initialValue={activeGoalType}
        onOpenChange={(open) => !open && setActiveGoalType(null)}
        onSubmit={(values) => upsertGoalType(values, activeGoalType)}
      />
    </>
  );
}

function GoalTypeModal({
  title,
  open,
  initialValue,
  onOpenChange,
  onSubmit,
}: {
  title: string;
  open: boolean;
  initialValue?: ProgrammeGoalType | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ProgrammeGoalTypeForm) => void;
}) {
  const form = useForm<ProgrammeGoalTypeForm>({
    resolver: zodResolver(programmeGoalTypeSchema),
    defaultValues: {
      label: initialValue?.label ?? '',
      description: initialValue?.description ?? '',
      requiresTargetAmount: initialValue?.requiresTargetAmount ?? false,
    },
  });

  React.useEffect(() => {
    if (!open) return;
    form.reset({
      label: initialValue?.label ?? '',
      description: initialValue?.description ?? '',
      requiresTargetAmount: initialValue?.requiresTargetAmount ?? false,
    });
  }, [form, initialValue, open]);

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title} width="wide">
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField label="Goal type name" error={form.formState.errors.label?.message}>
          <FormInput placeholder="e.g. Revenue growth target" {...form.register('label')} />
        </FormField>
        <FormField label="Description" optional>
          <FormTextarea
            rows={3}
            placeholder="Explain when entrepreneurs should use this goal type."
            {...form.register('description')}
          />
        </FormField>
        <label className="mb-5 flex items-start gap-3 rounded-xl border border-line bg-surface-subtle px-4 py-3">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-line text-bid focus:ring-bid"
            {...form.register('requiresTargetAmount')}
          />
          <span>
            <span className="block text-sm font-medium text-ink">Requires a target amount</span>
            <span className="mt-1 block text-sm leading-5 text-ink-muted">
              Use this for goal types such as fundraising where entrepreneurs should enter a USD target.
            </span>
          </span>
        </label>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit">Save goal type</Button>
        </div>
      </form>
    </Modal>
  );
}
