'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, CircleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { AuthBackToLoginLink } from '@/components/auth/AuthBackToLoginLink';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/shared/Button';
import { Skeleton } from '@/components/shared/Card';
import { useResendVerificationMutation, useVerifyEmailMutation } from '@/lib/api/auth';
import { routes } from '@/lib/routes';

export default function VerifyEmailPage() {
  return <AuthShell title="Verify your email" description="Check your email for the verification link to continue." className="max-w-[460px]" footer={<AuthBackToLoginLink />}><React.Suspense fallback={<div aria-label="Loading email verification" aria-busy="true" className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-11 w-full" /></div>}><VerifyEmailPanel /></React.Suspense></AuthShell>;
}

function VerifyEmailPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  const attemptedToken = React.useRef<string | null>(null);
  const verifyMutation = useVerifyEmailMutation({
    onSuccess: () => { toast.success('Email verified. You can now sign in.'); router.replace(routes.auth.login); },
  });
  const resendMutation = useResendVerificationMutation({
    onSuccess: () => toast.success('If verification is still required, a new email is on the way.'),
    onError: (error: Error) => toast.error(error.message),
  });

  React.useEffect(() => {
    if (token && attemptedToken.current !== token) {
      attemptedToken.current = token;
      verifyMutation.mutate({ token });
    }
  }, [token, verifyMutation]);

  if (token && verifyMutation.isPending) {
    return <div aria-label="Verifying email" aria-busy="true" className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-11 w-full" /></div>;
  }

  const failed = verifyMutation.isError;
  return (
    <div className="space-y-4">
      <div className={`flex items-start gap-3 rounded-lg border px-4 py-4 ${failed ? 'border-danger/30 bg-danger/5' : 'border-line bg-surface'}`}>
        {failed ? <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-danger" /> : <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />}
        <div>
          <div className="text-sm font-semibold">{failed ? 'Verification link could not be used' : 'Verification pending'}</div>
          <p className="mt-1 text-sm leading-6 text-ink-muted">{failed ? (verifyMutation.error as Error).message : 'Use the verification link sent to your email address to finish setting up your BID Hub access.'}</p>
        </div>
      </div>
      <Button type="button" size="lg" className="h-11 w-full" disabled={!email} isLoading={resendMutation.isPending} loadingLabel="Sending email..." onClick={() => email && resendMutation.mutate({ email })}>Resend verification email</Button>
      {!email ? <p className="text-center text-xs text-ink-muted">Return to sign in and enter your account details to request another link.</p> : null}
    </div>
  );
}
