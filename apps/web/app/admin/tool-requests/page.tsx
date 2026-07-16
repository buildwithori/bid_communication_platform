"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { Card, CardHeader, Skeleton, TableSkeleton } from "@/components/shared/Card";
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
} from "@/components/shared/DataTable";
import {
  FormAutocomplete,
  FormField,
  FormTextarea,
} from "@/components/shared/FormField";
import { MetricGrid } from "@/components/shared/MetricGrid";
import { Modal } from "@/components/shared/Modal";
import { Notice, PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import {
  useToolRequestDetailQuery,
  useToolRequestsPage,
  useUpdateToolRequestMutation,
  type ToolRequestRecord,
} from "@/lib/api/tool-requests";
import { useLazyToolsQuery } from "@/lib/api/tools";
import { useLazyToolAreasQuery } from "@/lib/api/settings";
import {
  apiToUiToolRequestStatus,
  mapToolRequestRecordToUi,
  toolRequestStatusMeta,
  uiToApiToolRequestStatus,
  type ToolRequest,
  type ToolRequestStatus,
} from "@/lib/tool-requests";
import { routes } from "@/lib/routes";

function formatDate(value?: string) {
  if (!value) return "Not specified";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminToolRequestsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const linkedRequestId = searchParams.get("requestId");
  const linkedRequest = useToolRequestDetailQuery(linkedRequestId);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [statusFilter, setStatusFilter] = useState<"all" | ToolRequestStatus>(
    "all",
  );
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [pageSize, setPageSize] = useState(10);
  const [activeRequest, setActiveRequest] = useState<ToolRequest | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [linkedToolId, setLinkedToolId] = useState("");
  const linkedRecord = linkedRequest.data as ToolRequestRecord | undefined;
  const linkedRequestView = linkedRecord ? mapToolRequestRecordToUi(linkedRecord) : null;
  const displayedRequest = activeRequest ?? linkedRequestView;


  function closeRequest() {
    setActiveRequest(null);
    if (linkedRequestId) router.replace(routes.admin.toolRequests);
  }
  const [areaOpen, setAreaOpen] = useState(false);
  const [areaSearch, setAreaSearch] = useState("");

  const requests = useToolRequestsPage({
    search: deferredQuery || undefined,
    status:
      statusFilter === "all"
        ? undefined
        : uiToApiToolRequestStatus[statusFilter],
    toolAreaId: categoryFilter === "all" ? undefined : categoryFilter,
    take: pageSize,
  });
  const areas = useLazyToolAreasQuery({
    enabled: areaOpen,
    search: areaSearch || undefined,
    active: true,
    take: 20,
  });
  const areaOptions = [
    { value: "all", label: "All tool areas" },
    ...(areas.data?.pages.flatMap((page) => page.items) ?? []).map((area) => ({
      value: area.id,
      label: area.name,
    })),
  ];
  const rows = useMemo(
    () => requests.rows.map(mapToolRequestRecordToUi),
    [requests.rows],
  );

  const update = useUpdateToolRequestMutation({
    onSuccess: (record) => {
      toast.success("Tool request updated", {
        description:
          toolRequestStatusMeta[apiToUiToolRequestStatus[record.status]].label,
      });
      closeRequest();
    },
    onError: (error) =>
      toast.error("Could not update tool request", {
        description: error.message,
      }),
  });

  const openRequest = (request: ToolRequest) => {
    setActiveRequest(request);
    setDecisionNote(request.adminNote ?? "");
    setLinkedToolId(request.linkedToolId ?? "");
  };

  const decideRequest = (
    request: ToolRequest,
    status: ToolRequestStatus,
    options?: { close?: boolean },
  ) => {
    update.mutate(
      {
        id: request.id,
        payload: {
          status: uiToApiToolRequestStatus[status],
          adminDecisionNote: decisionNote.trim() || request.adminNote || null,
          ...(status === "built" ? { linkedToolId: linkedToolId || request.linkedToolId } : {}),
        },
      },
      { onSuccess: () => options?.close !== false && setActiveRequest(null) },
    );
  };

  const getRowActions = (
    request: ToolRequest,
  ): Array<RowAction | "separator"> => {
    const actions: Array<RowAction | "separator"> = [
      { label: "View request", onSelect: () => openRequest(request) },
    ];
    if (request.availableTransitions.includes("in-development")) {
      actions.push("separator", {
        label: "Approve for development",
        disabled: update.isPending,
        onSelect: () =>
          decideRequest(request, "in-development", { close: false }),
      });
    }
    if (
      request.availableTransitions.includes("built") ||
      request.availableTransitions.includes("declined")
    ) {
      actions.push({
        label: "Review decision",
        onSelect: () => openRequest(request),
      });
    }
    if (request.availableTransitions.includes("under-review")) {
      actions.push("separator", {
        label: "Reopen review",
        disabled: update.isPending,
        onSelect: () =>
          decideRequest(request, "under-review", { close: false }),
      });
    }
    if (request.status === "built") {
      actions.push("separator", {
        label: "View linked tool",
        onSelect: () => router.push(routes.admin.entrepreneurTools),
      });
    }
    return actions;
  };

  const columns: Column<ToolRequest>[] = [
    {
      key: "actions",
      header: "Action",
      cell: (request) => <RowActions actions={getRowActions(request)} />,
      className: "w-[84px]",
    },
    {
      key: "request",
      header: "Request",
      cell: (request) => (
        <button
          type="button"
          onClick={() => openRequest(request)}
          className="block min-w-[260px] max-w-[420px] rounded-lg text-left outline-none transition hover:text-bid focus-visible:ring-2 focus-visible:ring-bid/20"
        >
          <span className="block truncate font-semibold text-ink">
            {request.toolName}
          </span>
          <span className="mt-1 line-clamp-2 text-sm leading-6 text-ink-muted">
            {request.reason}
          </span>
        </button>
      ),
    },
    {
      key: "business",
      header: "Business",
      cell: (request) => (
        <div className="min-w-[190px]">
          <div className="font-medium text-ink">{request.businessName}</div>
          <div className="mt-1 text-sm text-ink-muted">
            {request.requesterName}
          </div>
          <div className="mt-1 text-sm text-ink-muted">{request.programme}</div>
        </div>
      ),
    },
    {
      key: "category",
      header: "Tool area",
      cell: (request) => <Badge tone="blue">{request.category}</Badge>,
    },
    {
      key: "timeline",
      header: "Timeline",
      cell: (request) => (
        <div className="min-w-[150px] text-sm text-ink-muted">
          <div>Requested {request.requestedAgo}</div>
          {request.neededBy ? (
            <div>Needed by {formatDate(request.neededBy)}</div>
          ) : null}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (request) => {
        const meta = toolRequestStatusMeta[request.status];
        return <Badge tone={meta.tone}>{meta.label}</Badge>;
      },
    },
  ];

  const counts = requests.statusCounts;
  return (
    <>
      <PageHeader
        title="Tool requests"
        description="Review entrepreneur requests for new platform tools and move approved ideas into the build pipeline."
      />
      <Notice>
        Tool requests are product proposals from entrepreneurs. Capture the
        decision note and link the finished library tool before marking a
        request as built.
      </Notice>

      <MetricGrid className="mb-4">
        <StatCard
          label="Under review"
          value={counts?.under_review ?? 0}
          subline="Needs admin decision"
          dotColor="warning"
          accent="warning"
        />
        <StatCard
          label="In development"
          value={counts?.in_development ?? 0}
          subline="Approved for build"
          dotColor="info"
          accent="info"
        />
        <StatCard
          label="Built"
          value={counts?.built ?? 0}
          subline="Added to library"
          dotColor="success"
          accent="success"
        />
        <StatCard
          label="Declined"
          value={counts?.declined ?? 0}
          subline="Not moving forward"
          dotColor="neutral"
          accent="neutral"
        />
      </MetricGrid>

      <Card>
        <CardHeader
          title="Request queue"
          description={`${requests.totalItems} request${requests.totalItems === 1 ? "" : "s"} in this view`}
        />
        <TableToolbar>
          <div>
            <div className="text-sm font-medium text-ink">
              Filter tool requests
            </div>
            <div className="mt-0.5 text-sm text-ink-muted">
              Search by business, requester, tool area, or business need.
            </div>
          </div>
          <div className="grid w-full gap-2 lg:w-auto lg:grid-cols-[280px_190px_190px]">
            <TableFilterInput
              icon
              placeholder="Search requests..."
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                requests.resetPagination();
              }}
            />
            <TableFilterSelect
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as typeof statusFilter);
                requests.resetPagination();
              }}
            >
              <option value="all">All statuses</option>
              {Object.entries(toolRequestStatusMeta).map(([value, meta]) => (
                <option key={value} value={value}>
                  {meta.label}
                </option>
              ))}
            </TableFilterSelect>
            <TableFilterAutocomplete
              value={categoryFilter}
              onValueChange={(value) => {
                setCategoryFilter(value);
                requests.resetPagination();
              }}
              options={areaOptions}
              placeholder="All tool areas"
              searchPlaceholder="Search tool areas..."
              emptyMessage="No tool area found."
              onOpenChange={setAreaOpen}
              onSearchChange={setAreaSearch}
              isLoading={areas.isLoading || areas.isFetchingNextPage}
              hasMore={Boolean(areas.hasNextPage)}
              onLoadMore={() => void areas.fetchNextPage()}
            />
          </div>
        </TableToolbar>
        {requests.isLoading ? (
          <TableSkeleton rows={6} columns={6} />
        ) : requests.isError ? (
          <div className="rounded-xl border border-danger/20 bg-danger/5 p-6 text-sm text-danger">
            {requests.error.message}
          </div>
        ) : (
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(request) => request.id}
            emptyMessage="No tool requests match this view."
          />
        )}
        <TablePagination
          page={requests.page}
          pageSize={pageSize}
          totalItems={requests.totalItems}
          onPageChange={requests.setPage}
          onPageSizeChange={(next) => {
            setPageSize(next);
            requests.resetPagination();
          }}
        />
      </Card>

      <Modal open={Boolean(linkedRequestId) && !displayedRequest} onOpenChange={(open) => !open && closeRequest()} title="Tool request details" width="wide">
        {linkedRequest.isLoading ? <div className="space-y-3"><Skeleton className="h-24 w-full" /><Skeleton className="h-36 w-full" /></div> : null}
        {linkedRequest.isError ? <Notice>This tool request is unavailable or outside your access scope.</Notice> : null}
      </Modal>
      <ToolRequestReviewModal
        request={displayedRequest}
        decisionNote={activeRequest ? decisionNote : displayedRequest?.adminNote ?? ""}
        linkedToolId={activeRequest ? linkedToolId : displayedRequest?.linkedToolId ?? ""}
        busy={update.isPending}
        onDecisionNoteChange={(value) => { if (!activeRequest && displayedRequest) setActiveRequest(displayedRequest); setDecisionNote(value); }}
        onLinkedToolChange={(value) => { if (!activeRequest && displayedRequest) setActiveRequest(displayedRequest); setLinkedToolId(value); }}
        onClose={closeRequest}
        onDecide={(status) =>
          displayedRequest && decideRequest(displayedRequest, status)
        }
        onViewLibrary={() => router.push(routes.admin.entrepreneurTools)}
      />
    </>
  );
}

