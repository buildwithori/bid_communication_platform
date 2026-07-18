'use client';

import { Menu } from 'lucide-react';
import { Button } from '@/components/shared/Button';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
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

export function TopBar({ title, actions, onMenuClick, rightSlot, className }: TopBarProps) {
  return (
    <header
      className={cn(
        'flex h-16 shrink-0 items-center gap-3 border-b border-border bg-surface-panel/95 px-4 backdrop-blur lg:px-6',
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
      <div className="flex-1 truncate text-lg font-semibold">{title}</div>
      <ThemeToggle className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-card text-ink-muted shadow-sm transition-colors hover:bg-surface-subtle hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bid/25" />
      {rightSlot}
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
