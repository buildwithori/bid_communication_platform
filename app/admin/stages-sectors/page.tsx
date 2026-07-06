import { redirect } from 'next/navigation';
import { routes } from '@/lib/routes';

export default function AdminStagesSectorsRedirectPage() {
  redirect(routes.admin.settingsStages);
}
