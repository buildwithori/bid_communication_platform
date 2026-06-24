'use client';

import { Modal } from '@/components/shared/Modal';
import { Button } from '@/components/shared/Button';
import { Badge } from '@/components/shared/Badge';
import { sectorById, stageById } from '@/lib/mock-data/definitions';
import { programById, programs as allPrograms } from '@/lib/mock-data/programs';
import { trainerById } from '@/lib/mock-data/trainers';
import { toast } from 'sonner';
import type { Entrepreneur } from '@/types';

const mockDeliverables = [
  { id: 'd1', name: 'Business Model Canvas', submittedAt: 'Apr 8', fileName: 'BMC_v2.pdf', status: 'pending-review' as const },
  { id: 'd2', name: 'Financial Statements Q1', submittedAt: 'Mar 30', fileName: 'Financials_Q1.xlsx', status: 'approved' as const },
  { id: 'd3', name: 'Pitch Deck v2', dueDate: 'Apr 28', status: 'not-submitted' as const },
];

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
  const trainer = trainerById(entrepreneur.trainerId);
  const goalAmount = entrepreneur.goal.amountUsd
    ? `$${(entrepreneur.goal.amountUsd / 1000).toFixed(0)}k goal`
    : '';

  // Support multiple programmes — currently single, but show as tag list
  const enrolledProgrammes = entrepreneur.programmeId
    ? allPrograms.filter((p) => p.id === entrepreneur.programmeId)
    : [];

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={`${entrepreneur.businessName} – profile`}
      width="wide"
    >
      {/* Banner */}
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
        {goalAmount && (
          <div className="ml-auto text-right">
            <div className="text-base font-semibold">{goalAmount}</div>
            <div className="text-[9px] opacity-70">Fundraising target</div>
          </div>
        )}
      </div>

      {/* Enrolled programmes */}
      {enrolledProgrammes.length > 0 && (
        <div className="mb-3">
          <div className="mb-1.5 text-[10px] font-medium text-ink-muted">Enrolled in</div>
          <div className="flex flex-wrap gap-1.5">
            {enrolledProgrammes.map((p) => (
              <Badge key={p.id} tone={p.accent === 'info' ? 'blue' : p.accent === 'success' ? 'green' : 'brand'}>
                {p.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="mb-3 grid grid-cols-3 gap-2">
        <Stat label="Training progress" value={`${entrepreneur.metrics.trainingProgress}%`} />
        <Stat
          label="Deliverables"
          value={`${entrepreneur.metrics.deliverablesDone}/${entrepreneur.metrics.deliverablesTotal || 7}`}
        />
        <Stat label="Jobs created" value={String(entrepreneur.metrics.jobsCreated)} />
      </div>

      {/* Trainer */}
      {trainer && (
        <div className="mb-3 rounded-md bg-surface-subtle px-2.5 py-2">
          <span className="text-[9px] text-ink-faint">Trainer: </span>
          <span className="text-[11px] font-medium">{trainer.fullName}</span>
        </div>
      )}

      {/* Deliverables */}
      <div className="mb-3">
        <div className="mb-1.5 text-[11px] font-medium text-ink-muted">
          Deliverables{enrolledProgrammes[0] ? ` — ${enrolledProgrammes[0].name}` : ''}
        </div>
        <div className="flex flex-col gap-0">
          {mockDeliverables.map((d, i) => (
            <div
              key={d.id}
              className={`flex items-center gap-2.5 py-2 ${i < mockDeliverables.length - 1 ? 'border-b border-line' : ''}`}
            >
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-medium">{d.name}</div>
                <div className="text-[10px] text-ink-muted">
                  {d.status === 'not-submitted'
                    ? `Not yet submitted · Due ${d.dueDate}`
                    : `Submitted ${d.submittedAt} · ${d.fileName}`}
                </div>
              </div>
              {d.status === 'pending-review' && (
                <>
                  <Badge tone="amber">Pending review</Badge>
                  <Button size="sm" onClick={() => toast.success('Marked as reviewed!')}>Review</Button>
                </>
              )}
              {d.status === 'approved' && (
                <>
                  <Badge tone="green">Approved</Badge>
                  <Button variant="outline" size="sm" onClick={() => toast.success('Opening file…')}>View</Button>
                </>
              )}
              {d.status === 'not-submitted' && (
                <>
                  <Badge tone="neutral">Not submitted</Badge>
                  <Button variant="outline" size="sm" onClick={() => toast.success('Reminder sent!')}>Remind</Button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="mb-1.5 text-[10px] font-medium text-ink-muted">Quick actions</div>
      <div className="flex flex-wrap gap-1.5">
        <Button variant="outline" size="sm" onClick={() => toast.success('Message sent!')}>
          Send message
        </Button>
        <Button variant="outline" size="sm" onClick={() => onAssign?.(entrepreneur)}>
          Assign to programme / trainer
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
