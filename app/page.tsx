import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE, decodeSession } from '@/lib/auth/config';

/**
 * Root page. The middleware handles most redirects, but this server component
 * ensures any request that slips through is handled gracefully.
 *
 * On the app subdomain: unauthenticated → /login, authenticated → /dashboard
 * On the admin subdomain: unauthenticated → /admin/login, authenticated → /admin/dashboard
 */
export default async function HomePage() {
  const headersList = await headers();
  const host = headersList.get('host') ?? '';
  const isAdmin =
    host.startsWith('admin.') ||
    host.includes(':3001') ||
    headersList.get('x-bid-subdomain') === 'admin';

  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  const session = raw ? decodeSession(raw) : null;

  if (isAdmin) {
    if (!session || session.role === 'entrepreneur') {
      redirect('/admin/login');
    }
    redirect('/admin/dashboard');
  }

  if (!session) {
    redirect('/login');
  }

  if (session.role === 'admin' || session.role === 'trainer') {
    redirect('/admin/dashboard');
  }

  if (session.status === 'pending') {
    redirect('/pending');
  }

  redirect('/dashboard');
}
