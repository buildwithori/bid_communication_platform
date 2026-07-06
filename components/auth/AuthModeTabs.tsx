'use client';

import type * as React from 'react';
import Link from 'next/link';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

export function AuthModeTabs({ active }: { active: 'login' | 'signup' }) {
  return (
    <div className="mb-6 grid grid-cols-2 rounded-lg border border-line bg-surface-subtle p-1">
      <TabLink active={active === 'login'} href={routes.auth.login}>
        Login
      </TabLink>
      <TabLink active={active === 'signup'} href={routes.auth.signup}>
        Signup
      </TabLink>
    </div>
  );
}

function TabLink({
  active,
  href,
  children,
}: {
  active: boolean;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex h-10 items-center justify-center rounded-md text-sm font-medium transition-colors',
        active ? 'bg-white text-ink shadow-sm' : 'text-ink-muted hover:text-ink',
      )}
    >
      {children}
    </Link>
  );
}
