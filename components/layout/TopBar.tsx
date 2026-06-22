'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/shared/Button';
import { cn } from '@/lib/utils';

/**
 * Top bar: page title on the left, optional actions on the right, and
 * a hamburger button on mobile (visible < lg) that toggles the sidebar
 * drawer via the `onMenuClick` callback.
 */
export interface TopBarProps {
  title: string;
  actions?: React.ReactNode;
  onMenuClick?: () => void;
  rightSlot?: React.ReactNode;
  className?: string;
}

/** Mockup search box; reads as input with a leading icon. */
function SearchBox() {
  return (
    <label
      className={cn(
        'hidden items-center gap-1.5 rounded-[7px] border border-line bg-surface-subtle px-2.5',
        'w-[180px] md:flex',
      )}
    >
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <circle cx="5" cy="5" r="3.5" stroke="#999" strokeWidth="1.2" />
        <path d="M8.5 8.5L11 11" stroke="#999" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
      <span className="sr-only">Search</span>
      <input
        type="text"
        placeholder="Search…"
        className="h-[30px] w-full border-0 bg-transparent text-[11px] text-ink outline-none placeholder:text-ink-faint"
      />
    </label>
  );
}

export function TopBar({ title, actions, onMenuClick, rightSlot, className }: TopBarProps) {
  return (
    <header
      className={cn(
        'flex h-[50px] shrink-0 items-center gap-3 border-b border-line bg-surface-panel px-4 lg:px-[22px]',
        className,
      )}
    >
      {onMenuClick && (
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 lg:hidden"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" />
        </Button>
      )}
      <div className="flex-1 truncate text-[13px] font-medium">{title}</div>
      <SearchBox />
      {rightSlot}
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
