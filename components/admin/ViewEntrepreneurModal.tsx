'use client';

import { Modal } from '@/components/shared/Modal';
import { Button } from '@/components/shared/Button';
import { Badge } from '@/components/shared/Badge';
import { sectorById, stageById } from '@/lib/mock-data/definitions';
import { programById } from '@/lib/mock-data/programs';
import { trainerById } from '@/lib/mock-data/trainers';
import { toast } from 'sonner';
import type { BadgeTone, Entrepreneur } from '@/types';

const today = new Date('2026-07-07');

export function ViewEntrepreneurModal({
  open,
  onOpenChange,
  entrepreneur,
  onEdit,
  onAssign,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entrepreneur: Entrepreneur | null;
  onEdit?: (e: Entrepreneur) => void;
  onAssign?: (e: Entrepreneur) => void;
}) {
  if (!entrepreneur) return null;

  const sector = sectorById[entrepreneur.sector];
  const stage = stageById[entrepreneur.stage];
  const programme = programById(entrepreneur.programmeId);
  const trainer = trainerById(entrepreneur.trainerId);
  const status = getStatusMeta(entrepreneur);
  const sourceLabel = entrepreneur.source === 'self-registered' ? 'Self-registered' : 'Admin-invited';
  const daysSinceUpdate = entrepreneur.lastUpdateAt
    ? Math.max(Math.floor((today.getTime() - new Date(entrepreneur.lastUpdateAt).getTime()) / 86_400_000), 0)
    : null;
  const updateStatus = getUpdateStatus(daysSinceUpdate);
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
        <div className="rounded-xl border border-line bg-surface-subtle p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-bid text-sm font-semibold text-white">
                {entrepreneur.initials}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold text-ink">{entrepreneur.businessName}</h3>
                  <Badge tone={status.tone}>{status.label}</Badge>
                  <Badge tone="neutral">{sourceLabel}</Badge>
                </div>
                <div className="mt-1 text-sm text-ink-muted">
                  {entrepreneur.representative} · {entrepreneur.email} · {entrepreneur.phone || 'No phone'}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge tone={sector?.color ?? 'neutral'}>{sector?.label ?? entrepreneur.sector}</Badge>
                  <Badge tone={stage?.color ?? 'neutral'}>{stage?.label ?? entrepreneur.stage}</Badge>
                  <Badge tone="neutral">{entrepreneur.country}</Badge>
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

        {entrepreneur.status === 'unassigned' && (
          <div className="rounded-xl border border-warning/20 bg-warning-light px-4 py-3 text-sm text-warning-dark">
            This entrepreneur has joined but is not assigned to a programme or trainer yet. Assign them before expecting training progress, deliverables, or programme reporting.
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
          <section className="rounded-xl border border-line bg-white p-4">
            <SectionHeading title="Programme assignment" description="Where this entrepreneur sits operationally" />
            <div className="mt-4 grid gap-3">
              <InfoRow label="Programme" value={programme?.name ?? 'Not assigned'} tone={!programme ? 'warning' : undefined} />
              <InfoRow label="Trainer / mentor" value={trainer ? `${trainer.fullName} (${trainer.role})` : 'Not assigned'} tone={!trainer ? 'warning' : undefined} />
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
                value={entrepreneur.lastUpdateAt ? `${formatDate(entrepreneur.lastUpdateAt)} (${daysSinceUpdate} days ago)` : 'No update submitted'}
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
          <Button variant="outline" type="button" onClick={() => toast.success('Message composer will connect when communications are added.')}>Send message</Button>
          {onEdit && <Button variant="outline" type="button" onClick={() => onEdit(entrepreneur)}>Edit profile</Button>}
          {onAssign && <Button type="button" onClick={() => onAssign(entrepreneur)}>Assign programme / trainer</Button>}
        </div>
      </div>
    </Modal>
  );
}

function getStatusMeta(entrepreneur: Entrepreneur): { label: string; tone: BadgeTone } {
  if (entrepreneur.status === 'active') return { label: 'Active', tone: 'green' };
  if (entrepreneur.status === 'unassigned') return { label: 'Needs assignment', tone: 'amber' };
  if (entrepreneur.status === 'graduated') return { label: 'Graduated', tone: 'blue' };
  return { label: 'Inactive', tone: 'neutral' };
}

function getUpdateStatus(daysSinceUpdate: number | null): { tone?: 'warning'; message: string } {
  if (daysSinceUpdate == null) {
    return { tone: 'warning', message: 'No periodic update has been submitted. BID should prompt the entrepreneur once they are assigned.' };
  }
  if (daysSinceUpdate > 60) {
    return { tone: 'warning', message: 'This profile may need follow-up. The latest periodic update is older than 60 days.' };
  }
  return { message: 'Reporting is available for this entrepreneur. Use the reporting workspace for detailed impact review.' };
}

function getGoalLabel(entrepreneur: Entrepreneur) {
  if (entrepreneur.goal.type === 'fundraising') {
    return entrepreneur.goal.amountUsd ? `Fundraising · ${formatMoney(entrepreneur.goal.amountUsd)} target` : 'Fundraising';
  }
  if (entrepreneur.goal.type === 'milestone') return 'Milestone completion';
  return 'Programme completion';
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

function SummaryTile({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2">
      <div className="text-xs text-ink-muted">{label}</div>
      <div className="mt-1 text-lg font-semibold text-ink">{value}</div>
      <div className="mt-0.5 text-xs text-ink-muted">{helper}</div>
    </div>
  );
}

function InfoRow({ label, value, tone }: { label: string; value: string; tone?: 'warning' }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg bg-surface-subtle px-3 py-2 text-sm">
      <span className="text-ink-muted">{label}</span>
      <span className={tone === 'warning' ? 'text-right font-medium text-warning-dark' : 'text-right font-medium text-ink'}>{value}</span>
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
