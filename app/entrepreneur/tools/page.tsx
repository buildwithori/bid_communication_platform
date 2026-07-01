'use client';

import * as React from 'react';
import {
  LayoutGrid,
  FileText,
  Timer,
  Star,
  Plus,
  CalendarDays,
  Wrench,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { Tabs } from '@/components/shared/Tabs';
import { Modal } from '@/components/shared/Modal';
import { FormField, FormInput, FormTextarea } from '@/components/shared/FormField';
import {
  TableFilterInput,
  TablePagination,
  TableToolbar,
} from '@/components/shared/DataTable';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toolRequestSchema, type ToolRequestForm } from '@/lib/forms/schemas';
import { toast } from 'sonner';
import { tools } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import type { Tool } from '@/types';

const iconMap: Record<Tool['iconKey'], LucideIcon> = {
  canvas: LayoutGrid,
  document: FileText,
  timer: Timer,
  star: Star,
  plus: Plus,
  calendar: CalendarDays,
};

function ToolCard({ tool, onClick }: { tool: Tool; onClick?: () => void }) {
  const Icon = iconMap[tool.iconKey] ?? Wrench;
  const isOnline = tool.type === 'embed';
  return (
    <Card
      onClick={onClick}
      className={cn(
        'relative cursor-pointer transition-colors hover:border-bid',
      )}
    >
      <Badge tone={isOnline ? 'green' : 'blue'} className="absolute right-3.5 top-3.5">
        {isOnline ? 'Online tool' : 'PDF template'}
      </Badge>
      <div
        className={cn(
          'mb-2.5 flex h-9 w-9 items-center justify-center rounded-[9px]',
          isOnline ? 'bg-bid-light' : 'bg-info-light',
        )}
      >
        <Icon
          className={cn('h-[18px] w-[18px]', isOnline ? 'text-bid' : 'text-info')}
          strokeWidth={1.5}
        />
      </div>
      <div className="mb-1 text-xs font-medium">{tool.name}</div>
      <div className="text-[10px] leading-relaxed text-ink-muted">
        {tool.description}
      </div>
    </Card>
  );
}

function RequestToolModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const form = useForm<ToolRequestForm>({
    resolver: zodResolver(toolRequestSchema),
    defaultValues: { name: '', reason: '' },
  });

  const onSubmit = (values: ToolRequestForm) => {
    toast.success('Request sent to BID team!', {
      description: values.name,
    });
    onOpenChange(false);
    form.reset();
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Request a tool">
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField label="Tool name or idea" error={form.formState.errors.name?.message}>
          <FormInput placeholder="e.g. Cash flow forecasting tool" {...form.register('name')} />
        </FormField>
        <FormField label="Why would this help you?">
          <FormTextarea
            rows={3}
            placeholder="Tell the BID team what you need and why…"
            {...form.register('reason')}
          />
        </FormField>
        <Button type="submit" className="w-full">
          Send request
        </Button>
      </form>
    </Modal>
  );
}

function EmbedToolInlineModal({
  tool,
  onClose,
}: {
  tool: Tool | null;
  onClose: () => void;
}) {
  return (
    <Modal
      open={!!tool}
      onOpenChange={(o) => !o && onClose()}
      title={tool ? `${tool.name} — online tool` : ''}
      width="wide"
    >
      <div className="mb-3.5 flex h-[220px] flex-col items-center justify-center gap-2 rounded-lg bg-surface-subtle">
        <Wrench className="h-8 w-8 text-ink-faint" />
        <div className="text-[11px] text-ink-muted">Embedded tool would render here</div>
      </div>
      <div className="text-[11px] leading-relaxed text-ink-muted">
        This tool runs directly in the browser. Your work is saved automatically as
        you go.
      </div>
    </Modal>
  );
}

export default function ToolsPage() {
  const [tab, setTab] = React.useState<'all' | 'pdf' | 'embed'>('all');
  const [query, setQuery] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(6);
  const [requestOpen, setRequestOpen] = React.useState(false);
  const [activeTool, setActiveTool] = React.useState<Tool | null>(null);

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return tools.filter((tool) => {
      const matchesTab = tab === 'all' || tool.type === tab;
      const matchesQuery =
        !needle ||
        [tool.name, tool.description, tool.type]
          .join(' ')
          .toLowerCase()
          .includes(needle);
      return matchesTab && matchesQuery;
    });
  }, [query, tab]);

  React.useEffect(() => {
    setPage(1);
  }, [query, tab, pageSize]);

  const pageRows = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  return (
    <>
      <PageHeader
        title="Entrepreneur Tools"
        description="Downloadable templates and embedded online tools"
        actions={
          <Button variant="outline" onClick={() => setRequestOpen(true)}>
            + Request a tool
          </Button>
        }
      />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'all', label: 'All tools' },
          { value: 'pdf', label: 'PDF templates' },
          { value: 'embed', label: 'Online tools' },
        ]}
      />
      <TableToolbar>
        <div>
          <div className="text-sm font-medium text-ink">Browse tools</div>
          <div className="mt-0.5 text-sm text-ink-muted">
            {filtered.length} tool{filtered.length === 1 ? '' : 's'} available in this view.
          </div>
        </div>
        <div className="w-full sm:w-[320px]">
          <TableFilterInput
            icon
            placeholder="Search tools..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </TableToolbar>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {pageRows.map((t) => (
          <ToolCard
            key={t.id}
            tool={t}
            onClick={() =>
              t.type === 'embed'
                ? setActiveTool(t)
                : toast.success(`Downloading ${t.name}…`)
            }
          />
        ))}
      </div>
      <TablePagination
        page={page}
        pageSize={pageSize}
        totalItems={filtered.length}
        pageSizeOptions={[6, 12, 24]}
        onPageChange={setPage}
        onPageSizeChange={(next) => {
          setPageSize(next);
          setPage(1);
        }}
      />

      <RequestToolModal open={requestOpen} onOpenChange={setRequestOpen} />
      <EmbedToolInlineModal tool={activeTool} onClose={() => setActiveTool(null)} />
    </>
  );
}
