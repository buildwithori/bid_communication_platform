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
        'mb-4 flex w-fit gap-1 rounded-lg bg-surface-subtle p-1',
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
              'cursor-pointer rounded-md px-4 py-2 text-sm transition-colors',
              active
                ? 'border border-line bg-surface-panel font-medium text-ink'
                : 'text-ink-muted hover:text-ink',
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
