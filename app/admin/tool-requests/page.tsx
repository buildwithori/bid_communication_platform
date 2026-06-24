'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { toast } from 'sonner';

interface ToolRequest {
  id: string;
  entrepreneurName: string;
  toolName: string;
  reason: string;
  requestedAgo: string;
  status: 'pending' | 'granted' | 'declined';
}

const seed: ToolRequest[] = [
  {
    id: 'tr1',
    entrepreneurName: 'PayBridge Africa',
    toolName: 'Cap table modelling tool',
    reason: '"Need this ahead of our Series A conversations"',
    requestedAgo: '2 days ago',
    status: 'pending',
  },
  {
    id: 'tr2',
    entrepreneurName: 'HealthFirst',
    toolName: 'Unit economics calculator',
    reason: '"My mentor recommended this for our programme review"',
    requestedAgo: '4 days ago',
    status: 'pending',
  },
];

export default function AdminToolRequestsPage() {
  const [requests, setRequests] = useState<ToolRequest[]>(seed);

  const grant = (id: string) => {
    setRequests((r) => r.map((x) => (x.id === id ? { ...x, status: 'granted' } : x)));
    toast.success('Tool access granted!');
  };

  const decline = (id: string) => {
    setRequests((r) => r.map((x) => (x.id === id ? { ...x, status: 'declined' } : x)));
    toast.success('Request declined');
  };

  const pending = requests.filter((r) => r.status === 'pending');
  const resolved = requests.filter((r) => r.status !== 'pending');

  const pendingColumns: Column<ToolRequest>[] = [
    { key: 'ent', header: 'Entrepreneur', cell: (r) => r.entrepreneurName },
    { key: 'tool', header: 'Tool requested', cell: (r) => r.toolName },
    { key: 'reason', header: 'Reason', cell: (r) => <span className="text-ink-muted">{r.reason}</span> },
    { key: 'when', header: 'Requested', cell: (r) => r.requestedAgo },
    {
      key: 'actions',
      header: '',
      cell: (r) => (
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={() => decline(r.id)}>Decline</Button>
          <Button size="sm" onClick={() => grant(r.id)}>Grant access</Button>
        </div>
      ),
    },
  ];

  const resolvedColumns: Column<ToolRequest>[] = [
    { key: 'ent', header: 'Entrepreneur', cell: (r) => r.entrepreneurName },
    { key: 'tool', header: 'Tool requested', cell: (r) => r.toolName },
    {
      key: 'status',
      header: 'Outcome',
      cell: (r) => (
        <span className={r.status === 'granted' ? 'text-success-dark font-medium text-[11px]' : 'text-danger font-medium text-[11px]'}>
          {r.status === 'granted' ? 'Granted' : 'Declined'}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Tool requests"
        description="Entrepreneurs ask for tools they don't yet have access to"
      />
      <Card>
        <CardHeader title="Pending requests" />
        <DataTable
          columns={pendingColumns}
          rows={pending}
          rowKey={(r) => r.id}
          emptyMessage="No pending requests."
        />
      </Card>
      {resolved.length > 0 && (
        <Card className="mt-3">
          <CardHeader title="Resolved" />
          <DataTable
            columns={resolvedColumns}
            rows={resolved}
            rowKey={(r) => r.id}
          />
        </Card>
      )}
    </>
  );
}
