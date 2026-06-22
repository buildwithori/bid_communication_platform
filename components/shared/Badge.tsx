'use client';

import { cn } from '@/lib/utils';
import type { BadgeTone } from '@/types';

/**
 * BID-styled badge. Mirrors the `.bb / .ba / .bl / .bgr / .bgy / .br`
 * classes from the mockup.
 */
const toneClasses: Record<BadgeTone, string> = {
  brand: 'bg-bid-light text-bid-dark',
  amber: 'bg-warning-light text-warning-dark',
  blue: 'bg-info-light text-info',
  green: 'bg-success-light text-success-dark',
  neutral: 'bg-surface-subtle text-ink-muted',
  red: 'bg-danger-light text-danger',
};

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({
  tone = 'brand',
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium leading-tight',
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
