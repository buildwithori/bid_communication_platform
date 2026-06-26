'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import { BidLogo } from '@/components/shared/BidLogo';
import { GoogleIcon } from '@/components/shared/GoogleIcon';

const ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: 'Incorrect email or password.',
  wrong_portal:
    'Your account belongs to the entrepreneur platform. Please sign in at app.bid.org.',
  suspended: 'Your account has been suspended. Contact your system administrator.',
};

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorKey = searchParams.get('error');
  const [error, setError] = React.useState<string | null>(
    errorKey ? ERROR_MESSAGES[errorKey] ?? null : null,
  );
  const [pending, setPending] = React.useState(false);
  const [googlePending, setGooglePending] = React.useState(false);

  async function handleGoogleSignIn() {
    setGooglePending(true);
    // Production: await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: '/admin/dashboard' } })
    await new Promise((r) => setTimeout(r, 800));
    setGooglePending(false);
    router.push('/admin/dashboard');
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: fd.get('email'),
        password: fd.get('password'),
        subdomain: 'admin',
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(ERROR_MESSAGES[data.error] ?? 'Something went wrong. Please try again.');
      setPending(false);
      return;
    }

    router.push('/admin/dashboard');
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel — brand / hero */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-bid p-10 lg:flex lg:w-[45%]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-white/5" />
          <div className="absolute -bottom-24 -left-12 h-80 w-80 rounded-full bg-white/5" />
          <div className="absolute bottom-32 right-8 h-40 w-40 rounded-full bg-white/5" />
        </div>

        <div className="relative flex items-center gap-3">
          <BidLogo size={48} variant="isotype" className="bg-white/20" />
          <div>
            <div className="text-[15px] font-semibold text-white">BID Hub</div>
            <div className="font-mono text-[10px] text-white/60">Management Console</div>
          </div>
        </div>

        <div className="relative">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-[26px] font-semibold leading-tight text-white">
            Programme management <br />
            for your entire cohort.
          </h2>
          <p className="mt-3 text-[13px] leading-relaxed text-white/70">
            Manage entrepreneurs and trainers, build structured training programmes, track
            deliverables, and generate impact reports — all in one place.
          </p>
        </div>

        <div className="relative text-[11px] text-white/40">
          BID Hub · Confidential staff access only
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col items-center justify-center bg-surface px-6 py-12">
        <div className="mb-8 flex items-center gap-3 lg:hidden">
          <BidLogo size={48} variant="isotype" />
          <div>
            <div className="text-[15px] font-semibold text-ink">BID Hub</div>
            <div className="font-mono text-[10px] text-ink-faint">Management Console</div>
          </div>
        </div>

        <div className="w-full max-w-[380px]">
          <div className="mb-7">
            <h1 className="text-[20px] font-semibold tracking-tight text-ink">
              BID Management Console
            </h1>
            <p className="mt-1 text-[13px] text-ink-muted">
              Sign in with your BID team credentials
            </p>
          </div>

          <div className="rounded-bid border border-line bg-surface-panel p-7 shadow-sm">
            {error && (
              <div className="mb-5 flex items-start gap-2.5 rounded-lg bg-danger-light px-3.5 py-3 text-[12px] text-danger">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {error}
              </div>
            )}

            {/* Google SSO */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googlePending || pending}
              className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-line bg-surface px-4 py-2.5 text-[13px] font-medium text-ink transition-all hover:bg-surface-hover hover:border-ink-muted active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {googlePending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <GoogleIcon className="h-4 w-4" />
              )}
              Continue with Google
            </button>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-line" />
              <span className="text-[11px] text-ink-faint">or sign in with email</span>
              <div className="h-px flex-1 bg-line" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-[12px] font-medium text-ink">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@bid.org"
                  className="block w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-[13px] text-ink placeholder:text-ink-faint focus:border-bid focus:outline-none focus:ring-2 focus:ring-bid/20 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-[12px] font-medium text-ink">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  className="block w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-[13px] text-ink placeholder:text-ink-faint focus:border-bid focus:outline-none focus:ring-2 focus:ring-bid/20 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={pending || googlePending}
                className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-bid px-4 py-2.5 text-[13px] font-semibold text-white transition-all hover:bg-bid-dark active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Sign in
              </button>
            </form>
          </div>

          <p className="mt-8 text-center text-[11px] text-ink-faint">
            Access issues?{' '}
            <a
              href="mailto:support@bid.org"
              className="underline underline-offset-2 hover:text-ink-muted transition-colors"
            >
              Contact your system administrator
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
