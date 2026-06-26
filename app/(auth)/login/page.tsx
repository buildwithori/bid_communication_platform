'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import { BidLogo } from '@/components/shared/BidLogo';
import { GoogleIcon } from '@/components/shared/GoogleIcon';

const ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: 'Incorrect email or password. Please try again.',
  wrong_portal:
    'Your account is registered with the admin console. Please sign in at admin.bid.org.',
  suspended: 'Your account has been suspended. Contact support@bid.org for help.',
};

export default function EntrepreneurLoginPage() {
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
    // Production: await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: '/dashboard' } })
    await new Promise((r) => setTimeout(r, 800));
    setGooglePending(false);
    router.push('/dashboard');
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
        subdomain: 'app',
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(ERROR_MESSAGES[data.error] ?? 'Something went wrong. Please try again.');
      setPending(false);
      return;
    }

    if (data.status === 'pending') {
      router.push('/pending');
    } else {
      router.push('/dashboard');
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-[400px]">
        {/* Brand header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <BidLogo size={68} variant="full" className="mb-4" />
          <h1 className="text-[22px] font-semibold tracking-tight text-ink">
            Welcome to BID Hub
          </h1>
          <p className="mt-1 text-[13px] text-ink-muted">
            Sign in to your entrepreneur account
          </p>
        </div>

        {/* Card */}
        <div className="rounded-bid border border-line bg-surface-panel p-8 shadow-sm">
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
                placeholder="you@example.com"
                className="block w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-[13px] text-ink placeholder:text-ink-faint focus:border-bid focus:outline-none focus:ring-2 focus:ring-bid/20 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-[12px] font-medium text-ink">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-[11px] text-bid hover:text-bid-dark transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
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

        {/* Register link */}
        <p className="mt-4 text-center text-[12px] text-ink-muted">
          New to BID?{' '}
          <Link
            href="/register"
            className="font-medium text-bid hover:text-bid-dark transition-colors"
          >
            Register your business →
          </Link>
        </p>

        {/* Support */}
        <p className="mt-6 text-center text-[11px] text-ink-faint">
          Having trouble?{' '}
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
