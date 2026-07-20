'use client';

import { useDebouncedValue } from '@/lib/search';
import * as React from 'react';
import { Search } from 'lucide-react';
import { Badge } from '@/components/shared/Badge';
import { Modal } from '@/components/shared/Modal';
import { tools } from '@/lib/mock-data';
import { getEntrepreneurToolAccessSource, type EntrepreneurToolAccessSource } from '@/lib/tool-access';
import { cn } from '@/lib/utils';
import type { BadgeTone, Entrepreneur, Tool } from '@/types';

const accessSourceMeta: Record<Exclude<EntrepreneurToolAccessSource, 'none'>, { label: string; tone: BadgeTone }> = {
  global: { label: 'Global', tone: 'green' },
  programme: { label: 'Programme', tone: 'blue' },
  individual: { label: 'Individual', tone: 'brand' },
};

export function getVisibleToolsForEntrepreneur(entrepreneur: Entrepreneur) {
  return tools.filter((tool) => getEntrepreneurToolAccessSource(tool, entrepreneur) !== 'none');
}

export function ToolAccessList({
  entrepreneur,
  maxVisible = 2,
  className,
  chipClassName,
  emptyLabel = 'No tools',
  modalTitle,
}: {
  entrepreneur: Entrepreneur;
  maxVisible?: number;
  className?: string;
  chipClassName?: string;
  emptyLabel?: string;
  modalTitle?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const debouncedQuery = useDebouncedValue(query.trim());
  const visibleTools = React.useMemo(() => getVisibleToolsForEntrepreneur(entrepreneur), [entrepreneur]);
  const visible = visibleTools.slice(0, maxVisible);
  const hiddenCount = Math.max(visibleTools.length - visible.length, 0);
  const filteredTools = React.useMemo(() => {
    const needle = debouncedQuery.toLowerCase();
    if (!needle) return visibleTools;
    return visibleTools.filter((tool) =>
      [tool.name, tool.description, tool.type, getEntrepreneurToolAccessSource(tool, entrepreneur)]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }, [debouncedQuery, entrepreneur, visibleTools]);

  return (
    <>
      <div className={cn('flex min-w-0 max-w-full flex-wrap items-center gap-1.5', className)}>
        {visible.map((tool) => (
          <Badge
            key={tool.id}
            tone={tool.type === 'pdf' ? 'blue' : 'green'}
            className={cn('max-w-[170px] truncate', chipClassName)}
            title={tool.name}
          >
            {tool.name}
          </Badge>
        ))}
        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setOpen(true);
            }}
            className="inline-flex items-center rounded-full bg-surface-subtle px-2.5 py-1 text-xs font-semibold leading-tight text-bid transition hover:bg-bid-light focus:outline-none focus-visible:ring-2 focus-visible:ring-bid/30"
          >
            +{hiddenCount} more
          </button>
        )}
        {visibleTools.length === 0 && <span className="text-sm text-ink-faint">{emptyLabel}</span>}
      </div>

      <Modal open={open} onOpenChange={setOpen} title={modalTitle ?? `${entrepreneur.businessName} tool access`} width="wide">
        <div className="space-y-4">
          <div className="rounded-xl border border-line bg-surface-subtle px-4 py-3">
            <div className="text-sm font-semibold text-ink">
              {visibleTools.length} tool{visibleTools.length === 1 ? '' : 's'} visible
            </div>
            <div className="mt-1 text-sm text-ink-muted">
              These are the tools this entrepreneur can open from their workspace.
            </div>
          </div>

          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search tools..."
              className="h-10 w-full rounded-lg border border-line bg-card pl-9 pr-3 text-sm text-ink outline-none transition focus:border-bid focus:ring-2 focus:ring-bid/15"
            />
          </label>

          <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
            {filteredTools.map((tool: Tool) => {
              const source = getEntrepreneurToolAccessSource(tool, entrepreneur) as Exclude<EntrepreneurToolAccessSource, 'none'>;
              const meta = accessSourceMeta[source];
              return (
                <div key={tool.id} className="rounded-xl border border-line bg-card px-4 py-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="font-semibold text-ink">{tool.name}</div>
                      <div className="mt-1 line-clamp-2 text-sm leading-6 text-ink-muted">{tool.description}</div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <Badge tone={tool.type === 'pdf' ? 'blue' : 'green'}>{tool.type === 'pdf' ? 'PDF resource' : 'Online tool'}</Badge>
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredTools.length === 0 && (
              <div className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink-muted">
                No tool matches this search.
              </div>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
