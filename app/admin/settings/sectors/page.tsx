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
import { FormField, FormInput } from '@/components/shared/FormField';
import { useAdminStore } from '@/lib/stores/admin-store';
import { newSectorSchema, type NewSectorForm } from '@/lib/forms/schemas';
import type { Sector } from '@/types';

export default function AdminSectorsPage() {
  const { sectors, addSector, updateSector, removeSector } = useAdminStore();
  const [query, setQuery] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [activeSector, setActiveSector] = React.useState<Sector | null>(null);

  const filteredSectors = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return sectors;
    return sectors.filter((sector) =>
      [sector.label, sector.id].join(' ').toLowerCase().includes(needle),
    );
  }, [query, sectors]);

  React.useEffect(() => {
    setPage(1);
  }, [query, pageSize]);

  const pageRows = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredSectors.slice(start, start + pageSize);
  }, [filteredSectors, page, pageSize]);

  const columns: Column<Sector>[] = [
    {
      key: 'actions',
      header: 'Action',
      cell: (sector) => (
        <RowActions
          actions={[
            { label: 'Rename sector', onSelect: () => setActiveSector(sector) },
            'separator',
            { label: 'Remove sector', destructive: true, onSelect: () => removeSector(sector.id) },
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
      cell: (sector) => <span className="font-mono text-xs text-ink-muted">{sector.id}</span>,
      className: 'w-[220px]',
    },
    {
      key: 'usage',
      header: 'Used for',
      cell: () => (
        <span className="text-sm text-ink-muted">
          Entrepreneur profiles, trainer specialisms, filters, and reporting.
        </span>
      ),
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
          emptyMessage="No sectors match this search."
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
        onOpenChange={setCreateOpen}
        onSubmit={(values) => {
          addSector(values.label.trim());
          setCreateOpen(false);
        }}
      />
      <SectorFormModal
        title={activeSector ? `Rename ${activeSector.label}` : 'Rename sector'}
        open={!!activeSector}
        initialValue={activeSector?.label}
        onOpenChange={(open) => !open && setActiveSector(null)}
        onSubmit={(values) => {
          if (!activeSector) return;
          updateSector(activeSector.id, values.label.trim());
          setActiveSector(null);
        }}
      />
    </>
  );
}

function SectorFormModal({
  title,
  open,
  initialValue = '',
  onOpenChange,
  onSubmit,
}: {
  title: string;
  open: boolean;
  initialValue?: string;
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
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit">Save sector</Button>
        </div>
      </form>
    </Modal>
  );
}
