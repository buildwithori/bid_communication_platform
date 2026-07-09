'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { Tabs } from '@/components/shared/Tabs';
import { Modal } from '@/components/shared/Modal';
import {
  DataTable,
  RowActions,
  TableFilterAutocomplete,
  TableFilterInput,
  TablePagination,
  TableToolbar,
  type Column,
} from '@/components/shared/DataTable';
import {
  FormField,
  FormAutocomplete,
  FormInput,
  FormTextarea,
} from '@/components/shared/FormField';
import { FundingRoundModal } from '@/components/entrepreneur/FundingRoundModal';
import { PeriodicUpdateModal } from '@/components/entrepreneur/PeriodicUpdateModal';
import { DateRangePicker } from '@/components/shared/DatePicker';
import { useEntrepreneurStore } from '@/lib/stores/entrepreneur-store';
import { programById, programs } from '@/lib/mock-data/programs';
import {
  businessProfileSchema,
  programmeGoalSchema,
  type BusinessProfileForm,
  type ProgrammeGoalForm,
} from '@/lib/forms/schemas';
import { countries, programmeGoalTypes, sectors, stages } from '@/lib/mock-data/definitions';
import type { FundingRound, PeriodicUpdate } from '@/types';

type ProfileTab = 'biz' | 'goal' | 'fund' | 'update';
type ProgrammeGoalRow = ProgrammeGoalForm & {
  id: string;
  milestoneAchieved?: boolean;
  evidence?: string;
};
type ProgrammeGoalStatus = 'not-started' | 'active' | 'achieved';

const activeGoalTypes = programmeGoalTypes.filter((goalType) => goalType.active);
const PROGRAMME_COMPLETION_GOAL_TYPE = 'programme-completion';
const MILESTONE_GOAL_TYPE = 'milestone';
const ALL_FILTER = 'all';

function goalTypeLabel(value: string) {
  return programmeGoalTypes.find((goalType) => goalType.id === value)?.label ?? value;
}

function goalTypeRequiresTarget(value: string) {
  return programmeGoalTypes.find((goalType) => goalType.id === value)?.requiresTargetAmount ?? false;
}

function goalTypeRequiresProgramme(value: string) {
  return value === PROGRAMME_COMPLETION_GOAL_TYPE || value === MILESTONE_GOAL_TYPE;
}

function getGoalTargetAmount(goal: ProgrammeGoalRow) {
  return Number((goal.targetAmountUsd ?? '').replace(/[^0-9]/g, '')) || 0;
}

function getProgrammeGoalStatus(
  goal: ProgrammeGoalRow,
  context: {
    linkedFundingTotal: number;
    primaryProgrammeId?: string;
    trainingProgress: number;
  },
): ProgrammeGoalStatus {
  if (goal.goalType === 'fundraising') {
    const targetAmount = getGoalTargetAmount(goal);
    if (targetAmount > 0 && context.linkedFundingTotal >= targetAmount) return 'achieved';
    return context.linkedFundingTotal > 0 ? 'active' : 'not-started';
  }

  if (goal.goalType === PROGRAMME_COMPLETION_GOAL_TYPE) {
    return goal.programmeId && goal.programmeId === context.primaryProgrammeId && context.trainingProgress >= 100
      ? 'achieved'
      : 'active';
  }

  if (goal.goalType === 'milestone') {
    return goal.milestoneAchieved ? 'achieved' : 'active';
  }

  return 'active';
}

function getGoalStatusMeta(status: ProgrammeGoalStatus) {
  if (status === 'achieved') return { label: 'Achieved', tone: 'green' as const };
  if (status === 'not-started') return { label: 'Not started', tone: 'neutral' as const };
  return { label: 'Active', tone: 'blue' as const };
}

