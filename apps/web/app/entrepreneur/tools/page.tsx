"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  LayoutGrid,
  Plus,
  Star,
  Timer,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import {
  Card,
  CardHeader,
  Skeleton,
  TableSkeleton,
} from "@/components/shared/Card";
import { DatePicker } from "@/components/shared/DatePicker";
import {
  DataTable,
  RowActions,
  TableFilterAutocomplete,
  TableFilterInput,
  TableFilterSelect,
  TablePagination,
  TableToolbar,
  type Column,
} from "@/components/shared/DataTable";
import {
  FormAutocomplete,
  FormField,
  FormInput,
  FormTextarea,
} from "@/components/shared/FormField";
import { Modal } from "@/components/shared/Modal";
import { PageHeader } from "@/components/shared/PageHeader";
import { Tabs } from "@/components/shared/Tabs";
import {
  useCreateToolRequestMutation,
  useToolRequestDetailQuery,
  useToolRequestsPage,
  type ToolRequestRecord,
} from "@/lib/api/tool-requests";
import { useLazyToolAreasQuery } from "@/lib/api/settings";
import { useToolsPage } from "@/lib/api/tools";
import { toolRequestSchema, type ToolRequestForm } from "@/lib/forms/schemas";
import {
  mapToolRequestRecordToUi,
  toolRequestStatusMeta,
  uiToApiToolRequestStatus,
  type ToolRequest,
} from "@/lib/tool-requests";
import { mapToolRecordToUi } from "@/lib/tools/tool-records";
import { cn } from "@/lib/utils";
import type { Tool } from "@/types";

type ToolTab = "all" | "pdf" | "embed" | "requests";

const iconMap: Record<Tool["iconKey"], LucideIcon> = {
  canvas: LayoutGrid,
  document: FileText,
  timer: Timer,
  star: Star,
  plus: Plus,
  calendar: CalendarDays,
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ToolCard({ tool, onClick }: { tool: Tool; onClick: () => void }) {
  const Icon = iconMap[tool.iconKey] ?? Wrench;
  const isOnline = tool.type === "embed";
  return (
    <Card
      onClick={onClick}
      className="group relative flex min-h-[150px] cursor-pointer flex-col transition-colors hover:border-bid hover:bg-card"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
            isOnline ? "bg-bid-light" : "bg-info-light",
          )}
        >
          <Icon
            className={cn("h-6 w-6", isOnline ? "text-bid" : "text-info")}
            strokeWidth={1.7}
          />
        </div>
        <Badge tone={isOnline ? "green" : "blue"}>
          {isOnline ? "Online tool" : "PDF resource"}
        </Badge>
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-base font-semibold leading-tight text-ink transition group-hover:text-bid-dark">
          {tool.name}
        </div>
        <div className="mt-2 line-clamp-2 text-sm leading-6 text-ink-muted">
          {tool.description}
        </div>
      </div>
    </Card>
  );
}

