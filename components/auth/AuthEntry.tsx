'use client';

import * as React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Briefcase, CheckCircle2, Lock, Mail, ShieldCheck, UserPlus } from 'lucide-react';
import { BidLogo } from '@/components/shared/BidLogo';
import { Button } from '@/components/shared/Button';
import { GoogleIcon } from '@/components/shared/GoogleIcon';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import {
  loginSchema,
  signupSchema,
  type LoginForm as LoginFormValues,
  type SignupForm as SignupFormValues,
} from '@/lib/forms/schemas';
import { toast } from 'sonner';

type AuthTab = 'login' | 'signup';

export function AuthEntry() {
  const [tab, setTab] = React.useState<AuthTab>('login');

  return (
    <main className="h-screen overflow-hidden bg-surface text-ink">
      <div className="grid h-full w-full grid-cols-1 lg:grid-cols-[1fr_1fr]">
        <AuthBrandPanel />

        <section className="flex h-full min-h-0 items-center justify-center overflow-y-auto px-5 py-8 sm:px-8 lg:bg-surface-panel">
          <div className="w-full max-w-[480px]">
            <MobileBrand />

            <div className="rounded-bid border border-line bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-bid-light px-3 py-1 text-xs font-semibold text-bid-dark">
                <ShieldCheck className="h-3.5 w-3.5" />
                Secure BID Hub access
              </div>
              <AuthHeading activeTab={tab} />
              <AuthTabs value={tab} onChange={setTab} />

              {tab === 'login' ? <LoginForm /> : <SignupForm />}
            </div>

          </div>
        </section>
      </div>
    </main>
  );
}

function AuthBrandPanel() {
  return (
    <section className="hidden h-full min-h-0 flex-col justify-between bg-bid px-12 py-12 text-white lg:flex">
      <div className="flex items-center gap-3">
        <BidLogo size={52} variant="isotype" className="bg-white/20" />
        <div>
          <div className="text-lg font-semibold">BID Hub</div>
          <div className="font-mono text-xs text-white/65">Entrepreneur support platform</div>
        </div>
      </div>

      <div className="max-w-lg">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-white/15">
          <Briefcase className="h-7 w-7" />
        </div>
        <h1 className="text-5xl font-semibold leading-tight">
          Build stronger ventures with structured BID support.
        </h1>
        <p className="mt-5 text-base leading-7 text-white/75">
          Training, mentoring, deliverables, and impact reporting all live in one
          calm workspace for entrepreneurs and programme teams.
        </p>

        <div className="mt-8 space-y-3">
          <BrandPoint>Track programme progress from one dashboard</BrandPoint>
          <BrandPoint>Submit deliverables and receive BID feedback</BrandPoint>
          <BrandPoint>Report jobs, funding, and business milestones</BrandPoint>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <HeroMetric label="Programmes" value="3" />
        <HeroMetric label="Entrepreneurs" value="47" />
        <HeroMetric label="Funds tracked" value="$340k" />
      </div>
    </section>
  );
}

function MobileBrand() {
  return (
    <div className="mb-6 flex flex-col items-center text-center lg:hidden">
      <BidLogo size={72} variant="full" />
      <h1 className="mt-4 text-2xl font-semibold">BID Hub</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Entrepreneur & programme management platform
      </p>
    </div>
  );
}

function AuthHeading({ activeTab }: { activeTab: AuthTab }) {
  return (
    <div className="mb-5">
      <div className="text-3xl font-semibold tracking-tight">
        {activeTab === 'login' ? 'Sign in to BID Hub' : 'Create entrepreneur account'}
      </div>
      <p className="mt-2 text-sm leading-6 text-ink-muted">
        {activeTab === 'login'
          ? 'Use the email connected to your BID account. Your role will route you to the right workspace later.'
          : 'Entrepreneurs can create an account directly and start from the BID Hub workspace.'}
      </p>
    </div>
  );
}

