'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { PageHeader, Notice } from '@/components/shared/PageHeader';
import { MetricGrid } from '@/components/shared/MetricGrid';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardHeader } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { Modal } from '@/components/shared/Modal';
import { FormField, FormSelect, FormTextarea } from '@/components/shared/FormField';
import {
  DataTable,
  RowActions,
  TableFilterAutocomplete,
  TableFilterInput,
  TableFilterSelect,
  TablePagination,
  TableToolbar,
  type Column,
  type RowAction,
} from '@/components/shared/DataTable';
import { routes } from '@/lib/routes';
import { listToolAreas } from '@/lib/api/settings';
import { listTools } from '@/lib/api/tools';
import { listToolRequests, updateToolRequest } from '@/lib/api/tool-requests';
import {
  mapToolRequestRecordToUi,
  toolRequestStatusMeta,
  uiToApiToolRequestStatus,
  type ToolRequest,
  type ToolRequestStatus,
} from '@/lib/tool-requests';

function formatDate(value?: string) {
  if (!value) return 'Not specified';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}


export default function AdminToolRequestsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const requestsQuery = useQuery({
    queryKey: ['tool-requests', 'admin'],
    queryFn: () => listToolRequests({ take: 100 }),
  });
  const toolAreasQuery = useQuery({
    queryKey: ['lookups', 'tool-areas', 'active'],
    queryFn: () => listToolAreas({ active: true }),
  });
  const toolsQuery = useQuery({
    queryKey: ['tools', 'admin', 'published'],
    queryFn: () => listTools({ take: 100, status: 'published' }),
  });
  const updateRequestMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateToolRequest>[1] }) =>
      updateToolRequest(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tool-requests'] }),
  });

  const requests = useMemo<ToolRequest[]>(
    () => (requestsQuery.data?.items ?? []).map(mapToolRequestRecordToUi),
    [requestsQuery.data?.items],
  );
  const toolAreaOptions = useMemo<Array<{ value: string; label: string }>>(
    () => ((toolAreasQuery.data ?? []) as Array<{ id: string; name: string }>).map((area) => ({ value: area.id, label: area.name })),
    [toolAreasQuery.data],
  );
  const linkedToolOptions = useMemo<Array<{ value: string; label: string }>>(
    () => [
      { value: 'none', label: 'No linked tool yet' },
      ...((toolsQuery.data?.items ?? []) as Array<{ id: string; name: string }>).map((tool) => ({ value: tool.id, label: tool.name })),
    ],
    [toolsQuery.data?.items],
  );

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ToolRequestStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [decisionNote, setDecisionNote] = useState('');
  const [linkedToolId, setLinkedToolId] = useState('none');

  const activeRequest = requests.find((request) => request.id === activeId) ?? null;

  const openRequest = (request: ToolRequest) => {
    setActiveId(request.id);
    setDecisionNote(request.adminNote ?? '');
    setLinkedToolId(request.linkedToolId ?? 'none');
  };

  const updateRequest = async (
    id: string,
    patch: { status?: ToolRequestStatus; adminNote?: string; linkedToolId?: string },
    msg: string,
  ) => {
    await updateRequestMutation.mutateAsync({
      id,
      payload: {
        status: patch.status ? uiToApiToolRequestStatus[patch.status] : undefined,
        adminDecisionNote: patch.adminNote,
        linkedToolId:
          patch.linkedToolId === undefined
            ? undefined
            : patch.linkedToolId === 'none'
              ? null
              : patch.linkedToolId,
      },
    });
    toast.success(msg);
  };

  const canTransition = (request: ToolRequest, status: ToolRequestStatus) =>
    request.availableTransitions.includes(status);

  const decideRequest = async (status: ToolRequestStatus, msg: string) => {
    if (!activeRequest) return;
    await updateRequest(
      activeRequest.id,
      {
        status,
        adminNote: decisionNote.trim() || undefined,
        linkedToolId: status === 'built' ? linkedToolId : activeRequest.linkedToolId ?? 'none',
      },
      msg,
    );
    setActiveId(null);
  };

  const getRowActions = (request: ToolRequest): Array<RowAction | 'separator'> => {
    const actions: Array<RowAction | 'separator'> = [
      { label: 'View request', onSelect: () => openRequest(request) },
    ];

    const statusActions: RowAction[] = [];
    if (canTransition(request, 'in-development')) {
      statusActions.push({
        label: 'Approve for development',
        onSelect: () =>
          void updateRequest(request.id, { status: 'in-development' }, 'Tool request approved for development'),
      });
    }
    if (canTransition(request, 'built')) {
      statusActions.push({ label: 'Review build decision', onSelect: () => openRequest(request) });
    }
    if (canTransition(request, 'declined')) {
      statusActions.push({ label: 'Decline request', destructive: true, onSelect: () => openRequest(request) });
    }
    if (canTransition(request, 'under-review')) {
      statusActions.push({
        label: 'Reopen review',
        onSelect: () =>
          void updateRequest(request.id, { status: 'under-review', linkedToolId: 'none' }, 'Tool request reopened for review'),
      });
    }

    if (request.status === 'built') {
      statusActions.push({ label: 'View in library', onSelect: () => router.push(routes.admin.entrepreneurTools) });
    }

    if (statusActions.length > 0) actions.push('separator', ...statusActions);
    return actions;
  };

  const filteredRequests = useMemo<ToolRequest[]>(() => {
    const needle = query.trim().toLowerCase();
    return requests.filter((request) => {
      const matchesQuery =
        !needle ||
        [
          request.businessName,
          request.requesterName,
          request.programme,
          request.toolName,
          request.category,
          request.reason,
          request.requestedAgo,
        ]
          .join(' ')
          .toLowerCase()
          .includes(needle);
      const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || request.categoryId === categoryFilter;
      return matchesQuery && matchesStatus && matchesCategory;
    });
  }, [categoryFilter, query, requests, statusFilter]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRequests.slice(start, start + pageSize);
  }, [filteredRequests, page, pageSize]);

  const underReview = requests.filter((request) => request.status === 'under-review').length;
  const inDevelopment = requests.filter((request) => request.status === 'in-development').length;
  const built = requests.filter((request) => request.status === 'built').length;
  const declined = requests.filter((request) => request.status === 'declined').length;

  const columns: Column<ToolRequest>[] = [
    {
      key: 'actions',
      header: 'Action',
      cell: (request) => (
        <RowActions actions={getRowActions(request)} />
      ),
      className: 'w-[84px]',
    },
    {
      key: 'request',
      header: 'Request',
      cell: (request) => (
        <button
          type="button"
          onClick={() => openRequest(request)}
          className="block min-w-[260px] max-w-[420px] rounded-lg text-left outline-none transition hover:text-bid focus-visible:ring-2 focus-visible:ring-bid/20"
        >
          <span className="block truncate font-semibold text-ink transition-colors group-hover:text-bid">{request.toolName}</span>
          <span className="mt-1 line-clamp-2 text-sm leading-6 text-ink-muted">{request.reason}</span>
        </button>
      ),
    },
    {
      key: 'business',
      header: 'Business',
      cell: (request) => (
        <div className="min-w-[190px]">
          <div className="font-medium text-ink">{request.businessName}</div>
          <div className="mt-1 text-sm text-ink-muted">{request.requesterName}</div>
          <div className="mt-1 text-sm text-ink-muted">{request.programme}</div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Tool area',
      cell: (request) => (
        <Badge tone="blue">{request.category}</Badge>
      ),
    },
    {
      key: 'timeline',
      header: 'Timeline',
      cell: (request) => (
        <div className="min-w-[150px] text-sm text-ink-muted">
          <div>Requested {request.requestedAgo}</div>
          {request.neededBy && <div>Needed by {formatDate(request.neededBy)}</div>}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (request) => {
        const meta = toolRequestStatusMeta[request.status];
        return <Badge tone={meta.tone}>{meta.label}</Badge>;
      },
    },
  ];

  return (
    <>
      <PageHeader
        title="Tool requests"
        description="Review entrepreneur requests for new platform tools and move approved ideas into the build pipeline."
      />
      <Notice>
        Tool requests are product proposals from entrepreneurs. Admins should review the business need,
        decide whether the tool belongs in BID Hub, capture the decision note, and then move approved
        requests through Under review, In development, and Built.
      </Notice>

      <MetricGrid className="mb-4">
        <StatCard label="Under review" value={underReview} subline="Needs admin decision" dotColor="warning" accent="warning" />
        <StatCard label="In development" value={inDevelopment} subline="Approved for build" dotColor="info" accent="info" />
        <StatCard label="Built" value={built} subline="Added to library" dotColor="success" accent="success" />
        <StatCard label="Declined" value={declined} subline="Not moving forward" dotColor="neutral" accent="neutral" />
      </MetricGrid>

      <Card>
        <CardHeader
          title="Request queue"
          description={`${filteredRequests.length} request${filteredRequests.length === 1 ? '' : 's'} in this view`}
        />
        <TableToolbar>
          <div>
            <div className="text-sm font-medium text-ink">Filter tool requests</div>
            <div className="mt-0.5 text-sm text-ink-muted">
              Search by business, requester, programme, tool area, or business need.
            </div>
          </div>
          <div className="grid w-full gap-2 lg:w-auto lg:grid-cols-[280px_190px_190px]">
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
            <TableFilterAutocomplete
              value={categoryFilter}
              onValueChange={(value) => {
                setCategoryFilter(value);
                setPage(1);
              }}
              options={[{ value: 'all', label: 'All tool areas' }, ...toolAreaOptions]}
              placeholder="All tool areas"
              searchPlaceholder="Search tool areas..."
              emptyMessage="No tool area found."
            />
          </div>
        </TableToolbar>
        {requestsQuery.isLoading ? (
          <div className="grid min-h-[180px] place-items-center rounded-xl border border-line bg-surface-subtle text-sm text-ink-muted">
            Loading requests...
          </div>
        ) : requestsQuery.isError ? (
          <div className="grid min-h-[180px] place-items-center rounded-xl border border-line bg-surface-subtle p-6 text-center">
            <div>
              <div className="text-base font-semibold text-ink">Requests could not be loaded</div>
              <p className="mt-2 text-sm text-ink-muted">Please refresh the page or try again later.</p>
            </div>
          </div>
        ) : (
          <DataTable
            columns={columns}
            rows={pageRows}
            rowKey={(request) => request.id}
            emptyMessage="No tool requests match this view."
          />
        )}
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

      <ToolRequestReviewModal
        request={activeRequest}
        decisionNote={decisionNote}
        onDecisionNoteChange={setDecisionNote}
        linkedToolId={linkedToolId}
        onLinkedToolIdChange={setLinkedToolId}
        linkedToolOptions={linkedToolOptions}
        isSaving={updateRequestMutation.isPending}
        onClose={() => setActiveId(null)}
        canMoveToDevelopment={activeRequest ? canTransition(activeRequest, 'in-development') : false}
        canMarkBuilt={activeRequest ? canTransition(activeRequest, 'built') : false}
        canDecline={activeRequest ? canTransition(activeRequest, 'declined') : false}
        onMoveToDevelopment={() => void decideRequest('in-development', 'Tool request approved for development')}
        onMarkBuilt={() => void decideRequest('built', 'Tool marked as built and ready for the library')}
        onDecline={() => void decideRequest('declined', 'Tool request declined')}
        onViewLibrary={() => router.push(routes.admin.entrepreneurTools)}
      />
    </>
  );
}

function ToolRequestReviewModal({
  request,
  decisionNote,
  onDecisionNoteChange,
  linkedToolId,
  onLinkedToolIdChange,
  linkedToolOptions,
  isSaving,
  canMoveToDevelopment,
  canMarkBuilt,
  canDecline,
  onClose,
  onMoveToDevelopment,
  onMarkBuilt,
  onDecline,
  onViewLibrary,
}: {
  request: ToolRequest | null;
  decisionNote: string;
  onDecisionNoteChange: (value: string) => void;
  linkedToolId: string;
  onLinkedToolIdChange: (value: string) => void;
  linkedToolOptions: Array<{ value: string; label: string }>;
  isSaving: boolean;
  canMoveToDevelopment: boolean;
  canMarkBuilt: boolean;
  canDecline: boolean;
  onClose: () => void;
  onMoveToDevelopment: () => void;
  onMarkBuilt: () => void;
  onDecline: () => void;
  onViewLibrary: () => void;
}) {
  const hasDecisionNote = decisionNote.trim().length > 0;
  const hasLinkedTool = linkedToolId !== 'none';

  return (
    <Modal
      open={!!request}
      onOpenChange={(open) => !open && onClose()}
      title={request ? `Review tool request - ${request.toolName}` : 'Review tool request'}
      width="wide"
    >
      {request && (
        <div>
          <div className="mb-4 rounded-xl border border-line bg-surface-subtle p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-sm text-ink-muted">Requested by</div>
                <div className="mt-1 font-semibold text-ink">{request.businessName}</div>
                <div className="mt-1 text-sm text-ink-muted">{request.requesterName} · {request.programme}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone={toolRequestStatusMeta[request.status].tone}>{toolRequestStatusMeta[request.status].label}</Badge>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <InfoBlock label="Tool area" value={request.category} />
            {request.neededBy && <InfoBlock label="Needed by" value={formatDate(request.neededBy)} />}
            <InfoBlock label="Requested" value={`${formatDate(request.requestedAt)} (${request.requestedAgo})`} />
            <InfoBlock label="Status" value={toolRequestStatusMeta[request.status].label} />
          </div>

          <div className="mt-4 grid gap-3">
            <InfoPanel title="Why the entrepreneur wants this" text={request.reason} />
          </div>

          {(canMarkBuilt || request.status === 'built') && (
            <FormField label="Linked tool" optional className="mt-4">
              <FormSelect
                value={linkedToolId}
                onValueChange={onLinkedToolIdChange}
                options={linkedToolOptions}
                placeholder="Select the tool that satisfies this request"
              />
            </FormField>
          )}

          <FormField label="Admin decision note" optional={!canDecline} className="mt-4">
            <FormTextarea
              rows={4}
              placeholder="Capture why BID is approving, building, or declining this request..."
              value={decisionNote}
              onChange={(event) => onDecisionNoteChange(event.target.value)}
            />
          </FormField>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>Close</Button>
            {canDecline && (
              <Button type="button" variant="destructive" onClick={onDecline} disabled={isSaving || !hasDecisionNote}>Decline</Button>
            )}
            {canMoveToDevelopment && (
              <Button type="button" onClick={onMoveToDevelopment} disabled={isSaving}>Approve for development</Button>
            )}
            {canMarkBuilt && (
              <Button type="button" onClick={onMarkBuilt} disabled={isSaving || !hasLinkedTool}>Mark as built</Button>
            )}
            {request.status === 'built' && (
              <Button type="button" onClick={onViewLibrary}>View tool library</Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2">
      <div className="text-xs font-medium uppercase tracking-[0.04em] text-ink-faint">{label}</div>
      <div className="mt-1 text-sm font-medium text-ink">{value}</div>
    </div>
  );
}

function InfoPanel({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-line bg-white px-4 py-3">
      <div className="text-sm font-semibold text-ink">{title}</div>
      <p className="mt-2 text-sm leading-6 text-ink-muted">{text}</p>
    </div>
  );
}
