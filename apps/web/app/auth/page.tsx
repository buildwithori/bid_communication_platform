import { redirect } from 'next/navigation';
import { routes } from '@/lib/routes';

export default function AuthRootPage() {
  redirect(routes.auth.login);
}
