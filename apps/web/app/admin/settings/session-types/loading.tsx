import { DirectoryPageSkeleton } from '@/components/loading/PageRouteSkeletons';

export default function LoadingSessionTypes() {
  return <DirectoryPageSkeleton title="Session types" metrics={false} columns={5} filters={2} />;
}
