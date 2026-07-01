'use client';

import { useMemo, useState } from 'react';
import { PageHeader, Notice } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import {
  DataTable,
  RowActions,
  TableFilterInput,
  TableFilterSelect,
  TablePagination,
  TableToolbar,
  type Column,
} from '@/components/shared/DataTable';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { routes } from '@/lib/routes';
import {
  toolRequests,
  toolRequestStatusMeta,
  type ToolRequest,
  type ToolRequestStatus,
} from '@/lib/mock-data/admin-workflows';

export default function AdminToolRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<ToolRequest[]>(toolRequests);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ToolRequestStatus>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const updateStatus = (id: string, status: ToolRequestStatus, msg: string) => {
    setRequests((r) => r.map((x) => (x.id === id ? { ...x, status } : x)));
    toast.success(msg);
  };
  const filteredRequests = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return requests.filter((request) => {
      const matchesQuery =
        !needle ||
        [request.entrepreneurName, request.toolName, request.reason, request.requestedAgo]
          .join(' ')
          .toLowerCase()
          .includes(needle);
      const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [query, requests, statusFilter]);
  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRequests.slice(start, start + pageSize);
  }, [filteredRequests, page, pageSize]);

  const columns: Column<ToolRequest>[] = [
    {
      key: 'actions',
      header: 'Action',
      cell: (r) => {
        switch (r.status) {
          case 'under-review':
            return (
              <RowActions
                actions={[
                  { label: 'Move to development', onSelect: () => updateStatus(r.id, 'in-development', 'Moved to development') },
                  'separator',
                  { label: 'Decline request', destructive: true, onSelect: () => updateStatus(r.id, 'declined', 'Tool request declined') },
                ]}
              />
            );
          case 'in-development':
            return (
              <RowActions
                actions={[
                  { label: 'Mark as built', onSelect: () => updateStatus(r.id, 'built', 'Marked as built — added to library') },
                  'separator',
                  { label: 'Decline request', destructive: true, onSelect: () => updateStatus(r.id, 'declined', 'Tool request declined') },
                ]}
              />
            );
          case 'built':
            return (
              <RowActions
                actions={[
                  { label: 'View in library', onSelect: () => router.push(routes.admin.content) },
                ]}
              />
            );
          case 'declined':
            return (
              <RowActions
                actions={[
                  { label: 'No further action', disabled: true, onSelect: () => {} },
                ]}
              />
            );
        }
      },
      className: 'w-[84px]',
    },
    { key: 'ent', header: 'Entrepreneur', cell: (r) => r.entrepreneurName },
    { key: 'tool', header: 'Tool proposed', cell: (r) => r.toolName },
    { key: 'reason', header: 'Why they want it', cell: (r) => <span className="text-ink-muted">{r.reason}</span> },
    { key: 'when', header: 'Requested', cell: (r) => r.requestedAgo },
    {
      key: 'status',
      header: 'Status',
      cell: (r) => {
        const meta = toolRequestStatusMeta[r.status];
        return <Badge tone={meta.tone}>{meta.label}</Badge>;
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
        <CardHeader
          title="All tool requests"
          description={`${filteredRequests.length} proposal${filteredRequests.length === 1 ? '' : 's'} in this view`}
        />
        <TableToolbar>
          <div>
            <div className="text-sm font-medium text-ink">Filter tool proposals</div>
            <div className="mt-0.5 text-sm text-ink-muted">
              Search by entrepreneur, tool, reason, or request age.
            </div>
          </div>
          <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-[260px_180px]">
            <TableFilterInput
              icon
              placeholder="Search requests..."
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
            />
            <TableFilterSelect
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as typeof statusFilter);
                setPage(1);
              }}
            >
              <option value="all">All statuses</option>
              {Object.entries(toolRequestStatusMeta).map(([value, meta]) => (
                <option key={value} value={value}>{meta.label}</option>
              ))}
            </TableFilterSelect>
          </div>
        </TableToolbar>
        <DataTable
          columns={columns}
          rows={pageRows}
          rowKey={(r) => r.id}
          emptyMessage="No tool requests yet."
        />
        <TablePagination
          page={page}
          pageSize={pageSize}
          totalItems={filteredRequests.length}
          onPageChange={setPage}
          onPageSizeChange={(next) => {
            setPageSize(next);
            setPage(1);
          }}
        />
      </Card>
    </>
  );
}
