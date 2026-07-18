'use client';

import * as React from 'react';
import type { Route } from 'next';
import { usePathname, useRouter } from 'next/navigation';
import { useCurrentUserQuery, type AuthUser } from '@/lib/api/auth';
import {
  AdminDashboardSkeleton,
  EntrepreneurDashboardSkeleton,
  TrainerDashboardSkeleton,
} from '@/components/dashboard/DashboardSkeletons';
import { WorkspaceShellSkeleton } from '@/components/layout/WorkspaceShellSkeleton';
import { PageSkeleton } from '@/components/shared/Card';
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
    return <WorkspaceGuardFallback role={allowedRoles[0] ?? 'entrepreneur'} pathname={pathname} />;
  }
  return <>{children}</>;
}

function WorkspaceGuardFallback({ role, pathname }: { role: WorkspaceRole; pathname: string }) {
  const isDashboard = pathname === workspaceRouteForRole(role);
  const content = isDashboard
    ? role === 'admin'
      ? <AdminDashboardSkeleton />
      : role === 'trainer'
        ? <TrainerDashboardSkeleton />
        : <EntrepreneurDashboardSkeleton />
    : <PageSkeleton />;

  return (
    <WorkspaceShellSkeleton role={role}>
      {content}
    </WorkspaceShellSkeleton>
  );
}

export function workspaceRouteForRole(role: WorkspaceRole) {
  if (role === 'admin') return routes.admin.dashboard;
  if (role === 'trainer') return routes.trainer.dashboard;
  return routes.entrepreneur.dashboard;
}
