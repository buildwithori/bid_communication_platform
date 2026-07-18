'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AuthShell } from '@/components/auth/AuthShell';
import { Skeleton } from '@/components/shared/Card';
import { useCurrentUserQuery } from '@/lib/api/auth';
import {
  authenticatedDestination,
  destinationPath,
} from '@/lib/auth-navigation';

export function AuthRouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const currentUser = useCurrentUserQuery();
  const user = currentUser.data?.user;
  const hasUsableSession = Boolean(user && user.status !== 'inactive');
  const destination = hasUsableSession && user
    ? authenticatedDestination(user)
    : null;
  const shouldRedirect = Boolean(
    destination && pathname !== destinationPath(destination),
  );

  React.useEffect(() => {
    if (currentUser.isLoading || !destination || !shouldRedirect) return;
    router.replace(destination);
  }, [currentUser.isLoading, destination, router, shouldRedirect]);

  if (currentUser.isLoading || shouldRedirect) {
    return <AuthSessionFallback />;
  }

  return <>{children}</>;
}

function AuthSessionFallback() {
  return (
    <AuthShell
      title="Opening your workspace"
      description="Checking your BID Hub session and account access."
    >
      <div
        aria-label="Checking authenticated session"
        aria-busy="true"
        className="space-y-4"
      >
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="mx-auto h-4 w-3/5" />
      </div>
    </AuthShell>
  );
}
