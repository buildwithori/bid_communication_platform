'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { BidLogo } from '@/components/shared/BidLogo';
import { Clock, Loader2 } from 'lucide-react';

export default function PendingPage() {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function handleSignOut() {
    setPending(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-[420px] text-center">
        <div className="mb-6 flex flex-col items-center">
          <BidLogo size={52} className="mb-4" />
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-bid-light">
            <Clock className="h-6 w-6 text-bid" />
          </div>
        </div>

        <h1 className="text-[22px] font-semibold tracking-tight text-ink">
          Your account is under review
        </h1>
        <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">
          The BID team will review your registration and get in touch within{' '}
          <strong className="text-ink">2–3 business days</strong>. We may contact you at the email
          address you provided.
        </p>

        <div className="mt-8 rounded-bid border border-line bg-surface-panel p-6 shadow-sm">
          <p className="text-[12px] text-ink-muted">
            Once your account is approved, you will receive a confirmation email and can sign in to
            access the BID Hub platform.
          </p>

          <button
            onClick={handleSignOut}
            disabled={pending}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg border border-line bg-surface px-4 py-2.5 text-[13px] font-medium text-ink-muted transition-all hover:border-bid hover:text-bid active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Sign out
          </button>
        </div>

        <p className="mt-8 text-[11px] text-ink-faint">
          Questions?{' '}
          <a
            href="mailto:support@bid.org"
            className="underline underline-offset-2 hover:text-ink-muted transition-colors"
          >
            Contact support@bid.org
          </a>
        </p>
      </div>
    </div>
  );
}
