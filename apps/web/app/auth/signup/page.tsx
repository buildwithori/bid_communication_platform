'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { Briefcase, Lock, Mail, UserPlus } from 'lucide-react';
import { AuthDivider } from '@/components/auth/AuthDivider';
import { AuthGoogleButton } from '@/components/auth/AuthGoogleButton';
import { AuthModeTabs } from '@/components/auth/AuthModeTabs';
import { AuthShell } from '@/components/auth/AuthShell';
import { AuthTextField } from '@/components/auth/AuthTextField';
import { Button } from '@/components/shared/Button';
import { FormAutocomplete } from '@/components/shared/FormField';
import {
  signupSchema,
  type SignupForm as SignupFormValues,
} from '@/lib/forms/schemas';
import { countries } from '@/lib/mock-data/definitions';
import { signup } from '@/lib/api/auth';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const countryOptions = countries.map((country) => ({ value: country, label: country }));

export default function AuthSignupPage() {
  return (
    <AuthShell
      title="Create entrepreneur account"
      description="Entrepreneurs can create an account directly and start from the BID Hub workspace."
      className="max-w-[540px]"
    >
      <AuthModeTabs active="signup" />
      <SignupForm />
    </AuthShell>
  );
}

function SignupForm() {
  const router = useRouter();
  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      businessName: '',
      representative: '',
      email: '',
      country: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  });
  const mutation = useMutation({
    mutationFn: signup,
    onSuccess: (response) => {
      toast.success('Account created. Check your email to verify your account.');
      const tokenQuery = response.verification.devToken
        ? `?token=${encodeURIComponent(response.verification.devToken)}`
        : '';
      router.push(`/auth/verify-email${tokenQuery}`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Unable to create account.');
    },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit((values) => {
        mutation.mutate({
          businessName: values.businessName,
          representativeName: values.representative,
          email: values.email,
          password: values.password,
          country: values.country,
          phone: values.phone,
        });
      })}
    >
      <AuthGoogleButton onClick={() => router.push('/auth/onboarding?provider=google')}>
        Sign up with Google
      </AuthGoogleButton>

      <AuthDivider label="or create account with email" />

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
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink">Country</span>
          <FormAutocomplete
            value={form.watch('country')}
            onValueChange={(value) => form.setValue('country', value, { shouldValidate: true })}
            options={countryOptions}
            placeholder="Select country"
            searchPlaceholder="Search countries..."
            emptyMessage="No country found."
            className={cn(
              'h-11 border-line bg-white',
              form.formState.errors.country && 'border-danger focus:border-danger focus:ring-danger/10',
            )}
          />
          {form.formState.errors.country?.message && (
            <span className="mt-1.5 block text-xs text-danger">
              {form.formState.errors.country.message}
            </span>
          )}
        </label>
        <AuthTextField
          label="Phone"
          type="tel"
          placeholder="+233 20 000 0000"
          error={form.formState.errors.phone?.message}
          {...form.register('phone')}
        />
      </div>

      <AuthTextField
        icon={<Lock className="h-4 w-4" />}
        label="Password"
        type="password"
        placeholder="Create a password"
        error={form.formState.errors.password?.message}
        {...form.register('password')}
      />
      <AuthTextField
        icon={<Lock className="h-4 w-4" />}
        label="Confirm password"
        type="password"
        placeholder="Confirm password"
        error={form.formState.errors.confirmPassword?.message}
        {...form.register('confirmPassword')}
      />

      <Button type="submit" size="lg" className="h-11 w-full" disabled={mutation.isPending}>
        {mutation.isPending ? 'Creating account...' : 'Create account'}
      </Button>
    </form>
  );
}