function getGoalStatusSource(goal: ProgrammeGoalRow, linkedFundingTotal: number) {
  if (goal.goalType === 'fundraising') {
    return `${formatCurrency(linkedFundingTotal)} linked from fundraising history`;
  }

  if (goal.goalType === PROGRAMME_COMPLETION_GOAL_TYPE) {
    return goal.evidence || 'Calculated from training progress and required deliverables.';
  }

  if (goal.goalType === MILESTONE_GOAL_TYPE) {
    const programmeName = goal.programmeId
      ? programById(goal.programmeId)?.name ?? 'selected programme'
      : 'a programme';
    if (goal.milestoneAchieved) {
      return goal.evidence
        ? `Achieved from ${programmeName} milestone evidence: ${goal.evidence}`
        : `Achieved from ${programmeName} milestone evidence.`;
    }
    return goal.evidence
      ? `Active until ${programmeName} milestone evidence is reviewed: ${goal.evidence}`
      : `Active until ${programmeName} milestone evidence is recorded and reviewed.`;
  }

  return goal.evidence || 'No status source recorded yet.';
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateRange(start: string, end: string) {
  return `${formatDate(start)} - ${formatDate(end)}`;
}

export default function ProfilePage() {
  const { entrepreneur, updateProfile } = useEntrepreneurStore();
  const [tab, setTab] = React.useState<ProfileTab>('biz');
  const [fundingOpen, setFundingOpen] = React.useState(false);
  const [activeFundingRound, setActiveFundingRound] = React.useState<FundingRound | null>(null);
  const [updateOpen, setUpdateOpen] = React.useState(false);
  const [fundingQuery, setFundingQuery] = React.useState('');
  const [fundingDateStart, setFundingDateStart] = React.useState('');
  const [fundingDateEnd, setFundingDateEnd] = React.useState('');
  const [fundingGoalFilter, setFundingGoalFilter] = React.useState(ALL_FILTER);
  const [fundingProgrammeFilter, setFundingProgrammeFilter] = React.useState(ALL_FILTER);
  const [fundingPage, setFundingPage] = React.useState(1);
  const [fundingPageSize, setFundingPageSize] = React.useState(5);
  const [goalQuery, setGoalQuery] = React.useState('');
  const [goalTypeFilter, setGoalTypeFilter] = React.useState(ALL_FILTER);
  const [goalProgrammeFilter, setGoalProgrammeFilter] = React.useState(ALL_FILTER);
  const [goalStatusFilter, setGoalStatusFilter] = React.useState(ALL_FILTER);
  const [goalPage, setGoalPage] = React.useState(1);
  const [goalPageSize, setGoalPageSize] = React.useState(5);
  const [goalModalOpen, setGoalModalOpen] = React.useState(false);
  const [activeGoal, setActiveGoal] = React.useState<ProgrammeGoalRow | null>(null);
  const [updateQuery, setUpdateQuery] = React.useState('');
  const [updatePeriodFilter, setUpdatePeriodFilter] = React.useState(ALL_FILTER);
  const [updateJobsFilter, setUpdateJobsFilter] = React.useState(ALL_FILTER);
  const [updateScopeFilter, setUpdateScopeFilter] = React.useState(ALL_FILTER);
  const [updatePage, setUpdatePage] = React.useState(1);
  const [updatePageSize, setUpdatePageSize] = React.useState(5);
  const [activeUpdate, setActiveUpdate] = React.useState<PeriodicUpdate | null>(null);

  const profileForm = useForm<BusinessProfileForm>({
    resolver: zodResolver(businessProfileSchema),
    defaultValues: {
      businessName: entrepreneur.businessName,
      sector: entrepreneur.sector,
      stage: entrepreneur.stage,
      country: entrepreneur.country,
      representative: entrepreneur.representative,
      email: entrepreneur.email,
      phone: entrepreneur.phone,
    },
  });

  const [programmeGoals, setProgrammeGoals] = React.useState<ProgrammeGoalRow[]>(() => [
    {
      id: 'goal-fundraising-series-a',
      programmeId: '',
      goalType: 'fundraising',
      targetAmountUsd: '500000',
      description: 'Raise Series A capital to expand into two new markets and strengthen the sales team.',
      evidence: 'Calculated from fundraising history linked to this business.',
    },
    {
      id: 'goal-programme-completion',
      programmeId: entrepreneur.programmeId ?? programs[0]?.id ?? '',
      goalType: PROGRAMME_COMPLETION_GOAL_TYPE,
      targetAmountUsd: '',
      description: 'Complete required training modules and submit all core deliverables for the accelerator.',
      evidence: 'Calculated from training progress and required deliverables.',
    },
    {
      id: 'goal-merchant-onboarding',
      programmeId: entrepreneur.programmeId ?? programs[0]?.id ?? '',
      goalType: MILESTONE_GOAL_TYPE,
      targetAmountUsd: '',
      description: 'Launch the merchant onboarding workflow and activate the first 50 pilot businesses.',
      milestoneAchieved: true,
      evidence: 'Pilot launched with 50 merchants activated in Q4 2024.',
    },
    {
      id: 'goal-enterprise-pipeline',
      programmeId: entrepreneur.programmeIds?.[1] ?? entrepreneur.programmeId ?? programs[0]?.id ?? '',
      goalType: MILESTONE_GOAL_TYPE,
      targetAmountUsd: '',
      description: 'Secure signed LOIs from three enterprise payment partners.',
      milestoneAchieved: false,
      evidence: 'Two LOIs received; one partner negotiation still in progress.',
    },
  ]);
  const formalProgrammeOptions = programs
    .filter((program) => entrepreneur.programmeIds?.includes(program.id))
    .map((program) => ({
      value: program.id,
      label: program.name,
      description: `${formatDate(program.startDate)} - ${formatDate(program.endDate)}`,
    }));
  const defaultPeriodicUpdateScope =
    formalProgrammeOptions.length === 1 ? formalProgrammeOptions[0].value : 'company-wide';
  const fundraisingGoalOptions = programmeGoals
    .filter((goal) => goal.goalType === 'fundraising')
    .map((goal) => ({
      value: goal.id,
      label: goal.description || goalTypeLabel(goal.goalType),
      description: goal.targetAmountUsd
        ? `Target ${formatCurrency(getGoalTargetAmount(goal))}`
        : 'No target amount set',
    }));
  const linkedFundingTotalForGoal = React.useCallback(
    (goalId: string) =>
      entrepreneur.fundingRounds
        .filter((round) => round.goalId === goalId)
        .reduce((sum, round) => sum + round.amountUsd, 0),
    [entrepreneur.fundingRounds],
  );

  const onProfileSubmit = (values: BusinessProfileForm) => {
    updateProfile({
      businessName: values.businessName,
      sector: values.sector as typeof entrepreneur.sector,
      stage: values.stage,
      country: values.country,
      representative: values.representative,
      email: values.email,
      phone: values.phone ?? '',
    });
  };

  const saveProgrammeGoal = (values: ProgrammeGoalForm) => {
    const nextGoal: ProgrammeGoalRow = {
      id: activeGoal?.id ?? `goal-${Date.now()}`,
      ...values,
      milestoneAchieved: activeGoal?.milestoneAchieved,
      evidence: activeGoal?.evidence,
    };

    setProgrammeGoals((current) =>
      activeGoal
        ? current.map((goal) => (goal.id === activeGoal.id ? nextGoal : goal))
        : [nextGoal, ...current],
    );

    updateProfile({
      goal: {
        type: values.goalType,
        amountUsd: values.targetAmountUsd
          ? Number(values.targetAmountUsd.replace(/[^0-9]/g, '')) || undefined
          : undefined,
        description: values.description ?? '',
      },
    });
    setGoalModalOpen(false);
    setActiveGoal(null);
  };

  const filteredFundingRounds = entrepreneur.fundingRounds.filter((round) => {
    const needle = fundingQuery.trim().toLowerCase();
    const linkedGoal = programmeGoals.find((goal) => goal.id === round.goalId);
    const roundTime = new Date(round.date).getTime();
    const startTime = fundingDateStart ? new Date(fundingDateStart).getTime() : null;
    const endTime = fundingDateEnd ? new Date(fundingDateEnd).getTime() : null;
    const matchesSearch =
      !needle ||
      [
        round.name,
        round.source ?? '',
        round.date,
        String(round.amountUsd),
        linkedGoal?.description ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(needle);
    const matchesDate =
      (!startTime || roundTime >= startTime) &&
      (!endTime || roundTime <= endTime);
    const matchesGoal =
      fundingGoalFilter === ALL_FILTER ||
      (fundingGoalFilter === 'not-linked' && !round.goalId) ||
      round.goalId === fundingGoalFilter;
    const matchesProgramme =
      fundingProgrammeFilter === ALL_FILTER ||
      (fundingProgrammeFilter === 'unattributed' && !round.programmeId) ||
      round.programmeId === fundingProgrammeFilter;

    return matchesSearch && matchesDate && matchesGoal && matchesProgramme;
  });
  React.useEffect(() => {
    setFundingPage(1);
  }, [fundingDateEnd, fundingDateStart, fundingGoalFilter, fundingPageSize, fundingProgrammeFilter, fundingQuery]);
  const fundingPageRows = React.useMemo(() => {
    const start = (fundingPage - 1) * fundingPageSize;
    return filteredFundingRounds.slice(start, start + fundingPageSize);
  }, [filteredFundingRounds, fundingPage, fundingPageSize]);
  const fundingColumns: Column<FundingRound>[] = [
    {
      key: 'action',
      header: 'Action',
      cell: (round) => (
        <RowActions
          actions={[
            {
              label: 'Edit round',
              onSelect: () => {
                setActiveFundingRound(round);
                setFundingOpen(true);
              },
            },
          ]}
        />
      ),
      className: 'w-[84px]',
    },
    {
      key: 'round',
      header: 'Round',
      cell: (round) => (
        <button
          type="button"
          onClick={() => {
            setActiveFundingRound(round);
            setFundingOpen(true);
          }}
          className="text-left font-medium text-ink transition hover:text-bid focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bid/20"
        >
          {round.name}
        </button>
      ),
    },
    { key: 'amount', header: 'Amount', cell: (round) => `$${(round.amountUsd / 1000).toFixed(0)}k` },
    {
      key: 'date',
      header: 'Date',
      cell: (round) => new Date(round.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    },
    { key: 'source', header: 'Source', cell: (round) => round.source ?? 'Not recorded' },
    {
      key: 'programme',
      header: 'Programme attribution',
      cell: (round) =>
        round.programmeId ? (
          <span className="text-sm text-ink">{programById(round.programmeId)?.name ?? 'Programme not found'}</span>
        ) : (
          <span className="text-sm text-ink-faint">Company-wide</span>
        ),
    },
    {
      key: 'goal',
      header: 'Linked goal',
      cell: (round) => {
        const goal = programmeGoals.find((item) => item.id === round.goalId);
        return goal ? (
          <span className="text-sm text-ink">{goal.description || goalTypeLabel(goal.goalType)}</span>
        ) : (
          <span className="text-sm text-ink-faint">Not linked</span>
        );
      },
    },
  ];
  const baseGoalStatusContext = {
    primaryProgrammeId: entrepreneur.programmeId,
    trainingProgress: entrepreneur.metrics.trainingProgress,
  };
  const filteredProgrammeGoals = programmeGoals.filter((goal) => {
    const needle = goalQuery.trim().toLowerCase();
    const programme = programById(goal.programmeId);
    const status = getProgrammeGoalStatus(goal, {
      ...baseGoalStatusContext,
      linkedFundingTotal: linkedFundingTotalForGoal(goal.id),
    });
    const statusMeta = getGoalStatusMeta(status);
    const statusSource = getGoalStatusSource(goal, linkedFundingTotalForGoal(goal.id));
    const matchesSearch =
      !needle ||
      [
        programme?.name ?? '',
        goalTypeLabel(goal.goalType),
        goal.targetAmountUsd ?? '',
        goal.description ?? '',
        statusSource,
        statusMeta.label,
      ]
        .join(' ')
        .toLowerCase()
        .includes(needle);
    const matchesGoalType = goalTypeFilter === ALL_FILTER || goal.goalType === goalTypeFilter;
    const matchesProgramme =
      goalProgrammeFilter === ALL_FILTER ||
      (goalProgrammeFilter === 'business-level' && !goal.programmeId) ||
      goal.programmeId === goalProgrammeFilter;
    const matchesStatus = goalStatusFilter === ALL_FILTER || status === goalStatusFilter;

    return matchesSearch && matchesGoalType && matchesProgramme && matchesStatus;
  });
  React.useEffect(() => {
    setGoalPage(1);
  }, [goalProgrammeFilter, goalQuery, goalPageSize, goalStatusFilter, goalTypeFilter]);
  const goalPageRows = React.useMemo(() => {
    const start = (goalPage - 1) * goalPageSize;
    return filteredProgrammeGoals.slice(start, start + goalPageSize);
  }, [filteredProgrammeGoals, goalPage, goalPageSize]);
  const goalColumns: Column<ProgrammeGoalRow>[] = [
    {
      key: 'action',
      header: 'Action',
      cell: (goal) => (
        <RowActions
          actions={[
            {
              label: 'Edit goal',
              onSelect: () => {
                setActiveGoal(goal);
                setGoalModalOpen(true);
              },
            },
          ]}
        />
      ),
      className: 'w-[84px]',
    },
    {
      key: 'programme',
      header: 'Scope',
      headerClassName: 'min-w-[240px]',
      className: 'min-w-[240px]',
      cell: (goal) => (
        <button
          type="button"
          onClick={() => {
            setActiveGoal(goal);
            setGoalModalOpen(true);
          }}
          className="max-w-[460px] text-left font-medium leading-5 text-ink transition hover:text-bid focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bid/20"
        >
          {goal.programmeId ? programById(goal.programmeId)?.name ?? 'Programme not found' : 'Business-level fundraising goal'}
        </button>
      ),
    },
    {
      key: 'goal',
      header: 'Goal type',
      cell: (goal) => goalTypeLabel(goal.goalType),
    },
    {
      key: 'target',
      header: 'Target',
      cell: (goal) =>
        goalTypeRequiresTarget(goal.goalType) && goal.targetAmountUsd
          ? formatCurrency(Number(goal.targetAmountUsd.replace(/[^0-9]/g, '')) || 0)
          : 'Not monetary',
    },
    {
      key: 'description',
      header: 'Description',
      cell: (goal) => (
        <div className="max-w-[420px] truncate text-sm text-ink-muted">
          {goal.description || 'No description added'}
        </div>
      ),
    },
    {
      key: 'evidence',
      header: 'Status source',
      cell: (goal) => {
        const linkedFundingTotal = linkedFundingTotalForGoal(goal.id);
        return (
          <div className="max-w-[360px] truncate text-sm text-ink-muted">
            {getGoalStatusSource(goal, linkedFundingTotal)}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      cell: (goal) => {
        const statusMeta = getGoalStatusMeta(getProgrammeGoalStatus(goal, {
          ...baseGoalStatusContext,
          linkedFundingTotal: linkedFundingTotalForGoal(goal.id),
        }));
        return <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>;
      },
    },
  ];
  const periodicUpdates = entrepreneur.periodicUpdates ?? [];
  const updatePeriodOptions = periodicUpdates.map((update) => ({
    value: update.id,
    label: formatDateRange(update.periodStart, update.periodEnd),
    description: `Submitted ${formatDate(update.submittedAt)}`,
  }));
  const filteredPeriodicUpdates = periodicUpdates.filter((update) => {
    const needle = updateQuery.trim().toLowerCase();
    const matchesSearch =
      !needle ||
      [
        update.period,
        update.periodStart,
        update.periodEnd,
        update.submittedAt,
        update.programmeId ? programById(update.programmeId)?.name ?? '' : 'company-wide',
        String(update.jobsCreated),
        String(update.jobsWomen),
        String(update.jobsMen),
        update.notes ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(needle);
    const matchesPeriod = updatePeriodFilter === ALL_FILTER || update.id === updatePeriodFilter;
    const matchesJobs =
      updateJobsFilter === ALL_FILTER ||
      (updateJobsFilter === 'jobs-created' && update.jobsCreated > 0) ||
      (updateJobsFilter === 'no-jobs' && update.jobsCreated === 0);
    const matchesScope =
      updateScopeFilter === ALL_FILTER ||
      (updateScopeFilter === 'company-wide' && !update.programmeId) ||
      update.programmeId === updateScopeFilter;

    return matchesSearch && matchesPeriod && matchesJobs && matchesScope;
  });
  React.useEffect(() => {
    setUpdatePage(1);
  }, [updateJobsFilter, updatePageSize, updatePeriodFilter, updateQuery, updateScopeFilter]);
  const updatePageRows = React.useMemo(() => {
    const start = (updatePage - 1) * updatePageSize;
    return filteredPeriodicUpdates.slice(start, start + updatePageSize);
  }, [filteredPeriodicUpdates, updatePage, updatePageSize]);
  const updateColumns: Column<PeriodicUpdate>[] = [
    {
      key: 'action',
      header: 'Action',
      cell: (update) => (
        <RowActions
          actions={[
            {
              label: 'View update',
              onSelect: () => setActiveUpdate(update),
            },
          ]}
        />
      ),
      className: 'w-[84px]',
    },
    {
      key: 'period',
      header: 'Reporting period',
      cell: (update) => (
        <button
          type="button"
          onClick={() => setActiveUpdate(update)}
          className="text-left font-medium text-ink transition hover:text-bid focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bid/20"
        >
          {formatDateRange(update.periodStart, update.periodEnd)}
        </button>
      ),
    },
    {
      key: 'submitted',
      header: 'Submitted',
      cell: (update) => formatDate(update.submittedAt),
    },
    {
      key: 'scope',
      header: 'Scope',
      cell: (update) =>
        update.programmeId ? (
          <span className="text-sm text-ink">{programById(update.programmeId)?.name ?? 'Programme not found'}</span>
        ) : (
          <span className="text-sm text-ink-muted">Company-wide</span>
        ),
    },
    {
      key: 'jobs',
      header: 'Jobs created',
      cell: (update) => (
        <div className="min-w-[150px]">
          <div className="font-medium text-ink">{update.jobsCreated}</div>
          <div className="mt-1 text-sm text-ink-muted">
            {update.jobsWomen} women, {update.jobsMen} men
          </div>
        </div>
      ),
    },
    {
      key: 'notes',
      header: 'Notes',
      cell: (update) => (
        <div className="max-w-[360px] truncate text-sm text-ink-muted">
          {update.notes || 'No notes added'}
        </div>
      ),
    },
  ];

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
          <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="max-w-[760px]">
            <FormField label="Business name" error={profileForm.formState.errors.businessName?.message}>
              <FormInput {...profileForm.register('businessName')} />
            </FormField>
            <FormField label="Sector">
              <FormAutocomplete
                value={profileForm.watch('sector')}
                onValueChange={(v) => profileForm.setValue('sector', v)}
                options={sectors.map((s) => ({ value: s.id, label: s.label }))}
                placeholder="Select sector"
                searchPlaceholder="Search sectors..."
                emptyMessage="No sector found."
              />
            </FormField>
            <FormField label="Business stage">
              <FormAutocomplete
                value={profileForm.watch('stage')}
                onValueChange={(v) => profileForm.setValue('stage', v)}
                options={stages.map((s) => ({
                  value: s.id,
                  label: s.label,
                  description: s.definition,
                }))}
                placeholder="Select business stage"
                searchPlaceholder="Search stages..."
                emptyMessage="No stage found."
              />
            </FormField>
            <FormField label="Country">
              <FormAutocomplete
                value={profileForm.watch('country')}
                onValueChange={(v) => profileForm.setValue('country', v as BusinessProfileForm['country'])}
                options={countries.map((country) => ({ value: country, label: country }))}
                placeholder="Select country"
                searchPlaceholder="Search countries..."
                emptyMessage="No country found."
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
          <CardHeader
            title="Programme goals"
            description="Track fundraising goals, programme completion, and programme-specific milestones."
            actions={
              <Button
                size="sm"
                onClick={() => {
                  setActiveGoal(null);
                  setGoalModalOpen(true);
                }}
              >
                + Add goal
              </Button>
            }
          />
          <TableToolbar>
            <div>
              <div className="text-sm font-medium text-ink">Search programme goals</div>
              <div className="mt-0.5 text-sm text-ink-muted">
                Find goals by programme scope, goal type, target, status, or description.
              </div>
            </div>
            <div className="grid w-full gap-2 lg:w-auto lg:grid-cols-[260px_210px_220px_170px]">
              <TableFilterInput
                icon
                placeholder="Search goals..."
                value={goalQuery}
                onChange={(event) => setGoalQuery(event.target.value)}
              />
              <TableFilterAutocomplete
                value={goalTypeFilter}
                onValueChange={setGoalTypeFilter}
                options={[
                  { value: ALL_FILTER, label: 'All goal types' },
                  ...activeGoalTypes.map((goalType) => ({
                    value: goalType.id,
                    label: goalType.label,
                    description: goalType.description,
                  })),
                ]}
                placeholder="All goal types"
                searchPlaceholder="Search goal types..."
                emptyMessage="No goal type found."
              />
              <TableFilterAutocomplete
                value={goalProgrammeFilter}
                onValueChange={setGoalProgrammeFilter}
                options={[
                  { value: ALL_FILTER, label: 'All programme scopes' },
                  { value: 'business-level', label: 'Business-level fundraising goals' },
                  ...programs.filter((program) => program.accessType !== 'free').map((program) => ({
                    value: program.id,
                    label: program.name,
                    description: `${formatDate(program.startDate)} - ${formatDate(program.endDate)}`,
                  })),
                ]}
                placeholder="All programme scopes"
                searchPlaceholder="Search programmes..."
                emptyMessage="No programme found."
              />
              <TableFilterAutocomplete
                value={goalStatusFilter}
                onValueChange={setGoalStatusFilter}
                options={[
                  { value: ALL_FILTER, label: 'All statuses' },
                  { value: 'not-started', label: 'Not started' },
                  { value: 'active', label: 'Active' },
                  { value: 'achieved', label: 'Achieved' },
                ]}
                placeholder="All statuses"
                searchPlaceholder="Search statuses..."
                emptyMessage="No status found."
              />
            </div>
          </TableToolbar>
          <DataTable
            columns={goalColumns}
            rows={goalPageRows}
            rowKey={(goal) => goal.id}
            emptyMessage="No programme goals match this search."
            tableClassName="min-w-[920px]"
          />
          <TablePagination
            page={goalPage}
            pageSize={goalPageSize}
            totalItems={filteredProgrammeGoals.length}
            pageSizeOptions={[5, 10, 25]}
            onPageChange={setGoalPage}
            onPageSizeChange={(next) => {
              setGoalPageSize(next);
              setGoalPage(1);
            }}
          />
        </Card>
      )}

      {tab === 'fund' && (
        <Card>
          <CardHeader
            title="Fundraising history"
            actions={
              <Button
                size="sm"
                onClick={() => {
                  setActiveFundingRound(null);
                  setFundingOpen(true);
                }}
              >
                + Add round
              </Button>
            }
          />
          <TableToolbar>
            <div>
              <div className="text-sm font-medium text-ink">Search fundraising records</div>
              <div className="mt-0.5 text-sm text-ink-muted">
                Track rounds by name, source, date, or amount.
              </div>
            </div>
            <div className="grid w-full gap-2 lg:w-auto lg:grid-cols-[240px_280px_240px_240px]">
              <TableFilterInput
                icon
                placeholder="Search funding rounds..."
                value={fundingQuery}
                onChange={(event) => setFundingQuery(event.target.value)}
              />
              <div className="flex min-w-0 gap-2">
                <DateRangePicker
                  startValue={fundingDateStart}
                  endValue={fundingDateEnd}
                  onChange={(value) => {
                    setFundingDateStart(value.start);
                    setFundingDateEnd(value.end);
                  }}
                  placeholder="Filter by date range"
                  className="h-9 bg-white"
                />
                {(fundingDateStart || fundingDateEnd) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFundingDateStart('');
                      setFundingDateEnd('');
                    }}
                    className="shrink-0"
                  >
                    Clear
                  </Button>
                )}
              </div>
              <TableFilterAutocomplete
                value={fundingGoalFilter}
                onValueChange={setFundingGoalFilter}
                options={[
                  { value: ALL_FILTER, label: 'All linked goals' },
                  { value: 'not-linked', label: 'Not linked to a goal' },
                  ...fundraisingGoalOptions,
                ]}
                placeholder="All linked goals"
                searchPlaceholder="Search goals..."
                emptyMessage="No goal found."
              />
              <TableFilterAutocomplete
                value={fundingProgrammeFilter}
                onValueChange={setFundingProgrammeFilter}
                options={[
                  { value: ALL_FILTER, label: 'All programme attribution' },
                  { value: 'unattributed', label: 'Company-wide / unattributed' },
                  ...formalProgrammeOptions,
                ]}
                placeholder="All programme attribution"
                searchPlaceholder="Search programmes..."
                emptyMessage="No programme found."
              />
            </div>
          </TableToolbar>
          <DataTable
            columns={fundingColumns}
            rows={fundingPageRows}
            rowKey={(round) => round.id}
            emptyMessage="No funding rounds match this search."
          />
          <TablePagination
            page={fundingPage}
            pageSize={fundingPageSize}
            totalItems={filteredFundingRounds.length}
            pageSizeOptions={[5, 10, 25]}
            onPageChange={setFundingPage}
            onPageSizeChange={(next) => {
              setFundingPageSize(next);
              setFundingPage(1);
            }}
          />
        </Card>
      )}

      {tab === 'update' && (
        <Card>
          <CardHeader
            title="Periodic updates (jobs)"
            description="Submitted job-impact reports used for BID programme reporting."
            actions={
              <Button size="sm" onClick={() => setUpdateOpen(true)}>
                + Submit update
              </Button>
            }
          />
          <TableToolbar>
            <div>
              <div className="text-sm font-medium text-ink">Search update history</div>
              <div className="mt-0.5 text-sm text-ink-muted">
                Track submitted jobs, reporting scope, notes, and reporting periods.
              </div>
            </div>
            <div className="grid w-full gap-2 lg:w-auto lg:grid-cols-[260px_230px_170px_190px]">
              <TableFilterInput
                icon
                placeholder="Search updates..."
                value={updateQuery}
                onChange={(event) => setUpdateQuery(event.target.value)}
              />
              <TableFilterAutocomplete
                value={updatePeriodFilter}
                onValueChange={setUpdatePeriodFilter}
                options={[
                  { value: ALL_FILTER, label: 'All reporting periods' },
                  ...updatePeriodOptions,
                ]}
                placeholder="All reporting periods"
                searchPlaceholder="Search periods..."
                emptyMessage="No reporting period found."
              />
              <TableFilterAutocomplete
                value={updateJobsFilter}
                onValueChange={setUpdateJobsFilter}
                options={[
                  { value: ALL_FILTER, label: 'All job activity' },
                  { value: 'jobs-created', label: 'Jobs created' },
                  { value: 'no-jobs', label: 'No jobs created' },
                ]}
                placeholder="All job activity"
                searchPlaceholder="Search job filters..."
                emptyMessage="No job filter found."
              />
              <TableFilterAutocomplete
                value={updateScopeFilter}
                onValueChange={setUpdateScopeFilter}
                options={[
                  { value: ALL_FILTER, label: 'All reporting scopes' },
                  { value: 'company-wide', label: 'Company-wide' },
                  ...formalProgrammeOptions,
                ]}
                placeholder="All reporting scopes"
                searchPlaceholder="Search scopes..."
                emptyMessage="No scope found."
              />
            </div>
          </TableToolbar>
          <DataTable
            columns={updateColumns}
            rows={updatePageRows}
            rowKey={(update) => update.id}
            emptyMessage="No periodic updates match this search."
            tableClassName="min-w-[920px]"
          />
          <TablePagination
            page={updatePage}
            pageSize={updatePageSize}
            totalItems={filteredPeriodicUpdates.length}
            pageSizeOptions={[5, 10, 25]}
            onPageChange={setUpdatePage}
            onPageSizeChange={(next) => {
              setUpdatePageSize(next);
              setUpdatePage(1);
            }}
          />
        </Card>
      )}

      <FundingRoundModal
        open={fundingOpen}
        round={activeFundingRound}
        goalOptions={fundraisingGoalOptions}
        programmeOptions={formalProgrammeOptions}
        onOpenChange={(open) => {
          setFundingOpen(open);
          if (!open) setActiveFundingRound(null);
        }}
      />
      <ProgrammeGoalModal
        open={goalModalOpen}
        goal={activeGoal}
        onOpenChange={(open) => {
          setGoalModalOpen(open);
          if (!open) setActiveGoal(null);
        }}
        onSave={saveProgrammeGoal}
      />
      <PeriodicUpdateModal
        open={updateOpen}
        onOpenChange={setUpdateOpen}
        defaultProgrammeId={defaultPeriodicUpdateScope}
        programmeOptions={formalProgrammeOptions}
      />
      <PeriodicUpdateDetailsModal update={activeUpdate} onClose={() => setActiveUpdate(null)} />
    </>
  );
}

