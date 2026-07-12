'use client';

import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { Lock } from 'lucide-react';
import { AuthBackToLoginLink } from '@/components/auth/AuthBackToLoginLink';
import { AuthShell } from '@/components/auth/AuthShell';
import { AuthTextField } from '@/components/auth/AuthTextField';
import { Button } from '@/components/shared/Button';
import { resetPassword } from '@/lib/api/auth';
import {
  resetPasswordSchema,
  type ResetPasswordForm as ResetPasswordFormValues,
} from '@/lib/forms/schemas';
import { toast } from 'sonner';

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Reset password"
      description="Create a new password to keep your BID Hub account secure."
      className="max-w-[460px]"
      footer={<AuthBackToLoginLink />}
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });
  const mutation = useMutation({
    mutationFn: resetPassword,
    onSuccess: () => {
      toast.success('Password updated. You can now sign in.');
      router.push('/auth/login');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Unable to update password.');
    },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit((values) => {
        if (!token) {
          toast.error('Reset token is missing.');
          return;
        }

        mutation.mutate({ token, password: values.password });
      })}
    >
      <AuthTextField
        icon={<Lock className="h-4 w-4" />}
        label="New password"
        type="password"
        placeholder="Enter new password"
        error={form.formState.errors.password?.message}
        {...form.register('password')}
      />
      <AuthTextField
        icon={<Lock className="h-4 w-4" />}
        label="Confirm password"
        type="password"
        placeholder="Confirm new password"
        error={form.formState.errors.confirmPassword?.message}
        {...form.register('confirmPassword')}
      />
      <Button type="submit" size="lg" className="h-11 w-full" disabled={mutation.isPending}>
        {mutation.isPending ? 'Updating password...' : 'Update password'}
      </Button>
    </form>
  );
}
