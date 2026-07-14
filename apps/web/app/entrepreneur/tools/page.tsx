'use client';

import * as React from 'react';
import {
  LayoutGrid,
  FileText,
  Timer,
  Star,
  Plus,
  CalendarDays,
  Wrench,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { Tabs } from '@/components/shared/Tabs';
import { Modal } from '@/components/shared/Modal';
import { FormField, FormInput, FormSelect, FormTextarea } from '@/components/shared/FormField';
import { DatePicker } from '@/components/shared/DatePicker';
import {
  DataTable,
  RowActions,
  TableFilterAutocomplete,
  TableFilterInput,
  TableFilterSelect,
  TablePagination,
  TableToolbar,
  type Column,
} from '@/components/shared/DataTable';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toolRequestSchema, type ToolRequestForm } from '@/lib/forms/schemas';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { listTools } from '@/lib/api/tools';
import { mapToolRecordToUi } from '@/lib/tools/tool-records';
import { listToolAreas } from '@/lib/api/settings';
import {
  createToolRequest as createToolRequestRecord,
  listToolRequests,
} from '@/lib/api/tool-requests';
import {
  mapToolRequestRecordToUi,
  toolRequestStatusMeta,
  type ToolRequest,
} from '@/lib/tool-requests';
import type { LucideIcon } from 'lucide-react';
import type { Tool } from '@/types';

type ToolTab = 'all' | 'pdf' | 'embed' | 'requests';

const iconMap: Record<Tool['iconKey'], LucideIcon> = {
  canvas: LayoutGrid,
  document: FileText,
  timer: Timer,
  star: Star,
  plus: Plus,
  calendar: CalendarDays,
};

function ToolCard({ tool, onClick }: { tool: Tool; onClick?: () => void }) {
  const Icon = iconMap[tool.iconKey] ?? Wrench;
  const isOnline = tool.type === 'embed';
  return (
    <Card
      onClick={onClick}
      className="group relative flex min-h-[150px] cursor-pointer flex-col transition-colors hover:border-bid hover:bg-white"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
            isOnline ? 'bg-bid-light' : 'bg-info-light',
          )}
        >
          <Icon
            className={cn('h-6 w-6', isOnline ? 'text-bid' : 'text-info')}
            strokeWidth={1.7}
          />
        </div>
        <Badge tone={isOnline ? 'green' : 'blue'}>
          {isOnline ? 'Online tool' : 'PDF resource'}
        </Badge>
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-base font-semibold leading-tight text-ink transition group-hover:text-bid-dark">{tool.name}</div>
        <div className="mt-2 line-clamp-2 text-sm leading-6 text-ink-muted">
          {tool.description}
        </div>
      </div>
    </Card>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function RequestToolModal({
  open,
  onOpenChange,
  onRequestCreated,
  toolAreaOptions,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRequestCreated: (values: ToolRequestForm) => Promise<void>;
  toolAreaOptions: Array<{ value: string; label: string }>;
  isSubmitting: boolean;
}) {
  const form = useForm<ToolRequestForm>({
    resolver: zodResolver(toolRequestSchema),
    defaultValues: { name: '', category: '', neededBy: '', reason: '' },
  });

  const onSubmit = async (values: ToolRequestForm) => {
    await onRequestCreated(values);
    form.reset();
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Request a tool">
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField label="Tool name or idea" error={form.formState.errors.name?.message}>
          <FormInput placeholder="e.g. Cash flow forecasting tool" {...form.register('name')} />
        </FormField>
        <FormField label="Tool area" error={form.formState.errors.category?.message}>
          <FormSelect
            value={form.watch('category')}
            onValueChange={(value) => form.setValue('category', value, { shouldValidate: true })}
            placeholder="Select the area this tool supports"
            options={toolAreaOptions}
          />
        </FormField>
        <FormField label="Needed by" optional>
          <DatePicker
            value={form.watch('neededBy')}
            onChange={(value) => form.setValue('neededBy', value, { shouldValidate: true })}
            placeholder="Select a date if time-sensitive"
          />
        </FormField>
        <FormField label="Why would this help you?">
          <FormTextarea
            rows={3}
            placeholder="Tell the BID team what you need and why…"
            {...form.register('reason')}
          />
        </FormField>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Sending request...' : 'Send request'}
        </Button>
      </form>
    </Modal>
  );
}

