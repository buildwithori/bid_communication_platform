import { DirectoryPageSkeleton } from '@/components/loading/PageRouteSkeletons';

export default function LoadingGoalTypes() {
  return <DirectoryPageSkeleton title="Goal types" metrics={false} columns={6} filters={2} />;
}
