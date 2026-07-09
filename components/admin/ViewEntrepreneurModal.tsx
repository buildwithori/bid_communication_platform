'use client';

import { useState, type ReactNode } from 'react';
import { Modal } from '@/components/shared/Modal';
import { Button } from '@/components/shared/Button';
import { Badge } from '@/components/shared/Badge';
import { ProgrammeAccessList } from '@/components/shared/ProgrammeAccessList';
import { TrainerList } from '@/components/shared/TrainerList';
import { MessageModal } from '@/components/shared/MessageModal';
import { Mail, MapPin, Phone, UserRound, Wrench } from 'lucide-react';
import { programmeGoalTypes, sectorById, stageById } from '@/lib/mock-data/definitions';
import { programs } from '@/lib/mock-data/programs';
import { tools } from '@/lib/mock-data';
import { getEntrepreneurTrainers } from '@/lib/content-trainer-access';
import { getEntrepreneurToolAccessSource } from '@/lib/tool-access';
import { getDaysWithoutPeriodicReport } from '@/lib/reporting/overdue-updates';
import { useCompanyConfigStore } from '@/lib/stores/company-config-store';
import {
  FREE_RESOURCE_ACCESS_LABEL,
  getEntrepreneurAssignedProgrammes,
  hasFormalProgramme,
} from '@/lib/programme-access';
import type { BadgeTone, Entrepreneur } from '@/types';

const today = new Date('2026-07-07');

