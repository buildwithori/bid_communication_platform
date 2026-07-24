"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, FileSpreadsheet } from "lucide-react";
import { Button, InlineSpinner } from "@/components/shared/Button";
import { Skeleton } from "@/components/shared/Card";
import { useWorkbookPreviewQuery, type WorkbookPreview } from "@/lib/api/files";
import { cn } from "@/lib/utils";

const ROW_TAKE = 75;
const COLUMN_TAKE = 16;

export function SpreadsheetViewer({
  fileId,
  title,
  className,
}: {
  fileId?: string | null;
  title: string;
  className?: string;
}) {
  if (!fileId) {
    return (
      <SpreadsheetMessage
        title="Workbook unavailable"
        description="Attach an Excel workbook before previewing this resource."
      />
    );
  }

  return (
    <SpreadsheetViewerContent
      key={fileId}
      fileId={fileId}
      title={title}
      className={className}
    />
  );
}

function SpreadsheetViewerContent({
  fileId,
  title,
  className,
}: {
  fileId: string;
  title: string;
  className?: string;
}) {
  const [sheet, setSheet] = React.useState<string>();
  const [rowStart, setRowStart] = React.useState(1);
  const [columnStart, setColumnStart] = React.useState(1);
  const preview = useWorkbookPreviewQuery(
    fileId,
    {
      sheet,
      rowStart,
      columnStart,
      rowTake: ROW_TAKE,
      columnTake: COLUMN_TAKE,
    },
    true,
  );

  if (preview.isLoading && !preview.data) {
    return <SpreadsheetSkeleton className={className} />;
  }
  if (preview.isError || !preview.data) {
    return (
      <SpreadsheetMessage
        title="Workbook could not be loaded"
        description={
          preview.error?.message ?? "Try loading the workbook again."
        }
        action={
          <Button variant="outline" onClick={() => void preview.refetch()}>
            Try again
          </Button>
        }
      />
    );
  }

  const data = preview.data;
  const window = data.window;
  const previousRowStart =
    window.rowStart > 1 ? Math.max(1, window.rowStart - window.rowTake) : null;

  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-card shadow-sm",
        className,
      )}
      aria-label={title + " workbook preview"}
    >
      <div className="flex flex-col gap-3 border-b border-line bg-surface-subtle px-3 py-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-success-light text-success">
            <FileSpreadsheet className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-ink">
              {title}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-ink-muted">
              {preview.isFetching ? <InlineSpinner className="h-3.5 w-3.5 text-bid" /> : null}
              <span>Rows {window.rowStart}–{window.rowEnd} · Columns{" "}
              {window.columnStart}–{window.columnEnd}</span>
            </div>
          </div>
        </div>
        <div
          className="scrollbar-thin flex gap-1 overflow-x-auto pb-1"
          role="tablist"
          aria-label="Workbook sheets"
        >
          {data.workbook.sheets.map(
            (item: WorkbookPreview["workbook"]["sheets"][number]) => {
              const active = item.name === data.workbook.activeSheet;
              return (
                <button
                  key={item.name}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setSheet(item.name);
                    setRowStart(1);
                    setColumnStart(1);
                  }}
                  className={cn(
                    "shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition",
                    active
                      ? "border-bid bg-bid text-white"
                      : "border-border bg-card text-ink-muted hover:border-bid/45 hover:text-bid",
                  )}
                >
                  {item.name}
                  <span
                    className={cn(
                      "ml-1.5",
                      active ? "text-white/70" : "text-ink-faint",
                    )}
                  >
                    {item.rowCount} rows
                  </span>
                </button>
              );
            },
          )}
        </div>
      </div>

      <div className="max-h-[62vh] min-h-[420px] overflow-auto bg-card">
        <table className="border-separate border-spacing-0 text-xs text-ink">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-30 min-w-14 border-b border-r border-line bg-surface-subtle px-2 py-2 text-center font-medium text-ink-muted">
                #
              </th>
              {data.columns.map(
                (column: WorkbookPreview["columns"][number]) => (
                  <th
                    key={column.index}
                    className="sticky top-0 z-20 min-w-[150px] max-w-[240px] border-b border-r border-line bg-surface-subtle px-3 py-2 text-left font-medium text-ink-muted"
                  >
                    {column.label}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row: WorkbookPreview["rows"][number]) => (
              <tr key={row.index} className="hover:bg-bid-light/25">
                <th className="sticky left-0 z-10 border-b border-r border-line bg-surface-subtle px-2 py-2 text-center font-medium text-ink-muted">
                  {row.index}
                </th>
                {row.cells.map((cell: string, index: number) => (
                  <td
                    key={data.columns[index]?.index ?? index}
                    className="min-w-[150px] max-w-[240px] border-b border-r border-line px-3 py-2 align-top leading-5"
                  >
                    <div
                      className="max-h-24 overflow-hidden whitespace-pre-wrap break-words"
                      title={cell}
                    >
                      {cell || <span className="text-ink-faint">—</span>}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-2 border-t border-line bg-surface-subtle px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!window.previousColumnStart || preview.isFetching}
            onClick={() =>
              window.previousColumnStart &&
              setColumnStart(window.previousColumnStart)
            }
          >
            <ChevronLeft className="h-4 w-4" /> Columns
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!window.nextColumnStart || preview.isFetching}
            onClick={() =>
              window.nextColumnStart && setColumnStart(window.nextColumnStart)
            }
          >
            Columns <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!previousRowStart || preview.isFetching}
            onClick={() => previousRowStart && setRowStart(previousRowStart)}
          >
            <ChevronLeft className="h-4 w-4" /> Previous rows
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!window.nextRowStart || preview.isFetching}
            onClick={() =>
              window.nextRowStart && setRowStart(window.nextRowStart)
            }
          >
            Next rows <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}

function SpreadsheetSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "space-y-3 rounded-2xl border border-border bg-card p-4",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
      <Skeleton className="h-[500px] w-full rounded-xl" />
    </div>
  );
}

function SpreadsheetMessage({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-[420px] place-items-center rounded-2xl border border-dashed border-line bg-surface-subtle p-8 text-center">
      <div className="max-w-md">
        <FileSpreadsheet className="mx-auto h-10 w-10 text-ink-faint" />
        <div className="mt-4 font-semibold text-ink">{title}</div>
        <p className="mt-2 text-sm leading-6 text-ink-muted">{description}</p>
        {action ? <div className="mt-4">{action}</div> : null}
      </div>
    </div>
  );
}
