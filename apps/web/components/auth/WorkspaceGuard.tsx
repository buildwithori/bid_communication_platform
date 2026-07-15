'use client';

import * as React from 'react';
import type { Route } from 'next';
import { usePathname, useRouter } from 'next/navigation';
import { useCurrentUserQuery, type AuthUser } from '@/lib/api/auth';
import { Skeleton } from '@/components/shared/Card';
import { routes } from '@/lib/routes';

type WorkspaceRole = AuthUser['role'];

export function WorkspaceGuard({ allowedRoles, children }: { allowedRoles: WorkspaceRole[]; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const currentUserQuery = useCurrentUserQuery();
  const user = currentUserQuery.data?.user;
  const isAllowed = user ? allowedRoles.includes(user.role) : false;

  React.useEffect(() => {
    if (currentUserQuery.isLoading) return;
    if (!user) {
      const loginUrl = `${routes.auth.login}?next=${encodeURIComponent(pathname)}`;
      router.replace(loginUrl as Route);
      return;
    }
    if (!user.emailVerifiedAt || user.status === 'pending') {
      router.replace(`${routes.auth.verifyEmail}?email=${encodeURIComponent(user.email)}`);
      return;
    }
    if (user.onboardingRequired) {
      router.replace(routes.auth.onboarding);
      return;
    }
    if (!isAllowed) router.replace(workspaceRouteForRole(user.role));
  }, [currentUserQuery.isLoading, isAllowed, pathname, router, user]);

  if (currentUserQuery.isLoading || !user || !user.emailVerifiedAt || Boolean(user.onboardingRequired) || !isAllowed) {
    return <WorkspaceGuardFallback />;
  }
  return <>{children}</>;
}

function WorkspaceGuardFallback() {
  return (
    <div aria-label="Loading workspace" aria-busy="true" className="min-h-screen bg-canvas p-6 lg:p-10">
      <div className="mx-auto max-w-7xl space-y-7">
        <div className="flex items-center justify-between"><Skeleton className="h-9 w-36" /><Skeleton className="h-9 w-9 rounded-full" /></div>
        <div className="space-y-2"><Skeleton className="h-8 w-64" /><Skeleton className="h-4 w-full max-w-lg" /></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-28 w-full" />)}</div>
        <Skeleton className="h-80 w-full" />
      </div>
    </div>
  );
}

export function workspaceRouteForRole(role: WorkspaceRole) {
  if (role === 'admin') return routes.admin.dashboard;
  if (role === 'trainer') return routes.trainer.dashboard;
  return routes.entrepreneur.dashboard;
}
