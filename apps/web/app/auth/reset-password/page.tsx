'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Lock } from 'lucide-react';
import { toast } from 'sonner';
import { AuthBackToLoginLink } from '@/components/auth/AuthBackToLoginLink';
import { AuthShell } from '@/components/auth/AuthShell';
import { AuthTextField } from '@/components/auth/AuthTextField';
import { Button } from '@/components/shared/Button';
import { resetPassword } from '@/lib/api/auth';
import { resetPasswordSchema, type ResetPasswordForm as ResetPasswordFormValues } from '@/lib/forms/schemas';
import { routes } from '@/lib/routes';

export default function ResetPasswordPage() {
  return <AuthShell title="Reset password" description="Create a new password to keep your BID Hub account secure." className="max-w-[460px]" footer={<AuthBackToLoginLink />}><ResetPasswordForm /></AuthShell>;
}

function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get('token');
  const form = useForm<ResetPasswordFormValues>({ resolver: zodResolver(resetPasswordSchema), defaultValues: { password: '', confirmPassword: '' } });
  const mutation = useMutation({
    mutationFn: ({ password }: ResetPasswordFormValues) => {
      if (!token) throw new Error('This reset link is missing its token. Request a new link.');
      return resetPassword({ token, password });
    },
    onSuccess: () => { toast.success('Password updated. Sign in with your new password.'); router.replace(routes.auth.login); },
    onError: (error: Error) => toast.error(error.message),
  });
  return (
    <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
      {!token ? <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">This reset link is incomplete. Request a new password reset email.</div> : null}
      <AuthTextField icon={<Lock className="h-4 w-4" />} label="New password" type="password" placeholder="Enter new password" error={form.formState.errors.password?.message} {...form.register('password')} />
      <AuthTextField icon={<Lock className="h-4 w-4" />} label="Confirm password" type="password" placeholder="Confirm new password" error={form.formState.errors.confirmPassword?.message} {...form.register('confirmPassword')} />
      <Button type="submit" size="lg" className="h-11 w-full" disabled={!token} isLoading={mutation.isPending} loadingLabel="Updating password...">Update password</Button>
    </form>
  );
}
