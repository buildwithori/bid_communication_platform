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
import { FormField, FormInput } from '@/components/shared/FormField';
import { createSector, listSectors, updateSector, type LookupRecord } from '@/lib/api/settings';
import type { BadgeTone } from '@/types';
import { newSectorSchema, type NewSectorForm } from '@/lib/forms/schemas';

const SECTORS_QUERY_KEY = ['settings', 'sectors'];
const badgeTones: BadgeTone[] = ['blue', 'green', 'brand', 'amber', 'neutral'];

type SectorRow = LookupRecord & {
  label: string;
  color: BadgeTone;
};

function toSectorRow(sector: LookupRecord): SectorRow {
  return {
    ...sector,
    label: sector.name,
    color: badgeTones[Math.abs(hashString(sector.key)) % badgeTones.length],
  };
}

function hashString(value: string) {
  return value.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

export default function AdminSectorsPage() {
  const queryClient = useQueryClient();
  const sectorsQuery = useQuery<LookupRecord[]>({
    queryKey: SECTORS_QUERY_KEY,
    queryFn: () => listSectors(),
  });
  const rows = React.useMemo<SectorRow[]>(
    () => (sectorsQuery.data ?? []).map(toSectorRow),
    [sectorsQuery.data],
  );
  const [query, setQuery] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [activeSector, setActiveSector] = React.useState<SectorRow | null>(null);

  const createMutation = useMutation({
    mutationFn: (values: NewSectorForm) => createSector({ name: values.label.trim() }),
    onSuccess: () => {
      toast.success('Sector added');
      setCreateOpen(false);
      void queryClient.invalidateQueries({ queryKey: SECTORS_QUERY_KEY });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Unable to add sector.'),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: NewSectorForm }) =>
      updateSector(id, { name: values.label.trim() }),
    onSuccess: () => {
      toast.success('Sector updated');
      setActiveSector(null);
      void queryClient.invalidateQueries({ queryKey: SECTORS_QUERY_KEY });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Unable to update sector.'),
  });

  const filteredSectors = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((sector) =>
      [sector.label, sector.key].join(' ').toLowerCase().includes(needle),
    );
  }, [query, rows]);

  React.useEffect(() => {
    setPage(1);
  }, [query, pageSize]);

  const pageRows = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredSectors.slice(start, start + pageSize);
  }, [filteredSectors, page, pageSize]);

  const columns: Column<SectorRow>[] = [
    {
      key: 'actions',
      header: 'Action',
      cell: (sector) => (
        <RowActions
          actions={[
            { label: 'Rename sector', onSelect: () => setActiveSector(sector) },
          ]}
        />
      ),
      className: 'w-[84px]',
    },
    {
      key: 'sector',
      header: 'Sector',
      cell: (sector) => <Badge tone={sector.color}>{sector.label}</Badge>,
      className: 'w-[260px]',
    },
    {
      key: 'key',
      header: 'Key',
      cell: (sector) => <span className="font-mono text-xs text-ink-muted">{sector.key}</span>,
      className: 'w-[220px]',
    },
    {
      key: 'status',
      header: 'Status',
      cell: (sector) => (
        <Badge tone={sector.active ? 'green' : 'neutral'}>
          {sector.active ? 'Active' : 'Inactive'}
        </Badge>
      ),
      className: 'w-[150px]',
    },
  ];

  return (
    <>
      <PageHeader
        title="Sectors"
        description="Manage the sector list used for entrepreneur profiles, trainer matching, and reporting filters."
      />

      <Card>
        <CardHeader
          title="Sector list"
          description={`${filteredSectors.length} sector${filteredSectors.length === 1 ? '' : 's'} in this view`}
          actions={<Button onClick={() => setCreateOpen(true)}>+ Add sector</Button>}
        />
        <TableToolbar>
          <div>
            <div className="text-sm font-medium text-ink">Search sectors</div>
            <div className="mt-0.5 text-sm text-ink-muted">
              Find sectors by name or key.
            </div>
          </div>
          <TableFilterInput
            icon
            className="w-full sm:w-[320px]"
            placeholder="Search sectors..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </TableToolbar>
        <DataTable
          columns={columns}
          rows={pageRows}
          rowKey={(sector) => sector.id}
          emptyMessage={sectorsQuery.isLoading ? 'Loading sectors...' : 'No sectors match this search.'}
        />
        <TablePagination
          page={page}
          pageSize={pageSize}
          totalItems={filteredSectors.length}
          onPageChange={setPage}
          onPageSizeChange={(next) => {
            setPageSize(next);
            setPage(1);
          }}
        />
      </Card>

      <SectorFormModal
        title="Add sector"
        open={createOpen}
        isSaving={createMutation.isPending}
        onOpenChange={setCreateOpen}
        onSubmit={(values) => createMutation.mutate(values)}
      />
      <SectorFormModal
        title={activeSector ? `Rename ${activeSector.label}` : 'Rename sector'}
        open={!!activeSector}
        initialValue={activeSector?.label}
        isSaving={updateMutation.isPending}
        onOpenChange={(open) => !open && setActiveSector(null)}
        onSubmit={(values) => {
          if (!activeSector) return;
          updateMutation.mutate({ id: activeSector.id, values });
        }}
      />
    </>
  );
}

function SectorFormModal({
  title,
  open,
  initialValue = '',
  isSaving = false,
  onOpenChange,
  onSubmit,
}: {
  title: string;
  open: boolean;
  initialValue?: string;
  isSaving?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: NewSectorForm) => void;
}) {
  const form = useForm<NewSectorForm>({
    resolver: zodResolver(newSectorSchema),
    defaultValues: { label: initialValue },
  });

  React.useEffect(() => {
    if (open) form.reset({ label: initialValue });
  }, [form, initialValue, open]);

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField label="Sector name" error={form.formState.errors.label?.message}>
          <FormInput placeholder="e.g. Renewable Energy" {...form.register('label')} />
        </FormField>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save sector'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
