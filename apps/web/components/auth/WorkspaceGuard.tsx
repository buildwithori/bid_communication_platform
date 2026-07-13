'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getCurrentUser, type AuthUser } from '@/lib/api/auth';
import { routes } from '@/lib/routes';

type WorkspaceRole = AuthUser['role'];

const CURRENT_USER_QUERY_KEY = ['auth', 'me'];

export function WorkspaceGuard({
  allowedRoles,
  children,
}: {
  allowedRoles: WorkspaceRole[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const allowedRoleKey = allowedRoles.join('|');
  const currentUserQuery = useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: getCurrentUser,
    retry: false,
    staleTime: 0,
  });
  const user = currentUserQuery.data?.user;

  React.useEffect(() => {
    if (currentUserQuery.isLoading) return;

    if (!user) {
      router.replace(routes.auth.login);
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      router.replace(workspaceRouteForRole(user.role));
    }
  }, [allowedRoleKey, currentUserQuery.isLoading, pathname, router, user]);

  if (currentUserQuery.isLoading || !user || !allowedRoles.includes(user.role)) {
    return <WorkspaceGuardFallback />;
  }

  return <>{children}</>;
}

function WorkspaceGuardFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-6 text-center">
      <div>
        <div className="text-sm font-medium text-ink">Preparing your workspace</div>
        <div className="mt-1 text-sm text-ink-muted">Checking your session...</div>
      </div>
    </div>
  );
}

function workspaceRouteForRole(role: WorkspaceRole) {
  if (role === 'admin') return routes.admin.dashboard;
  if (role === 'trainer') return routes.trainer.dashboard;
  return routes.entrepreneur.dashboard;
}
