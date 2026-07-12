'use client';

import { cn } from '@/lib/utils';

/**
 * Segmented "pill" tab strip mirroring `.tabs` / `.tab` in the mockups.
 * Controlled component — parent owns the active value.
 */
export interface TabsProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  tabs: { value: T; label: React.ReactNode }[];
  className?: string;
}

export function Tabs<T extends string>({
  value,
  onChange,
  tabs,
  className,
}: TabsProps<T>) {
  return (
    <div
      role="tablist"
      className={cn(
        'mb-4 flex w-fit max-w-full gap-1 overflow-x-auto rounded-xl border border-black/[0.06] bg-white p-1 shadow-sm',
        className,
      )}
    >
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={cn(
              'h-9 shrink-0 cursor-pointer rounded-lg px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bid/20',
              active
                ? 'bg-bid text-white shadow-sm'
                : 'text-ink-muted hover:bg-surface-subtle hover:text-ink',
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
