'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Lock, Mail } from 'lucide-react';
import { AuthDivider } from '@/components/auth/AuthDivider';
import { AuthGoogleButton } from '@/components/auth/AuthGoogleButton';
import { AuthModeTabs } from '@/components/auth/AuthModeTabs';
import { AuthShell } from '@/components/auth/AuthShell';
import { AuthTextField } from '@/components/auth/AuthTextField';
import { Button } from '@/components/shared/Button';
import { routes } from '@/lib/routes';
import {
  loginSchema,
  type LoginForm as LoginFormValues,
} from '@/lib/forms/schemas';
import { toast } from 'sonner';

export default function AuthLoginPage() {
  return (
    <AuthShell
      title="Sign in to BID Hub"
      className="max-w-[460px]"
    >
      <AuthModeTabs active="login" />
      <LoginForm />
    </AuthShell>
  );
}

function LoginForm() {
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit(() => {
        toast.success('Login details validated.');
      })}
    >
      <AuthGoogleButton>
        Continue with Google
      </AuthGoogleButton>

      <AuthDivider label="or sign in with email" />

      <AuthTextField
        icon={<Mail className="h-4 w-4" />}
        label="Email address"
        type="email"
        placeholder="you@example.com"
        error={form.formState.errors.email?.message}
        {...form.register('email')}
      />
      <AuthTextField
        icon={<Lock className="h-4 w-4" />}
        label="Password"
        type="password"
        placeholder="Enter password"
        error={form.formState.errors.password?.message}
        {...form.register('password')}
      />

      <div className="text-right">
        <Link href={routes.auth.forgotPassword} className="text-sm font-medium text-bid hover:text-bid-dark">
          Forgot password?
        </Link>
      </div>

      <Button type="submit" size="lg" className="h-11 w-full">
        Sign in
      </Button>

      <p className="text-center text-xs leading-5 text-ink-faint">
        By continuing, you agree to use BID Hub for authorised programme activity.
      </p>
    </form>
  );
}
