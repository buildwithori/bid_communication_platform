'use client';

import * as React from 'react';
import { useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { AuthBackToLoginLink } from '@/components/auth/AuthBackToLoginLink';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/shared/Button';
import { verifyEmail } from '@/lib/api/auth';
import { toast } from 'sonner';

export default function VerifyEmailPage() {
  return (
    <AuthShell
      title="Verify your email"
      description="Check your email for the verification link to continue."
      className="max-w-[460px]"
      footer={<AuthBackToLoginLink />}
    >
      <VerifyEmailPanel />
    </AuthShell>
  );
}

function VerifyEmailPanel() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const mutation = useMutation({
    mutationFn: verifyEmail,
    onSuccess: () => {
      toast.success('Email verified. You can now sign in.');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Unable to verify email.');
    },
  });

  React.useEffect(() => {
    if (token && mutation.isIdle) {
      mutation.mutate({ token });
    }
  }, [mutation.isIdle, mutation.mutate, token]);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-lg border border-line bg-surface px-4 py-4">
        {mutation.isPending ? (
          <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-bid" />
        ) : (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
        )}
        <div>
          <div className="text-sm font-semibold">
            {mutation.isSuccess ? 'Email verified' : 'Verification pending'}
          </div>
          <p className="mt-1 text-sm leading-6 text-ink-muted">
            {mutation.isSuccess
              ? 'Your account is ready. Return to login to continue.'
              : 'Use the verification link sent to your email address to finish setting up your BID Hub access.'}
          </p>
        </div>
      </div>
      <Button
        type="button"
        size="lg"
        className="h-11 w-full"
        disabled={!token || mutation.isPending}
        onClick={() => token && mutation.mutate({ token })}
      >
        {mutation.isPending ? 'Verifying...' : 'Verify email'}
      </Button>
    </div>
  );
}
