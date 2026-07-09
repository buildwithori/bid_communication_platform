'use client';

import * as React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { Tabs } from '@/components/shared/Tabs';
import {
  DataTable,
  RowActions,
  TableFilterInput,
  TablePagination,
  TableToolbar,
  type Column,
} from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import { FormAutocomplete, FormField } from '@/components/shared/FormField';
import { Notice } from '@/components/shared/PageHeader';
import { AddContentItemModal } from '@/components/admin/ManageContentModal';
import { useAdminStore } from '@/lib/stores/admin-store';
import { programs, modules as seedModules } from '@/lib/mock-data/programs';
import type { ContentItem } from '@/types';
import { toast } from 'sonner';

type Tab = ContentItem['type'];

export default function AdminContentPage() {
  const { contentItems } = useAdminStore();
  const [tab, setTab] = React.useState<Tab>('video');
  const [query, setQuery] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [reuseOpen, setReuseOpen] = React.useState(false);
  const [reuseTarget, setReuseTarget] = React.useState<ContentItem | null>(null);
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<ContentItem | null>(null);
  const [targetProgramme, setTargetProgramme] = React.useState('p-wee');
  const [targetModule, setTargetModule] = React.useState('new');

  const filtered = React.useMemo(() => {
    const rows = contentItems.filter((c) => c.type === tab);
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((item) =>
      [item.title, item.chapter, item.type, item.durationLabel ?? '']
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }, [contentItems, query, tab]);

  React.useEffect(() => {
    setPage(1);
  }, [query, tab, pageSize]);

  const pageRows = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const columns: Column<ContentItem>[] = [
    {
      key: 'actions',
      header: 'Action',
      cell: (c) => (
        <RowActions
          actions={[
            { label: 'Edit content', onSelect: () => setEditTarget(c) },
            {
              label: 'Add to programme',
              onSelect: () => {
                setReuseTarget(c);
                setReuseOpen(true);
              },
            },
          ]}
        />
      ),
      className: 'w-[84px]',
    },
    { key: 'title', header: 'Title', cell: (c) => `${c.chapter}: ${c.title}` },
    {
      key: 'used',
      header: 'Used in (programme → module)',
      cell: (c) => {
        const contentModule = seedModules.find((m) => m.id === c.moduleId);
        const usedIn = programs.filter((p) => contentModule && p.moduleIds.includes(contentModule.id));
        return (
          <>
            {usedIn.length > 0 ? (
              usedIn.map((p) => (
                <span
                  key={p.id}
                  className="mr-1 mb-1 inline-flex items-center gap-1 rounded-full bg-surface-subtle px-2 py-0.5 text-[9px] text-ink-muted"
                >
                  {p.name.split('–')[0].trim()} → {contentModule?.title}
                </span>
              ))
            ) : (
              <span className="text-[10px] text-ink-faint">Not used yet</span>
            )}
          </>
        );
      },
    },
    { key: 'duration', header: 'Duration', cell: (c) => c.durationLabel ?? '—' },
    {
      key: 'views',
      header: 'Views',
      cell: () => '—',
    },
    {
      key: 'status',
      header: 'Status',
      cell: () => <Badge tone="green">Published</Badge>,
    },
  ];

  return (
    <>
      <PageHeader
        title="Content library"
        description="Upload once, assign to multiple programmes and modules"
        actions={
          <Button onClick={() => setUploadOpen(true)}>
            + Upload content
          </Button>
        }
      />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'video', label: 'Videos' },
          { value: 'pdf', label: 'PDFs' },
          { value: 'tool', label: 'Tools' },
        ]}
      />
      <Card>
        <CardHeader
          title={`${tab[0].toUpperCase() + tab.slice(1)} content`}
          description={`${filtered.length} reusable asset${filtered.length === 1 ? '' : 's'} found`}
        />
        <TableToolbar>
          <div>
            <div className="text-sm font-medium text-ink">Find content quickly</div>
            <div className="mt-0.5 text-sm text-ink-muted">
              Search by title, chapter, type, or duration.
            </div>
          </div>
          <div className="w-full sm:w-[320px]">
            <TableFilterInput
              icon
              placeholder="Search content..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </TableToolbar>
        <DataTable columns={columns} rows={pageRows} rowKey={(c) => c.id} emptyMessage="No content in this tab yet." />
        <TablePagination
          page={page}
          pageSize={pageSize}
          totalItems={filtered.length}
          onPageChange={setPage}
          onPageSizeChange={(next) => {
            setPageSize(next);
            setPage(1);
          }}
        />
      </Card>

      <Modal open={reuseOpen} onOpenChange={setReuseOpen} title="Add content to another programme">
        <FormField label="Target programme">
          <FormAutocomplete
            value={targetProgramme}
            onValueChange={setTargetProgramme}
            options={programs.map((program) => ({ value: program.id, label: program.name }))}
            placeholder="Search programme"
            searchPlaceholder="Search programmes..."
          />
        </FormField>
        <FormField label="Target module">
          <FormAutocomplete
            value={targetModule}
            onValueChange={setTargetModule}
            options={[
              { value: 'new', label: 'Create new module' },
              ...seedModules.map((module) => ({
                value: module.id,
                label: module.title,
                description: module.reuseCount ? `Used in ${module.reuseCount} programmes` : undefined,
              })),
            ]}
            placeholder="Search module"
            searchPlaceholder="Search modules..."
          />
        </FormField>
        <Notice>
          The same content will now appear in both places. Editing it once updates it
          everywhere it&apos;s used.
        </Notice>
        <Button className="w-full" onClick={() => { setReuseOpen(false); toast.success('Content added to programme!'); }}>
          Add content
        </Button>
      </Modal>
      <AddContentItemModal
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        module={seedModules[0]}
      />
      <Modal
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
        title={editTarget ? `Edit content — ${editTarget.title}` : 'Edit content'}
      >
        {editTarget && (
          <div>
            <FormField label="Title">
              <div className="rounded-lg border border-black/[0.08] bg-surface-subtle px-3 py-2 text-sm text-ink">
                {editTarget.title}
              </div>
            </FormField>
            <FormField label="Chapter">
              <div className="rounded-lg border border-black/[0.08] bg-surface-subtle px-3 py-2 text-sm text-ink">
                {editTarget.chapter}
              </div>
            </FormField>
            <FormField label="Type">
              <div className="rounded-lg border border-black/[0.08] bg-surface-subtle px-3 py-2 text-sm capitalize text-ink">
                {editTarget.type}
              </div>
            </FormField>
            <Button
              className="w-full"
              onClick={() => {
                setEditTarget(null);
                toast.success('Content changes saved');
              }}
            >
              Save content
            </Button>
          </div>
        )}
      </Modal>
    </>
  );
}
