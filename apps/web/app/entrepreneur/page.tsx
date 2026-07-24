import { redirect } from 'next/navigation';
import { routes } from '@/lib/routes';

export default function EntrepreneurRootPage() {
  redirect(routes.entrepreneur.dashboard);
}
