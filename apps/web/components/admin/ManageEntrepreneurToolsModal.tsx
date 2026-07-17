'use client';

import * as React from 'react';
import { FileText, LayoutGrid, Plus, Search, Timer, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '@/components/shared/Modal';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import {
  DataTable,
  RowActions,
  TableFilterAutocomplete,
  TableFilterInput,
  TablePagination,
  TableToolbar,
  type Column,
  type RowAction,
} from '@/components/shared/DataTable';
import { tools } from '@/lib/mock-data';
import { programs } from '@/lib/mock-data/programs';
import { useAdminStore } from '@/lib/stores/admin-store';
import {
  describeToolAudience,
  getEntrepreneurToolAccessSource,
  getToolStatus,
  type EntrepreneurToolAccessSource,
} from '@/lib/tool-access';
import { cn } from '@/lib/utils';
import type { BadgeTone, Entrepreneur, Tool, ToolType } from '@/types';

const iconMap = {
  canvas: LayoutGrid,
  document: FileText,
  timer: Timer,
  star: Search,
  plus: Plus,
  calendar: Wrench,
};

const sourceMeta: Record<EntrepreneurToolAccessSource, { label: string; tone: BadgeTone; description: string }> = {
  global: {
    label: 'Global',
    tone: 'green',
    description: 'Inherited because the tool is available to all entrepreneurs.',
  },
  programme: {
    label: 'Programme',
    tone: 'blue',
    description: 'Inherited from one of this entrepreneur’s programmes.',
  },
  individual: {
    label: 'Individual',
    tone: 'brand',
    description: 'Granted directly to this entrepreneur.',
  },
  none: {
    label: 'No access',
    tone: 'neutral',
    description: 'This entrepreneur cannot currently see this tool.',
  },
};

const typeTone: Record<ToolType, BadgeTone> = {
  pdf: 'blue',
  embed: 'green',
};

export function ManageEntrepreneurToolsModal({
  open,
  onOpenChange,
  entrepreneur,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entrepreneur: Entrepreneur;
}) {
  const { entrepreneurs, updateEntrepreneur } = useAdminStore();
  const currentEntrepreneur = entrepreneurs.find((item) => item.id === entrepreneur.id) ?? entrepreneur;
  const [query, setQuery] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState<'all' | ToolType>('all');
  const [sourceFilter, setSourceFilter] = React.useState<'all' | EntrepreneurToolAccessSource>('all');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(5);
  const [addToolId, setAddToolId] = React.useState('');

  const blockedToolIds = React.useMemo(
    () => currentEntrepreneur.toolAccess?.blockedToolIds ?? [],
    [currentEntrepreneur.toolAccess?.blockedToolIds],
  );
  const addedToolIds = currentEntrepreneur.toolAccess?.addedToolIds ?? [];
  const publishedTools = React.useMemo(() => tools.filter((tool) => getToolStatus(tool) === 'published'), []);

  const visibleTools = React.useMemo(() =>
    publishedTools.filter((tool) => getEntrepreneurToolAccessSource(tool, currentEntrepreneur) !== 'none'),
    [currentEntrepreneur, publishedTools],
  );

  const blockedTools = React.useMemo(() =>
    publishedTools.filter((tool) => blockedToolIds.includes(tool.id)),
    [blockedToolIds, publishedTools],
  );

  const addOptions = React.useMemo(() =>
    publishedTools
      .filter((tool) => getEntrepreneurToolAccessSource(tool, currentEntrepreneur) === 'none')
      .filter((tool) => !blockedToolIds.includes(tool.id))
      .map((tool) => ({ value: tool.id, label: tool.name, description: tool.type === 'pdf' ? 'PDF resource' : 'Online tool' })),
    [blockedToolIds, currentEntrepreneur, publishedTools],
  );

  const filteredTools = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return visibleTools.filter((tool) => {
      const source = getEntrepreneurToolAccessSource(tool, currentEntrepreneur);
      const audience = describeToolAudience(tool, programs, entrepreneurs);
      const matchesQuery = !needle || [tool.name, tool.description, sourceMeta[source].label, audience.detail]
        .join(' ')
        .toLowerCase()
        .includes(needle);
      const matchesType = typeFilter === 'all' || tool.type === typeFilter;
      const matchesSource = sourceFilter === 'all' || source === sourceFilter;
      return matchesQuery && matchesType && matchesSource;
    });
  }, [currentEntrepreneur, entrepreneurs, query, sourceFilter, typeFilter, visibleTools]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      onOpenChange(true);
      return;
    }
    setQuery('');
    setTypeFilter('all');
    setSourceFilter('all');
    setPage(1);
    setAddToolId('');
    onOpenChange(false);
  };

  const pageRows = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredTools.slice(start, start + pageSize);
  }, [filteredTools, page, pageSize]);

  const patchToolAccess = (next: { addedToolIds?: string[]; blockedToolIds?: string[] }, message: string) => {
    updateEntrepreneur(currentEntrepreneur.id, {
      toolAccess: {
        addedToolIds: next.addedToolIds ?? addedToolIds,
        blockedToolIds: next.blockedToolIds ?? blockedToolIds,
      },
    });
    toast.success(message);
  };

  const removeAccess = (tool: Tool) => {
    const source = getEntrepreneurToolAccessSource(tool, currentEntrepreneur);
    if (source === 'individual') {
      patchToolAccess(
        { addedToolIds: addedToolIds.filter((id) => id !== tool.id) },
        'Individual tool access removed',
      );
      return;
    }

    patchToolAccess(
      { blockedToolIds: Array.from(new Set([...blockedToolIds, tool.id])) },
      'Tool hidden for this entrepreneur',
    );
  };

  const restoreAccess = (tool: Tool) => {
    patchToolAccess(
      { blockedToolIds: blockedToolIds.filter((id) => id !== tool.id) },
      'Tool access restored',
    );
  };

  const addAccess = () => {
    if (!addToolId) return;
    patchToolAccess(
      { addedToolIds: Array.from(new Set([...addedToolIds, addToolId])) },
      'Tool access added',
    );
    setAddToolId('');
  };

  const columns: Column<Tool>[] = [
    {
      key: 'action',
      header: 'Action',
      cell: (tool) => <RowActions actions={rowActions(tool, currentEntrepreneur, removeAccess)} />,
      className: 'w-[84px]',
    },
    {
      key: 'tool',
      header: 'Tool',
      cell: (tool) => <ToolCell tool={tool} />,
    },
    {
      key: 'type',
      header: 'Type',
      cell: (tool) => <Badge tone={typeTone[tool.type]}>{tool.type === 'pdf' ? 'PDF resource' : 'Online tool'}</Badge>,
    },
    {
      key: 'source',
      header: 'Access source',
      cell: (tool) => {
        const source = getEntrepreneurToolAccessSource(tool, currentEntrepreneur);
        const meta = sourceMeta[source];
        return (
          <div className="min-w-[220px]">
            <Badge tone={meta.tone}>{meta.label}</Badge>
            <div className="mt-2 text-sm leading-5 text-ink-muted">{meta.description}</div>
          </div>
        );
      },
    },
    {
      key: 'audience',
      header: 'Tool rule',
      cell: (tool) => {
        const audience = describeToolAudience(tool, programs, entrepreneurs);
        return (
          <div className="min-w-[220px] max-w-[340px] text-sm text-ink-muted">
            <div className="font-medium text-ink">{audience.label}</div>
            <div className="mt-1 line-clamp-2">{audience.detail}</div>
          </div>
        );
      },
    },
  ];

  return (
    <Modal open={open} onOpenChange={handleOpenChange} title="Manage entrepreneur tools" width="xl">
      <div className="space-y-4">
        <div className="rounded-2xl border border-line bg-surface-subtle p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-sm text-ink-muted">Entrepreneur</div>
              <div className="mt-1 text-xl font-semibold text-ink">{currentEntrepreneur.businessName}</div>
              <div className="mt-1 text-sm text-ink-muted">{currentEntrepreneur.representative} · {currentEntrepreneur.email}</div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[360px]">
              <Summary label="Visible" value={String(visibleTools.length)} />
              <Summary label="Added" value={String(addedToolIds.length)} />
              <Summary label="Hidden" value={String(blockedToolIds.length)} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-white p-4">
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-semibold text-ink">Add individual tool access</div>
              <div className="text-sm text-ink-muted">Use this only for exceptions. Global and programme access are inherited automatically.</div>
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
            <TableFilterAutocomplete
              value={addToolId}
              onValueChange={setAddToolId}
              options={addOptions}
              placeholder="Search available tools"
              searchPlaceholder="Search tools..."
              emptyMessage="No additional published tools available."
            />
            <Button type="button" onClick={addAccess} disabled={!addToolId} className="md:min-w-[160px]">
              Add access
            </Button>
          </div>
        </div>

        <div>
          <TableToolbar>
            <div>
              <div className="text-sm font-medium text-ink">Current tool access</div>
              <div className="mt-0.5 text-sm text-ink-muted">Search, filter, or remove tools from this entrepreneur’s workspace.</div>
            </div>
            <div className="grid w-full gap-2 lg:w-auto lg:grid-cols-[240px_170px_190px]">
              <TableFilterInput
                icon
                placeholder="Search tools..."
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
              />
              <TableFilterAutocomplete
                value={typeFilter}
                onValueChange={(value) => {
                  setTypeFilter(value as typeof typeFilter);
                  setPage(1);
                }}
                options={[
                  { value: 'all', label: 'All types' },
                  { value: 'pdf', label: 'PDF resources' },
                  { value: 'embed', label: 'Online tools' },
                ]}
                placeholder="All types"
                searchPlaceholder="Search types..."
              />
              <TableFilterAutocomplete
                value={sourceFilter}
                onValueChange={(value) => {
                  setSourceFilter(value as typeof sourceFilter);
                  setPage(1);
                }}
                options={[
                  { value: 'all', label: 'All sources' },
                  { value: 'global', label: 'Global' },
                  { value: 'programme', label: 'Programme' },
                  { value: 'individual', label: 'Individual' },
                ]}
                placeholder="All sources"
                searchPlaceholder="Search sources..."
              />
            </div>
          </TableToolbar>
          <DataTable
            columns={columns}
            rows={pageRows}
            rowKey={(tool) => tool.id}
            emptyMessage="No tools match this view."
            tableClassName="min-w-[980px]"
          />
          <TablePagination
            page={page}
            pageSize={pageSize}
            totalItems={filteredTools.length}
            pageSizeOptions={[5, 10, 25]}
            onPageChange={setPage}
            onPageSizeChange={(next) => {
              setPageSize(next);
              setPage(1);
            }}
          />
        </div>

        {blockedTools.length > 0 && (
          <div className="rounded-2xl border border-line bg-white p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-ink">Hidden tools</div>
                <div className="text-sm text-ink-muted">These are inherited tools that have been removed for this entrepreneur.</div>
              </div>
              <Badge tone="neutral">{blockedTools.length}</Badge>
            </div>
            <div className="grid gap-2">
              {blockedTools.map((tool) => (
                <div key={tool.id} className="flex flex-col gap-3 rounded-xl border border-line bg-surface-subtle px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <ToolCell tool={tool} compact />
                  <Button type="button" variant="outline" size="sm" onClick={() => restoreAccess(tool)} className="sm:min-w-[120px]">
                    Restore
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end border-t border-line pt-4">
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Done</Button>
        </div>
      </div>
    </Modal>
  );
}

function rowActions(
  tool: Tool,
  entrepreneur: Entrepreneur,
  removeAccess: (tool: Tool) => void,
): Array<RowAction | 'separator'> {
  const source = getEntrepreneurToolAccessSource(tool, entrepreneur);
  return [
    {
      label: source === 'individual' ? 'Remove individual access' : 'Hide for entrepreneur',
      destructive: true,
      onSelect: () => removeAccess(tool),
    },
  ];
}

function ToolCell({ tool, compact = false }: { tool: Tool; compact?: boolean }) {
  const Icon = iconMap[tool.iconKey] ?? Wrench;
  return (
    <div className={cn('flex min-w-[260px] items-start gap-3', compact && 'min-w-0')}>
      <span className={cn('mt-0.5 grid shrink-0 place-items-center rounded-xl', compact ? 'h-9 w-9' : 'h-10 w-10', tool.type === 'pdf' ? 'bg-info-light text-info' : 'bg-bid-light text-bid')}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-ink">{tool.name}</span>
        {!compact && <span className="mt-1 line-clamp-2 text-sm leading-5 text-ink-muted">{tool.description}</span>}
        {compact && <span className="mt-0.5 block text-sm text-ink-muted">{tool.type === 'pdf' ? 'PDF resource' : 'Online tool'}</span>}
      </span>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-white px-3 py-2">
      <div className="text-xs text-ink-muted">{label}</div>
      <div className="mt-1 text-xl font-semibold text-ink">{value}</div>
    </div>
  );
}
