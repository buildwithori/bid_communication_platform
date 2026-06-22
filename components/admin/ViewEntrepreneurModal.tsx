'use client';

import { Modal } from '@/components/shared/Modal';
import { Button } from '@/components/shared/Button';
import { Badge } from '@/components/shared/Badge';
import { useAdminStore } from '@/lib/stores/admin-store';
import { sectorById, stageById } from '@/lib/mock-data/definitions';
import { programById } from '@/lib/mock-data/programs';
import { trainerById } from '@/lib/mock-data/trainers';
import type { Entrepreneur } from '@/types';

export function ViewEntrepreneurModal({
  open,
  onOpenChange,
  entrepreneur,
  onGenerateMemo,
  onEdit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entrepreneur: Entrepreneur | null;
  onGenerateMemo?: (e: Entrepreneur) => void;
  onEdit?: (e: Entrepreneur) => void;
}) {
  if (!entrepreneur) return null;
  const sector = sectorById[entrepreneur.sector];
  const stage = stageById[entrepreneur.stage];
  const program = programById(entrepreneur.programmeId);
  const trainer = trainerById(entrepreneur.trainerId);
  const goalAmount = entrepreneur.goal.amountUsd
    ? `$${(entrepreneur.goal.amountUsd / 1000).toFixed(0)}k goal`
    : '';

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={`${entrepreneur.businessName} – profile`} width="wide">
      <div className="mb-4 flex items-center gap-3.5 rounded-lg bg-bid p-4 text-white">
        <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-white/20 text-[15px] font-semibold">
          {entrepreneur.initials}
        </div>
        <div>
          <div className="text-sm font-semibold">{entrepreneur.businessName}</div>
          <div className="text-[10px] opacity-80">
            {stage.label} stage · {sector.label} · {entrepreneur.country}
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-base font-semibold">{goalAmount}</div>
          <div className="text-[9px] opacity-70">Fundraising target</div>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2">
        <Stat label="Training progress" value={`${entrepreneur.metrics.trainingProgress}%`} />
        <Stat label="Deliverables" value={`${entrepreneur.metrics.deliverablesDone}/${entrepreneur.metrics.deliverablesTotal || 7}`} />
        <Stat label="Jobs created" value={String(entrepreneur.metrics.jobsCreated)} />
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 text-[11px]">
        <Field label="Programme" value={program?.name ?? '—'} />
        <Field label="Trainer" value={trainer?.fullName ?? '—'} />
      </div>

      <div className="mb-3 text-[10px] font-medium text-ink-muted">Quick actions</div>
      <div className="flex flex-wrap gap-1.5">
        <Button size="sm" onClick={() => onGenerateMemo?.(entrepreneur)}>
          Generate memo
        </Button>
        <Button variant="outline" size="sm" onClick={() => import('sonner').then(({ toast }) => toast.success('Message sent!'))}>
          Send message
        </Button>
        <Button variant="outline" size="sm" onClick={() => onEdit?.(entrepreneur)}>
          Edit jobs/funding data
        </Button>
      </div>
    </Modal>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-surface-subtle p-2.5">
      <div className="mb-0.5 text-[9px] text-ink-faint">{label}</div>
      <div className="text-base font-medium">{value}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-surface-subtle p-2.5">
      <div className="mb-0.5 text-[9px] text-ink-faint">{label}</div>
      <div className="text-[11px] font-medium">{value}</div>
    </div>
  );
}
