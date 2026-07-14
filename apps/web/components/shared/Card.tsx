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

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-lg bg-black/[0.07]', className)}
      {...props}
    />
  );
}

export function PageSkeleton({
  cards = 4,
  className,
}: {
  cards?: number;
  className?: string;
}) {
  return (
    <div aria-label="Loading page" aria-busy="true" className={cn('space-y-6', className)}>
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: cards }, (_, index) => (
          <Card key={index} className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-32" />
          </Card>
        ))}
      </div>
      <TableSkeleton />
    </div>
  );
}

export function TableSkeleton({
  rows = 6,
  columns = 4,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div aria-label="Loading table" aria-busy="true" className={cn('overflow-hidden rounded-xl border border-black/[0.08] bg-white', className)}>
      <div className="grid gap-4 border-b border-line bg-surface-subtle/80 p-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {Array.from({ length: columns }, (_, index) => <Skeleton key={index} className="h-3 w-20" />)}
      </div>
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="grid gap-4 border-b border-line/80 p-4 last:border-0" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {Array.from({ length: columns }, (_, column) => <Skeleton key={column} className="h-4 w-full max-w-32" />)}
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <Card aria-label="Loading chart" aria-busy="true" className={cn('space-y-5', className)}>
      <Skeleton className="h-5 w-40" />
      <div className="flex h-52 items-end gap-3">
        {[45, 72, 58, 88, 64, 76].map((height, index) => (
          <Skeleton key={index} className="flex-1 rounded-t-md" style={{ height: `${height}%` }} />
        ))}
      </div>
    </Card>
  );
}

export function ModalSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-label="Loading dialog content" aria-busy="true" className="space-y-4 py-1">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  );
}
