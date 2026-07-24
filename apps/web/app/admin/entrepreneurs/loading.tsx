import { DirectoryPageSkeleton } from '@/components/loading/PageRouteSkeletons';

export default function LoadingEntrepreneurs() {
  return <DirectoryPageSkeleton title="Entrepreneurs" columns={9} filters={5} />;
}
