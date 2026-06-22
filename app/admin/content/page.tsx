'use client';

import * as React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { Tabs } from '@/components/shared/Tabs';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import { FormField, FormSelect } from '@/components/shared/FormField';
import { Notice } from '@/components/shared/PageHeader';
import { useAdminStore } from '@/lib/stores/admin-store';
import { programs, modules as seedModules } from '@/lib/mock-data/programs';
import type { ContentItem } from '@/types';
import { toast } from 'sonner';

type Tab = 'video' | 'pdf' | 'tool' | 'templates';

const tabTypeMap: Record<string, ContentItem['type']> = {
  video: 'video',
  pdf: 'pdf',
  tool: 'tool',
  templates: 'pdf',
};

export default function AdminContentPage() {
  const { contentItems } = useAdminStore();
  const [tab, setTab] = React.useState<Tab>('video');
  const [reuseOpen, setReuseOpen] = React.useState(false);
  const [reuseTarget, setReuseTarget] = React.useState<ContentItem | null>(null);

  const filtered =
    tab === 'templates'
      ? contentItems.filter((c) => c.type === 'pdf')
      : contentItems.filter((c) => c.type === tabTypeMap[tab]);

  const columns: Column<ContentItem>[] = [
    { key: 'title', header: 'Title', cell: (c) => `${c.chapter}: ${c.title}` },
    {
      key: 'used',
      header: 'Used in (programme → module)',
      cell: (c) => {
        const module = seedModules.find((m) => m.id === c.moduleId);
        const usedIn = programs.filter((p) => module && p.moduleIds.includes(module.id));
        return (
          <>
            {usedIn.length > 0 ? (
              usedIn.map((p) => (
                <span
                  key={p.id}
                  className="mr-1 mb-1 inline-flex items-center gap-1 rounded-full bg-surface-subtle px-2 py-0.5 text-[9px] text-ink-muted"
                >
                  {p.name.split('–')[0].trim()} → {module?.title}
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
    {
      key: 'actions',
      header: '',
      cell: (c) => (
        <div className="flex gap-1">
          <Button variant="outline" size="sm">
            Edit
          </Button>
          <Button
            variant="info"
            size="sm"
            onClick={() => {
              setReuseTarget(c);
              setReuseOpen(true);
            }}
          >
            + Add to programme
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Content library"
        description="Upload once, assign to multiple programmes and modules"
        actions={
          <Button onClick={() => toast.success('Upload flow opened')}>
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
          { value: 'templates', label: 'Templates' },
          { value: 'tool', label: 'Tools' },
        ]}
      />
      <Card>
        <CardHeader title={`${tab[0].toUpperCase() + tab.slice(1)} content`} />
        <DataTable columns={columns} rows={filtered} rowKey={(c) => c.id} emptyMessage="No content in this tab yet." />
      </Card>

      <Modal open={reuseOpen} onOpenChange={setReuseOpen} title="Add content to another programme">
        <FormField label="Target programme">
          <FormSelect
            value="p-wee"
            onValueChange={() => {}}
            options={[
              { value: 'p-wee', label: 'Women Economic Empowerment Programme' },
              { value: 'p-readiness-fintech', label: 'Investment Readiness for Fintech' },
            ]}
          />
        </FormField>
        <FormField label="Target module">
          <FormSelect
            value="new"
            onValueChange={() => {}}
            options={[
              { value: 'new', label: '— Create new module —' },
              { value: 'm-intro', label: 'Foundations Module' },
            ]}
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
    </>
  );
}
