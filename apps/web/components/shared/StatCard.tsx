import { cn } from '@/lib/utils';

/**
 * Stat card — the white `.sc` tiles on the dashboards. Shows a label,
 * a big value, and an optional sub-line with a colored status dot.
 */
export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  subline?: React.ReactNode;
  /** Color of the leading status dot on the subline. */
  dotColor?: 'bid' | 'info' | 'success' | 'warning' | 'neutral';
  /** When set, the big value renders in this color (e.g. unassigned count). */
  valueClassName?: string;
  className?: string;
  accent?: 'bid' | 'info' | 'success' | 'warning' | 'neutral';
}

const dotClasses: Record<NonNullable<StatCardProps['dotColor']>, string> = {
  bid: 'bg-bid',
  info: 'bg-info',
  success: 'bg-success',
  warning: 'bg-warning',
  neutral: 'bg-ink-muted',
};

export function StatCard({
  label,
  value,
  subline,
  dotColor,
  valueClassName,
  className,
  accent = 'neutral',
}: StatCardProps) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border border-black/[0.08] bg-surface-panel px-5 py-4 shadow-[0_14px_34px_rgba(26,26,26,0.045)]',
        className,
      )}
    >
      <div
        className={cn(
          'absolute inset-x-0 top-0 h-1',
          accent === 'bid' && 'bg-bid',
          accent === 'info' && 'bg-info',
          accent === 'success' && 'bg-success',
          accent === 'warning' && 'bg-warning',
          accent === 'neutral' && 'bg-line',
        )}
      />
      <div className="mb-3 text-sm font-medium text-ink-muted">{label}</div>
      <div className={cn('text-3xl font-semibold leading-none tracking-[-0.02em]', valueClassName)}>
        {value}
      </div>
      {subline && (
        <div className="mt-3 flex items-center text-sm text-ink-muted">
          {dotColor && (
            <span
              className={cn(
                'mr-2 inline-block h-2 w-2 rounded-full',
                dotClasses[dotColor],
              )}
            />
          )}
          {subline}
        </div>
      )}
    </div>
  );
}
