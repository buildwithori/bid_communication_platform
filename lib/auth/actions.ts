'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { authenticate, encodeSession, SESSION_COOKIE } from './config';

export async function loginAction(formData: FormData) {
  const email = (formData.get('email') as string | null) ?? '';
  const password = (formData.get('password') as string | null) ?? '';
  const subdomain = (formData.get('subdomain') as string | null) ?? 'app';

  const session = authenticate(email.trim(), password);

  if (!session) {
    redirect(`/login?error=invalid_credentials`);
  }

  // Role-domain mismatch: an entrepreneur tried to log in via admin and vice versa.
  if (subdomain === 'admin' && session.role === 'entrepreneur') {
    redirect(`/login?error=wrong_portal`);
  }
  if (subdomain === 'app' && (session.role === 'admin' || session.role === 'trainer')) {
    redirect(`/login?error=wrong_portal`);
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, encodeSession(session), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  if (session.role === 'entrepreneur') {
    if (session.status === 'pending') {
      redirect('/pending');
    }
    redirect('/dashboard');
  }

  redirect('/admin/dashboard');
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect('/login');
}

export async function registerAction(formData: FormData) {
  // In production this would insert a row in Supabase with status = 'pending'.
  // For the mock, we just redirect to the pending page directly after "registering".
  const email = formData.get('email') as string;
  const businessName = formData.get('businessName') as string;

  if (!email || !businessName) {
    redirect('/register?error=missing_fields');
  }

  // Simulate account creation — set a pending session cookie.
  const cookieStore = await cookies();
  const pendingSession = {
    userId: `usr_new_${Date.now()}`,
    email,
    name: formData.get('representativeName') as string,
    role: 'entrepreneur' as const,
    status: 'pending' as const,
    businessId: `biz_new_${Date.now()}`,
  };
  cookieStore.set(SESSION_COOKIE, encodeSession(pendingSession), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect('/pending');
}