function ToolRequestReviewModal({
  request,
  decisionNote,
  linkedToolId,
  busy,
  onDecisionNoteChange,
  onLinkedToolChange,
  onClose,
  onDecide,
  onViewLibrary,
}: {
  request: ToolRequest | null;
  decisionNote: string;
  linkedToolId: string;
  busy: boolean;
  onDecisionNoteChange: (value: string) => void;
  onLinkedToolChange: (value: string) => void;
  onClose: () => void;
  onDecide: (status: ToolRequestStatus) => void;
  onViewLibrary: () => void;
}) {
  const [toolsOpen, setToolsOpen] = useState(false);
  const [toolSearch, setToolSearch] = useState("");
  const tools = useLazyToolsQuery({
    enabled: toolsOpen && Boolean(request),
    search: toolSearch || undefined,
    status: "published",
    take: 20,
  });
  const toolOptions = tools.rows.map((tool) => ({
    value: tool.id,
    label: tool.name,
    description: tool.toolArea.name,
  }));
  if (
    request?.linkedToolId &&
    !toolOptions.some((option) => option.value === request.linkedToolId)
  ) {
    toolOptions.unshift({
      value: request.linkedToolId,
      label: request.linkedToolName ?? "Linked tool",
      description: "Currently linked",
    });
  }

  return (
    <Modal
      open={Boolean(request)}
      onOpenChange={(open) => !open && onClose()}
      title={
        request
          ? `Review tool request  ${request.toolName}`
          : "Review tool request"
      }
      width="wide"
    >
      {request ? (
        <div>
          <div className="mb-4 rounded-xl border border-line bg-surface-subtle p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-sm text-ink-muted">Requested by</div>
                <div className="mt-1 font-semibold text-ink">
                  {request.businessName}
                </div>
                <div className="mt-1 text-sm text-ink-muted">
                  {request.requesterName} � {request.programme}
                </div>
              </div>
              <Badge tone={toolRequestStatusMeta[request.status].tone}>
                {toolRequestStatusMeta[request.status].label}
              </Badge>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <InfoBlock label="Tool area" value={request.category} />
            <InfoBlock
              label="Requested"
              value={`${formatDate(request.requestedAt)} (${request.requestedAgo})`}
            />
            {request.neededBy ? (
              <InfoBlock
                label="Needed by"
                value={formatDate(request.neededBy)}
              />
            ) : null}
            <InfoBlock
              label="Status"
              value={toolRequestStatusMeta[request.status].label}
            />
          </div>

          <div className="mt-4">
            <InfoPanel
              title="Why the entrepreneur wants this"
              text={request.reason}
            />
          </div>

          <FormField label="Admin decision note" optional className="mt-4">
            <FormTextarea
              rows={4}
              placeholder="Capture why BID is approving, building, or declining this request..."
              value={decisionNote}
              onChange={(event) => onDecisionNoteChange(event.target.value)}
            />
          </FormField>

          {request.availableTransitions.includes("built") ? (
            <FormField label="Finished library tool" className="mt-4">
              <FormAutocomplete
                value={linkedToolId}
                onValueChange={onLinkedToolChange}
                options={toolOptions}
                placeholder="Select the published tool"
                searchPlaceholder="Search published tools..."
                emptyMessage="No published tool found."
                onOpenChange={setToolsOpen}
                onSearchChange={setToolSearch}
                isLoading={tools.isLoading || tools.isFetchingNextPage}
                hasMore={Boolean(tools.hasNextPage)}
                onLoadMore={() => void tools.fetchNextPage()}
              />
            </FormField>
          ) : null}

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={busy}
            >
              Close
            </Button>
            {request.availableTransitions.includes("declined") ? (
              <Button
                type="button"
                variant="destructive"
                onClick={() => onDecide("declined")}
                isLoading={busy}
                disabled={!decisionNote.trim()}
              >
                Decline
              </Button>
            ) : null}
            {request.availableTransitions.includes("in-development") ? (
              <Button
                type="button"
                onClick={() => onDecide("in-development")}
                isLoading={busy}
              >
                Approve for development
              </Button>
            ) : null}
            {request.availableTransitions.includes("built") ? (
              <Button
                type="button"
                onClick={() => onDecide("built")}
                isLoading={busy}
                disabled={!linkedToolId}
              >
                Mark as built
              </Button>
            ) : null}
            {request.availableTransitions.includes("under-review") ? (
              <Button
                type="button"
                onClick={() => onDecide("under-review")}
                isLoading={busy}
              >
                Reopen review
              </Button>
            ) : null}
            {request.status === "built" ? (
              <Button type="button" onClick={onViewLibrary}>
                View linked tool
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2">
      <div className="text-xs font-medium uppercase tracking-[0.04em] text-ink-faint">
        {label}
      </div>
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
