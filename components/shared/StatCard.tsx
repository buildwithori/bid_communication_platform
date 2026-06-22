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
}: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-bid border border-line bg-surface-panel px-4 py-3.5',
        className,
      )}
    >
      <div className="mb-1.5 text-[10px] text-ink-muted">{label}</div>
      <div className={cn('text-[22px] font-medium leading-none', valueClassName)}>
        {value}
      </div>
      {subline && (
        <div className="mt-1.5 flex items-center text-[10px] text-ink-muted">
          {dotColor && (
            <span
              className={cn(
                'mr-1 inline-block h-[5px] w-[5px] rounded-full',
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
