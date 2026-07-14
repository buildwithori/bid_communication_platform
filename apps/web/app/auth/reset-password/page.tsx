'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Lock } from 'lucide-react';
import { AuthBackToLoginLink } from '@/components/auth/AuthBackToLoginLink';
import { AuthShell } from '@/components/auth/AuthShell';
import { AuthTextField } from '@/components/auth/AuthTextField';
import { Button } from '@/components/shared/Button';
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
  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit(() => {
        toast.success('Password details validated.');
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
      <Button type="submit" size="lg" className="h-11 w-full">
        Update password
      </Button>
    </form>
  );
}
