import { redirect } from 'next/navigation';
import { routes } from '@/lib/routes';

export default function TrainerRootPage() {
  redirect(routes.trainer.dashboard);
}
