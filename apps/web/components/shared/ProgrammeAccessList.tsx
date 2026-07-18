"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/shared/Badge";
import { Modal } from "@/components/shared/Modal";
import { cn } from "@/lib/utils";

type ProgrammeAccessItem = {
  id: string;
  name: string;
  description?: string | null;
  accessType?: "free" | "assigned";
  accent?: "info" | "success" | "bid" | "neutral";
};

interface ProgrammeAccessListProps {
  programmes: ProgrammeAccessItem[];
  includeFreeResources?: boolean;
  maxVisible?: number;
  emptyLabel?: string;
  className?: string;
  chipClassName?: string;
  modalTitle?: string;
}

function programmeTone(programme: ProgrammeAccessItem) {
  if (programme.accessType === "free") return "neutral" as const;
  if (programme.accent === "info") return "blue" as const;
  if (programme.accent === "success") return "green" as const;
  return "blue" as const;
}

export function ProgrammeAccessList({
  programmes,
  includeFreeResources = true,
  maxVisible = 2,
  emptyLabel = "No programme",
  className,
  chipClassName,
  modalTitle = "Programme access",
}: ProgrammeAccessListProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const assignedProgrammes = React.useMemo(
    () =>
      programmes.filter(
        (programme) => (programme.accessType ?? "assigned") !== "free",
      ),
    [programmes],
  );
  const visibleProgrammes = assignedProgrammes.slice(0, maxVisible);
  const hiddenCount = Math.max(
    assignedProgrammes.length - visibleProgrammes.length,
    0,
  );
  const filteredProgrammes = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return assignedProgrammes;
    return assignedProgrammes.filter((programme) =>
      [programme.name, programme.description ?? "", programme.accessType]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [assignedProgrammes, query]);

  return (
    <>
      <div
        className={cn(
          "flex min-w-0 max-w-full flex-wrap items-center gap-1.5",
          className,
        )}
      >
        {includeFreeResources && (
          <Badge tone="neutral" className={chipClassName}>
            Free resources
          </Badge>
        )}
        {visibleProgrammes.map((programme) => (
          <Badge
            key={programme.id}
            tone={programmeTone(programme)}
            className={cn("max-w-[220px] truncate", chipClassName)}
            title={programme.name}
          >
            {programme.name}
          </Badge>
        ))}
        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setOpen(true);
            }}
            className="inline-flex items-center rounded-full bg-surface-subtle px-2.5 py-1 text-xs font-semibold leading-tight text-bid transition hover:bg-bid-light focus:outline-none focus-visible:ring-2 focus-visible:ring-bid/30"
          >
            +{hiddenCount} more
          </button>
        )}
        {!includeFreeResources && assignedProgrammes.length === 0 && (
          <span className="text-sm text-ink-faint">{emptyLabel}</span>
        )}
      </div>

      <Modal open={open} onOpenChange={setOpen} title={modalTitle} width="wide">
        <div className="space-y-4">
          <div className="rounded-xl border border-line bg-surface-subtle px-4 py-3">
            <div className="text-sm font-semibold text-ink">
              {assignedProgrammes.length} programme
              {assignedProgrammes.length === 1 ? "" : "s"} available
            </div>
            <div className="mt-1 text-sm text-ink-muted">
              Free resources remain available to every entrepreneur by default.
            </div>
          </div>

          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search programmes..."
              className="h-10 w-full rounded-lg border border-line bg-card pl-9 pr-3 text-sm text-ink outline-none transition focus:border-bid focus:ring-2 focus:ring-bid/15"
            />
          </label>

          <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
            {filteredProgrammes.map((programme) => (
              <div
                key={programme.id}
                className="rounded-xl border border-line bg-card px-4 py-3"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="font-semibold text-ink">
                      {programme.name}
                    </div>
                    {programme.description && (
                      <div className="mt-1 line-clamp-2 text-sm leading-6 text-ink-muted">
                        {programme.description}
                      </div>
                    )}
                  </div>
                  <Badge tone={programmeTone(programme)} className="shrink-0">
                    {programme.accessType === "free" ? "Free" : "Programme"}
                  </Badge>
                </div>
              </div>
            ))}
            {filteredProgrammes.length === 0 && (
              <div className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink-muted">
                No programme matches this search.
              </div>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
