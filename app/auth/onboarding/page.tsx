'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { Briefcase, Mail, Phone, UserPlus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { AuthShell } from '@/components/auth/AuthShell';
import { AuthTextField } from '@/components/auth/AuthTextField';
import { Button } from '@/components/shared/Button';
import { FormAutocomplete } from '@/components/shared/FormField';
import {
  entrepreneurOnboardingSchema,
  type EntrepreneurOnboardingForm,
} from '@/lib/forms/schemas';
import { countries } from '@/lib/mock-data/definitions';
import { cn } from '@/lib/utils';

const countryOptions = countries.map((country) => ({ value: country, label: country }));

function getCountry(value: string | null): EntrepreneurOnboardingForm['country'] {
  return countries.find((country) => country === value) ?? 'Ghana';
}

export default function EntrepreneurOnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isGoogleSignup = searchParams.get('provider') === 'google';

  const form = useForm<EntrepreneurOnboardingForm>({
    resolver: zodResolver(entrepreneurOnboardingSchema),
    defaultValues: {
      businessName: searchParams.get('businessName') ?? '',
      representative: searchParams.get('representative') ?? '',
      email: searchParams.get('email') ?? '',
      country: getCountry(searchParams.get('country')),
      phone: searchParams.get('phone') ?? '',
    },
  });

  return (
    <AuthShell
      title="Complete signup details"
      description="Confirm the entrepreneur account details BID needs before opening the workspace."
      className="max-w-[560px]"
      cardClassName="p-5 sm:p-7"
    >
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit(() => {
          toast.success('Signup details completed.');
          router.push('/entrepreneur/dashboard');
        })}
      >
        {isGoogleSignup ? (
          <div className="rounded-xl border border-line bg-surface-subtle px-4 py-3 text-sm leading-6 text-ink-muted">
            Google will provide the representative name and email when auth is connected. Add any missing business details here.
          </div>
        ) : null}

        <AuthTextField
          icon={<Briefcase className="h-4 w-4" />}
          label="Business name"
          placeholder="Acme Fintech Ltd"
          error={form.formState.errors.businessName?.message}
          {...form.register('businessName')}
        />

        <div className="grid gap-3 sm:grid-cols-2">
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
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">Country</span>
            <FormAutocomplete
              value={form.watch('country')}
              onValueChange={(value) => form.setValue('country', value as EntrepreneurOnboardingForm['country'], { shouldValidate: true })}
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
            icon={<Phone className="h-4 w-4" />}
            label="Phone"
            type="tel"
            placeholder="+233 20 000 0000"
            error={form.formState.errors.phone?.message}
            {...form.register('phone')}
          />
        </div>

        <Button type="submit" size="lg" className="h-11 w-full">
          Continue to dashboard
        </Button>
      </form>
    </AuthShell>
  );
}
