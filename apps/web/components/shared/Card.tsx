'use client';

import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Optional accent stripe on the left edge (used on program cards). */
  accent?: 'bid' | 'info' | 'success';
  dashed?: boolean;
  padding?: 'sm' | 'md' | 'lg';
}

const accentBorder: Record<NonNullable<CardProps['accent']>, string> = {
  bid: 'border-l-[3px] border-l-bid',
  info: 'border-l-[3px] border-l-info',
  success: 'border-l-[3px] border-l-success',
};

export function Card({
  accent,
  dashed,
  padding = 'md',
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl bg-surface-panel shadow-[0_18px_45px_rgba(26,26,26,0.055)] transition-shadow',
        padding === 'sm' && 'p-4',
        padding === 'md' && 'p-5',
        padding === 'lg' && 'p-6',
        dashed
          ? 'border-[1.5px] border-dashed border-line-strong'
          : 'border border-black/[0.08]',
        accent && accentBorder[accent],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'mb-4 flex items-start justify-between gap-3',
        className,
      )}
    >
      <div className="min-w-0">
        <div className="text-base font-semibold tracking-[-0.01em]">{title}</div>
        {description && (
          <div className="mt-1 text-sm leading-5 text-ink-muted">{description}</div>
        )}
      </div>
      {actions && <div className="flex items-center gap-1.5">{actions}</div>}
    </div>
  );
}
