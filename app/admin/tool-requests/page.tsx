'use client';

import { useState } from 'react';
import { PageHeader, Notice } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

type ToolRequestStatus = 'under-review' | 'in-development' | 'built' | 'declined';

interface ToolRequest {
  id: string;
  entrepreneurName: string;
  toolName: string;
  reason: string;
  requestedAgo: string;
  status: ToolRequestStatus;
}

const seed: ToolRequest[] = [
  {
    id: 'tr1',
    entrepreneurName: 'PayBridge Africa',
    toolName: 'Cap table modelling tool',
    reason: '"Need this ahead of our Series A conversations"',
    requestedAgo: '2 days ago',
    status: 'under-review',
  },
  {
    id: 'tr2',
    entrepreneurName: 'HealthFirst',
    toolName: 'Unit economics calculator',
    reason: '"My mentor recommended this for our programme review"',
    requestedAgo: '4 days ago',
    status: 'under-review',
  },
];

const statusMeta: Record<ToolRequestStatus, { label: string; tone: 'amber' | 'blue' | 'green' | 'red' }> = {
  'under-review': { label: 'Under review', tone: 'amber' },
  'in-development': { label: 'In development', tone: 'blue' },
  built: { label: 'Built — added to library', tone: 'green' },
  declined: { label: 'Declined', tone: 'red' },
};

export default function AdminToolRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<ToolRequest[]>(seed);

  const updateStatus = (id: string, status: ToolRequestStatus, msg: string) => {
    setRequests((r) => r.map((x) => (x.id === id ? { ...x, status } : x)));
    toast.success(msg);
  };

  const columns: Column<ToolRequest>[] = [
    { key: 'ent', header: 'Entrepreneur', cell: (r) => r.entrepreneurName },
    { key: 'tool', header: 'Tool proposed', cell: (r) => r.toolName },
    { key: 'reason', header: 'Why they want it', cell: (r) => <span className="text-ink-muted">{r.reason}</span> },
    { key: 'when', header: 'Requested', cell: (r) => r.requestedAgo },
    {
      key: 'status',
      header: 'Status',
      cell: (r) => {
        const meta = statusMeta[r.status];
        return <Badge tone={meta.tone}>{meta.label}</Badge>;
      },
    },
    {
      key: 'actions',
      header: '',
      cell: (r) => {
        switch (r.status) {
          case 'under-review':
            return (
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => updateStatus(r.id, 'declined', 'Tool request declined')}>
                  Decline
                </Button>
                <Button size="sm" onClick={() => updateStatus(r.id, 'in-development', 'Moved to development')}>
                  Move to development
                </Button>
              </div>
            );
          case 'in-development':
            return (
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => updateStatus(r.id, 'declined', 'Tool request declined')}>
                  Decline
                </Button>
                <Button size="sm" onClick={() => updateStatus(r.id, 'built', 'Marked as built — added to library')}>
                  Mark as built
                </Button>
              </div>
            );
          case 'built':
            return (
              <Button variant="outline" size="sm" onClick={() => router.push('/admin/content')}>
                View in library
              </Button>
            );
          case 'declined':
            return <span className="text-[10px] text-ink-faint">No further action</span>;
        }
      },
    },
  ];

  return (
    <>
      <PageHeader
        title="Tool requests"
        description="Entrepreneurs suggesting new tools they'd like BID to build"
      />
      <Notice>
        These aren&apos;t access requests — they&apos;re proposals for tools that
        don&apos;t exist yet on the platform. Move promising ones through the build
        pipeline (Under review → In development → Built) or decline them.
      </Notice>
      <Card>
        <CardHeader title="All tool requests" />
        <DataTable
          columns={columns}
          rows={requests}
          rowKey={(r) => r.id}
          emptyMessage="No tool requests yet."
        />
      </Card>
    </>
  );
}
