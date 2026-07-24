import { DirectoryPageSkeleton } from '@/components/loading/PageRouteSkeletons';

export default function LoadingSectors() {
  return <DirectoryPageSkeleton title="Sectors" metrics={false} columns={4} filters={2} />;
}