function PeriodicUpdateDetailsModal({
  update,
  onClose,
}: {
  update: PeriodicUpdate | null;
  onClose: () => void;
}) {
  return (
    <Modal
      open={!!update}
      onOpenChange={(open) => !open && onClose()}
      title={update ? `${formatDateRange(update.periodStart, update.periodEnd)} impact update` : 'Impact update'}
      width="wide"
    >
      {update && (
        <div>
          <div className="grid gap-3 sm:grid-cols-2">
            <UpdateInfoBlock label="Submitted" value={formatDate(update.submittedAt)} />
            <UpdateInfoBlock
              label="Reporting scope"
              value={update.programmeId ? programById(update.programmeId)?.name ?? 'Programme not found' : 'Company-wide'}
            />
            <UpdateInfoBlock label="Period start" value={formatDate(update.periodStart)} />
            <UpdateInfoBlock label="Period end" value={formatDate(update.periodEnd)} />
            <UpdateInfoBlock label="Jobs created" value={String(update.jobsCreated)} />
            <UpdateInfoBlock label="Breakdown" value={`${update.jobsWomen} women, ${update.jobsMen} men`} />
          </div>
          <div className="mt-4 rounded-xl border border-line bg-white px-4 py-3">
            <div className="text-sm font-semibold text-ink">Notes</div>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              {update.notes || 'No notes were added for this period.'}
            </p>
          </div>
          <div className="mt-5 flex justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function ProgrammeGoalModal({
  open,
  goal,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  goal: ProgrammeGoalRow | null;
  onOpenChange: (open: boolean) => void;
  onSave: (values: ProgrammeGoalForm) => void;
}) {
  const form = useForm<ProgrammeGoalForm>({
    resolver: zodResolver(programmeGoalSchema),
    defaultValues: {
      programmeId: goalTypeRequiresProgramme(goal?.goalType ?? '')
        ? goal?.programmeId ?? programs[0]?.id ?? ''
        : '',
      goalType: goal?.goalType ?? activeGoalTypes[0]?.id ?? '',
      targetAmountUsd: goal?.targetAmountUsd ?? '',
      description: goal?.description ?? '',
    },
  });
  const goalType = form.watch('goalType');
  const needsProgramme = goalTypeRequiresProgramme(goalType);

  React.useEffect(() => {
    if (!open) return;
    const nextGoalType = goal?.goalType ?? activeGoalTypes[0]?.id ?? '';
    form.reset({
      programmeId: goalTypeRequiresProgramme(nextGoalType)
        ? goal?.programmeId ?? programs[0]?.id ?? ''
        : '',
      goalType: nextGoalType,
      targetAmountUsd: goal?.targetAmountUsd ?? '',
      description: goal?.description ?? '',
    });
  }, [form, goal, open]);

  React.useEffect(() => {
    if (!needsProgramme && form.watch('programmeId')) {
      form.setValue('programmeId', '', { shouldValidate: true });
    }
  }, [form, needsProgramme]);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={goal ? 'Edit programme goal' : 'Add programme goal'}
      width="wide"
    >
      <form onSubmit={form.handleSubmit(onSave)}>
        <FormField label="Goal type">
          <FormAutocomplete
            value={form.watch('goalType')}
            onValueChange={(v) => form.setValue('goalType', v, { shouldValidate: true })}
            options={activeGoalTypes.map((goalTypeOption) => ({
              value: goalTypeOption.id,
              label: goalTypeOption.label,
              description: goalTypeOption.description,
            }))}
            placeholder="Select goal type"
            searchPlaceholder="Search goal types..."
            emptyMessage="No goal type found."
          />
        </FormField>
        {needsProgramme && (
          <FormField label="Programme" error={form.formState.errors.programmeId?.message}>
            <FormAutocomplete
              value={form.watch('programmeId') ?? ''}
              onValueChange={(value) => form.setValue('programmeId', value, { shouldValidate: true })}
              options={programs.filter((program) => program.accessType !== 'free').map((program) => ({
                value: program.id,
                label: program.name,
                description: `${formatDate(program.startDate)} - ${formatDate(program.endDate)}`,
              }))}
              placeholder="Select programme"
              searchPlaceholder="Search programmes..."
              emptyMessage="No programme found."
            />
          </FormField>
        )}
        {goalTypeRequiresTarget(goalType) && (
          <FormField label="Target amount (USD)" optional>
            <FormInput {...form.register('targetAmountUsd')} placeholder="e.g. 500000" />
          </FormField>
        )}
        <FormField label="Goal description" optional>
          <FormTextarea
            rows={3}
            {...form.register('description')}
            placeholder="Describe the outcome this programme goal is tracking."
          />
        </FormField>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit">
            Save goal
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function UpdateInfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2">
      <div className="text-xs font-medium uppercase tracking-[0.04em] text-ink-faint">{label}</div>
      <div className="mt-1 text-sm font-medium text-ink">{value}</div>
    </div>
  );
}
