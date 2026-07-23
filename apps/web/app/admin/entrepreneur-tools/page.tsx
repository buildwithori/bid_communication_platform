"use client";

import { useDebouncedValue } from "@/lib/search";
import * as React from "react";
import {
  CalendarDays,
  FileText,
  LayoutGrid,
  Plus,
  Star,
  Timer,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { AdminToolEditorModal } from "@/components/admin/tools/AdminToolEditorModal";
import { SpreadsheetViewer } from "@/components/shared/SpreadsheetViewer";
import { ToolFramePreview } from "@/components/shared/ToolFramePreview";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { Card, CardHeader, TableSkeleton } from "@/components/shared/Card";
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
import { MetricGrid } from "@/components/shared/MetricGrid";
import { Modal } from "@/components/shared/Modal";
import { Notice, PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { useLazyToolAreasQuery } from "@/lib/api/settings";
import {
  useToolsPage,
  useUpdateToolMutation,
  type ApiToolStatus,
  type ApiToolType,
  type ApiToolVisibility,
  type ToolRecord,
} from "@/lib/api/tools";
import { cn } from "@/lib/utils";
import type { BadgeTone } from "@/types";

const iconMap: Record<string, LucideIcon> = {
  canvas: LayoutGrid,
  document: FileText,
  timer: Timer,
  star: Star,
  plus: Plus,
  calendar: CalendarDays,
};
const statusLabels: Record<ApiToolStatus, string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
};
const statusTone: Record<ApiToolStatus, BadgeTone> = {
  draft: "amber",
  published: "green",
  archived: "neutral",
};
const visibilityLabels: Record<ApiToolVisibility, string> = {
  all_entrepreneurs: "All entrepreneurs",
  programmes: "Selected programmes",
  entrepreneurs: "Selected entrepreneurs",
};
const toolTypeLabels: Record<ApiToolType, string> = {
  pdf: "PDF resource",
  excel: "Excel workbook",
  embedded_tool: "Online tool",
};
const toolTypeTone: Record<ApiToolType, BadgeTone> = {
  pdf: "blue",
  excel: "green",
  embedded_tool: "brand",
};

const visibilityTone: Record<ApiToolVisibility, BadgeTone> = {
  all_entrepreneurs: "green",
  programmes: "blue",
  entrepreneurs: "brand",
};

function formatDate(value?: string | null) {
  return value
    ? new Date(value).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Not updated";
}
function sourceLabel(tool: ToolRecord) {
  if (tool.type !== "embedded_tool") {
    return (
      tool.fileAsset?.originalFilename ??
      (tool.type === "excel" ? "No workbook attached" : "No PDF attached")
    );
  }
  return tool.embeddedUrl ? "Online link added" : "No tool link added";
}
function audienceDetail(tool: ToolRecord) {
  if (tool.visibility === "all_entrepreneurs") {
    return tool.audience.hiddenEntrepreneurs.length
      ? `All entrepreneurs except ${tool.audience.hiddenEntrepreneurs.length} hidden`
      : "Every entrepreneur";
  }
  const audience =
    tool.visibility === "programmes"
      ? tool.audience.programmes
      : tool.audience.entrepreneurs;
  if (!audience.length) return "No audience selected";
  const names = audience
    .slice(0, 2)
    .map((item) => item.name)
    .join(", ");
  return audience.length > 2 ? `${names} + ${audience.length - 2} more` : names;
}

export default function AdminEntrepreneurToolsPage() {
  const [query, setQuery] = React.useState("");
  const debouncedQuery = useDebouncedValue(query);
  const [typeFilter, setTypeFilter] = React.useState<"all" | ApiToolType>(
    "all",
  );
  const [toolAreaFilter, setToolAreaFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState<"all" | ApiToolStatus>(
    "all",
  );
  const [visibilityFilter, setVisibilityFilter] = React.useState<
    "all" | ApiToolVisibility
  >("all");
  const [pageSize, setPageSize] = React.useState(10);
  const [activeTool, setActiveTool] = React.useState<ToolRecord | null>(null);
  const [editingTool, setEditingTool] = React.useState<ToolRecord | null>(null);
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [areaSearch, setAreaSearch] = React.useState("");

  const tools = useToolsPage({
    search: debouncedQuery || undefined,
    type: typeFilter === "all" ? undefined : typeFilter,
    toolAreaId: toolAreaFilter === "all" ? undefined : toolAreaFilter,
    status: statusFilter === "all" ? undefined : statusFilter,
    visibility: visibilityFilter === "all" ? undefined : visibilityFilter,
    take: pageSize,
  });
  const areas = useLazyToolAreasQuery({
    enabled: true,
    search: areaSearch || undefined,
    active: true,
    take: 20,
  });
  const update = useUpdateToolMutation({
    onSuccess: (tool) =>
      toast.success("Tool updated", { description: tool.name }),
    onError: (error) =>
      toast.error("Could not update tool", { description: error.message }),
  });
  const areaOptions = [
    { value: "all", label: "All tool areas" },
    ...(areas.data?.pages.flatMap((page) => page.items) ?? []).map((area) => ({
      value: area.id,
      label: area.name,
    })),
  ];

  const openCreate = () => {
    setEditingTool(null);
    setEditorOpen(true);
  };
  const openEdit = (tool: ToolRecord) => {
    setEditingTool(tool);
    setEditorOpen(true);
  };
  const changeStatus = (tool: ToolRecord, status: ApiToolStatus) =>
    update.mutate({ id: tool.id, payload: { status } });

  const getActions = (tool: ToolRecord): Array<RowAction | "separator"> => [
    { label: "View tool", onSelect: () => setActiveTool(tool) },
    { label: "Edit tool", onSelect: () => openEdit(tool) },
    "separator",
    {
      label: tool.status === "published" ? "Move to draft" : "Publish tool",
      disabled: update.isPending || tool.status === "archived",
      onSelect: () =>
        changeStatus(tool, tool.status === "published" ? "draft" : "published"),
    },
    {
      label: tool.status === "archived" ? "Restore as draft" : "Archive tool",
      destructive: tool.status !== "archived",
      disabled: update.isPending,
      onSelect: () =>
        changeStatus(tool, tool.status === "archived" ? "draft" : "archived"),
    },
  ];

  const columns: Column<ToolRecord>[] = [
    {
      key: "action",
      header: "Action",
      cell: (tool) => <RowActions actions={getActions(tool)} />,
      className: "w-[84px]",
    },
    {
      key: "tool",
      header: "Tool",
      cell: (tool) => {
        const Icon = iconMap[tool.iconKey] ?? Wrench;
        return (
          <button
            type="button"
            onClick={() => setActiveTool(tool)}
            className="flex min-w-[280px] max-w-[520px] items-start gap-3 rounded-lg text-left outline-none transition hover:text-bid focus-visible:ring-2 focus-visible:ring-bid/20"
          >
            <span
              className={cn(
                "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                tool.type === "pdf"
                  ? "bg-info-light text-info"
                  : tool.type === "excel"
                    ? "bg-success-light text-success"
                    : "bg-bid-light text-bid",
              )}
            >
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold text-ink">{tool.name}</span>
              <span className="mt-1 line-clamp-2 text-sm leading-5 text-ink-muted">
                {tool.description}
              </span>
            </span>
          </button>
        );
      },
    },
    {
      key: "type",
      header: "Type",
      className: "min-w-[156px]",
      cell: (tool) => (
        <Badge tone={toolTypeTone[tool.type]}>
          {toolTypeLabels[tool.type]}
        </Badge>
      ),
    },
    {
      key: "toolArea",
      header: "Tool area",
      cell: (tool) => <Badge tone="neutral">{tool.toolArea.name}</Badge>,
    },
    {
      key: "audience",
      header: "Who can see it",
      cell: (tool) => (
        <div className="min-w-[240px] max-w-[360px]">
          <Badge tone={visibilityTone[tool.visibility]}>
            {visibilityLabels[tool.visibility]}
          </Badge>
          <div className="mt-2 line-clamp-2 text-sm leading-5 text-ink-muted">
            {audienceDetail(tool)}
          </div>
        </div>
      ),
    },
    {
      key: "source",
      header: "Source",
      className: "w-[220px] max-w-[220px]",
      cell: (tool) => {
        const source = sourceLabel(tool);
        return (
          <div className="truncate text-sm text-ink-muted" title={source}>
            {source}
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      cell: (tool) => (
        <Badge tone={statusTone[tool.status]}>
          {statusLabels[tool.status]}
        </Badge>
      ),
    },
    {
      key: "updated",
      header: "Updated",
      cell: (tool) => (
        <div className="min-w-[120px] text-sm text-ink-muted">
          {formatDate(tool.updatedAt)}
        </div>
      ),
    },
  ];

  const summary = tools.summary;
  const targeted =
    (summary?.visibility.programmes ?? 0) +
    (summary?.visibility.entrepreneurs ?? 0);

  return (
    <>
      <PageHeader
        title="Entrepreneur tools"
        description="Manage PDF resources, Excel workbooks, and online tools entrepreneurs can use in their workspace."
        actions={<Button onClick={openCreate}>+ Add tool</Button>}
      />
      <Notice>
        Use global visibility for broad self-serve tools, programme visibility
        for curriculum-specific tools, and individual visibility only for
        targeted exceptions.
      </Notice>

      <MetricGrid className="mb-4">
        <StatCard
          label="Published tools"
          value={summary?.statuses.published ?? 0}
          subline="Visible when access rules match"
          dotColor="success"
          accent="success"
        />
        <StatCard
          label="Global tools"
          value={summary?.visibility.allEntrepreneurs ?? 0}
          subline="Available to every entrepreneur"
          dotColor="bid"
          accent="bid"
        />
        <StatCard
          label="Targeted tools"
          value={targeted}
          subline="Programme or entrepreneur-specific"
          dotColor="info"
          accent="info"
        />
        <StatCard
          label="Drafts"
          value={summary?.statuses.draft ?? 0}
          subline="Not visible yet"
          dotColor="warning"
          accent="warning"
        />
      </MetricGrid>

      <Card>
        <CardHeader
          title="Tool library"
          description={`${tools.totalItems} tool${tools.totalItems === 1 ? "" : "s"} in this view`}
        />
        <TableToolbar>
          <div>
            <div className="text-sm font-medium text-ink">
              Filter entrepreneur tools
            </div>
            <div className="mt-0.5 text-sm text-ink-muted">
              Search by tool name, tool area, or description.
            </div>
          </div>
          <div className="grid w-full gap-2 lg:w-auto lg:grid-cols-[240px_170px_190px_170px_200px]">
            <TableFilterInput
              icon
              placeholder="Search tools..."
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                tools.resetPagination();
              }}
            />
            <TableFilterSelect
              value={typeFilter}
              onChange={(event) => {
                setTypeFilter(event.target.value as typeof typeFilter);
                tools.resetPagination();
              }}
            >
              <option value="all">All types</option>
              <option value="pdf">PDF resources</option>
              <option value="excel">Excel workbooks</option>
              <option value="embedded_tool">Online tools</option>
            </TableFilterSelect>
            <TableFilterAutocomplete
              value={toolAreaFilter}
              onValueChange={(value) => {
                setToolAreaFilter(value);
                tools.resetPagination();
              }}
              options={areaOptions}
              placeholder="All tool areas"
              searchPlaceholder="Search tool areas..."
              emptyMessage="No tool area found."
              onSearchChange={setAreaSearch}
              isLoading={areas.isLoading || areas.isFetchingNextPage}
              hasMore={Boolean(areas.hasNextPage)}
              onLoadMore={() => void areas.fetchNextPage()}
            />
            <TableFilterSelect
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as typeof statusFilter);
                tools.resetPagination();
              }}
            >
              <option value="all">All statuses</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </TableFilterSelect>
            <TableFilterSelect
              value={visibilityFilter}
              onChange={(event) => {
                setVisibilityFilter(
                  event.target.value as typeof visibilityFilter,
                );
                tools.resetPagination();
              }}
            >
              <option value="all">All audiences</option>
              {Object.entries(visibilityLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </TableFilterSelect>
          </div>
        </TableToolbar>
        {tools.isLoading ? (
          <TableSkeleton rows={6} columns={8} />
        ) : tools.isError ? (
          <div className="rounded-xl border border-danger/20 bg-danger/5 p-6 text-sm text-danger">
            {tools.error.message}
          </div>
        ) : (
          <DataTable
            columns={columns}
            rows={tools.rows}
            rowKey={(tool) => tool.id}
            emptyMessage="No tools match this view."
            tableClassName="min-w-[1080px]"
          />
        )}
        <TablePagination
          page={tools.page}
          pageSize={pageSize}
          totalItems={tools.totalItems}
          pageSizeOptions={[10, 25, 50]}
          onPageChange={tools.setPage}
          onPageSizeChange={(next) => {
            setPageSize(next);
            tools.resetPagination();
          }}
        />
      </Card>

      {editorOpen ? (
        <AdminToolEditorModal
          key={editingTool?.id ?? "new-tool"}
          open
          tool={editingTool}
          onOpenChange={setEditorOpen}
          onSaved={(tool) => {
            setEditingTool(tool);
            setActiveTool((current) =>
              current?.id === tool.id ? tool : current,
            );
          }}
        />
      ) : null}
      <ToolDetailsModal
        tool={activeTool}
        onClose={() => setActiveTool(null)}
        onEdit={(tool) => {
          setActiveTool(null);
          openEdit(tool);
        }}
      />
    </>
  );
}

function ToolDetailsModal({
  tool,
  onClose,
  onEdit,
}: {
  tool: ToolRecord | null;
  onClose: () => void;
  onEdit: (tool: ToolRecord) => void;
}) {
  if (!tool) return null;
  const previewUrl =
    tool.type === "embedded_tool"
      ? tool.embeddedUrl
      : tool.type === "pdf"
        ? tool.fileAsset?.downloadUrl
        : null;
  return (
    <Modal
      open={Boolean(tool)}
      onOpenChange={(open) => !open && onClose()}
      title="Tool preview"
      width="media"
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-line bg-surface-subtle p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge tone={toolTypeTone[tool.type]}>
                  {toolTypeLabels[tool.type]}
                </Badge>
                <Badge tone={statusTone[tool.status]}>
                  {statusLabels[tool.status]}
                </Badge>
                <Badge tone={visibilityTone[tool.visibility]}>
                  {visibilityLabels[tool.visibility]}
                </Badge>
              </div>
              <div className="mt-3 text-2xl font-semibold text-ink">
                {tool.name}
              </div>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-muted">
                {tool.description}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => onEdit(tool)}>Edit tool</Button>
            </div>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <InfoBlock label="Tool area" value={tool.toolArea.name} />
          <InfoBlock
            label="Audience"
            value={visibilityLabels[tool.visibility]}
            detail={audienceDetail(tool)}
          />
          <InfoBlock label="Source" value={sourceLabel(tool)} />
          <InfoBlock label="Last updated" value={formatDate(tool.updatedAt)} />
        </div>
        {tool.type === "excel" ? (
          <SpreadsheetViewer fileId={tool.fileAsset?.id} title={tool.name} />
        ) : previewUrl ? (
          <ToolFramePreview
            key={`${tool.id}:${previewUrl}`}
            title={tool.name}
            url={
              tool.type === "embedded_tool"
                ? previewUrl
                : previewUrl + "#view=FitH&toolbar=1&navpanes=1"
            }
            type={tool.type === "embedded_tool" ? "online" : "pdf"}
            className="[&>iframe]:h-[64vh]"
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-line bg-card">
            <div className="grid min-h-[320px] place-items-center bg-surface-subtle p-8 text-center text-sm text-ink-muted">
              Add a {tool.type === "pdf" ? "PDF resource" : "tool link"} before
              this can be previewed.
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function InfoBlock({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-card p-3">
      <div className="text-xs font-medium uppercase tracking-[0.04em] text-ink-faint">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-ink">{value}</div>
      {detail ? (
        <div className="mt-1 line-clamp-2 text-sm leading-5 text-ink-muted">
          {detail}
        </div>
      ) : null}
    </div>
  );
}
