"use client";

import { useDebouncedValue } from "@/lib/search";
import * as React from "react";
import {
  FileSpreadsheet,
  FileText,
  Layers3,
  PlayCircle,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import {
  DataTable,
  TableFilterInput,
  TablePagination,
  TableToolbar,
  type Column,
} from "@/components/shared/DataTable";
import { Modal } from "@/components/shared/Modal";
import { ProgressBar } from "@/components/shared/ProgressBar";
import { useAdminStore } from "@/lib/stores/admin-store";
import {
  getProgrammeStatus,
  getProgrammeStatusLabel,
} from "@/lib/programme-status";
import type { ContentItem, Module, Program } from "@/types";

const contentTypeMeta: Record<
  ContentItem["type"],
  {
    label: string;
    icon: React.ElementType;
    tone: "brand" | "blue" | "green";
    bg: string;
    fg: string;
  }
> = {
  video: {
    label: "Video",
    icon: PlayCircle,
    tone: "brand",
    bg: "bg-bid-light",
    fg: "text-bid",
  },
  pdf: {
    label: "PDF",
    icon: FileText,
    tone: "blue",
    bg: "bg-info-light",
    fg: "text-info",
  },
  excel: {
    label: "Excel",
    icon: FileSpreadsheet,
    tone: "green",
    bg: "bg-success-light",
    fg: "text-success",
  },
  tool: {
    label: "Tool",
    icon: Wrench,
    tone: "green",
    bg: "bg-success-light",
    fg: "text-success-dark",
  },
};

type ModuleDetailModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  module?: Module;
  program?: Program;
  onManageContent: (module: Module) => void;
  onAddContent: (module: Module) => void;
  readOnly?: boolean;
};

export function ModuleDetailModal(props: ModuleDetailModalProps) {
  return (
    <ModuleDetailModalContent key={props.module?.id ?? "empty"} {...props} />
  );
}

