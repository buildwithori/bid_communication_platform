'use client';

import * as React from 'react';
import type { Route } from 'next';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCurrentUserQuery, type AuthUser } from '@/lib/api/auth';
import {
  AdminDashboardSkeleton,
  EntrepreneurDashboardSkeleton,
  TrainerDashboardSkeleton,
} from '@/components/dashboard/DashboardSkeletons';
import { WorkspaceShellSkeleton } from '@/components/layout/WorkspaceShellSkeleton';
import { PageSkeleton } from '@/components/shared/Card';
import { ProfilePageSkeleton } from '@/components/entrepreneur/profile/ProfileLoadingSkeletons';
import { ContentLibrarySkeleton } from '@/components/admin/content/ContentLibrarySkeleton';
import { authenticatedDestination, workspaceRouteForRole } from '@/lib/auth-navigation';
import { routes } from '@/lib/routes';
import { entrepreneurProfileTabFromQuery } from '@/lib/entrepreneur-profile-tabs';
import { contentLibraryTabFromQuery } from '@/lib/content-library-tabs';

type WorkspaceRole = AuthUser['role'];

export function WorkspaceGuard({ allowedRoles, children }: { allowedRoles: WorkspaceRole[]; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const currentUserQuery = useCurrentUserQuery();
  const refetchCurrentUser = currentUserQuery.refetch;
  const user = currentUserQuery.data?.user;
  const isAllowed = user ? allowedRoles.includes(user.role) : false;

  React.useEffect(() => {
    if (user?.role !== 'trainer' || !user.trainerAccessExpiresAt) return;
    const expiresAt = new Date(user.trainerAccessExpiresAt).getTime();
    let timeout: number | undefined;
    const checkExpiry = () => {
      const remaining = expiresAt - Date.now();
      if (remaining <= 0) {
        void refetchCurrentUser();
        return;
      }
      timeout = window.setTimeout(
        checkExpiry,
        Math.min(remaining + 50, 2_147_483_647),
      );
    };
    checkExpiry();
    return () => {
      if (timeout !== undefined) window.clearTimeout(timeout);
    };
  }, [refetchCurrentUser, user?.role, user?.trainerAccessExpiresAt]);

  React.useEffect(() => {
    if (currentUserQuery.isLoading) return;
    if (!user) {
      const loginUrl = `${routes.auth.login}?next=${encodeURIComponent(pathname)}`;
      router.replace(loginUrl as Route);
      return;
    }
    if (user.status === 'inactive') {
      router.replace(routes.auth.login);
      return;
    }
    if (!user.emailVerifiedAt || user.status === 'pending') {
      router.replace(authenticatedDestination(user));
      return;
    }
    if (user.onboardingRequired) {
      router.replace(authenticatedDestination(user));
      return;
    }
    if (!isAllowed) router.replace(workspaceRouteForRole(user.role));
  }, [currentUserQuery.isLoading, isAllowed, pathname, router, user]);

  if (currentUserQuery.isLoading || !user || user.status !== 'active' || !user.emailVerifiedAt || Boolean(user.onboardingRequired) || !isAllowed) {
    return <WorkspaceGuardFallback role={allowedRoles[0] ?? 'entrepreneur'} pathname={pathname} />;
  }
  return <>{children}</>;
}

function WorkspaceGuardFallback({ role, pathname }: { role: WorkspaceRole; pathname: string }) {
  const isDashboard = pathname === workspaceRouteForRole(role);
  const content = pathname === routes.entrepreneur.profile
    ? (
        <React.Suspense fallback={<ProfilePageSkeleton />}>
          <UrlAwareProfileSkeleton />
        </React.Suspense>
      )
    : pathname === routes.admin.content
      ? (
          <React.Suspense fallback={<ContentLibrarySkeleton activeType="video" />}>
            <UrlAwareContentLibrarySkeleton />
          </React.Suspense>
        )
    : isDashboard
      ? role === 'admin'
      ? <AdminDashboardSkeleton />
      : role === 'trainer'
        ? <TrainerDashboardSkeleton />
        : <EntrepreneurDashboardSkeleton />
    : <PageSkeleton />;

  return (
    <WorkspaceShellSkeleton role={role} pathname={pathname}>
      {content}
    </WorkspaceShellSkeleton>
  );
}

function UrlAwareContentLibrarySkeleton() {
  const searchParams = useSearchParams();
  const tab = contentLibraryTabFromQuery(searchParams.get('tab'));
  return <ContentLibrarySkeleton activeType={tab} />;
}

function UrlAwareProfileSkeleton() {
  const searchParams = useSearchParams();
  const tab = entrepreneurProfileTabFromQuery(searchParams.get('tab'));
  return <ProfilePageSkeleton tab={tab} />;
}
