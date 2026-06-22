'use client';

import { cn } from '@/lib/utils';

/**
 * Thin BID card: white panel, hairline border, 10px radius, 16px padding.
 * Mirrors `.card` in the mockups.
 */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Optional accent stripe on the left edge (used on program cards). */
  accent?: 'bid' | 'info' | 'success';
  dashed?: boolean;
}

const accentBorder: Record<NonNullable<CardProps['accent']>, string> = {
  bid: 'border-l-[3px] border-l-bid',
  info: 'border-l-[3px] border-l-info',
  success: 'border-l-[3px] border-l-success',
};

export function Card({
  accent,
  dashed,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-bid bg-surface-panel p-4',
        dashed
          ? 'border-[1.5px] border-dashed border-line-strong'
          : 'border border-line',
        accent && accentBorder[accent],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Card header row — title on the left, optional actions on the right.
 * Mirrors `.ch` / `.ctit`.
 */
export function CardHeader({
  title,
  actions,
  className,
}: {
  title: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'mb-3 flex items-center justify-between',
        className,
      )}
    >
      <span className="text-xs font-medium">{title}</span>
      {actions && <div className="flex items-center gap-1.5">{actions}</div>}
    </div>
  );
}
