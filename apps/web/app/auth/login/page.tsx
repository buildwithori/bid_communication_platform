'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Lock, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { AuthDivider } from '@/components/auth/AuthDivider';
import { AuthGoogleButton } from '@/components/auth/AuthGoogleButton';
import { AuthModeTabs } from '@/components/auth/AuthModeTabs';
import { AuthShell } from '@/components/auth/AuthShell';
import { AuthTextField } from '@/components/auth/AuthTextField';
import { Button } from '@/components/shared/Button';
import { getGoogleAuthUrl, login, type AuthUser } from '@/lib/api/auth';
import { loginSchema, type LoginForm as LoginFormValues } from '@/lib/forms/schemas';
import { routes } from '@/lib/routes';

export default function AuthLoginPage() {
  return <AuthShell title="Sign in to BID Hub" className="max-w-[460px]"><AuthModeTabs active="login" /><LoginForm /></AuthShell>;
}

function LoginForm() {
  const router = useRouter();
  const form = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });
  const mutation = useMutation({
    mutationFn: login,
    onSuccess: ({ user }) => {
      if (!user.emailVerifiedAt || user.status === 'pending') {
        router.push(`${routes.auth.verifyEmail}?email=${encodeURIComponent(user.email)}`);
        return;
      }
      router.push(workspaceRoute(user));
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
      <AuthGoogleButton onClick={() => window.location.assign(getGoogleAuthUrl('login'))}>Continue with Google</AuthGoogleButton>
      <AuthDivider label="or sign in with email" />
      <AuthTextField icon={<Mail className="h-4 w-4" />} label="Email address" type="email" placeholder="you@example.com" error={form.formState.errors.email?.message} {...form.register('email')} />
      <AuthTextField icon={<Lock className="h-4 w-4" />} label="Password" type="password" placeholder="Enter password" error={form.formState.errors.password?.message} {...form.register('password')} />
      <div className="text-right"><Link href={routes.auth.forgotPassword} className="text-sm font-medium text-bid hover:text-bid-dark">Forgot password?</Link></div>
      <Button type="submit" size="lg" className="h-11 w-full" isLoading={mutation.isPending} loadingLabel="Signing in...">Sign in</Button>
      <p className="text-center text-xs leading-5 text-ink-faint">By continuing, you agree to use BID Hub for authorised programme activity.</p>
    </form>
  );
}

function workspaceRoute(user: AuthUser) {
  if (user.role === 'admin') return routes.admin.dashboard;
  if (user.role === 'trainer') return routes.trainer.dashboard;
  return routes.entrepreneur.dashboard;
}
