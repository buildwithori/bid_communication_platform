"use client";

import { useDebouncedValue } from "@/lib/search";
import * as React from "react";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { FileSpreadsheet, FileText, PlayCircle, Wrench } from "lucide-react";
import {
  AttachContentItemModal,
  CreateContentItemModal,
  EditContentItemModal,
} from "@/components/admin/content/ContentItemModals";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { Card, CardHeader, Skeleton } from "@/components/shared/Card";
import {
  DataTable,
  RowActions,
  TableFilterInput,
  TablePagination,
  TableToolbar,
  type Column,
} from "@/components/shared/DataTable";
import { DestructiveActionModal } from "@/components/shared/DestructiveActionModal";
import { Notice, PageHeader } from "@/components/shared/PageHeader";
import { Tabs } from "@/components/shared/Tabs";
import {
  useContentItemsPage,
  useDeleteContentItemMutation,
  type ContentItemRecord,
  type ContentItemStatus,
  type ContentItemType,
} from "@/lib/api/content";

const typeMeta = {
  video: {
    label: "Video",
    plural: "Videos",
    icon: PlayCircle,
    tone: "blue",
  },
  pdf: {
    label: "PDF",
    plural: "PDFs",
    icon: FileText,
    tone: "neutral",
  },
  excel: {
    label: "Excel",
    plural: "Excel workbooks",
    icon: FileSpreadsheet,
    tone: "green",
  },
  tool: {
    label: "Tool",
    plural: "Tools",
    icon: Wrench,
    tone: "brand",
  },
} as const;

export default function AdminContentPage() {
  return (
    <React.Suspense fallback={<ContentLibrarySkeleton activeType="video" />}>
      <ContentLibrary />
    </React.Suspense>
  );
}

