'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
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
  createBusinessStage,
  listBusinessStages,
  updateBusinessStage,
  type BusinessStageRecord,
} from '@/lib/api/settings';
import {
  businessStageSchema,
  type BusinessStageForm,
} from '@/lib/forms/schemas';
import type { BadgeTone } from '@/types';

const STAGES_QUERY_KEY = ['settings', 'business-stages'];
const badgeTones: BadgeTone[] = ['amber', 'brand', 'blue', 'green', 'neutral'];

type StageRow = BusinessStageRecord & {
  label: string;
  color: BadgeTone;
};

function toStageRow(stage: BusinessStageRecord): StageRow {
  return {
    ...stage,
    label: stage.name,
    color: badgeTones[Math.abs(hashString(stage.key)) % badgeTones.length],
  };
}

function hashString(value: string) {
  return value.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

export default function AdminBusinessStagesPage() {
  const queryClient = useQueryClient();
  const stagesQuery = useQuery<BusinessStageRecord[]>({
    queryKey: STAGES_QUERY_KEY,
    queryFn: () => listBusinessStages(),
  });
  const stages = React.useMemo<StageRow[]>(
    () => (stagesQuery.data ?? []).map(toStageRow),
    [stagesQuery.data],
  );
  const [query, setQuery] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [activeStage, setActiveStage] = React.useState<StageRow | null>(null);

  const createMutation = useMutation({
    mutationFn: (values: BusinessStageForm) =>
      createBusinessStage({ name: values.label.trim(), definition: values.definition.trim() }),
    onSuccess: () => {
      toast.success('Business stage added');
      setCreateOpen(false);
      void queryClient.invalidateQueries({ queryKey: STAGES_QUERY_KEY });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Unable to add stage.'),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: BusinessStageForm }) =>
      updateBusinessStage(id, {
        name: values.label.trim(),
        definition: values.definition.trim(),
      }),
    onSuccess: () => {
      toast.success('Business stage updated');
      setActiveStage(null);
      void queryClient.invalidateQueries({ queryKey: STAGES_QUERY_KEY });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Unable to update stage.'),
  });

  const filteredStages = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return stages;
    return stages.filter((stage) =>
      [stage.label, stage.key, stage.definition].join(' ').toLowerCase().includes(needle),
    );
  }, [query, stages]);

  React.useEffect(() => {
    setPage(1);
  }, [query, pageSize]);

  const pageRows = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredStages.slice(start, start + pageSize);
  }, [filteredStages, page, pageSize]);

  const columns: Column<StageRow>[] = [
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
      cell: (stage) => <span className="font-mono text-xs text-ink-muted">{stage.key}</span>,
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
    {
      key: 'status',
      header: 'Status',
      cell: (stage) => (
        <Badge tone={stage.active ? 'green' : 'neutral'}>
          {stage.active ? 'Active' : 'Inactive'}
        </Badge>
      ),
      className: 'w-[150px]',
    },
  ];

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
          actions={<Button onClick={() => setCreateOpen(true)}>+ Add stage</Button>}
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
          emptyMessage={stagesQuery.isLoading ? 'Loading business stages...' : 'No business stages match this search.'}
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
        isSaving={updateMutation.isPending}
        onClose={() => setActiveStage(null)}
        onSubmit={(stage, values) => updateMutation.mutate({ id: stage.id, values })}
      />
      <StageFormModal
        title="Add stage"
        open={createOpen}
        isSaving={createMutation.isPending}
        onOpenChange={setCreateOpen}
        onSubmit={(values) => createMutation.mutate(values)}
      />
    </>
  );
}

function StageDefinitionModal({
  stage,
  isSaving = false,
  onClose,
  onSubmit,
}: {
  stage: StageRow | null;
  isSaving?: boolean;
  onClose: () => void;
  onSubmit: (stage: StageRow, values: BusinessStageForm) => void;
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
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save definition'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function StageFormModal({
  title,
  open,
  isSaving = false,
  onOpenChange,
  onSubmit,
}: {
  title: string;
  open: boolean;
  isSaving?: boolean;
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
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save stage'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
