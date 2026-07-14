'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail } from 'lucide-react';
import { AuthBackToLoginLink } from '@/components/auth/AuthBackToLoginLink';
import { AuthShell } from '@/components/auth/AuthShell';
import { AuthTextField } from '@/components/auth/AuthTextField';
import { Button } from '@/components/shared/Button';
import {
  forgotPasswordSchema,
  type ForgotPasswordForm as ForgotPasswordFormValues,
} from '@/lib/forms/schemas';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Forgot password"
      description="Enter your email address and we will send password reset instructions."
      className="max-w-[460px]"
      footer={<AuthBackToLoginLink />}
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}

function ForgotPasswordForm() {
  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit(() => {
        toast.success('Reset email details validated.');
      })}
    >
      <AuthTextField
        icon={<Mail className="h-4 w-4" />}
        label="Email address"
        type="email"
        placeholder="you@example.com"
        error={form.formState.errors.email?.message}
        {...form.register('email')}
      />
      <Button type="submit" size="lg" className="h-11 w-full">
        Send reset instructions
      </Button>
    </form>
  );
}
