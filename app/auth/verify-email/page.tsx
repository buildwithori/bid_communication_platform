'use client';

import { CheckCircle2 } from 'lucide-react';
import { AuthBackToLoginLink } from '@/components/auth/AuthBackToLoginLink';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/shared/Button';

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
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-lg border border-line bg-surface px-4 py-4">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
        <div>
          <div className="text-sm font-semibold">Verification pending</div>
          <p className="mt-1 text-sm leading-6 text-ink-muted">
            Use the verification link sent to your email address to finish setting
            up your BID Hub access.
          </p>
        </div>
      </div>
      <Button type="button" size="lg" className="h-11 w-full">
        Resend verification email
      </Button>
    </div>
  );
}
