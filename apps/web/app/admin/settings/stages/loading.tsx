import { DirectoryPageSkeleton } from '@/components/loading/PageRouteSkeletons';

export default function LoadingBusinessStages() {
  return <DirectoryPageSkeleton title="Business stages" metrics={false} columns={5} filters={2} />;
}
