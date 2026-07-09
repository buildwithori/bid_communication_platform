'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Briefcase, Mail, UserPlus } from 'lucide-react';
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
        toast.success('Account details validated.');
      })}
    >
      <AuthGoogleButton>
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

      <Button type="submit" size="lg" className="h-11 w-full">
        Create account
      </Button>
    </form>
  );
}
