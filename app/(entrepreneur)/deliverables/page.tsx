'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { FileText } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { ProgramCard } from '@/components/entrepreneur/ProgramCard';
import { Card, CardHeader } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { UploadDeliverableModal } from '@/components/entrepreneur/UploadDeliverableModal';
import { programs } from '@/lib/mock-data/programs';
import { deliverableGroups, deliverablesForGroup } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import type { Deliverable, Program } from '@/types';

const groupProgrammeMap: Record<string, Program | undefined> = {};
programs.forEach((p) => {
  const grp = deliverableGroups.find((g) => g.programmeId === p.id);
  if (grp) groupProgrammeMap[grp.id] = p;
});

function DeliverableRow({ d }: { d: Deliverable }) {
  const tone =
    d.status === 'reviewed'
      ? 'brand'
      : d.status === 'pending'
        ? 'amber'
        : 'neutral';
  return (
    <div className="flex items-center gap-2.5 border-b border-line py-2.5 last:border-b-0">
      <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[7px] bg-bid-light">
        <FileText className="h-3.5 w-3.5 text-bid" strokeWidth={1.5} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-medium leading-tight">{d.name}</div>
        <div className="mt-0.5 text-[10px] text-ink-muted">
          {d.status === 'pending'
            ? `Due ${d.dueDate ? new Date(d.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''} · Not yet uploaded`
            : `Uploaded ${d.submittedAt ? new Date(d.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''} · ${d.reviewFeedback ?? 'Pending review'}`}
        </div>
      </div>
      <Badge tone={tone}>
        {d.status === 'reviewed' ? 'Reviewed' : d.status === 'pending' ? 'Pending' : 'Submitted'}
      </Badge>
    </div>
  );
}

export default function DeliverablesPage() {
  const router = useRouter();
  const [uploadOpen, setUploadOpen] = React.useState(false);

  return (
    <>
      <PageHeader
        title="Deliverables"
        description="Browse deliverables by programme, or view general deliverables"
        actions={
          <Button onClick={() => setUploadOpen(true)}>+ Upload deliverable</Button>
        }
      />
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {deliverableGroups.map((g) => {
          const program = groupProgrammeMap[g.id];
          const items = deliverablesForGroup(g.id);
          const pending = items.filter((d) => d.status === 'pending').length;
          const done = items.filter((d) => d.status === 'reviewed').length;
          const accentBg =
            g.accent === 'bid' ? 'bg-bid-light' : g.accent === 'info' ? 'bg-info-light' : 'bg-success-light';
          return (
            <Card
              key={g.id}
              accent={g.accent}
              onClick={() => router.push(`/deliverables/${g.id}`)}
              className={cn('cursor-pointer transition-colors hover:border-bid')}
            >
              <div
                className={cn(
                  'mb-3 flex h-[38px] w-[38px] items-center justify-center rounded-[9px]',
                  accentBg,
                )}
              >
                <FileText
                  className={cn(
                    'h-[18px] w-[18px]',
                    g.accent === 'bid' ? 'text-bid' : g.accent === 'info' ? 'text-info' : 'text-success',
                  )}
                  strokeWidth={1.5}
                />
              </div>
              <div className="mb-1 text-[13px] font-medium">{g.label}</div>
              <div className="mb-2.5 text-[10px] text-ink-muted">
                {program?.description ?? 'Not tied to a specific programme'}
              </div>
              {pending > 0 ? (
                <Badge tone="amber">{pending} pending</Badge>
              ) : (
                <Badge tone="brand">{done} done</Badge>
              )}
            </Card>
          );
        })}
      </div>

      <UploadDeliverableModal open={uploadOpen} onOpenChange={setUploadOpen} />
    </>
  );
}
