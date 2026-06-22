'use client';

import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Dashed "+" empty-state card. Used for "New program", "Add module", etc.
 * Mirrors the `border:1.5px dashed` cards from the mockups.
 */
export interface EmptyStateCardProps {
  label: string;
  onClick?: () => void;
  className?: string;
  minHeight?: number;
}

export function EmptyStateCard({
  label,
  onClick,
  className,
  minHeight = 120,
}: EmptyStateCardProps) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      type={onClick ? 'button' : undefined}
      aria-label={onClick ? label : undefined}
      className={cn(
        'flex w-full flex-col items-center justify-center gap-1.5 rounded-bid border-[1.5px] border-dashed border-line-strong text-ink-faint',
        onClick && 'cursor-pointer transition-colors hover:border-bid hover:text-bid',
        className,
      )}
      style={{ minHeight }}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full border-[1.5px] border-dashed border-line-strong">
        <Plus className="h-4 w-4" />
      </span>
      <span className="text-[11px]">{label}</span>
    </Comp>
  );
}
