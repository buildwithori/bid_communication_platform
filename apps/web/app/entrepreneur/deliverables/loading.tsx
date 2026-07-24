import { ManagementQueuePageSkeleton } from '@/components/loading/PageRouteSkeletons';

export default function LoadingDeliverables() {
  return <ManagementQueuePageSkeleton title="Deliverables" columns={6} metrics={3} />;
}
