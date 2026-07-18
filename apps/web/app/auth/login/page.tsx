'use client';

import * as React from 'react';
import type { Route } from 'next';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { Skeleton } from '@/components/shared/Card';
import { getGoogleAuthUrl, useLoginMutation, type AuthUser } from '@/lib/api/auth';
import { workspaceRouteForRole } from '@/lib/auth-navigation';
import { loginSchema, type LoginForm as LoginFormValues } from '@/lib/forms/schemas';
import { routes } from '@/lib/routes';

const oauthErrors: Record<string, string> = {
  account_not_found: 'No BID Hub account exists for that Google email. Create an entrepreneur account first.',
  access_denied: 'That Google account cannot access entrepreneur sign-in.',
  unavailable: 'Google sign-in is not configured right now. Use email and password instead.',
  failed: 'Google sign-in could not be completed. Please try again.',
};

export default function AuthLoginPage() {
  return (
    <AuthShell title="Sign in to BID Hub">
      <AuthModeTabs active="login" />
      <React.Suspense fallback={<LoginFormSkeleton />}>
        <LoginForm />
      </React.Suspense>
    </AuthShell>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next');
  const oauthError = searchParams.get('oauthError');
  const form = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });
  const mutation = useLoginMutation({
    onSuccess: ({ user }) => {
      if (!user.emailVerifiedAt || user.status === 'pending') {
        router.replace(`${routes.auth.verifyEmail}?email=${encodeURIComponent(user.email)}`);
        return;
      }
      router.replace(safePostLoginRoute(user, nextPath));
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
      {oauthError ? <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{oauthErrors[oauthError] ?? oauthErrors.failed}</div> : null}
      <AuthGoogleButton onClick={() => window.location.assign(getGoogleAuthUrl('login'))}>Continue with Google</AuthGoogleButton>
      <AuthDivider label="or sign in with email" />
      <AuthTextField icon={<Mail className="h-4 w-4" />} label="Email address" type="email" placeholder="you@example.com" error={form.formState.errors.email?.message} {...form.register('email')} />
      <AuthTextField icon={<Lock className="h-4 w-4" />} label="Password" type="password" placeholder="Enter password" error={form.formState.errors.password?.message} {...form.register('password')} />
      <div className="text-right"><Link href={routes.auth.forgotPassword} className="text-sm font-medium text-primary hover:text-primary/80">Forgot password?</Link></div>
      <Button type="submit" size="lg" className="h-11 w-full" isLoading={mutation.isPending} loadingLabel="Signing in...">Sign in</Button>
      <p className="text-center text-xs leading-5 text-muted-foreground">By continuing, you agree to use BID Hub for authorised programme activity.</p>
    </form>
  );
}

function LoginFormSkeleton() {
  return <div aria-label="Loading sign in" aria-busy="true" className="space-y-4"><Skeleton className="h-11 w-full" /><Skeleton className="h-5 w-full" /><Skeleton className="h-11 w-full" /><Skeleton className="h-11 w-full" /><Skeleton className="h-11 w-full" /></div>;
}

function safePostLoginRoute(user: AuthUser, nextPath: string | null): Route {
  const fallback = workspaceRouteForRole(user.role);
  if (!nextPath || !nextPath.startsWith(`${workspacePrefix(user.role)}/`)) return fallback;
  return nextPath as Route;
}

function workspacePrefix(role: AuthUser['role']) {
  if (role === 'admin') return '/admin';
  if (role === 'trainer') return '/trainer';
  return '/entrepreneur';
}
