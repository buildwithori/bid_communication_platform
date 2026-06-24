'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { Tabs } from '@/components/shared/Tabs';
import {
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
} from '@/components/shared/FormField';
import { FundingRoundModal } from '@/components/entrepreneur/FundingRoundModal';
import { PeriodicUpdateModal } from '@/components/entrepreneur/PeriodicUpdateModal';
import { useEntrepreneurStore } from '@/lib/stores/entrepreneur-store';
import { programById, programs as allPrograms } from '@/lib/mock-data/programs';
import {
  businessProfileSchema,
  programmeGoalSchema,
  type BusinessProfileForm,
  type ProgrammeGoalForm,
} from '@/lib/forms/schemas';
import { sectors, stages } from '@/lib/mock-data/definitions';

type ProfileTab = 'biz' | 'goal' | 'fund' | 'update';

export default function ProfilePage() {
  const { entrepreneur, updateProfile } = useEntrepreneurStore();
  const [tab, setTab] = React.useState<ProfileTab>('biz');
  const [fundingOpen, setFundingOpen] = React.useState(false);
  const [updateOpen, setUpdateOpen] = React.useState(false);

  const profileForm = useForm<BusinessProfileForm>({
    resolver: zodResolver(businessProfileSchema),
    defaultValues: {
      businessName: entrepreneur.businessName,
      sector: entrepreneur.sector,
      stage: entrepreneur.stage,
      representative: entrepreneur.representative,
      email: entrepreneur.email,
      phone: entrepreneur.phone,
    },
  });

  const goalForm = useForm<ProgrammeGoalForm>({
    resolver: zodResolver(programmeGoalSchema),
    defaultValues: {
      goalType: entrepreneur.goal.type,
      targetAmountUsd: entrepreneur.goal.amountUsd
        ? `$${entrepreneur.goal.amountUsd.toLocaleString()}`
        : '',
      description: entrepreneur.goal.description ?? '',
    },
  });

  const goalType = goalForm.watch('goalType');

  const onProfileSubmit = (values: BusinessProfileForm) => {
    updateProfile({
      businessName: values.businessName,
      sector: values.sector as typeof entrepreneur.sector,
      stage: values.stage,
      representative: values.representative,
      email: values.email,
      phone: values.phone ?? '',
    });
  };

  const onGoalSubmit = (values: ProgrammeGoalForm) => {
    updateProfile({
      goal: {
        type: values.goalType,
        amountUsd: values.targetAmountUsd
          ? Number(values.targetAmountUsd.replace(/[^0-9]/g, '')) || undefined
          : undefined,
        description: values.description ?? '',
      },
    });
  };

  // Programmes the entrepreneur is enrolled in
  const enrolledProgrammes = entrepreneur.programmeId
    ? allPrograms.filter((p) => p.id === entrepreneur.programmeId)
    : [];

  return (
    <>
      {/* Banner */}
      <div className="mb-4 flex flex-col gap-4 rounded-bid bg-bid p-4 text-white sm:flex-row sm:items-center lg:p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20 text-base font-semibold">
            {entrepreneur.initials}
          </div>
          <div>
            <div className="text-base font-semibold">{entrepreneur.businessName}</div>
            <div className="text-[11px] opacity-80 capitalize">
              {entrepreneur.stage} stage · {entrepreneur.sector} · {entrepreneur.country}
            </div>
            {enrolledProgrammes.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {enrolledProgrammes.map((p) => (
                  <span key={p.id} className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px]">
                    {p.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-5 sm:ml-auto">
          <div className="text-center">
            <div className="text-lg font-semibold">{entrepreneur.metrics.trainingProgress}%</div>
            <div className="text-[9px] opacity-70">Training</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold">
              {entrepreneur.metrics.deliverablesDone}/{entrepreneur.metrics.deliverablesTotal}
            </div>
            <div className="text-[9px] opacity-70">Delivered</div>
          </div>
        </div>
      </div>

      <Tabs
        value={tab}
        onChange={(v) => setTab(v as ProfileTab)}
        tabs={[
          { value: 'biz', label: 'Business details' },
          { value: 'goal', label: 'Programme goal' },
          { value: 'fund', label: 'Fundraising history' },
          { value: 'update', label: 'Periodic updates' },
        ]}
      />

      {tab === 'biz' && (
        <Card>
          <CardHeader title="Business details" />
          <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
            <FormField label="Business name" error={profileForm.formState.errors.businessName?.message}>
              <FormInput {...profileForm.register('businessName')} />
            </FormField>
            <FormField label="Sector">
              <FormSelect
                value={profileForm.watch('sector')}
                onValueChange={(v) => profileForm.setValue('sector', v)}
                options={sectors.map((s) => ({ value: s.id, label: s.label }))}
              />
            </FormField>
            <FormField label="Business stage">
              <FormSelect
                value={profileForm.watch('stage')}
                onValueChange={(v) => profileForm.setValue('stage', v as 'idea' | 'growth' | 'scale')}
                options={stages.map((s) => ({
                  value: s.id,
                  label: `${s.label} — ${s.definition.split('—')[0].trim()}`,
                }))}
              />
            </FormField>
            <div className="my-3 h-px bg-line" />
            <CardHeader title="Representative contact" className="mb-2" />
            <FormField label="Representative name" error={profileForm.formState.errors.representative?.message}>
              <FormInput {...profileForm.register('representative')} />
            </FormField>
            <FormField label="Email" error={profileForm.formState.errors.email?.message}>
              <FormInput type="email" {...profileForm.register('email')} />
            </FormField>
            <FormField label="Phone number">
              <FormInput {...profileForm.register('phone')} />
            </FormField>
            <Button type="submit">Save changes</Button>
          </form>
        </Card>
      )}

      {tab === 'goal' && (
        <Card>
          <CardHeader title="Programme goal" />
          <form onSubmit={goalForm.handleSubmit(onGoalSubmit)}>
            <FormField label="Goal type">
              <FormSelect
                value={goalForm.watch('goalType')}
                onValueChange={(v) => goalForm.setValue('goalType', v as 'fundraising' | 'programme-completion' | 'milestone')}
                options={[
                  { value: 'fundraising', label: 'Fundraising target' },
                  { value: 'programme-completion', label: 'Programme completion' },
                  { value: 'milestone', label: 'Milestone-based' },
                ]}
              />
            </FormField>
            {goalType === 'fundraising' && (
              <FormField label="Target amount (USD)" optional>
                <FormInput {...goalForm.register('targetAmountUsd')} placeholder="e.g. 500000" />
              </FormField>
            )}
            <FormField label="Goal description" optional>
              <FormTextarea rows={2} {...goalForm.register('description')} />
            </FormField>
            <Button type="submit">Save goal</Button>
          </form>
        </Card>
      )}

      {tab === 'fund' && (
        <Card>
          <CardHeader
            title="Fundraising history"
            actions={
              <Button variant="outline" size="sm" onClick={() => setFundingOpen(true)}>
                + Add round
              </Button>
            }
          />
          <div className="overflow-hidden rounded-lg border border-line">
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr>
                  <th className="border-b border-line px-2.5 py-1.5 text-left text-[10px] font-medium text-ink-muted">Round</th>
                  <th className="border-b border-line px-2.5 py-1.5 text-left text-[10px] font-medium text-ink-muted">Amount</th>
                  <th className="border-b border-line px-2.5 py-1.5 text-left text-[10px] font-medium text-ink-muted">Date</th>
                  <th className="border-b border-line px-2.5 py-1.5" />
                </tr>
              </thead>
              <tbody>
                {entrepreneur.fundingRounds.map((r) => (
                  <tr key={r.id}>
                    <td className="border-b border-line px-2.5 py-2">{r.name}</td>
                    <td className="border-b border-line px-2.5 py-2">${(r.amountUsd / 1000).toFixed(0)}k</td>
                    <td className="border-b border-line px-2.5 py-2">
                      {new Date(r.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </td>
                    <td className="border-b border-line px-2.5 py-2">
                      <Button variant="outline" size="sm" onClick={() => import('sonner').then(({ toast }) => toast.success('Editing round…'))}>
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
                {entrepreneur.fundingRounds.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-2.5 py-4 text-center text-[11px] text-ink-faint">
                      No funding rounds recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'update' && (
        <Card>
          <CardHeader
            title="Periodic updates (jobs & funding)"
            actions={
              <Button size="sm" onClick={() => setUpdateOpen(true)}>
                + Submit update
              </Button>
            }
          />
          <div className="text-[11px] text-ink-muted">
            Last submitted:{' '}
            {entrepreneur.lastUpdateAt
              ? `Q4 2024 · ${entrepreneur.metrics.jobsCreated} jobs created (${entrepreneur.metrics.jobsWomen} women, ${entrepreneur.metrics.jobsMen} men) · $0 mobilised this period`
              : 'Never submitted'}
          </div>
        </Card>
      )}

      <FundingRoundModal open={fundingOpen} onOpenChange={setFundingOpen} />
      <PeriodicUpdateModal open={updateOpen} onOpenChange={setUpdateOpen} />
    </>
  );
}
