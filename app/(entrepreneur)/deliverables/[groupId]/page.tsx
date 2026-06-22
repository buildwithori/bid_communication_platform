'use client';

import * as React from 'react';
import { notFound } from 'next/navigation';
import { FileText } from 'lucide-react';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { UploadDeliverableModal } from '@/components/entrepreneur/UploadDeliverableModal';
import { useEntrepreneurStore } from '@/lib/stores/entrepreneur-store';
import { deliverableGroups, deliverablesForGroup } from '@/lib/mock-data';

export default function DeliverableListPage({
  params,
}: {
  params: { groupId: string };
}) {
  const { deliverables: userDeliverables } = useEntrepreneurStore();
  const group = deliverableGroups.find((g) => g.id === params.groupId);
  if (!group) return notFound();

  const seedItems = deliverablesForGroup(group.id);
  // Merge in any deliverable the user submitted this session (general).
  const items = [...seedItems, ...userDeliverables.filter((d) => d.group === 'general' && group.id === 'g-general')];
  const [uploadOpen, setUploadOpen] = React.useState(false);

  return (
    <>
      <Breadcrumb
        items={[
          { label: 'Deliverables', href: '/deliverables' },
          { label: group.label },
        ]}
      />
      <PageHeader
        title={group.label}
        description="Programme deliverables"
        actions={
          <Button onClick={() => setUploadOpen(true)}>+ Upload deliverable</Button>
        }
      />
      <Card>
        <CardHeader title={`${items.length} items`} />
        <div className="flex flex-col">
          {items.length === 0 && (
            <p className="py-6 text-center text-[11px] text-ink-faint">
              No deliverables in this group yet.
            </p>
          )}
          {items.map((d) => {
            const tone = d.status === 'reviewed' ? 'brand' : d.status === 'pending' ? 'amber' : 'neutral';
            return (
              <div
                key={d.id}
                className="flex items-center gap-2.5 border-b border-line py-2.5 last:border-b-0"
              >
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
          })}
        </div>
      </Card>
      <UploadDeliverableModal open={uploadOpen} onOpenChange={setUploadOpen} />
    </>
  );
}