export function ViewEntrepreneurModal({
  open,
  onOpenChange,
  entrepreneur,
  onEdit,
  onAssign,
  onManageTools,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entrepreneur: Entrepreneur | null;
  onEdit?: (e: Entrepreneur) => void;
  onAssign?: (e: Entrepreneur) => void;
  onManageTools?: (e: Entrepreneur) => void;
}) {
  const { companyConfig } = useCompanyConfigStore();
  const overdueAfterDays = companyConfig.reporting.periodicUpdateOverdueAfterDays;
  const [messageOpen, setMessageOpen] = useState(false);

  if (!entrepreneur) return null;

  const sector = sectorById[entrepreneur.sector];
  const stage = stageById[entrepreneur.stage];
  const programmeAccess = getEntrepreneurAssignedProgrammes(entrepreneur, programs);
  const hasFormalProgrammes = hasFormalProgramme(entrepreneur);
  const contentTrainers = getEntrepreneurTrainers(entrepreneur);
  const visibleTools = tools.filter((tool) => getEntrepreneurToolAccessSource(tool, entrepreneur) !== 'none');
  const individualToolCount = visibleTools.filter((tool) => getEntrepreneurToolAccessSource(tool, entrepreneur) === 'individual').length;
  const blockedToolCount = entrepreneur.toolAccess?.blockedToolIds?.length ?? 0;
  const status = getStatusMeta(entrepreneur);
  const sourceLabel = entrepreneur.source === 'self-registered' ? 'Self-registered' : 'Admin-invited';
  const daysWithoutReport = getDaysWithoutPeriodicReport(entrepreneur, today);
  const hasSubmittedReport = Boolean(entrepreneur.lastUpdateAt || entrepreneur.periodicUpdates?.length);
  const lastReportDate = entrepreneur.lastUpdateAt ?? entrepreneur.periodicUpdates?.[0]?.submittedAt;
  const updateStatus = getUpdateStatus(daysWithoutReport, hasSubmittedReport, overdueAfterDays);
  const deliverableTotal = entrepreneur.metrics.deliverablesTotal;
  const deliverableRate = deliverableTotal > 0
    ? Math.round((entrepreneur.metrics.deliverablesDone / deliverableTotal) * 100)
    : 0;
  const fundingTotal = entrepreneur.fundingRounds.reduce((sum, round) => sum + round.amountUsd, 0);
  const goalLabel = getGoalLabel(entrepreneur);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={`${entrepreneur.businessName} - profile`}
      width="xl"
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-line bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-bid text-base font-semibold text-white shadow-sm">
                {entrepreneur.initials}
              </div>
              <div className="min-w-0">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <h3 className="text-xl font-semibold leading-tight text-ink">{entrepreneur.businessName}</h3>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge tone={status.tone}>{status.label}</Badge>
                    <Badge tone="neutral">{sourceLabel}</Badge>
                  </div>
                </div>

                <div className="mt-4 grid max-w-[720px] gap-x-5 gap-y-3 text-sm sm:grid-cols-[minmax(0,220px)_minmax(0,320px)]">
                  <ProfileMeta icon={UserRound} label="Representative" value={entrepreneur.representative} />
                  <ProfileMeta icon={Mail} label="Email" value={entrepreneur.email} />
                  <ProfileMeta icon={Phone} label="Phone" value={entrepreneur.phone || 'No phone'} />
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone={sector?.color ?? 'neutral'}>{sector?.label ?? entrepreneur.sector}</Badge>
                  <Badge tone={stage?.color ?? 'neutral'}>{stage?.label ?? entrepreneur.stage}</Badge>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-subtle px-2.5 py-1 text-xs font-medium text-ink-muted">
                    <MapPin className="h-3 w-3" />
                    {entrepreneur.country}
                  </span>
                  {entrepreneur.cohort && <Badge tone="brand">{entrepreneur.cohort}</Badge>}
                </div>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[310px]">
              <SummaryTile label="Training" value={`${entrepreneur.metrics.trainingProgress}%`} helper="Current progress" />
              <SummaryTile label="Deliverables" value={`${entrepreneur.metrics.deliverablesDone}/${deliverableTotal}`} helper={`${deliverableRate}% complete`} />
              <SummaryTile label="Funds mobilised" value={formatMoney(entrepreneur.metrics.fundsMobilisedUsd)} helper="Reported by entrepreneur" />
              <SummaryTile label="Jobs" value={String(entrepreneur.metrics.jobsCreated)} helper={`${entrepreneur.metrics.jobsWomen} women · ${entrepreneur.metrics.jobsMen} men`} />
            </div>
          </div>
        </div>
        {!hasFormalProgrammes && (
          <div className="rounded-xl border border-warning/20 bg-warning-light px-4 py-3 text-sm text-warning-dark">
            This entrepreneur currently has free resource access only. Add a programme before expecting programme deliverables or programme-specific reporting.
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
          <section className="rounded-xl border border-line bg-white p-4">
            <SectionHeading title="Programme access" description="Free resources plus assigned programmes" />
            <div className="mt-4 grid gap-3">
              <InfoRow label="Base access" value={FREE_RESOURCE_ACCESS_LABEL} />
              <InfoRow
                label="Programmes"
                value={programmeAccess.length > 0 ? (
                  <ProgrammeAccessList
                    programmes={programmeAccess}
                    includeFreeResources={false}
                    maxVisible={2}
                    modalTitle={`${entrepreneur.businessName} programme access`}
                    className="justify-end"
                  />
                ) : 'No programme yet'}
                tone={programmeAccess.length === 0 ? 'warning' : undefined}
              />
              <InfoRow
                label="Programme access"
                value={`${programmeAccess.length} programme${programmeAccess.length === 1 ? '' : 's'}`}
              />
              <InfoRow
                label="Programme trainers"
                value={(
                  <TrainerList
                    trainers={contentTrainers}
                    maxVisible={1}
                    modalTitle={`${entrepreneur.businessName} programme trainers`}
                    className="justify-end"
                  />
                )}
                tone={contentTrainers.length === 0 ? 'warning' : undefined}
              />
              <InfoRow
                label="Tool access"
                value={(
                  <span className="inline-flex flex-wrap items-center justify-end gap-2">
                    <span>{visibleTools.length} visible</span>
                    {individualToolCount > 0 && <Badge tone="brand">{individualToolCount} added</Badge>}
                    {blockedToolCount > 0 && <Badge tone="amber">{blockedToolCount} hidden</Badge>}
                    {onManageTools && (
                      <button
                        type="button"
                        onClick={() => onManageTools(entrepreneur)}
                        className="inline-flex items-center gap-1 text-bid transition hover:text-bid-dark"
                      >
                        <Wrench className="h-3.5 w-3.5" /> Manage
                      </button>
                    )}
                  </span>
                )}
              />
              <InfoRow label="Joined" value={formatDate(entrepreneur.joinedAt)} />
              <InfoRow label="Goal" value={goalLabel} />
              {entrepreneur.goal.description && <InfoPanel title="Goal note" text={entrepreneur.goal.description} />}
            </div>
          </section>

          <section className="rounded-xl border border-line bg-white p-4">
            <SectionHeading title="Reporting health" description="What BID should follow up on" />
            <div className="mt-4 grid gap-3">
              <InfoRow
                label="Last periodic update"
                value={lastReportDate ? `${formatDate(lastReportDate)} (${daysWithoutReport} days ago)` : `No update submitted (${daysWithoutReport} days since joining)`}
                tone={updateStatus.tone}
              />
              <InfoRow label="Funding reported" value={`${formatMoney(fundingTotal)} across ${entrepreneur.fundingRounds.length} round${entrepreneur.fundingRounds.length === 1 ? '' : 's'}`} />
              <InfoRow label="Deliverable progress" value={deliverableTotal > 0 ? `${deliverableRate}% complete` : 'No deliverables assigned'} />
              <InfoPanel title="Admin readout" text={updateStatus.message} />
            </div>
          </section>
        </div>

        <section className="rounded-xl border border-line bg-white p-4">
          <SectionHeading title="Funding history" description="Capital the entrepreneur has reported to BID" />
          {entrepreneur.fundingRounds.length > 0 ? (
            <div className="mt-3 overflow-hidden rounded-lg border border-line">
              {entrepreneur.fundingRounds.map((round) => (
                <div key={round.id} className="grid gap-2 border-b border-line px-3 py-3 text-sm last:border-b-0 sm:grid-cols-[1fr_120px_130px]">
                  <div>
                    <div className="font-medium text-ink">{round.name}</div>
                    <div className="mt-1 text-ink-muted">{round.source ?? 'Source not specified'}</div>
                  </div>
                  <div className="font-semibold text-ink">{formatMoney(round.amountUsd)}</div>
                  <div className="text-ink-muted">{formatDate(round.date)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3 rounded-lg bg-surface-subtle px-3 py-4 text-sm text-ink-muted">
              No funding rounds have been reported yet.
            </div>
          )}
        </section>

        <div className="flex flex-col gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
          <Button variant="outline" type="button" onClick={() => setMessageOpen(true)}>Send message</Button>
          {onEdit && <Button variant="outline" type="button" onClick={() => onEdit(entrepreneur)}>Edit profile</Button>}
          {onManageTools && <Button variant="outline" type="button" onClick={() => onManageTools(entrepreneur)}>Manage tools</Button>}
          {onAssign && <Button type="button" onClick={() => onAssign(entrepreneur)}>Manage programme access</Button>}
        </div>
      </div>
      <MessageModal
        open={messageOpen}
        onOpenChange={setMessageOpen}
        recipientName={entrepreneur.representative}
        recipientDetail={`${entrepreneur.businessName} · ${entrepreneur.email}`}
        defaultSubject={`Follow-up from BID for ${entrepreneur.businessName}`}
      />
    </Modal>
  );
}

function getStatusMeta(entrepreneur: Entrepreneur): { label: string; tone: BadgeTone } {
  if (entrepreneur.status === 'active') return { label: 'Active', tone: 'green' };
  if (entrepreneur.status === 'unassigned') return { label: 'Needs assignment', tone: 'amber' };
  if (entrepreneur.status === 'graduated') return { label: 'Graduated', tone: 'blue' };
  return { label: 'Inactive', tone: 'neutral' };
}

function getUpdateStatus(
  daysWithoutReport: number,
  hasSubmittedReport: boolean,
  overdueAfterDays: number,
): { tone?: 'warning'; message: string } {
  if (!hasSubmittedReport && daysWithoutReport > overdueAfterDays) {
    return { tone: 'warning', message: `No periodic update has been submitted for more than ${overdueAfterDays} days since this entrepreneur joined.` };
  }
  if (!hasSubmittedReport) {
    return { message: 'No periodic update has been submitted yet, but this entrepreneur is still within the configured reporting window.' };
  }
  if (daysWithoutReport > overdueAfterDays) {
    return { tone: 'warning', message: `This profile may need follow-up. The latest periodic update is older than ${overdueAfterDays} days.` };
  }
  return { message: 'Reporting is available for this entrepreneur. Use the reporting workspace for detailed impact review.' };
}

function getGoalLabel(entrepreneur: Entrepreneur) {
  const goalType = programmeGoalTypes.find((item) => item.id === entrepreneur.goal.type);
  if (goalType?.requiresTargetAmount) {
    return entrepreneur.goal.amountUsd
      ? `${goalType.label} · ${formatMoney(entrepreneur.goal.amountUsd)} target`
      : goalType.label;
  }
  return goalType?.label ?? entrepreneur.goal.type;
}

function formatDate(value?: string) {
  if (!value) return 'Not available';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatMoney(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}m`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}k`;
  return `$${value}`;
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <div className="text-sm font-semibold text-ink">{title}</div>
      <div className="mt-1 text-sm text-ink-muted">{description}</div>
    </div>
  );
}

function ProfileMeta({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-subtle text-ink-muted">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-medium leading-4 text-ink-muted">
          {label}
        </span>
        <span
          className="mt-0.5 block max-w-full truncate text-sm font-semibold leading-5 text-ink"
          title={value}
        >
          {value}
        </span>
      </span>
    </div>
  );
}

function SummaryTile({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2">
      <div className="text-xs text-ink-muted">{label}</div>
      <div className="mt-1 text-lg font-semibold text-ink">{value}</div>
      <div className="mt-0.5 text-xs text-ink-muted">{helper}</div>
    </div>
  );
}

function InfoRow({ label, value, tone }: { label: string; value: ReactNode; tone?: 'warning' }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg bg-surface-subtle px-3 py-2 text-sm">
      <span className="text-ink-muted">{label}</span>
      <span className={tone === 'warning' ? 'min-w-0 text-right font-medium text-warning-dark' : 'min-w-0 text-right font-medium text-ink'}>{value}</span>
    </div>
  );
}

function InfoPanel({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-3">
      <div className="text-sm font-semibold text-ink">{title}</div>
      <p className="mt-1 text-sm leading-6 text-ink-muted">{text}</p>
    </div>
  );
}
