'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, CheckCircle2, KeyRound, Lock, Mail, ShieldCheck } from 'lucide-react';
import { BidLogo } from '@/components/shared/BidLogo';
import { Button } from '@/components/shared/Button';
import { AuthTextField } from '@/components/auth/AuthEntry';
import { routes } from '@/lib/routes';
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  type ForgotPasswordForm as ForgotPasswordFormValues,
  type ResetPasswordForm as ResetPasswordFormValues,
} from '@/lib/forms/schemas';
import { toast } from 'sonner';

type RecoveryMode = 'forgot-password' | 'reset-password' | 'verify-email';

const copy: Record<RecoveryMode, {
  icon: typeof Mail;
  title: string;
  description: string;
}> = {
  'forgot-password': {
    icon: Mail,
    title: 'Forgot password',
    description:
      'Enter the email linked to your entrepreneur account. We will send password reset instructions when backend auth is connected.',
  },
  'reset-password': {
    icon: KeyRound,
    title: 'Reset password',
    description:
      'Create a new password for your entrepreneur account. This screen is ready for token-based reset links later.',
  },
  'verify-email': {
    icon: ShieldCheck,
    title: 'Verify your email',
    description:
      'Entrepreneurs verify their email after signup before continuing into BID Hub.',
  },
};

export function AuthRecoveryPage({ mode }: { mode: RecoveryMode }) {
  const content = copy[mode];
  const Icon = content.icon;

  return (
    <main className="h-screen overflow-hidden bg-surface text-ink">
      <div className="grid h-full w-full grid-cols-1 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="hidden h-full min-h-0 flex-col justify-between bg-bid px-12 py-12 text-white lg:flex">
          <div className="flex items-center gap-3">
            <BidLogo size={52} variant="isotype" className="bg-white/20" />
            <div>
              <div className="text-lg font-semibold">BID Hub</div>
              <div className="font-mono text-xs text-white/65">Entrepreneur access</div>
            </div>
          </div>

          <div className="max-w-md">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-white/15">
              <Icon className="h-7 w-7" />
            </div>
            <h1 className="text-5xl font-semibold leading-tight">{content.title}</h1>
            <p className="mt-5 text-base leading-7 text-white/75">
              Keep your BID Hub account secure while staying connected to your
              programme, deliverables, and support team.
            </p>
          </div>

          <div className="rounded-lg bg-white/10 px-4 py-4 text-sm leading-6 text-white/75">
            Entrepreneur account recovery keeps access to programmes, deliverables,
            and support activity protected.
          </div>
        </section>

        <section className="flex h-full min-h-0 items-center justify-center overflow-y-auto px-5 py-8 sm:px-8 lg:bg-surface-panel">
          <div className="w-full max-w-[460px]">
            <div className="mb-6 flex flex-col items-center text-center lg:hidden">
              <BidLogo size={72} variant="full" />
              <div className="mt-5 flex h-12 w-12 items-center justify-center rounded-xl bg-bid-light text-bid">
                <Icon className="h-6 w-6" />
              </div>
            </div>

            <div className="rounded-bid border border-line bg-white p-6 shadow-sm sm:p-8">
              <h1 className="text-3xl font-semibold tracking-tight">{content.title}</h1>
              <p className="mt-2 text-sm leading-6 text-ink-muted">{content.description}</p>

              <div className="mt-6">
                {mode === 'forgot-password' && <ForgotPasswordForm />}
                {mode === 'reset-password' && <ResetPasswordForm />}
                {mode === 'verify-email' && <VerifyEmailPanel />}
              </div>
            </div>

            <Link
              href={routes.auth.login}
              className="mx-auto mt-5 flex w-fit items-center gap-2 text-sm font-medium text-ink-muted transition-colors hover:text-bid"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </Link>
          </div>
        </section>
      </div>
    </main>
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
        toast.success('Reset email validation passed. Backend auth will send the email here.');
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

function ResetPasswordForm() {
  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit(() => {
        toast.success('Password validation passed. Backend auth will update it here.');
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

function VerifyEmailPanel() {
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-bid-light px-4 py-3 text-sm leading-6 text-bid-dark">
        We have prepared this screen for the email verification link entrepreneurs
        will receive after signup.
      </div>
      <div className="flex items-start gap-3 rounded-lg border border-line bg-surface px-4 py-4">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
        <div>
          <div className="text-sm font-semibold">Verification pending</div>
          <p className="mt-1 text-sm leading-6 text-ink-muted">
            Once backend auth is connected, this page will confirm the token and
            move the entrepreneur to the next onboarding step.
          </p>
        </div>
      </div>
      <Button type="button" size="lg" className="h-11 w-full">
        Resend verification email
      </Button>
    </div>
  );
}
