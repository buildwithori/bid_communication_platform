import { DirectoryPageSkeleton } from '@/components/loading/PageRouteSkeletons';

export default function LoadingProgrammes() {
  return <DirectoryPageSkeleton title="Programmes" columns={8} filters={3} />;
}