function ModuleDetailModalContent({
  open,
  onOpenChange,
  module,
  program,
  onManageContent,
  onAddContent,
  readOnly = false,
}: ModuleDetailModalProps) {
  const { contentItems, programs, trainers } = useAdminStore();
  const [contentQuery, setContentQuery] = React.useState("");
  const debouncedContentQuery = useDebouncedValue(contentQuery.trim());
  const [contentPage, setContentPage] = React.useState(1);
  const [contentPageSize, setContentPageSize] = React.useState(5);
  const [usageQuery, setUsageQuery] = React.useState("");
  const debouncedUsageQuery = useDebouncedValue(usageQuery.trim());
  const [usagePage, setUsagePage] = React.useState(1);
  const [usagePageSize, setUsagePageSize] = React.useState(5);

  const items = React.useMemo(
    () =>
      module ? contentItems.filter((item) => item.moduleId === module.id) : [],
    [contentItems, module],
  );
  const usedInPrograms = React.useMemo(
    () =>
      module
        ? programs.filter((item) => item.moduleIds.includes(module.id))
        : [],
    [module, programs],
  );

  const filteredItems = React.useMemo(() => {
    const needle = debouncedContentQuery.toLowerCase();
    if (!needle) return items;
    return items.filter((item) => {
      const trainer = trainers.find((entry) => entry.id === item.trainerId);
      return [
        item.title,
        item.chapter,
        item.type,
        item.durationLabel ?? "",
        item.toolUrl ?? "",
        item.fileUrl ?? "",
        item.muxPlaybackId ?? "",
        trainer?.fullName ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [debouncedContentQuery, items, trainers]);

  const filteredUsage = React.useMemo(() => {
    const needle = debouncedUsageQuery.toLowerCase();
    if (!needle) return usedInPrograms;
    return usedInPrograms.filter((item) =>
      [
        item.name,
        item.accessType === "free" ? "free programme" : "assigned programme",
        getProgrammeStatusLabel(getProgrammeStatus(item)),
        item.id === program?.id ? "current programme" : "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [debouncedUsageQuery, program?.id, usedInPrograms]);

  const contentPageRows = React.useMemo(() => {
    const start = (contentPage - 1) * contentPageSize;
    return filteredItems.slice(start, start + contentPageSize);
  }, [contentPage, contentPageSize, filteredItems]);

  const usagePageRows = React.useMemo(() => {
    const start = (usagePage - 1) * usagePageSize;
    return filteredUsage.slice(start, start + usagePageSize);
  }, [filteredUsage, usagePage, usagePageSize]);

  const contentColumns = React.useMemo<Column<ContentItem>[]>(
    () => [
      {
        key: "content",
        header: "Content item",
        cell: (item) => {
          const meta = contentTypeMeta[item.type];
          const Icon = meta.icon;
          return (
            <div className="flex min-w-0 items-start gap-3">
              <span
                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.bg}`}
              >
                <Icon className={`h-4 w-4 ${meta.fg}`} />
              </span>
              <div className="min-w-0">
                <div className="font-semibold text-ink">{item.title}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
                  <span>{item.chapter}</span>
                  <span>{item.durationLabel}</span>
                </div>
              </div>
            </div>
          );
        },
        className: "min-w-[320px]",
      },
      {
        key: "type",
        header: "Type",
        cell: (item) => (
          <Badge tone={contentTypeMeta[item.type].tone}>
            {contentTypeMeta[item.type].label}
          </Badge>
        ),
        className: "min-w-[120px]",
      },
      {
        key: "trainer",
        header: "Trainer owner",
        cell: (item) =>
          trainers.find((trainer) => trainer.id === item.trainerId)?.fullName ??
          "Not assigned",
        className: "min-w-[180px]",
      },
      {
        key: "source",
        header: "Source",
        cell: (item) => {
          const sourceLabel =
            item.type === "video"
              ? item.muxPlaybackId
                ? `Mux ${item.muxPlaybackId}`
                : "Mux playback ID missing"
              : item.type === "pdf"
                ? (item.fileUrl ?? "PDF file missing")
                : (item.toolUrl ?? "Tool link missing");

          return (
            <span className="block max-w-[260px] truncate text-sm text-ink-muted">
              {sourceLabel}
            </span>
          );
        },
        className: "min-w-[220px]",
      },
    ],
    [trainers],
  );

  const usageColumns = React.useMemo<Column<Program>[]>(
    () => [
      {
        key: "programme",
        header: "Programme",
        cell: (item) => (
          <div className="min-w-0">
            <div className="font-semibold text-ink">{item.name}</div>
            <div className="mt-1 text-sm text-ink-muted">
              {item.id === program?.id
                ? "Current programme"
                : item.accessType === "free"
                  ? "Free programme"
                  : "Assigned programme"}
            </div>
          </div>
        ),
        className: "min-w-[320px]",
      },
      {
        key: "status",
        header: "Status",
        cell: (item) => (
          <Badge tone="neutral">
            {getProgrammeStatusLabel(getProgrammeStatus(item))}
          </Badge>
        ),
        className: "min-w-[140px]",
      },
      {
        key: "access",
        header: "Access",
        cell: (item) => (
          <Badge tone={item.accessType === "free" ? "blue" : "brand"}>
            {item.accessType === "free" ? "Free" : "Assigned"}
          </Badge>
        ),
        className: "min-w-[130px]",
      },
      {
        key: "timeline",
        header: "Timeline",
        cell: (item) =>
          `${formatProgrammeDate(item.startDate)} - ${formatProgrammeDate(item.endDate)}`,
        className: "min-w-[220px]",
      },
    ],
    [program?.id],
  );

  if (!module) return null;

  const ready = items.length > 0;
  const contentCounts = items.reduce<Record<ContentItem["type"], number>>(
    (acc, item) => ({ ...acc, [item.type]: acc[item.type] + 1 }),
    { video: 0, pdf: 0, excel: 0, tool: 0 },
  );

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Module details"
      width="xl"
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-line bg-surface-subtle p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={ready ? "green" : "amber"}>
                  {ready ? "Ready for learners" : "Needs content"}
                </Badge>
                <Badge tone="neutral">Module {module.order}</Badge>
                {module.reuseCount ? (
                  <Badge tone="blue">
                    Reused in {usedInPrograms.length} programmes
                  </Badge>
                ) : null}
              </div>
              <h3 className="mt-3 text-xl font-semibold tracking-[-0.01em] text-ink">
                {module.title}
              </h3>
              {module.description ? (
                <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-muted">
                  {module.description}
                </p>
              ) : (
                <p className="mt-2 text-sm text-ink-muted">
                  No module description has been added yet.
                </p>
              )}
            </div>
            {!readOnly && (
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="border-bid/35 bg-bid-light/35 text-bid-dark hover:border-bid/50 hover:bg-bid-light hover:text-bid-dark"
                  onClick={() => {
                    onOpenChange(false);
                    onManageContent(module);
                  }}
                >
                  Manage content
                </Button>
                <Button
                  onClick={() => {
                    onOpenChange(false);
                    onAddContent(module);
                  }}
                >
                  + Add content item
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ModuleMetric
            label="Programme"
            value={program?.name ?? "Not linked"}
          />
          <ModuleMetric
            label="Attached content"
            value={items.length}
            helper={`${contentCounts.video} videos, ${contentCounts.pdf} PDFs, ${contentCounts.excel} Excel workbooks, ${contentCounts.tool} tools`}
          />
          <ModuleMetric
            label="Readiness"
            value={ready ? "Ready" : "Needs content"}
            progress={ready ? 100 : 0}
          />
          <ModuleMetric
            label="Used in"
            value={`${usedInPrograms.length} programme${usedInPrograms.length === 1 ? "" : "s"}`}
          />
        </div>

        <div className="rounded-xl border border-line bg-card p-4">
          <div className="flex flex-col gap-1">
            <div className="font-semibold text-ink">Content items</div>
            <div className="text-sm text-ink-muted">
              Learning assets entrepreneurs will see inside this module.
            </div>
          </div>
          {items.length > 0 ? (
            <div className="mt-4">
              <TableToolbar>
                <div>
                  <div className="text-sm font-medium text-ink">
                    Find content
                  </div>
                  <div className="mt-0.5 text-sm text-ink-muted">
                    {filteredItems.length} of {items.length} items shown
                  </div>
                </div>
                <div className="w-full sm:w-[360px]">
                  <TableFilterInput
                    icon
                    placeholder="Search title, type, trainer, or link..."
                    value={contentQuery}
                    onChange={(event) => {
                      setContentQuery(event.target.value);
                      setContentPage(1);
                    }}
                  />
                </div>
              </TableToolbar>
              <DataTable
                columns={contentColumns}
                rows={contentPageRows}
                rowKey={(item) => item.id}
                emptyMessage="No content item matches this search."
                tableClassName="min-w-[900px]"
              />
              <TablePagination
                page={contentPage}
                pageSize={contentPageSize}
                totalItems={filteredItems.length}
                pageSizeOptions={[5, 10, 20]}
                onPageChange={setContentPage}
                onPageSizeChange={(next) => {
                  setContentPageSize(next);
                  setContentPage(1);
                }}
              />
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-line bg-surface-subtle px-4 py-8 text-center">
              <Layers3 className="mx-auto h-8 w-8 text-ink-faint" />
              <div className="mt-3 font-medium text-ink">
                No content has been attached
              </div>
              <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-ink-muted">
                Add at least one video, PDF, Excel workbook, or online tool before this module
                is useful to entrepreneurs.
              </p>
              {!readOnly && (
                <Button
                  className="mt-4"
                  onClick={() => {
                    onOpenChange(false);
                    onAddContent(module);
                  }}
                >
                  + Add content item
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-line bg-card p-4">
          <div className="flex flex-col gap-1">
            <div className="font-semibold text-ink">Programme usage</div>
            <div className="text-sm text-ink-muted">
              Programmes using this module. Review this before changing shared
              content.
            </div>
          </div>
          <div className="mt-4">
            <TableToolbar>
              <div>
                <div className="text-sm font-medium text-ink">
                  Find programmes
                </div>
                <div className="mt-0.5 text-sm text-ink-muted">
                  {filteredUsage.length} of {usedInPrograms.length} programmes
                  shown
                </div>
              </div>
              <div className="w-full sm:w-[360px]">
                <TableFilterInput
                  icon
                  placeholder="Search programme, access, or status..."
                  value={usageQuery}
                  onChange={(event) => {
                    setUsageQuery(event.target.value);
                    setUsagePage(1);
                  }}
                />
              </div>
            </TableToolbar>
            <DataTable
              columns={usageColumns}
              rows={usagePageRows}
              rowKey={(item) => item.id}
              emptyMessage="No programme usage matches this search."
              tableClassName="min-w-[820px]"
            />
            <TablePagination
              page={usagePage}
              pageSize={usagePageSize}
              totalItems={filteredUsage.length}
              pageSizeOptions={[5, 10, 20]}
              onPageChange={setUsagePage}
              onPageSizeChange={(next) => {
                setUsagePageSize(next);
                setUsagePage(1);
              }}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}

function ModuleMetric({
  label,
  value,
  helper,
  progress,
}: {
  label: string;
  value: React.ReactNode;
  helper?: string;
  progress?: number;
}) {
  return (
    <div className="rounded-xl border border-line bg-card px-3 py-3">
      <div className="text-xs font-medium uppercase tracking-[0.04em] text-ink-muted">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold text-ink">{value}</div>
      {typeof progress === "number" ? (
        <ProgressBar value={progress} width="100%" className="mt-3 h-1.5" />
      ) : null}
      {helper ? (
        <div className="mt-2 text-xs leading-5 text-ink-muted">{helper}</div>
      ) : null}
    </div>
  );
}

function formatProgrammeDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
