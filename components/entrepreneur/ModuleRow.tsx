'use client';

import { Check } from 'lucide-react';
import { Badge } from '@/components/shared/Badge';
import { cn } from '@/lib/utils';
import type { ModuleWithProgress } from '@/types';

/** Tiny status → badge tone map used by ModuleRow and content rows. */
export function moduleStatusBadge(status: ModuleWithProgress['status']) {
  switch (status) {
    case 'completed':
      return <Badge tone="brand">Done</Badge>;
    case 'in-progress':
      return <Badge tone="amber">60%</Badge>;
    default:
      return <Badge tone="neutral">Not started</Badge>;
  }
}

/**
 * Module list row: numbered circle (or checkmark when done) + title +
 * meta + status pill. Clickable.
 */
export function ModuleRow({
  module,
  onClick,
}: {
  module: ModuleWithProgress;
  onClick?: () => void;
}) {
  const done = module.status === 'completed';
  return (
    <div
      onClick={onClick}
      className={cn(
        'flex cursor-pointer items-center gap-3 border-b border-line py-3 transition-colors last:border-b-0 hover:bg-surface-subtle',
      )}
    >
      <div
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-medium',
          done ? 'bg-bid-light text-bid-dark' : 'bg-surface-subtle text-ink-muted',
        )}
      >
        {done ? <Check className="h-3 w-3" strokeWidth={2.5} /> : module.order}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 text-xs font-medium">{module.title}</div>
        <div className="text-[10px] text-ink-muted">
          {module.contentItemIds.length} content items
          {module.status === 'in-progress' ? ' · In progress' : ''}
          {module.status === 'completed' ? ' · Completed' : ''}
        </div>
      </div>
      {moduleStatusBadge(module.status)}
    </div>
  );
}
