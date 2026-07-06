'use client';

import * as React from 'react';
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
import { FormField, FormTextarea } from '@/components/shared/FormField';
import { useAdminStore } from '@/lib/stores/admin-store';
import {
  stageDefinitionEditSchema,
  type StageDefinitionEditForm,
} from '@/lib/forms/schemas';
import type { Stage } from '@/types';

export default function AdminBusinessStagesPage() {
  const { stages, updateStageDefinitions } = useAdminStore();
  const [query, setQuery] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [activeStage, setActiveStage] = React.useState<Stage | null>(null);

  const filteredStages = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return stages;
    return stages.filter((stage) =>
      [stage.label, stage.definition].join(' ').toLowerCase().includes(needle),
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
            { label: 'Edit definition', onSelect: () => setActiveStage(stage) },
            {
              label: 'Add new stage',
              onSelect: () => toast.success('Stage creation will be connected when backend settings are added.'),
            },
          ]}
        />
      ),
      className: 'w-[84px]',
    },
    {
      key: 'stage',
      header: 'Stage',
      cell: (stage) => (
        <div className="flex items-center gap-2">
          <Badge tone={stage.color}>{stage.label}</Badge>
          <span className="font-mono text-xs text-ink-faint">{stage.id}</span>
        </div>
      ),
      className: 'w-[220px]',
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

  const saveDefinition = (stage: Stage, values: StageDefinitionEditForm) => {
    const nextDefinitions = stages.reduce<Record<string, string>>((defs, item) => {
      defs[item.id] = item.id === stage.id ? values.definition.trim() : item.definition;
      return defs;
    }, {});
    updateStageDefinitions(nextDefinitions);
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
              variant="outline"
              onClick={() => toast.success('Stage creation will be connected when backend settings are added.')}
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
        onSubmit={saveDefinition}
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
  onSubmit: (stage: Stage, values: StageDefinitionEditForm) => void;
}) {
  const form = useForm<StageDefinitionEditForm>({
    resolver: zodResolver(stageDefinitionEditSchema),
    defaultValues: { definition: '' },
  });

  React.useEffect(() => {
    if (stage) form.reset({ definition: stage.definition });
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
