import { redirect } from 'next/navigation';
import { routes } from '@/lib/routes';

export default function AdminRootPage() {
  redirect(routes.admin.dashboard);
}
