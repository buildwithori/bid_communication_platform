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
 * AppShell; on desktop it is a fixed 226px column.
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
      <div className="flex items-center gap-2.5 border-b border-line px-4 py-3.5">
        <BidLogo size={32} />
        <div>
          <div className="text-sm font-semibold leading-tight">{brandTitle}</div>
          <div className="font-mono text-[9px] text-ink-faint">{brandSubtitle}</div>
          {role === 'admin' && (
            <Badge tone="brand" className="mt-0.5">
              Admin
            </Badge>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-2.5">
        {sections.map((section) => (
          <div key={section.heading}>
            <div className="px-2 pb-0.5 pt-2 text-[9px] font-medium uppercase tracking-[0.08em] text-ink-faint">
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
                    'mb-px flex items-center gap-2.5 rounded-lg px-2 py-2 text-xs transition-colors',
                    active
                      ? 'bg-bid-light font-medium text-bid-dark'
                      : 'text-ink-muted hover:bg-surface-subtle hover:text-ink',
                  )}
                >
                  <item.icon
                    className={cn(
                      'h-[14px] w-[14px] shrink-0',
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
      <div className="border-t border-line px-3.5 py-3">
        <div className="flex items-center gap-2.5">
          <Avatar initials={user.initials} size={28} tone={user.tone} />
          <div className="min-w-0">
            <div className="text-[11px] font-medium leading-tight">{user.name}</div>
            <div className="truncate text-[9px] text-ink-faint">{user.subtitle}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
