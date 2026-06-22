import { cn } from '@/lib/utils';

/**
 * Horizontal bar chart row — the simple `chart-row` from the mockups.
 * Not a real charting lib; just a tinted bar + label + value.
 */
export interface BarChartRowProps {
  label: string;
  value: string;
  percent: number;
  accent?: 'bid' | 'info' | 'success';
  className?: string;
}

const barColors: Record<NonNullable<BarChartRowProps['accent']>, string> = {
  bid: 'bg-bid',
  info: 'bg-info',
  success: 'bg-success',
};

export function BarChartRow({
  label,
  value,
  percent,
  accent = 'bid',
  className,
}: BarChartRowProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className={cn('mb-2 flex items-center gap-2', className)}>
      <div className="w-[110px] shrink-0 text-right text-[10px] text-ink-muted">
        {label}
      </div>
      <div className="h-2 flex-1 overflow-hidden rounded bg-surface-subtle">
        <div
          className={cn('h-full rounded', barColors[accent])}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <div className="w-9 text-right font-mono text-[10px] text-ink-muted">
        {value}
      </div>
    </div>
  );
}
