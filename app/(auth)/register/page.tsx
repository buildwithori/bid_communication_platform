'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, AlertCircle, ChevronDown } from 'lucide-react';
import { BidLogo } from '@/components/shared/BidLogo';

const COUNTRIES = ['Ghana', 'Nigeria', 'Kenya', 'South Africa', 'Rwanda', 'Uganda'];

export default function EntrepreneurRegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = React.useState<string | null>(
    searchParams.get('error') === 'missing_fields' ? 'Please fill in all required fields.' : null,
  );
  const [pending, setPending] = React.useState(false);
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [passwordMismatch, setPasswordMismatch] = React.useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setPasswordMismatch(true);
      return;
    }
    setPasswordMismatch(false);
    setPending(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: fd.get('email'),
        businessName: fd.get('businessName'),
        representativeName: fd.get('representativeName'),
        phone: fd.get('phone'),
        country: fd.get('country'),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error === 'missing_fields' ? 'Please fill in all required fields.' : 'Something went wrong. Please try again.');
      setPending(false);
      return;
    }

    router.push('/pending');
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-[460px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <BidLogo size={68} variant="full" className="mb-4" />
          <h1 className="text-[22px] font-semibold tracking-tight text-ink">
            Register your business
          </h1>
          <p className="mt-1 text-[13px] text-ink-muted">
            Create your BID Hub entrepreneur account
          </p>
        </div>

        <div className="rounded-bid border border-line bg-surface-panel p-8 shadow-sm">
          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-lg bg-danger-light px-3.5 py-3 text-[12px] text-danger">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="businessName" className="block text-[12px] font-medium text-ink">
                Business name <span className="text-bid">*</span>
              </label>
              <input
                id="businessName"
                name="businessName"
                type="text"
                required
                placeholder="Acme Fintech Ltd"
                className="block w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-[13px] text-ink placeholder:text-ink-faint focus:border-bid focus:outline-none focus:ring-2 focus:ring-bid/20 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="representativeName" className="block text-[12px] font-medium text-ink">
                Your full name <span className="text-bid">*</span>
              </label>
              <input
                id="representativeName"
                name="representativeName"
                type="text"
                required
                placeholder="Jane Doe"
                className="block w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-[13px] text-ink placeholder:text-ink-faint focus:border-bid focus:outline-none focus:ring-2 focus:ring-bid/20 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-[12px] font-medium text-ink">
                  Email address <span className="text-bid">*</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="jane@example.com"
                  className="block w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-[13px] text-ink placeholder:text-ink-faint focus:border-bid focus:outline-none focus:ring-2 focus:ring-bid/20 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="phone" className="block text-[12px] font-medium text-ink">
                  Phone number <span className="text-bid">*</span>
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  placeholder="+233 20 000 0000"
                  className="block w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-[13px] text-ink placeholder:text-ink-faint focus:border-bid focus:outline-none focus:ring-2 focus:ring-bid/20 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="country" className="block text-[12px] font-medium text-ink">
                Country <span className="text-bid">*</span>
              </label>
              <div className="relative">
                <select
                  id="country"
                  name="country"
                  required
                  defaultValue=""
                  className="block w-full appearance-none rounded-lg border border-line bg-surface px-3.5 py-2.5 text-[13px] text-ink focus:border-bid focus:outline-none focus:ring-2 focus:ring-bid/20 transition-all"
                >
                  <option value="" disabled>
                    Select your country
                  </option>
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-[12px] font-medium text-ink">
                  Password <span className="text-bid">*</span>
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-[13px] text-ink placeholder:text-ink-faint focus:border-bid focus:outline-none focus:ring-2 focus:ring-bid/20 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="confirmPassword" className="block text-[12px] font-medium text-ink">
                  Confirm password <span className="text-bid">*</span>
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`block w-full rounded-lg border bg-surface px-3.5 py-2.5 text-[13px] text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 transition-all ${
                    passwordMismatch
                      ? 'border-danger focus:border-danger focus:ring-danger/20'
                      : 'border-line focus:border-bid focus:ring-bid/20'
                  }`}
                />
                {passwordMismatch && (
                  <p className="text-[11px] text-danger">Passwords do not match.</p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={pending}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-bid px-4 py-2.5 text-[13px] font-semibold text-white transition-all hover:bg-bid-dark active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Create account
            </button>
          </form>

          <p className="mt-4 rounded-lg bg-bid-light px-3.5 py-3 text-[11px] leading-relaxed text-bid-dark">
            Your account will be reviewed by the BID team before you can access the platform. This
            typically takes 2–3 business days.
          </p>
        </div>

        <p className="mt-4 text-center text-[12px] text-ink-muted">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-medium text-bid hover:text-bid-dark transition-colors"
          >
            Sign in
          </Link>
        </p>

        <p className="mt-8 text-center text-[11px] text-ink-faint">
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
