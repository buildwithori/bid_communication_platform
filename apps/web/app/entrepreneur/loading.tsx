'use client';

import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import {
  WorkspaceRouteSkeleton,
  WorkspaceRouteSkeletonFallback,
} from '@/components/loading/WorkspaceRouteSkeleton';

export default function EntrepreneurRouteLoading() {
  const pathname = usePathname();
  return (
    <Suspense fallback={<WorkspaceRouteSkeletonFallback role="entrepreneur" pathname={pathname} />}>
      <WorkspaceRouteSkeleton role="entrepreneur" pathname={pathname} />
    </Suspense>
  );
}
