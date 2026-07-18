import * as React from 'react';
import { Skeleton } from '@/components/shared/Card';
import { adminNav } from '@/lib/nav/admin-nav';
import { entrepreneurNav } from '@/lib/nav/entrepreneur-nav';
import { trainerNav } from '@/lib/nav/trainer-nav';

export type WorkspaceSkeletonRole = 'admin' | 'trainer' | 'entrepreneur';

export function WorkspaceShellSkeleton({
  role,
  children,
}: {
  role: WorkspaceSkeletonRole;
  children: React.ReactNode;
}) {
  return (
    <div
      aria-label="Loading workspace"
      aria-busy="true"
      className="flex h-screen h-[100dvh] w-full overflow-hidden bg-surface"
    >
      <aside className="hidden w-[260px] shrink-0 border-r border-line bg-surface-panel lg:block">
        <SidebarSkeleton role={role} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-surface-panel/95 px-4 lg:px-6">
          <Skeleton className="h-8 w-8 lg:hidden" />
          <Skeleton className="h-5 w-40 sm:w-52" />
          <div className="flex-1" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </header>
        <main className="app-shell-main flex-1 overflow-y-auto px-5 py-6 lg:px-7 lg:py-7">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarSkeleton({ role }: { role: WorkspaceSkeletonRole }) {
  const sections = role === 'admin' ? adminNav : role === 'trainer' ? trainerNav : entrepreneurNav;

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-[81px] items-center gap-3 border-b border-line px-5 py-5">
        <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-36" />
          {role !== 'entrepreneur' ? <Skeleton className="h-4 w-14 rounded-full" /> : null}
        </div>
      </div>

      <nav className="flex-1 overflow-hidden px-3 py-3">
        {sections.map((section, sectionIndex) => (
          <div key={section.heading}>
            <div className="px-3 pb-1 pt-3">
              <Skeleton className={sectionIndex === 0 ? 'h-3 w-16' : 'h-3 w-20'} />
            </div>
            {section.items.map((item, itemIndex) => (
              <div
                key={item.href}
                className={itemIndex === 0 && sectionIndex === 0
                  ? 'mb-1 flex h-10 items-center gap-3 rounded-lg bg-muted/70 px-3'
                  : 'mb-1 flex h-10 items-center gap-3 rounded-lg px-3'}
              >
                <Skeleton className="h-4 w-4 shrink-0 rounded" />
                <Skeleton className="h-3.5" style={{ width: `${Math.min(132, 66 + item.label.length * 4)}px` }} />
              </div>
            ))}
          </div>
        ))}
      </nav>

      <div className="border-t border-line px-4 py-4">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-[34px] w-[34px] shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3 w-36" />
          </div>
        </div>
        <Skeleton className="mt-3 h-9 w-full" />
      </div>
    </div>
  );
}
