'use client';

import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import {
  WorkspaceRouteSkeleton,
  WorkspaceRouteSkeletonFallback,
} from '@/components/loading/WorkspaceRouteSkeleton';

export default function TrainerRouteLoading() {
  const pathname = usePathname();
  return (
    <Suspense fallback={<WorkspaceRouteSkeletonFallback role="trainer" pathname={pathname} />}>
      <WorkspaceRouteSkeleton role="trainer" pathname={pathname} />
    </Suspense>
  );
}
