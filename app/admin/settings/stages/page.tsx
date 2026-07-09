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
import { useAdminStore } from '@/lib/stores/admin-store';
import {
  businessStageSchema,
  type BusinessStageForm,
} from '@/lib/forms/schemas';
import type { Stage } from '@/types';

export default function AdminBusinessStagesPage() {
  const { stages, addStage, updateStage } = useAdminStore();
  const [query, setQuery] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [activeStage, setActiveStage] = React.useState<Stage | null>(null);

  const filteredStages = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return stages;
    return stages.filter((stage) =>
      [stage.label, stage.id, stage.definition].join(' ').toLowerCase().includes(needle),
    );
  }, [query, stages]);

  React.useEffect(() => {
    setPage(1);
  }, [query, pageSize]);

  const pageRows = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredStages.slice(start, start + pageSize);
  }, [filteredStages, page, pageSize]);

  const columns: Column<Stage>[] = [
    {
      key: 'actions',
      header: 'Action',
      cell: (stage) => (
        <RowActions
          actions={[
            { label: 'Edit stage', onSelect: () => setActiveStage(stage) },
          ]}
        />
      ),
      className: 'w-[84px]',
    },
    {
      key: 'stage',
      header: 'Stage',
      cell: (stage) => <Badge tone={stage.color}>{stage.label}</Badge>,
      className: 'w-[220px]',
    },
    {
      key: 'key',
      header: 'Key',
      cell: (stage) => <span className="font-mono text-xs text-ink-muted">{stage.id}</span>,
      className: 'w-[180px]',
    },
    {
      key: 'definition',
      header: 'Definition',
      cell: (stage) => (
        <p className="max-w-3xl text-sm leading-6 text-ink-muted">
          {stage.definition}
        </p>
      ),
    },
  ];

  const saveStage = (stage: Stage, values: BusinessStageForm) => {
    updateStage(stage.id, {
      label: values.label.trim(),
      definition: values.definition.trim(),
    });
    setActiveStage(null);
  };

  return (
    <>
      <PageHeader
        title="Business stages"
        description="Manage the stage definitions used across entrepreneur profiles and reporting."
      />

      <Card>
        <CardHeader
          title="Stage definitions"
          description={`${filteredStages.length} stage${filteredStages.length === 1 ? '' : 's'} in this view`}
          actions={
            <Button
              onClick={() => setCreateOpen(true)}
            >
              + Add stage
            </Button>
          }
        />
        <TableToolbar>
          <div>
            <div className="text-sm font-medium text-ink">Search stages</div>
            <div className="mt-0.5 text-sm text-ink-muted">
              Find a stage by name, key, or definition.
            </div>
          </div>
          <TableFilterInput
            icon
            className="w-full sm:w-[320px]"
            placeholder="Search stages..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </TableToolbar>
        <DataTable
          columns={columns}
          rows={pageRows}
          rowKey={(stage) => stage.id}
          emptyMessage="No business stages match this search."
        />
        <TablePagination
          page={page}
          pageSize={pageSize}
          totalItems={filteredStages.length}
          onPageChange={setPage}
          onPageSizeChange={(next) => {
            setPageSize(next);
            setPage(1);
          }}
        />
      </Card>

      <StageDefinitionModal
        stage={activeStage}
        onClose={() => setActiveStage(null)}
        onSubmit={saveStage}
      />
      <StageFormModal
        title="Add stage"
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={(values) => {
          addStage(values.label.trim(), values.definition.trim());
          setCreateOpen(false);
        }}
      />
    </>
  );
}

function StageDefinitionModal({
  stage,
  onClose,
  onSubmit,
}: {
  stage: Stage | null;
  onClose: () => void;
  onSubmit: (stage: Stage, values: BusinessStageForm) => void;
}) {
  const form = useForm<BusinessStageForm>({
    resolver: zodResolver(businessStageSchema),
    defaultValues: { label: '', definition: '' },
  });

  React.useEffect(() => {
    if (stage) form.reset({ label: stage.label, definition: stage.definition });
  }, [form, stage]);

  return (
    <Modal
      open={!!stage}
      onOpenChange={(open) => !open && onClose()}
      title={stage ? `Edit ${stage.label}` : 'Edit stage'}
      width="wide"
    >
      {stage && (
        <form onSubmit={form.handleSubmit((values) => onSubmit(stage, values))}>
          <FormField label="Stage name" error={form.formState.errors.label?.message}>
            <FormInput placeholder="e.g. Expansion" {...form.register('label')} />
          </FormField>
          <FormField label="Stage definition" error={form.formState.errors.definition?.message}>
            <FormTextarea rows={5} {...form.register('definition')} />
          </FormField>
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save definition</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function StageFormModal({
  title,
  open,
  onOpenChange,
  onSubmit,
}: {
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: BusinessStageForm) => void;
}) {
  const form = useForm<BusinessStageForm>({
    resolver: zodResolver(businessStageSchema),
    defaultValues: { label: '', definition: '' },
  });

  React.useEffect(() => {
    if (open) form.reset({ label: '', definition: '' });
  }, [form, open]);

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title} width="wide">
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField label="Stage name" error={form.formState.errors.label?.message}>
          <FormInput placeholder="e.g. Expansion" {...form.register('label')} />
        </FormField>
        <FormField label="Stage definition" error={form.formState.errors.definition?.message}>
          <FormTextarea
            rows={5}
            placeholder="Describe when an entrepreneur belongs in this stage."
            {...form.register('definition')}
          />
        </FormField>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit">Save stage</Button>
        </div>
      </form>
    </Modal>
  );
}
