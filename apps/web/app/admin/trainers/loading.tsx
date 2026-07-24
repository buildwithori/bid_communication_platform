import { DirectoryPageSkeleton } from '@/components/loading/PageRouteSkeletons';

export default function LoadingTrainers() {
  return <DirectoryPageSkeleton title="Trainers" columns={8} filters={5} />;
}