function ContentLibrary() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const moduleId = searchParams.get("moduleId") ?? undefined;
  const tab = contentTabFromQuery(searchParams.get("tab"));
  const setTab = React.useCallback(
    (nextTab: ContentItemType) => {
      if (nextTab === tab) return;
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", nextTab);
      router.push((pathname + "?" + params.toString()) as Route, {
        scroll: false,
      });
    },
    [pathname, router, searchParams, tab],
  );
  const [query, setQuery] = React.useState("");
  const debouncedQuery = useDebouncedValue(query);
  const [pageSize, setPageSize] = React.useState(10);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<ContentItemRecord | null>(
    null,
  );
  const [attachTarget, setAttachTarget] =
    React.useState<ContentItemRecord | null>(null);
  const [deleteTarget, setDeleteTarget] =
    React.useState<ContentItemRecord | null>(null);
  const deleteContent = useDeleteContentItemMutation({
    onSuccess: () => {
      setDeleteTarget(null);
      toast.success("Content deleted.");
    },
    onError: (error) => toast.error(error.message),
  });

  const content = useContentItemsPage({
    type: tab,
    search: debouncedQuery.trim() || undefined,
    moduleId,
    take: pageSize,
  });
  const resetPagination = content.resetPagination;

  React.useEffect(() => {
    resetPagination();
  }, [debouncedQuery, moduleId, pageSize, resetPagination, tab]);

  const showInitialSkeleton = content.isPending && !content.data;
  const showTableSkeleton = content.isPlaceholderData;

  const columns = React.useMemo<Column<ContentItemRecord>[]>(
    () => [
      {
        key: "actions",
        header: "Action",
        cell: (item) => (
          <RowActions
            actions={[
              {
                label: "Edit content",
                onSelect: () => setEditTarget(item),
              },
              {
                label: "Add to another module",
                onSelect: () => setAttachTarget(item),
              },
              {
                label: "Delete content",
                destructive: true,
                disabled: deleteContent.isPending,
                onSelect: () => setDeleteTarget(item),
              },
            ]}
          />
        ),
        className: "w-[84px]",
      },
      {
        key: "title",
        header: "Content",
        cell: (item) => {
          const meta = typeMeta[item.type];
          const Icon = meta.icon;
          return (
            <div className="flex min-w-[280px] items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-subtle text-bid">
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <div className="font-semibold text-ink">{item.title}</div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                  <StatusBadge status={item.status} />
                </div>
              </div>
            </div>
          );
        },
      },
      {
        key: "owner",
        header: "Trainer owner",
        cell: (item) =>
          item.trainer ? (
            <div className="min-w-[190px]">
              <div className="font-medium text-ink">{item.trainer.name}</div>
              <div className="mt-0.5 text-xs text-ink-muted">
                {item.trainer.email}
              </div>
            </div>
          ) : (
            <span className="text-sm text-ink-muted">Not assigned</span>
          ),
      },
      {
        key: "source",
        header: "Asset",
        cell: (item) => (
          <div className="min-w-[180px] text-sm">
            <div className="font-medium text-ink">{sourceLabel(item)}</div>
            <div className="mt-1 text-xs text-ink-muted">
              {item.type === "video" && item.status === "failed"
                ? item.video?.failureReason ??
                  "Processing failed. Delete this item and upload it again."
                : item.durationLabel ?? updatedLabel(item.updatedAt)}
            </div>
          </div>
        ),
      },
      {
        key: "usage",
        header: "Used in",
        cell: (item) => (
          <div className="min-w-[180px]">
            <div className="font-medium text-ink">
              {item.usage.modules} module
              {item.usage.modules === 1 ? "" : "s"}
            </div>
            <div className="mt-1 text-xs text-ink-muted">
              Across {item.usage.programmes} programme
              {item.usage.programmes === 1 ? "" : "s"}
            </div>
          </div>
        ),
      },
    ],
    [deleteContent.isPending],
  );

  if (showInitialSkeleton) {
    return <ContentLibrarySkeleton activeType={tab} />;
  }

  return (
    <>
      <PageHeader
        title="Content library"
        description="Upload once, reuse across programme modules, and keep trainer attribution in one place."
        actions={
          <Button onClick={() => setCreateOpen(true)}>+ Upload content</Button>
        }
      />

      {moduleId ? (
        <Notice className="mb-4">
          Showing content attached to the selected module. Uploading from this
          view adds the new item directly to that module.
        </Notice>
      ) : null}

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          {
            value: "video",
            label: `Videos (${content.summary.video})`,
          },
          {
            value: "pdf",
            label: `PDFs (${content.summary.pdf})`,
          },
          {
            value: "excel",
            label: `Excel (${content.summary.excel})`,
          },
          {
            value: "tool",
            label: `Tools (${content.summary.tool})`,
          },
        ]}
      />

      <Card>
        <CardHeader
          title={`${typeMeta[tab].plural} content`}
          description={
            showTableSkeleton ? (
              <Skeleton className="h-4 w-36" />
            ) : (
              `${content.totalItems} reusable asset${content.totalItems === 1 ? "" : "s"} found`
            )
          }
        />
        <TableToolbar>
          <div>
            <div className="text-sm font-medium text-ink">
              Find content quickly
            </div>
            <div className="mt-0.5 text-sm text-ink-muted">
              Search by content title or trainer.
            </div>
          </div>
          <div className="w-full sm:w-[340px]">
            <TableFilterInput
              icon
              placeholder="Search content..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </TableToolbar>

        {content.isError ? (
          <Notice>Content could not be loaded. {content.error.message}</Notice>
        ) : showTableSkeleton ? (
          <ContentTableSkeleton type={tab} rows={pageSize} />
        ) : (
          <DataTable
            columns={columns}
            rows={content.rows}
            rowKey={(item) => item.id}
            emptyMessage={
              query
                ? "No content matches this search."
                : `No ${typeMeta[tab].plural.toLowerCase()} have been added yet.`
            }
            tableClassName="min-w-[1040px]"
          />
        )}

        {showTableSkeleton ? (
          <ContentPaginationSkeleton />
        ) : (
          <TablePagination
            page={content.page}
            pageSize={pageSize}
            totalItems={content.totalItems}
            pageSizeOptions={[10, 20, 50]}
            onPageChange={content.setPage}
            onPageSizeChange={setPageSize}
          />
        )}
      </Card>

      <CreateContentItemModal
        key={`${moduleId ?? "library"}-${tab}`}
        open={createOpen}
        onOpenChange={setCreateOpen}
        initialModuleId={moduleId}
        initialType={tab}
      />
      <EditContentItemModal
        item={editTarget}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
      />
      <AttachContentItemModal
        item={attachTarget}
        onOpenChange={(open) => {
          if (!open) setAttachTarget(null);
        }}
      />
      <DestructiveActionModal
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete content"
        resourceName={deleteTarget?.title ?? ""}
        description="This permanently removes the content item from the BID Hub content library and every module that uses it."
        consequences={[
          (deleteTarget?.usage.modules ?? 0) +
            " module" +
            (deleteTarget?.usage.modules === 1 ? "" : "s") +
            " will lose this content.",
          "Learner progress and ratings for this content will be permanently deleted.",
          deleteTarget?.type === "tool"
            ? "Any linked tool remains available; only this learning content link is deleted."
            : "The uploaded media file will also be permanently deleted.",
        ]}
        confirmLabel="Delete content"
        isPending={deleteContent.isPending}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await deleteContent.mutateAsync({
            contentItemId: deleteTarget.id,
            confirmation: deleteTarget.title,
          });
        }}
      />
    </>
  );
}

