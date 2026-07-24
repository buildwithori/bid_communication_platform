import { DirectoryPageSkeleton } from '@/components/loading/PageRouteSkeletons';

export default function LoadingAdmins() {
  return <DirectoryPageSkeleton title="Admins" columns={6} filters={3} />;
}
