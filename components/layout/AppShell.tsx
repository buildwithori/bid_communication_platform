'use client';

import * as React from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { NavSidebar, type NavSection, type SidebarUser } from './NavSidebar';
import { TopBar } from './TopBar';
import { Button } from '@/components/shared/Button';
import { cn } from '@/lib/utils';

export interface AppShellProps {
  brandTitle: string;
  brandSubtitle: string;
  role?: 'entrepreneur' | 'admin' | 'trainer';
  sections: NavSection[];
  user: SidebarUser;
  title: string;
  topActions?: React.ReactNode;
  topRightSlot?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * The two-column shell used by both the entrepreneur and admin sides.
 *
 * On desktop: a fixed 260px sidebar (sticky full-height).
 * On mobile (< lg): the sidebar lives in a slide-in drawer toggled by
 * the TopBar hamburger; it stays mounted for transition fidelity.
 */
export function AppShell({
  brandTitle,
  brandSubtitle,
  role,
  sections,
  user,
  title,
  topActions,
  topRightSlot,
  children,
}: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const sidebar = (
    <NavSidebar
      brandTitle={brandTitle}
      brandSubtitle={brandSubtitle}
      role={role}
      sections={sections}
      user={user}
    />
  );

  return (
    <div className="flex h-screen h-[100dvh] w-full overflow-hidden bg-surface">
      {/* Desktop sidebar */}
      <aside className="hidden w-[260px] shrink-0 border-r border-line lg:block">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      <MobileDrawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <div className="h-full">
          <div className="flex items-center justify-between border-b border-line px-3 py-2.5 lg:hidden">
            <span className="text-[11px] font-medium text-ink-muted">Menu</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {sidebar}
        </div>
      </MobileDrawer>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          title={title}
          actions={topActions}
          onMenuClick={() => setDrawerOpen(true)}
          rightSlot={topRightSlot}
        />
        <main className="app-shell-main flex-1 overflow-y-auto px-5 py-6 lg:px-7 lg:py-7">
          {children}
        </main>
      </div>
    </div>
  );
}

/** A minimal accessible drawer (no library). */
function MobileDrawer({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onOpenChange]);

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 lg:hidden',
        open ? 'pointer-events-auto' : 'pointer-events-none',
      )}
      aria-hidden={!open}
    >
      {/* Overlay */}
      <div
        className={cn(
          'absolute inset-0 bg-black/40 transition-opacity',
          open ? 'opacity-100' : 'opacity-0',
        )}
        onClick={() => onOpenChange(false)}
      />
      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={cn(
          'absolute left-0 top-0 h-full w-[260px] border-r border-line bg-surface-panel shadow-xl transition-transform',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {children}
      </div>
    </div>
  );
}
