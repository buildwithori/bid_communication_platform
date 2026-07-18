'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { Briefcase, Mail, Phone, UserPlus } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { AuthShell } from '@/components/auth/AuthShell';
import { AuthTextField } from '@/components/auth/AuthTextField';
import { Button } from '@/components/shared/Button';
import { Skeleton } from '@/components/shared/Card';
import { FormAutocomplete } from '@/components/shared/FormField';
import { useCompleteGoogleOnboardingMutation, useGoogleOnboardingQuery } from '@/lib/api/auth';
import { entrepreneurOnboardingSchema, type EntrepreneurOnboardingForm } from '@/lib/forms/schemas';
import { countries } from '@/lib/mock-data/definitions';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

const countryOptions = countries.map((country) => ({ value: country, label: country }));

export default function EntrepreneurOnboardingPage() {
  return <AuthShell title="Complete signup details" description="Confirm the entrepreneur account details BID needs before opening the workspace." cardClassName="p-5 sm:p-7"><OnboardingForm /></AuthShell>;
}

function OnboardingForm() {
  const router = useRouter();
  const account = useGoogleOnboardingQuery();
  const form = useForm<EntrepreneurOnboardingForm>({
    resolver: zodResolver(entrepreneurOnboardingSchema),
    defaultValues: { businessName: '', representative: '', email: '', country: 'Ghana', phone: '' },
  });
  const country = useWatch({ control: form.control, name: 'country' });

  React.useEffect(() => {
    if (!account.data?.user) return;
    const user = account.data.user;
    if (!user.onboardingRequired) { router.replace(routes.entrepreneur.dashboard); return; }
    form.reset({
      businessName: '',
      representative: [user.firstName, user.lastName].filter(Boolean).join(' '),
      email: user.email,
      country: 'Ghana',
      phone: user.phone ?? '',
    });
  }, [account.data, form, router]);

  const mutation = useCompleteGoogleOnboardingMutation({
    onSuccess: () => { toast.success('Signup details completed.'); router.replace(routes.entrepreneur.dashboard); },
    onError: (error: Error) => toast.error(error.message),
  });

  if (account.isLoading) return <div aria-label="Loading onboarding" aria-busy="true" className="space-y-4">{Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-11 w-full" />)}</div>;
  if (account.isError) return <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">Your Google signup session could not be loaded. Return to sign in and try again.</div>;

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate({ businessName: values.businessName, representativeName: values.representative, email: values.email, country: values.country, phone: values.phone }))}>
      <div className="rounded-xl border border-border bg-secondary px-4 py-3 text-sm leading-6 text-muted-foreground">Google supplied your verified name and email. Add the missing business and contact details to open your workspace.</div>
      <AuthTextField icon={<Briefcase className="h-4 w-4" />} label="Business name" placeholder="Acme Fintech Ltd" error={form.formState.errors.businessName?.message} {...form.register('businessName')} />
      <div className="grid gap-3 sm:grid-cols-2">
        <AuthTextField icon={<UserPlus className="h-4 w-4" />} label="Representative name" placeholder="Jane Doe" error={form.formState.errors.representative?.message} {...form.register('representative')} />
        <AuthTextField icon={<Mail className="h-4 w-4" />} label="Email address" type="email" readOnly error={form.formState.errors.email?.message} {...form.register('email')} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block"><span className="mb-1.5 block text-sm font-medium text-foreground">Country</span><FormAutocomplete value={country} onValueChange={(value) => form.setValue('country', value as EntrepreneurOnboardingForm['country'], { shouldValidate: true })} options={countryOptions} placeholder="Select country" searchPlaceholder="Search countries..." emptyMessage="No country found." className={cn('h-11', form.formState.errors.country && 'border-destructive')} />{form.formState.errors.country?.message ? <span className="mt-1.5 block text-xs text-destructive">{form.formState.errors.country.message}</span> : null}</label>
        <AuthTextField icon={<Phone className="h-4 w-4" />} label="Phone" type="tel" placeholder="+233 20 000 0000" error={form.formState.errors.phone?.message} {...form.register('phone')} />
      </div>
      <Button type="submit" size="lg" className="h-11 w-full" isLoading={mutation.isPending} loadingLabel="Opening workspace...">Continue to dashboard</Button>
    </form>
  );
}
