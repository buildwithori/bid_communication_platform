'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { BidLogo } from '@/components/shared/BidLogo';
import { Avatar } from '@/components/shared/Avatar';
import { Badge } from '@/components/shared/Badge';

export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface NavSection {
  heading: string;
  items: NavItem[];
}

export interface SidebarUser {
  initials: string;
  name: string;
  subtitle: string;
  tone?: 'brand' | 'blue' | 'green' | 'amber' | 'neutral';
}

export interface NavSidebarProps {
  brandTitle: string;
  brandSubtitle: string;
  role?: 'entrepreneur' | 'admin';
  sections: NavSection[];
  user: SidebarUser;
}

/**
 * Renders nav sections, with active route highlighted via `usePathname`.
 *
 * On <1024px screens this collapses into a drawer controlled by the
 * AppShell; on desktop it is a fixed column.
 */
export function NavSidebar({
  brandTitle,
  brandSubtitle,
  role,
  sections,
  user,
}: NavSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    // Exact route match for index pages, prefix match otherwise.
    if (pathname === href) return true;
    return pathname.startsWith(href + '/');
  };

  return (
    <div className="flex h-full flex-col bg-surface-panel">
      {/* Brand */}
      <div className="flex items-center gap-3 border-b border-line px-5 py-5">
        <BidLogo size={40} variant="isotype" />
        <div>
          <div className="text-base font-semibold leading-tight">{brandTitle}</div>
          <div className="font-mono text-xs text-ink-faint">{brandSubtitle}</div>
          {role === 'admin' && (
            <Badge tone="brand" className="mt-0.5">
              Admin
            </Badge>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {sections.map((section) => (
          <div key={section.heading}>
            <div className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-[0.08em] text-ink-faint">
              {section.heading}
            </div>
            {section.items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                    active
                      ? 'bg-bid-light font-medium text-bid-dark'
                      : 'text-ink-muted hover:bg-surface-subtle hover:text-ink',
                  )}
                >
                  <item.icon
                    className={cn(
                      'h-4 w-4 shrink-0',
                      active ? 'opacity-100' : 'opacity-60',
                    )}
                  />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-line px-4 py-4">
        <div className="flex items-center gap-2.5">
          <Avatar initials={user.initials} size={34} tone={user.tone} />
          <div className="min-w-0">
            <div className="text-sm font-medium leading-tight">{user.name}</div>
            <div className="truncate text-xs text-ink-faint">{user.subtitle}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