function AuthTabs({
  value,
  onChange,
}: {
  value: AuthTab;
  onChange: (value: AuthTab) => void;
}) {
  return (
    <div className="mb-6 grid grid-cols-2 rounded-lg border border-line bg-surface-subtle p-1">
      <TabButton active={value === 'login'} onClick={() => onChange('login')}>
        Login
      </TabButton>
      <TabButton active={value === 'signup'} onClick={() => onChange('signup')}>
        Signup
      </TabButton>
    </div>
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
        toast.success('Login validation passed. Backend auth will connect here.');
      })}
    >
      <button
        type="button"
        className="flex h-12 w-full items-center justify-center gap-2.5 rounded-lg border border-line bg-white text-sm font-semibold text-ink transition-colors hover:bg-surface-subtle"
      >
        <GoogleIcon className="h-4 w-4" />
        Continue with Google
      </button>

      <Divider label="or sign in with email" />

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

function SignupForm() {
  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      businessName: '',
      representative: '',
      email: '',
      country: '',
      phone: '',
    },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit(() => {
        toast.success('Signup validation passed. Backend auth will connect here.');
      })}
    >
      <div className="rounded-lg bg-bid-light px-4 py-3 text-sm leading-6 text-bid-dark">
        This signup is for entrepreneurs creating their BID Hub account.
      </div>

      <AuthTextField
        icon={<Briefcase className="h-4 w-4" />}
        label="Business name"
        placeholder="Acme Fintech Ltd"
        error={form.formState.errors.businessName?.message}
        {...form.register('businessName')}
      />
      <AuthTextField
        icon={<UserPlus className="h-4 w-4" />}
        label="Representative name"
        placeholder="Jane Doe"
        error={form.formState.errors.representative?.message}
        {...form.register('representative')}
      />
      <AuthTextField
        icon={<Mail className="h-4 w-4" />}
        label="Email address"
        type="email"
        placeholder="jane@example.com"
        error={form.formState.errors.email?.message}
        {...form.register('email')}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <AuthTextField
          label="Country"
          placeholder="Ghana"
          error={form.formState.errors.country?.message}
          {...form.register('country')}
        />
        <AuthTextField
          label="Phone"
          type="tel"
          placeholder="+233 20 000 0000"
          error={form.formState.errors.phone?.message}
          {...form.register('phone')}
        />
      </div>

      <Button type="submit" size="lg" className="h-11 w-full">
        Create account
      </Button>
    </form>
  );
}

export const AuthTextField = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon?: React.ReactNode;
  error?: string;
  }
>(({ label, icon, type = 'text', placeholder, error, ...props }, ref) => {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      <span
        className={cn(
          'flex h-11 items-center gap-2 rounded-lg border border-line bg-white px-3 focus-within:border-bid focus-within:ring-2 focus-within:ring-bid/15',
          error && 'border-danger focus-within:border-danger focus-within:ring-danger/10',
        )}
      >
        {icon && <span className="text-ink-faint">{icon}</span>}
        <input
          ref={ref}
          type={type}
          placeholder={placeholder}
          className="h-full min-w-0 flex-1 border-0 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
          {...props}
        />
      </span>
      {error && <span className="mt-1.5 block text-xs text-danger">{error}</span>}
    </label>
  );
});
AuthTextField.displayName = 'AuthTextField';

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-10 items-center justify-center rounded-md text-sm font-medium transition-colors',
        active
          ? 'bg-white text-ink shadow-sm'
          : 'text-ink-muted hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-line" />
      <span className="text-xs text-ink-muted">{label}</span>
      <div className="h-px flex-1 bg-line" />
    </div>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/10 px-4 py-3">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-white/65">{label}</div>
    </div>
  );
}

function BrandPoint({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-sm font-medium text-white/85">
      <CheckCircle2 className="h-4 w-4 shrink-0 text-white" />
      {children}
    </div>
  );
}