function RequestToolModal({
  open,
  busy,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ToolRequestForm) => void;
}) {
  const [areaSearch, setAreaSearch] = React.useState("");
  const areas = useLazyToolAreasQuery({
    enabled: open,
    search: areaSearch || undefined,
    active: true,
    take: 20,
  });
  const form = useForm<ToolRequestForm>({
    resolver: zodResolver(toolRequestSchema),
    defaultValues: { name: "", category: "", neededBy: "", reason: "" },
  });
  const category = useWatch({ control: form.control, name: "category" });
  const neededBy = useWatch({ control: form.control, name: "neededBy" });
  const areaOptions =
    areas.data?.pages.flatMap((page) =>
      page.items.map((area) => ({ value: area.id, label: area.name })),
    ) ?? [];

  const submit = (values: ToolRequestForm) => onSubmit(values);

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Request a tool">
      <form onSubmit={form.handleSubmit(submit)}>
        <FormField
          label="Tool name or idea"
          error={form.formState.errors.name?.message}
        >
          <FormInput
            placeholder="e.g. Cash flow forecasting tool"
            {...form.register("name")}
          />
        </FormField>
        <FormField
          label="Tool area"
          error={form.formState.errors.category?.message}
        >
          <FormAutocomplete
            value={category}
            onValueChange={(value) =>
              form.setValue("category", value, { shouldValidate: true })
            }
            options={areaOptions}
            placeholder="Select the area this tool supports"
            searchPlaceholder="Search tool areas..."
            emptyMessage="No tool area found."
            onSearchChange={setAreaSearch}
            isLoading={areas.isLoading || areas.isFetchingNextPage}
            hasMore={Boolean(areas.hasNextPage)}
            onLoadMore={() => void areas.fetchNextPage()}
          />
        </FormField>
        <FormField label="Needed by" optional>
          <DatePicker
            value={neededBy}
            onChange={(value) =>
              form.setValue("neededBy", value, { shouldValidate: true })
            }
            placeholder="Select a date if time-sensitive"
          />
        </FormField>
        <FormField
          label="Why would this help you?"
          error={form.formState.errors.reason?.message}
        >
          <FormTextarea
            rows={3}
            placeholder="Tell the BID team what you need and why&"
            {...form.register("reason")}
          />
        </FormField>
        <Button type="submit" className="w-full" isLoading={busy}>
          Send request
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
  const isOnline = tool.type === "embed";
  const previewUrl = isOnline ? tool.embedUrl : tool.pdfUrl;
  const currentIndex = Math.max(
    tools.findIndex((item) => item.id === tool.id),
    0,
  );
  const previousTool = currentIndex > 0 ? tools[currentIndex - 1] : undefined;
  const nextTool =
    currentIndex < tools.length - 1 ? tools[currentIndex + 1] : undefined;

  return (
    <Modal
      open={Boolean(tool)}
      onOpenChange={(open) => !open && onClose()}
      title="Tool preview"
      width="media"
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-surface-subtle p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span
                className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                  isOnline
                    ? "bg-bid-light text-bid"
                    : "bg-info-light text-info",
                )}
              >
                <Icon className="h-6 w-6" strokeWidth={1.8} />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={isOnline ? "green" : "blue"}>
                    {isOnline ? "Online tool" : "PDF resource"}
                  </Badge>
                  <span className="rounded-full bg-card px-2.5 py-1 text-xs font-medium text-ink-muted shadow-sm">
                    {currentIndex + 1} of {tools.length}
                  </span>
                </div>
                <div className="mt-2 text-2xl font-semibold leading-tight text-ink">
                  {tool.name}
                </div>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-muted">
                  {tool.description}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={() => previousTool && onChangeTool(previousTool)}
                disabled={!previousTool}
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <Button
                variant="outline"
                onClick={() => nextTool && onChangeTool(nextTool)}
                disabled={!nextTool}
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
              {previewUrl ? (
                <Button
                  asChild
                  variant="outline"
                  className="border-bid/35 bg-bid-light/35 text-bid-dark hover:bg-bid-light"
                >
                  <a href={previewUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" /> Open
                  </a>
                </Button>
              ) : null}
            </div>
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {previewUrl ? (
            <iframe
              title={`${tool.name} preview`}
              src={previewUrl}
              sandbox={
                isOnline
                  ? "allow-forms allow-popups allow-same-origin allow-scripts"
                  : undefined
              }
              className="h-[56vh] min-h-[430px] w-full bg-card"
            />
          ) : (
            <div className="grid min-h-[430px] place-items-center bg-surface-subtle p-8 text-center">
              <div>
                <div className="text-base font-semibold text-ink">
                  Preview is not available
                </div>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-muted">
                  This tool needs a {isOnline ? "tool link" : "PDF file"} before
                  it can be previewed.
                </p>
              </div>
            </div>
          )}
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
  return (
    <Modal
      open={Boolean(request)}
      onOpenChange={(open) => !open && onClose()}
      title={request?.toolName ?? "Tool request"}
      width="wide"
    >
      {request && statusMeta ? (
        <div>
          <div className="rounded-xl border border-line bg-surface-subtle p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm text-ink-muted">Request from</div>
                <div className="mt-1 font-semibold text-ink">
                  {request.businessName}
                </div>
                <div className="mt-1 text-sm text-ink-muted">
                  {request.programme}
                </div>
              </div>
              <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <RequestInfoBlock label="Tool area" value={request.category} />
            <RequestInfoBlock
              label="Requested"
              value={`${formatDate(request.requestedAt)} (${request.requestedAgo})`}
            />
            {request.neededBy ? (
              <RequestInfoBlock
                label="Needed by"
                value={formatDate(request.neededBy)}
              />
            ) : null}
            <RequestInfoBlock label="Current status" value={statusMeta.label} />
          </div>
          <div className="mt-4 grid gap-3">
            <RequestInfoPanel title="Business need" text={request.reason} />
            {request.adminNote ? (
              <RequestInfoPanel
                title="BID decision note"
                text={request.adminNote}
              />
            ) : null}
          </div>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
            {request.status === "built" ? (
              <Button type="button" onClick={onBrowseTools}>
                Browse tools
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

function RequestInfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-card px-3 py-2">
      <div className="text-xs font-medium uppercase tracking-[0.04em] text-ink-faint">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium text-ink">{value}</div>
    </div>
  );
}

function RequestInfoPanel({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-line bg-card px-4 py-3">
      <div className="text-sm font-semibold text-ink">{title}</div>
      <p className="mt-2 text-sm leading-6 text-ink-muted">{text}</p>
    </div>
  );
}

export default function ToolsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const linkedRequestId = searchParams.get("requestId");
  const linkedRequest = useToolRequestDetailQuery(linkedRequestId);
  const [tab, setTab] = React.useState<ToolTab>("all");
  const [query, setQuery] = React.useState("");
  const deferredQuery = React.useDeferredValue(query);
  const [pageSize, setPageSize] = React.useState(6);
  const [requestQuery, setRequestQuery] = React.useState("");
  const deferredRequestQuery = React.useDeferredValue(requestQuery);
  const [requestStatus, setRequestStatus] = React.useState<
    "all" | ToolRequest["status"]
  >("all");
  const [requestCategory, setRequestCategory] = React.useState("all");
  const [requestPageSize, setRequestPageSize] = React.useState(10);
  const [requestOpen, setRequestOpen] = React.useState(false);
  const [activeRequest, setActiveRequest] = React.useState<ToolRequest | null>(
    null,
  );
  const [activeTool, setActiveTool] = React.useState<Tool | null>(null);
  const linkedRecord = linkedRequest.data as ToolRequestRecord | undefined;
  const linkedRequestView = linkedRecord ? mapToolRequestRecordToUi(linkedRecord) : null;
  const displayedRequest = activeRequest ?? linkedRequestView;
  const displayedTab: ToolTab = linkedRequestId ? "requests" : tab;


  function closeRequest() {
    setActiveRequest(null);
    if (linkedRequestId) router.replace("/entrepreneur/tools");
  }
  const [areaOpen, setAreaOpen] = React.useState(false);
  const [areaSearch, setAreaSearch] = React.useState("");

  const toolPage = useToolsPage({
    search: deferredQuery || undefined,
    type: displayedTab === "pdf" ? "pdf" : displayedTab === "embed" ? "embedded_tool" : undefined,
    take: pageSize,
  });
  const requestPage = useToolRequestsPage({
    search: deferredRequestQuery || undefined,
    status:
      requestStatus === "all"
        ? undefined
        : uiToApiToolRequestStatus[requestStatus],
    toolAreaId: requestCategory === "all" ? undefined : requestCategory,
    take: requestPageSize,
  });
  const requestMutation = useCreateToolRequestMutation({
    onSuccess: (record) => {
      toast.success("Request sent to BID team", { description: record.title });
      setRequestOpen(false);
    },
    onError: (error) =>
      toast.error("Could not send request", { description: error.message }),
  });
  const areas = useLazyToolAreasQuery({
    enabled: areaOpen,
    search: areaSearch || undefined,
    active: true,
    take: 20,
  });

  const tools: Tool[] = React.useMemo<Tool[]>(
    () => toolPage.rows.map(mapToolRecordToUi),
    [toolPage.rows],
  );
  const requests = React.useMemo(
    () => requestPage.rows.map(mapToolRequestRecordToUi),
    [requestPage.rows],
  );
  const areaOptions = [
    { value: "all", label: "All tool areas" },
    ...(areas.data?.pages.flatMap((page) => page.items) ?? []).map((area) => ({
      value: area.id,
      label: area.name,
    })),
  ];

  const requestColumns: Column<ToolRequest>[] = [
    {
      key: "action",
      header: "Action",
      cell: (request) => (
        <RowActions
          actions={[
            {
              label: "View request",
              onSelect: () => setActiveRequest(request),
            },
          ]}
        />
      ),
      className: "w-[84px]",
    },
    {
      key: "request",
      header: "Request",
      cell: (request) => (
        <div className="min-w-[280px] max-w-[520px]">
          <button
            type="button"
            onClick={() => setActiveRequest(request)}
            className="text-left font-medium text-ink transition hover:text-bid"
          >
            {request.toolName}
          </button>
          <div className="mt-1 line-clamp-2 text-sm leading-5 text-ink-muted">
            {request.reason}
          </div>
        </div>
      ),
    },
    {
      key: "area",
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

  return (
    <>
      <PageHeader
        title="Entrepreneur Tools"
        description="Downloadable PDF resources and embedded online tools"
        actions={
          <Button onClick={() => setRequestOpen(true)}>+ Request a tool</Button>
        }
      />
      <Tabs
        value={displayedTab}
        onChange={setTab}
        tabs={[
          { value: "all", label: "All tools" },
          { value: "pdf", label: "PDF resources" },
          { value: "embed", label: "Online tools" },
          { value: "requests", label: "My requests" },
        ]}
      />

      {displayedTab === "requests" ? (
        <Card>
          <CardHeader
            title="Your tool requests"
            description="Track requests you have sent to BID and the admin decision state."
            actions={
              <Badge tone="neutral">{requestPage.totalItems} requests</Badge>
            }
          />
          <TableToolbar>
            <div>
              <div className="text-sm font-medium text-ink">
                Filter requests
              </div>
              <div className="mt-0.5 text-sm text-ink-muted">
                Search by request, tool area, status, or business need.
              </div>
            </div>
            <div className="grid w-full gap-2 lg:w-auto lg:grid-cols-[260px_180px_180px]">
              <TableFilterInput
                icon
                placeholder="Search requests..."
                value={requestQuery}
                onChange={(event) => {
                  setRequestQuery(event.target.value);
                  requestPage.resetPagination();
                }}
              />
              <TableFilterSelect
                value={requestStatus}
                onChange={(event) => {
                  setRequestStatus(event.target.value as typeof requestStatus);
                  requestPage.resetPagination();
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
                value={requestCategory}
                onValueChange={(value) => {
                  setRequestCategory(value);
                  requestPage.resetPagination();
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
          {requestPage.isLoading ? (
            <TableSkeleton rows={5} columns={5} />
          ) : requestPage.isError ? (
            <div className="rounded-xl border border-danger/20 bg-danger/5 p-6 text-sm text-danger">
              {requestPage.error.message}
            </div>
          ) : (
            <DataTable
              columns={requestColumns}
              rows={requests}
              rowKey={(request) => request.id}
              emptyMessage="No tool requests match this view."
              tableClassName="min-w-[920px]"
            />
          )}
          <TablePagination
            page={requestPage.page}
            pageSize={requestPageSize}
            totalItems={requestPage.totalItems}
            onPageChange={requestPage.setPage}
            onPageSizeChange={(next) => {
              setRequestPageSize(next);
              requestPage.resetPagination();
            }}
          />
        </Card>
      ) : (
        <Card>
          <TableToolbar>
            <div>
              <div className="text-sm font-medium text-ink">Browse tools</div>
              <div className="mt-0.5 text-sm text-ink-muted">
                {toolPage.totalItems} tools available in this view.
              </div>
            </div>
            <div className="w-full sm:w-[320px]">
              <TableFilterInput
                icon
                placeholder="Search tools..."
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  toolPage.resetPagination();
                }}
              />
            </div>
          </TableToolbar>
          {toolPage.isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, index) => (
                <Skeleton key={index} className="h-[170px] rounded-xl" />
              ))}
            </div>
          ) : toolPage.isError ? (
            <div className="rounded-xl border border-danger/20 bg-danger/5 p-6 text-sm text-danger">
              {toolPage.error.message}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {tools.map((tool) => (
                <ToolCard
                  key={tool.id}
                  tool={tool}
                  onClick={() => setActiveTool(tool)}
                />
              ))}
              {tools.length === 0 ? (
                <div className="col-span-full rounded-xl border border-dashed border-line-strong bg-surface-subtle px-4 py-10 text-center text-sm text-ink-muted">
                  No tools match this view.
                </div>
              ) : null}
            </div>
          )}
          <TablePagination
            page={toolPage.page}
            pageSize={pageSize}
            totalItems={toolPage.totalItems}
            pageSizeOptions={[6, 12, 24]}
            onPageChange={toolPage.setPage}
            onPageSizeChange={(next) => {
              setPageSize(next);
              toolPage.resetPagination();
            }}
          />
        </Card>
      )}

      <RequestToolModal
        open={requestOpen}
        busy={requestMutation.isPending}
        onOpenChange={setRequestOpen}
        onSubmit={(values) =>
          requestMutation.mutate({
            title: values.name,
            toolAreaId: values.category,
            businessNeed: values.reason,
            neededBy: values.neededBy || null,
          })
        }
      />
      <Modal open={Boolean(linkedRequestId) && !displayedRequest} onOpenChange={(open) => !open && closeRequest()} title="Tool request details" width="wide">
        {linkedRequest.isLoading ? <div className="space-y-3"><Skeleton className="h-24 w-full" /><Skeleton className="h-36 w-full" /></div> : null}
        {linkedRequest.isError ? <div className="rounded-xl border border-danger/20 bg-danger/5 p-4 text-sm text-danger">This tool request is unavailable or outside your access scope.</div> : null}
      </Modal>
      <ViewToolRequestModal
        request={displayedRequest}
        onClose={closeRequest}
        onBrowseTools={() => {
          setActiveRequest(null);
          setTab("all");
        }}
      />
      <ToolPreviewModal
        tool={activeTool}
        tools={tools}
        onChangeTool={setActiveTool}
        onClose={() => setActiveTool(null)}
      />
    </>
  );
}
