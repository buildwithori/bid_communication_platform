'use client';

import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import {
  WorkspaceRouteSkeleton,
  WorkspaceRouteSkeletonFallback,
} from '@/components/loading/WorkspaceRouteSkeleton';

export default function AdminRouteLoading() {
  const pathname = usePathname();
  return (
    <Suspense fallback={<WorkspaceRouteSkeletonFallback role="admin" pathname={pathname} />}>
      <WorkspaceRouteSkeleton role="admin" pathname={pathname} />
    </Suspense>
  );
}
