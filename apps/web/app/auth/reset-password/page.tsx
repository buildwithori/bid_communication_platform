'use client';

import { Suspense } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Lock } from 'lucide-react';
import { toast } from 'sonner';
import { AuthBackToLoginLink } from '@/components/auth/AuthBackToLoginLink';
import { AuthShell } from '@/components/auth/AuthShell';
import { AuthTextField } from '@/components/auth/AuthTextField';
import { Button } from '@/components/shared/Button';
import { Skeleton } from '@/components/shared/Card';
import { useResetPasswordMutation } from '@/lib/api/auth';
import { resetPasswordSchema, type ResetPasswordForm as ResetPasswordFormValues } from '@/lib/forms/schemas';
import { routes } from '@/lib/routes';
import { offerBrowserCredentialSave } from '@/lib/browser-credentials';

export default function ResetPasswordPage() {
  return <AuthShell title="Reset password" description="Create a new password to keep your BID Hub account secure." footer={<AuthBackToLoginLink />}><Suspense fallback={<div aria-label="Loading password reset" aria-busy="true" className="space-y-4"><Skeleton className="h-11 w-full" /><Skeleton className="h-11 w-full" /><Skeleton className="h-11 w-full" /></div>}><ResetPasswordForm /></Suspense></AuthShell>;
}

function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get('token');
  const form = useForm<ResetPasswordFormValues>({ resolver: zodResolver(resetPasswordSchema), defaultValues: { password: '', confirmPassword: '' } });
  const mutation = useResetPasswordMutation({
    onSuccess: async ({ email }) => { await offerBrowserCredentialSave(email, form.getValues('password')); toast.success('Password updated. Sign in with your new password.'); router.replace(routes.auth.login); },
    onError: (error: Error) => toast.error(error.message),
  });
  return (
    <form className="space-y-4" autoComplete="on" onSubmit={form.handleSubmit(({ password }) => token && mutation.mutate({ token, password }))}>
      {!token ? <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">This reset link is incomplete. Request a new password reset email.</div> : null}
      <AuthTextField icon={<Lock className="h-4 w-4" />} label="New password" type="password" autoComplete="new-password" placeholder="Enter new password" error={form.formState.errors.password?.message} {...form.register('password')} />
      <AuthTextField icon={<Lock className="h-4 w-4" />} label="Confirm password" type="password" autoComplete="new-password" placeholder="Confirm new password" error={form.formState.errors.confirmPassword?.message} {...form.register('confirmPassword')} />
      <Button type="submit" size="lg" className="h-11 w-full" disabled={!token} isLoading={mutation.isPending} loadingLabel="Updating password...">Update password</Button>
    </form>
  );
}
