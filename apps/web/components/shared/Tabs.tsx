'use client';

import * as React from 'react';
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
  const tabListRef = React.useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = React.useState({
    left: false,
    right: false,
  });

  const updateOverflow = React.useCallback(() => {
    const element = tabListRef.current;
    if (!element) return;
    const maximumScroll = element.scrollWidth - element.clientWidth;
    setOverflow({
      left: element.scrollLeft > 2,
      right: maximumScroll - element.scrollLeft > 2,
    });
  }, []);

  React.useEffect(() => {
    const element = tabListRef.current;
    if (!element) return;

    updateOverflow();
    const observer = new ResizeObserver(updateOverflow);
    observer.observe(element);
    Array.from(element.children).forEach((child) => observer.observe(child));

    return () => observer.disconnect();
  }, [tabs.length, updateOverflow]);

  React.useEffect(() => {
    const element = tabListRef.current;
    const activeTab = element?.querySelector<HTMLElement>(
      '[role="tab"][aria-selected="true"]',
    );
    if (element && activeTab) {
      const tabStart = activeTab.offsetLeft;
      const tabEnd = tabStart + activeTab.offsetWidth;
      const visibleStart = element.scrollLeft;
      const visibleEnd = visibleStart + element.clientWidth;

      if (tabStart < visibleStart) {
        element.scrollTo({ left: tabStart - 16, behavior: 'smooth' });
      } else if (tabEnd > visibleEnd) {
        element.scrollTo({
          left: tabEnd - element.clientWidth + 16,
          behavior: 'smooth',
        });
      }
    }
    const frame = window.requestAnimationFrame(updateOverflow);
    return () => window.cancelAnimationFrame(frame);
  }, [updateOverflow, value]);

  const maskImage =
    overflow.left && overflow.right
      ? 'linear-gradient(to right, transparent, black 18px, black calc(100% - 18px), transparent)'
      : overflow.left
        ? 'linear-gradient(to right, transparent, black 18px, black)'
        : overflow.right
          ? 'linear-gradient(to right, black, black calc(100% - 18px), transparent)'
          : undefined;

  return (
    <div
      ref={tabListRef}
      role="tablist"
      onScroll={updateOverflow}
      style={{
        maskImage,
        WebkitMaskImage: maskImage,
      }}
      className={cn(
        'mb-4 flex w-fit max-w-full gap-1 overflow-x-auto overscroll-x-contain scroll-smooth scroll-px-4 rounded-xl border border-border bg-card p-1 shadow-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
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