function StatusBadge({ status }: { status: ContentItemStatus }) {
  const tones = {
    draft: "neutral",
    processing: "amber",
    ready: "green",
    failed: "red",
    archived: "red",
  } as const;
  return (
    <Badge tone={tones[status]}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function contentTabFromQuery(value: string | null): ContentItemType {
  return value === "pdf" || value === "excel" || value === "tool"
    ? value
    : "video";
}

function sourceLabel(item: ContentItemRecord) {
  if (item.type === "video") {
    if (item.video?.status === "ready") return "Video ready";
    if (item.video?.status === "failed") return "Video processing failed";
    return "Video processing";
  }
  if (item.type === "pdf") {
    return item.file?.originalFilename ?? "PDF asset";
  }
  if (item.type === "excel") {
    return item.file?.originalFilename ?? "Excel workbook";
  }
  return item.toolLink?.toolName ?? item.toolLink?.url ?? "Embedded tool";
}

function updatedLabel(value: string) {
  return `Updated ${new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

function ContentLibrarySkeleton({
  activeType,
}: {
  activeType: ContentItemType;
}) {
  return (
    <>
      <PageHeader
        title="Content library"
        description="Upload once, reuse across programme modules, and keep trainer attribution in one place."
        actions={<Skeleton className="h-9 w-36" />}
      />
      <div
        aria-label="Loading content categories"
        aria-busy="true"
        className="mb-4 flex h-12 w-full max-w-md items-center gap-2 rounded-xl border border-border bg-card p-1"
      >
        {[96, 82, 88, 86].map((width, index) => (
          <Skeleton
            key={index}
            className="h-9"
            style={{ width: `${width}px` }}
          />
        ))}
      </div>
      <Card>
        <div className="mb-4 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-border bg-surface-subtle p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-52" />
          </div>
          <Skeleton className="h-9 w-full sm:w-[340px]" />
        </div>
        <ContentTableSkeleton type={activeType} rows={10} />
        <ContentPaginationSkeleton />
      </Card>
    </>
  );
}

function ContentTableSkeleton({
  type,
  rows,
}: {
  type: ContentItemType;
  rows: number;
}) {
  const assetWidth = {
    video: "w-28",
    pdf: "w-44",
    excel: "w-48",
    tool: "w-52",
  }[type];

  return (
    <div
      aria-label={`Loading ${typeMeta[type].plural.toLowerCase()} content`}
      aria-busy="true"
      className="overflow-x-auto rounded-xl border border-border bg-card"
    >
      <div className="min-w-[1040px]">
        <div className="grid grid-cols-[64px_minmax(280px,1.35fr)_minmax(190px,1fr)_minmax(180px,1fr)_minmax(170px,0.8fr)] gap-4 border-b border-line bg-surface-subtle/80 px-5 py-4">
          {["Action", "Content", "Trainer owner", "Asset", "Used in"].map(
            (label) => (
              <span
                key={label}
                className="text-xs font-medium uppercase tracking-wide text-ink-faint"
              >
                {label}
              </span>
            ),
          )}
        </div>
        {Array.from({ length: rows }, (_, index) => (
          <div
            key={index}
            className="grid min-h-[80px] grid-cols-[64px_minmax(280px,1.35fr)_minmax(190px,1fr)_minmax(180px,1fr)_minmax(170px,0.8fr)] items-center gap-4 border-b border-line/80 px-5 py-3 last:border-0"
          >
            <Skeleton className="h-9 w-9 rounded-lg" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
              <div className="min-w-0 space-y-2">
                <Skeleton className="h-4 w-44" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-40" />
            </div>
            <div className="space-y-2">
              <Skeleton className={`h-4 ${assetWidth}`} />
              <Skeleton className="h-3 w-28" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ContentPaginationSkeleton() {
  return (
    <div
      aria-label="Loading content pagination"
      aria-busy="true"
      className="mt-4 flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <Skeleton className="h-4 w-28" />
      <div className="flex items-center gap-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-[76px]" />
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-8" />
      </div>
    </div>
  );
}
