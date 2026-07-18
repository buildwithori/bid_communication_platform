'use client';

import type * as React from 'react';
import type { Route } from 'next';
import Link from 'next/link';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

export function AuthModeTabs({ active }: { active: 'login' | 'signup' }) {
  return (
    <div className="mb-6 grid grid-cols-2 rounded-lg border border-border bg-secondary p-1">
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
  href: Route;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      prefetch
      scroll={false}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex h-10 items-center justify-center rounded-md text-sm font-medium transition-[background-color,color,box-shadow] duration-200',
        active
          ? 'bg-card text-card-foreground shadow-sm'
          : 'text-muted-foreground hover:bg-card/55 hover:text-foreground',
      )}
    >
      {children}
    </Link>
  );
}