function ToolPreviewModal({
  tool,
  tools,
  onChangeTool,
  onClose,
}: {
  tool: Tool | null;
  tools: Tool[];
  onChangeTool: (tool: Tool | null) => void;
  onClose: () => void;
}) {
  if (!tool) return null;
  const Icon = iconMap[tool.iconKey] ?? Wrench;
  const isOnline = tool.type === 'embed';
  const previewUrl = isOnline ? tool.embedUrl : tool.pdfUrl;
  const currentIndex = Math.max(tools.findIndex((item) => item.id === tool.id), 0);
  const previousTool = currentIndex > 0 ? tools[currentIndex - 1] : undefined;
  const nextTool = currentIndex < tools.length - 1 ? tools[currentIndex + 1] : undefined;

  return (
    <Modal
      open={!!tool}
      onOpenChange={(open) => !open && onClose()}
      title="Tool preview"
      width="media"
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-black/[0.08] bg-surface-subtle p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span
                className={cn(
                  'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
                  isOnline ? 'bg-bid-light text-bid' : 'bg-info-light text-info',
                )}
              >
                <Icon className="h-6 w-6" strokeWidth={1.8} />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={isOnline ? 'green' : 'blue'}>{isOnline ? 'Online tool' : 'PDF resource'}</Badge>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-ink-muted shadow-sm">
                    {currentIndex + 1} of {tools.length}
                  </span>
                </div>
                <div className="mt-2 text-2xl font-semibold leading-tight text-ink">{tool.name}</div>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-muted">{tool.description}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={() => previousTool && onChangeTool(previousTool)} disabled={!previousTool} className="min-w-[112px]">
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button variant="outline" onClick={() => nextTool && onChangeTool(nextTool)} disabled={!nextTool} className="min-w-[92px]">
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
              {previewUrl ? (
                <Button asChild variant="outline" className="border-bid/35 bg-bid-light/35 text-bid-dark hover:border-bid/50 hover:bg-bid-light hover:text-bid-dark">
                  <a href={previewUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    Open
                  </a>
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-sm">
          {previewUrl ? (
            <iframe
              title={`${tool.name} preview`}
              src={previewUrl}
              sandbox={isOnline ? 'allow-forms allow-popups allow-same-origin allow-scripts' : undefined}
              className="h-[56vh] min-h-[430px] w-full bg-white"
            />
          ) : (
            <div className="grid min-h-[430px] place-items-center bg-surface-subtle p-8 text-center">
              <div>
                <div className="text-base font-semibold text-ink">Preview is not available</div>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-muted">
                  This tool needs a {isOnline ? 'tool link' : 'PDF link'} before it can be previewed.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 rounded-2xl border border-black/[0.08] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 text-sm text-ink-muted">
            {previousTool ? <span className="block truncate">Previous: {previousTool.name}</span> : <span>No previous tool</span>}
          </div>
          <div className="text-sm font-medium text-ink-muted">{currentIndex + 1} / {tools.length}</div>
          <div className="min-w-0 text-sm text-ink-muted sm:text-right">
            {nextTool ? <span className="block truncate">Next: {nextTool.name}</span> : <span>No next tool</span>}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function ViewToolRequestModal({
  request,
  onClose,
  onBrowseTools,
}: {
  request: ToolRequest | null;
  onClose: () => void;
  onBrowseTools: () => void;
}) {
  const statusMeta = request ? toolRequestStatusMeta[request.status] : null;
  const hasAdminDecision = Boolean(
    request && (request.status !== 'under-review' || request.adminNote),
  );

  return (
    <Modal
      open={!!request}
      onOpenChange={(open) => !open && onClose()}
      title={request ? request.toolName : 'Tool request'}
      width="wide"
    >
      {request && statusMeta && (
        <div>
          <div className="rounded-xl border border-line bg-surface-subtle p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-sm text-ink-muted">Request from</div>
                <div className="mt-1 font-semibold text-ink">{request.businessName}</div>
                <div className="mt-1 text-sm text-ink-muted">{request.programme}</div>
              </div>
              <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <RequestInfoBlock label="Tool area" value={request.category} />
            <RequestInfoBlock label="Requested" value={`${formatDate(request.requestedAt)} (${request.requestedAgo})`} />
            {request.neededBy && <RequestInfoBlock label="Needed by" value={formatDate(request.neededBy)} />}
            <RequestInfoBlock label="Current status" value={statusMeta.label} />
          </div>

          <div className="mt-4 grid gap-3">
            <RequestInfoPanel title="Business need" text={request.reason} />
            {hasAdminDecision && (
              <div className="rounded-xl border border-line bg-white px-4 py-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-ink">Admin decision</div>
                    <div className="mt-1 text-sm text-ink-muted">
                      {request.status === 'in-development' && 'Approved for development'}
                      {request.status === 'built' && 'Built and added to the tool library'}
                      {request.status === 'declined' && 'Declined by BID'}
                      {request.status === 'under-review' && 'BID added a review note'}
                    </div>
                  </div>
                  <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
                </div>
                {request.adminNote && (
                  <p className="mt-3 text-sm leading-6 text-ink-muted">{request.adminNote}</p>
                )}
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
            {request.status === 'built' && (
              <Button type="button" onClick={onBrowseTools}>
                Browse tools
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

function RequestInfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2">
      <div className="text-xs font-medium uppercase tracking-[0.04em] text-ink-faint">{label}</div>
      <div className="mt-1 text-sm font-medium text-ink">{value}</div>
    </div>
  );
}

function RequestInfoPanel({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-line bg-white px-4 py-3">
      <div className="text-sm font-semibold text-ink">{title}</div>
      <p className="mt-2 text-sm leading-6 text-ink-muted">{text}</p>
    </div>
  );
}

export default function ToolsPage() {
  const queryClient = useQueryClient();
  const toolsQuery = useQuery({
    queryKey: ['tools', 'entrepreneur'],
    queryFn: () => listTools({ take: 100 }),
  });
  const toolAreasQuery = useQuery({
    queryKey: ['lookups', 'tool-areas', 'active'],
    queryFn: () => listToolAreas({ active: true }),
  });
  const requestsQuery = useQuery({
    queryKey: ['tool-requests', 'entrepreneur'],
    queryFn: () => listToolRequests({ take: 100 }),
  });
  const createRequestMutation = useMutation({
    mutationFn: createToolRequestRecord,
    onSuccess: (_request, payload) => {
      queryClient.invalidateQueries({ queryKey: ['tool-requests'] });
      setRequestOpen(false);
      toast.success('Request sent to BID team!', { description: payload.title });
    },
  });
  const [tab, setTab] = React.useState<ToolTab>('all');
  const [query, setQuery] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(6);
  const [requestQuery, setRequestQuery] = React.useState('');
  const [requestStatus, setRequestStatus] = React.useState<'all' | ToolRequest['status']>('all');
  const [requestCategory, setRequestCategory] = React.useState('all');
  const [requestPage, setRequestPage] = React.useState(1);
  const [requestPageSize, setRequestPageSize] = React.useState(10);
  const [requestOpen, setRequestOpen] = React.useState(false);
  const [activeRequest, setActiveRequest] = React.useState<ToolRequest | null>(null);
  const [activeTool, setActiveTool] = React.useState<Tool | null>(null);

  const accessibleTools = React.useMemo<Tool[]>(
    () => (toolsQuery.data?.items ?? []).map(mapToolRecordToUi),
    [toolsQuery.data?.items],
  );

  const toolAreaOptions = React.useMemo<Array<{ value: string; label: string }>>(
    () => ((toolAreasQuery.data ?? []) as Array<{ id: string; name: string }>).map((area) => ({ value: area.id, label: area.name })),
    [toolAreasQuery.data],
  );

  const myRequests = React.useMemo<ToolRequest[]>(
    () => (requestsQuery.data?.items ?? []).map(mapToolRequestRecordToUi),
    [requestsQuery.data?.items],
  );

  const filtered = React.useMemo<Tool[]>(() => {
    const needle = query.trim().toLowerCase();
    return accessibleTools.filter((tool) => {
      const matchesTab = tab === 'requests' ? false : tab === 'all' || tool.type === tab;
      const matchesQuery =
        !needle ||
        [tool.name, tool.description, tool.type]
          .join(' ')
          .toLowerCase()
          .includes(needle);
      return matchesTab && matchesQuery;
    });
  }, [accessibleTools, query, tab]);

  React.useEffect(() => {
    setPage(1);
  }, [query, tab, pageSize]);

  React.useEffect(() => {
    setRequestPage(1);
  }, [requestQuery, requestStatus, requestCategory, requestPageSize]);

  const pageRows = React.useMemo<Tool[]>(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const filteredRequests = React.useMemo<ToolRequest[]>(() => {
    const needle = requestQuery.trim().toLowerCase();
    return myRequests.filter((request) => {
      const matchesQuery =
        !needle ||
        [request.toolName, request.reason, request.category, request.status, request.requestedAgo]
          .join(' ')
          .toLowerCase()
          .includes(needle);
      const matchesStatus = requestStatus === 'all' || request.status === requestStatus;
      const matchesCategory = requestCategory === 'all' || request.categoryId === requestCategory;
      return matchesQuery && matchesStatus && matchesCategory;
    });
  }, [myRequests, requestCategory, requestQuery, requestStatus]);

  const requestRows = React.useMemo(() => {
    const start = (requestPage - 1) * requestPageSize;
    return filteredRequests.slice(start, start + requestPageSize);
  }, [filteredRequests, requestPage, requestPageSize]);

  const requestColumns: Column<ToolRequest>[] = [
    {
      key: 'action',
      header: 'Action',
      cell: (request) => (
        <RowActions
          actions={[
            { label: 'View request', onSelect: () => setActiveRequest(request) },
          ]}
        />
      ),
      className: 'w-[84px]',
    },
    {
      key: 'request',
      header: 'Request',
      cell: (request) => (
        <div className="min-w-[280px] max-w-[520px]">
          <button
            type="button"
            onClick={() => setActiveRequest(request)}
            className="text-left font-medium text-ink transition hover:text-bid focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bid/20"
          >
            {request.toolName}
          </button>
          <div className="mt-1 line-clamp-2 text-sm leading-5 text-ink-muted">{request.reason}</div>
        </div>
      ),
    },
    {
      key: 'area',
      header: 'Tool area',
      cell: (request) => <Badge tone="blue">{request.category}</Badge>,
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

  const createToolRequest = async (values: ToolRequestForm) => {
    await createRequestMutation.mutateAsync({
      title: values.name,
      toolAreaId: values.category,
      businessNeed: values.reason?.trim() || 'No additional context provided.',
      neededBy: values.neededBy || null,
    });
  };

  return (
    <>
      <PageHeader
        title="Entrepreneur Tools"
        description="Downloadable PDF resources and embedded online tools"
        actions={
          <Button onClick={() => setRequestOpen(true)}>
            + Request a tool
          </Button>
        }
      />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'all', label: 'All tools' },
          { value: 'pdf', label: 'PDF resources' },
          { value: 'embed', label: 'Online tools' },
          { value: 'requests', label: 'My requests' },
        ]}
      />
      {tab === 'requests' ? (
        <Card>
          <CardHeader
            title="Your tool requests"
            description="Track requests you have sent to BID and the admin decision state."
            actions={<Badge tone="neutral">{filteredRequests.length} request{filteredRequests.length === 1 ? '' : 's'}</Badge>}
          />
          <TableToolbar>
            <div>
              <div className="text-sm font-medium text-ink">Filter requests</div>
              <div className="mt-0.5 text-sm text-ink-muted">Search by request, tool area, status, or business need.</div>
            </div>
            <div className="grid w-full gap-2 lg:w-auto lg:grid-cols-[260px_180px_180px]">
              <TableFilterInput
                icon
                placeholder="Search requests..."
                value={requestQuery}
                onChange={(event) => setRequestQuery(event.target.value)}
              />
              <TableFilterSelect value={requestStatus} onChange={(event) => setRequestStatus(event.target.value as typeof requestStatus)}>
                <option value="all">All statuses</option>
                {Object.entries(toolRequestStatusMeta).map(([value, meta]) => (
                  <option key={value} value={value}>{meta.label}</option>
                ))}
              </TableFilterSelect>
              <TableFilterAutocomplete
                value={requestCategory}
                onValueChange={setRequestCategory}
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
              columns={requestColumns}
              rows={requestRows}
              rowKey={(request) => request.id}
              emptyMessage="No tool requests match this view."
              tableClassName="min-w-[920px]"
            />
          )}
          <TablePagination
            page={requestPage}
            pageSize={requestPageSize}
            totalItems={filteredRequests.length}
            onPageChange={setRequestPage}
            onPageSizeChange={(next) => {
              setRequestPageSize(next);
              setRequestPage(1);
            }}
          />
        </Card>
      ) : (
        <Card>
          <TableToolbar>
            <div>
              <div className="text-sm font-medium text-ink">Browse tools</div>
              <div className="mt-0.5 text-sm text-ink-muted">
                {filtered.length} tool{filtered.length === 1 ? '' : 's'} available in this view.
              </div>
            </div>
            <div className="w-full sm:w-[320px]">
              <TableFilterInput
                icon
                placeholder="Search tools..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </TableToolbar>
          {toolsQuery.isLoading ? (
            <div className="grid min-h-[220px] place-items-center rounded-xl border border-line bg-surface-subtle text-sm text-ink-muted">
              Loading tools...
            </div>
          ) : toolsQuery.isError ? (
            <div className="grid min-h-[220px] place-items-center rounded-xl border border-line bg-surface-subtle p-6 text-center">
              <div>
                <div className="text-base font-semibold text-ink">Tools could not be loaded</div>
                <p className="mt-2 text-sm text-ink-muted">Please refresh the page or try again later.</p>
              </div>
            </div>
          ) : (
            <>
              {pageRows.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {pageRows.map((t) => (
                    <ToolCard
                      key={t.id}
                      tool={t}
                      onClick={() => setActiveTool(t)}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid min-h-[220px] place-items-center rounded-xl border border-line bg-surface-subtle p-6 text-center">
                  <div>
                    <div className="text-base font-semibold text-ink">No tools found</div>
                    <p className="mt-2 text-sm text-ink-muted">Try a different search or filter.</p>
                  </div>
                </div>
              )}
              <TablePagination
                page={page}
                pageSize={pageSize}
                totalItems={filtered.length}
                pageSizeOptions={[6, 12, 24]}
                onPageChange={setPage}
                onPageSizeChange={(next) => {
                  setPageSize(next);
                  setPage(1);
                }}
              />
            </>
          )}
        </Card>
      )}

      <RequestToolModal
        open={requestOpen}
        onOpenChange={setRequestOpen}
        onRequestCreated={createToolRequest}
        toolAreaOptions={toolAreaOptions}
        isSubmitting={createRequestMutation.isPending}
      />
      <ViewToolRequestModal
        request={activeRequest}
        onClose={() => setActiveRequest(null)}
        onBrowseTools={() => {
          setActiveRequest(null);
          setTab('all');
        }}
      />
      <ToolPreviewModal tool={activeTool} tools={filtered} onChangeTool={setActiveTool} onClose={() => setActiveTool(null)} />
    </>
  );
}
