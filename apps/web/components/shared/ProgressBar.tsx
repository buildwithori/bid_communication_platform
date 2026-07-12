import { cn } from '@/lib/utils';

/**
 * Slim progress bar mirroring `.pbar` / `.pf` from the mockups.
 */
export interface ProgressBarProps {
  value: number; // 0-100
  className?: string;
  barClassName?: string;
  /** Width of the track. Defaults to "70px" to match the mockup's inline width. */
  width?: string;
}

export function ProgressBar({
  value,
  className,
  barClassName,
  width = '70px',
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <span
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        'inline-block h-1 overflow-hidden rounded bg-surface-subtle',
        className,
      )}
      style={{ width }}
    >
      <span
        className={cn('block h-full rounded bg-bid', barClassName)}
        style={{ width: `${clamped}%` }}
      />
    </span>
  );
}
