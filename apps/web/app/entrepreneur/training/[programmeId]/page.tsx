"use client";

import { useDebouncedValue } from '@/lib/search';
import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  FileText,
  Layers3,
  PlayCircle,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/shared/Badge";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { Button } from "@/components/shared/Button";
import { Card, CardHeader, Skeleton, TableSkeleton } from "@/components/shared/Card";
import {
  TableEmptyState,
  TableFilterInput,
  TableFilterSelect,
  TablePagination,
  TableToolbar,
} from "@/components/shared/DataTable";
import {
  LearningContentPlayer,
  type LearningPlaylistEntry,
} from "@/components/entrepreneur/LearningContentPlayer";
import { Notice, PageHeader } from "@/components/shared/PageHeader";
import { ProgressBar } from "@/components/shared/ProgressBar";
import {
  useModuleContentItemsInfinite,
  type ContentItemRecord,
  type ContentItemType,
} from "@/lib/api/content";
import {
  useProgrammeDetailQuery,
  useProgrammeModulesPage,
  type ProgrammeLifecycle,
  type ProgrammeModuleRecord,
} from "@/lib/api/programmes";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { BadgeTone } from "@/types";

type ContentFilter = "all" | ContentItemType;
type ProgressFilter = "all" | "not_started" | "in_progress" | "completed";

const contentMeta: Record<
  ContentItemType,
  { label: string; icon: LucideIcon; tone: BadgeTone; iconClass: string }
> = {
  video: {
    label: "Video",
    icon: PlayCircle,
    tone: "brand",
    iconClass: "bg-bid-light text-bid",
  },
  pdf: {
    label: "PDF",
    icon: FileText,
    tone: "blue",
    iconClass: "bg-info-light text-info",
  },
  tool: {
    label: "Tool",
    icon: Wrench,
    tone: "green",
    iconClass: "bg-success-light text-success-dark",
  },
};

export default function ProgrammeModulesPage() {
  const params = useParams<{ programmeId: string }>();
  const programme = useProgrammeDetailQuery(params.programmeId);
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [contentFilter, setContentFilter] = React.useState<ContentFilter>("all");
  const [progressFilter, setProgressFilter] = React.useState<ProgressFilter>("all");
  const [pageSize, setPageSize] = React.useState(5);
  const modules = useProgrammeModulesPage(params.programmeId, {
    search: debouncedSearch.trim() || undefined,
    contentType: contentFilter === "all" ? undefined : contentFilter,
    progressStatus: progressFilter === "all" ? undefined : progressFilter,
    take: pageSize,
  });
  const resetPagination = modules.resetPagination;
  const [expandedModuleIds, setExpandedModuleIds] = React.useState<string[]>([]);
  const [activeEntry, setActiveEntry] = React.useState<LearningPlaylistEntry | null>(null);
  const [activePlaylist, setActivePlaylist] = React.useState<LearningPlaylistEntry[]>([]);

  React.useEffect(() => {
    resetPagination();
  }, [contentFilter, debouncedSearch, pageSize, progressFilter, resetPagination]);

  function toggleModule(moduleId: string) {
    setExpandedModuleIds((current) =>
      current.includes(moduleId)
        ? current.filter((id) => id !== moduleId)
        : [...current, moduleId],
    );
  }

  function openContent(
    entry: LearningPlaylistEntry,
    playlist: LearningPlaylistEntry[],
  ) {
    setActivePlaylist(playlist);
    setActiveEntry(entry);
  }

  if ((programme.isLoading && !programme.data) || (modules.isLoading && !modules.data)) {
    return <ProgrammeDetailSkeleton />;
  }

  if (programme.isError || modules.isError || !programme.data) {
    const error = programme.isError ? programme.error : modules.error;
    return (
      <>
        <ProgrammeBreadcrumb name="Programme" />
        <PageHeader
          title="Programme learning path"
          description="Work through programme modules and learning content."
        />
        <Card>
          <Notice>
            This learning path could not be loaded. {error?.message ?? "Please try again."}
          </Notice>
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={() => {
              void programme.refetch();
              void modules.refetch();
            }}
          >
            Try again
          </Button>
        </Card>
      </>
    );
  }

  const detail = programme.data;
  const progress = detail.learnerProgress.average;
  const completedModules = modules.rows.filter(
    (module) => module.learnerProgress?.status === "completed",
  ).length;

  return (
    <>
      <ProgrammeBreadcrumb name={detail.name} />
      <PageHeader
        title={detail.name}
        description={detail.description || "Work through the programme modules and learning content."}
        actions={
          detail.nextLearning ? (
            <Button asChild>
              <Link
                href={routes.entrepreneur.trainingModule(
                  detail.id,
                  detail.nextLearning.moduleId,
                )}
              >
                {progress > 0 ? "Continue learning" : "Start learning"}
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : undefined
        }
      />

      <Card padding="lg" accent="bid" className="mb-4">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <ProgrammeStatusBadge status={detail.lifecycle} />
              <Badge tone={detail.accessType === "free" ? "blue" : "brand"}>
                {detail.accessType === "free" ? "Free programme" : "Programme access"}
              </Badge>
              <span className="inline-flex items-center gap-1.5 text-sm text-ink-muted">
                <CalendarDays className="h-4 w-4" />
                {formatDate(detail.startDate) + " - " + formatDate(detail.endDate)}
              </span>
            </div>

            <div className="mt-5 max-w-3xl">
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-ink">Programme progress</span>
                <span className="text-ink-muted">{progress}% complete</span>
              </div>
              <ProgressBar value={progress} width="100%" className="h-2.5" />
            </div>

            <div className="mt-5 rounded-xl border border-line bg-surface-subtle p-4">
              <div className="text-sm font-medium text-ink">Next learning</div>
              {detail.nextLearning ? (
                <>
                  <div className="mt-1 text-lg font-semibold text-ink">
                    {detail.nextLearning.moduleTitle}
                  </div>
                  <p className="mt-1 text-sm leading-6 text-ink-muted">
                    {detail.nextLearning.contentTitle}
                  </p>
                  <Button asChild size="sm" className="mt-3">
                    <Link
                      href={routes.entrepreneur.trainingModule(
                        detail.id,
                        detail.nextLearning.moduleId,
                      )}
                    >
                      Open next module
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </>
              ) : (
                <div className="mt-1 text-sm text-ink-muted">
                  You have completed every available learning item.
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <ProgrammeMetric
              icon={Layers3}
              label="Modules completed"
              value={
                completedModules + "/" + detail.modules.total
              }
              helper="This page reflects your personal progress"
            />
            <ProgrammeMetric
              icon={PlayCircle}
              label="Learning content"
              value={detail.content.total}
              helper={contentBreakdown(detail.content)}
            />
            <ProgrammeMetric
              icon={FileText}
              label="Programme access"
              value={detail.accessType === "free" ? "Free" : "Granted"}
              helper="Authenticated learning access"
            />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader
            title="Programme curriculum"
            description="Expand modules to load their learning content when you need it."
          />
          <TableToolbar>
            <div>
              <div className="text-sm font-medium text-ink">Find modules and content</div>
              <div className="mt-0.5 text-sm text-ink-muted">
                Search and filter on the server without loading the full curriculum.
              </div>
            </div>
            <div className="grid w-full gap-2 lg:w-[720px] lg:grid-cols-[minmax(220px,1fr)_170px_170px]">
              <TableFilterInput
                icon
                placeholder="Search curriculum..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <TableFilterSelect
                value={contentFilter}
                onChange={(event) => setContentFilter(event.target.value as ContentFilter)}
              >
                <option value="all">All content</option>
                <option value="video">Videos</option>
                <option value="pdf">PDFs</option>
                <option value="tool">Tools</option>
              </TableFilterSelect>
              <TableFilterSelect
                value={progressFilter}
                onChange={(event) => setProgressFilter(event.target.value as ProgressFilter)}
              >
                <option value="all">All progress</option>
                <option value="in_progress">In progress</option>
                <option value="not_started">Not started</option>
                <option value="completed">Completed</option>
              </TableFilterSelect>
            </div>
          </TableToolbar>

          {modules.rows.length > 0 ? (
            <div className="space-y-3">
              {modules.rows.map((module) => (
                <LearnerModuleAccordion
                  key={module.id}
                  programmeId={detail.id}
                  module={module}
                  expanded={expandedModuleIds.includes(module.id)}
                  onToggle={() => toggleModule(module.id)}
                  onOpenContent={openContent}
                />
              ))}
            </div>
          ) : (
            <TableEmptyState
              title="No modules found"
              description="Try changing your search, content, or progress filter."
            />
          )}

          <TablePagination
            page={modules.page}
            pageSize={pageSize}
            totalItems={modules.totalItems}
            pageSizeOptions={[5, 10, 25]}
            onPageChange={modules.setPage}
            onPageSizeChange={setPageSize}
          />
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Programme work"
              description="View submissions and requirements connected to your programmes."
            />
            <div className="rounded-xl border border-line bg-surface-subtle p-4">
              <p className="text-sm leading-6 text-ink-muted">
                Deliverable requirements are managed in your dedicated programme work area.
              </p>
              <Button asChild variant="outline" className="mt-3 w-full">
                <Link href={routes.entrepreneur.deliverables}>View deliverables</Link>
              </Button>
            </div>
          </Card>

          <Card>
            <CardHeader title="Content mix" description="Available learning assets in this programme." />
            <div className="grid grid-cols-3 gap-2">
              <ContentMix label="Videos" value={detail.content.videos} tone="brand" />
              <ContentMix label="PDFs" value={detail.content.pdfs} tone="blue" />
              <ContentMix label="Tools" value={detail.content.tools} tone="green" />
            </div>
          </Card>

          <Button asChild variant="outline" className="w-full">
            <Link href={routes.entrepreneur.training}>Back to training library</Link>
          </Button>
        </div>
      </div>

      <LearningContentPlayer
        entry={activeEntry}
        playlist={activePlaylist}
        onChangeEntry={setActiveEntry}
        onClose={() => setActiveEntry(null)}
      />
    </>
  );
}

function LearnerModuleAccordion({
  programmeId,
  module,
  expanded,
  onToggle,
  onOpenContent,
}: {
  programmeId: string;
  module: ProgrammeModuleRecord;
  expanded: boolean;
  onToggle: () => void;
  onOpenContent: (
    entry: LearningPlaylistEntry,
    playlist: LearningPlaylistEntry[],
  ) => void;
}) {
  const content = useModuleContentItemsInfinite(module.id, {
    programmeId,
    take: 10,
    enabled: expanded,
  });
  const progress = module.learnerProgress?.progressPercent ?? 0;
  const completedItems = module.learnerProgress?.completedContentCount ?? 0;
  const totalItems = module.learnerProgress?.totalContentCount ?? module.content.total;
  const playlist = content.rows.map((item) => ({
    programmeId,
    moduleId: module.id,
    moduleTitle: module.title,
    item,
  }));

  function openItem(item: ContentItemRecord) {
    const entry = playlist.find((candidate) => candidate.item.id === item.id);
    if (entry) onOpenContent(entry, playlist);
  }

  return (
    <section className="overflow-hidden rounded-xl border border-line bg-card">
      <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-start gap-3 rounded-lg text-left outline-none transition hover:text-bid focus-visible:ring-2 focus-visible:ring-bid/20"
          aria-expanded={expanded}
        >
          <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-subtle text-ink-muted">
            {expanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          </span>
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-base font-semibold text-ink">{module.title}</span>
              <ModuleStatusBadge status={module.learnerProgress?.status ?? "not_started"} />
            </span>
            {module.description ? (
              <span className="mt-1 line-clamp-2 block text-sm leading-5 text-ink-muted">
                {module.description}
              </span>
            ) : null}
            <span className="mt-2 flex flex-wrap gap-1.5">
              <Badge tone="neutral">{module.content.total} items</Badge>
              {module.content.videos > 0 ? <Badge tone="brand">{module.content.videos} videos</Badge> : null}
              {module.content.pdfs > 0 ? <Badge tone="blue">{module.content.pdfs} PDFs</Badge> : null}
              {module.content.tools > 0 ? <Badge tone="green">{module.content.tools} tools</Badge> : null}
            </span>
          </span>
        </button>

        <div className="min-w-[220px]">
          <div className="mb-1 flex items-center justify-between gap-2 text-sm">
            <span className="text-ink-muted">{completedItems + "/" + totalItems} done</span>
            <span className="font-medium text-ink">{progress}%</span>
          </div>
          <ProgressBar value={progress} width="100%" className="h-2" />
          <Button type="button" size="sm" variant="outline" className="mt-2 w-full" onClick={onToggle}>
            {expanded ? "Hide content" : progress > 0 ? "Continue module" : "Open module"}
          </Button>
        </div>
      </div>

      {expanded ? (
        <div className="border-t border-line bg-surface-subtle/50 p-4">
          {content.isLoading && content.rows.length === 0 ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }, (_, index) => (
                <Skeleton key={index} className="h-20 w-full" />
              ))}
            </div>
          ) : content.isError ? (
            <div className="rounded-xl border border-danger/20 bg-danger-light p-4 text-sm text-danger-dark">
              Module content could not be loaded. {content.error.message}
              <Button type="button" size="sm" variant="outline" className="mt-3" onClick={() => void content.refetch()}>
                Try again
              </Button>
            </div>
          ) : content.rows.length > 0 ? (
            <div className="space-y-2">
              {content.rows.map((item, index) => (
                <ContentRow
                  key={item.id}
                  item={item}
                  index={index}
                  onOpen={() => openItem(item)}
                />
              ))}
              {content.hasNextPage ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  isLoading={content.isFetchingNextPage}
                  loadingLabel="Loading more..."
                  onClick={() => void content.fetchNextPage()}
                >
                  Load more content
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-line-strong bg-card px-4 py-8 text-center text-sm text-ink-muted">
              No ready learning content is available in this module yet.
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

function ContentRow({
  item,
  index,
  onOpen,
}: {
  item: ContentItemRecord;
  index: number;
  onOpen: () => void;
}) {
  const meta = contentMeta[item.type];
  const Icon = meta.icon;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full items-start gap-3 rounded-xl border border-line bg-card p-3 text-left transition hover:border-bid/20 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bid/20"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-subtle text-sm font-semibold text-ink-muted">
        {index + 1}
      </span>
      <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", meta.iconClass)}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-ink group-hover:text-bid">{item.title}</span>
          <Badge tone={meta.tone}>{meta.label}</Badge>
          <ContentProgressBadge status={item.learnerProgress?.status ?? "not_started"} />
        </span>
        <span className="mt-1 block text-sm text-ink-muted">
          {[
            item.durationLabel,
            item.trainer ? "By " + item.trainer.name : null,
            item.learnerProgress && item.learnerProgress.progressPercent > 0
              ? item.learnerProgress.progressPercent + "% complete"
              : null,
          ].filter(Boolean).join(" · ") || "Ready to open"}
        </span>
      </span>
      <span className="hidden shrink-0 text-sm font-medium text-bid sm:block">Open</span>
    </button>
  );
}

function ProgrammeBreadcrumb({ name }: { name: string }) {
  return (
    <Breadcrumb
      items={[
        { label: "Training Library", href: routes.entrepreneur.training },
        { label: name },
      ]}
    />
  );
}

function ProgrammeDetailSkeleton() {
  return (
    <>
      <ProgrammeBreadcrumb name="Programme" />
      <PageHeader title="Programme learning path" description="Loading your curriculum and progress." />
      <Card padding="lg" className="mb-4">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <Skeleton className="h-5 w-64" />
            <Skeleton className="h-8 w-3/5" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-20 w-full" />)}
          </div>
        </div>
      </Card>
      <TableSkeleton columns={4} rows={5} />
    </>
  );
}

function ProgrammeMetric({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  helper: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface-subtle px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-ink-muted">
        <Icon className="h-4 w-4 text-bid" />
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-ink">{value}</div>
      <div className="mt-1 text-xs leading-5 text-ink-muted">{helper}</div>
    </div>
  );
}

function ProgrammeStatusBadge({ status }: { status: ProgrammeLifecycle }) {
  const meta: Record<ProgrammeLifecycle, { label: string; tone: BadgeTone }> = {
    draft: { label: "Draft", tone: "neutral" },
    scheduled: { label: "Scheduled", tone: "blue" },
    active: { label: "Active", tone: "green" },
    completed: { label: "Completed", tone: "amber" },
    archived: { label: "Archived", tone: "red" },
  };
  return <Badge tone={meta[status].tone}>{meta[status].label}</Badge>;
}

function ModuleStatusBadge({
  status,
}: {
  status: "not_started" | "in_progress" | "completed";
}) {
  if (status === "completed") return <Badge tone="green">Completed</Badge>;
  if (status === "in_progress") return <Badge tone="amber">In progress</Badge>;
  return <Badge tone="neutral">Not started</Badge>;
}

function ContentProgressBadge({
  status,
}: {
  status: "not_started" | "in_progress" | "completed";
}) {
  if (status === "completed") return <Badge tone="green">Done</Badge>;
  if (status === "in_progress") return <Badge tone="amber">In progress</Badge>;
  return null;
}

function ContentMix({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "brand" | "blue" | "green";
}) {
  const toneClass = {
    brand: "bg-bid-light text-bid",
    blue: "bg-info-light text-info",
    green: "bg-success-light text-success-dark",
  }[tone];
  return (
    <div className={cn("rounded-xl px-3 py-4 text-center", toneClass)}>
      <div className="text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs font-medium">{label}</div>
    </div>
  );
}

function contentBreakdown(content: { videos: number; pdfs: number; tools: number }) {
  return content.videos + " videos · " + content.pdfs + " PDFs · " + content.tools + " tools";
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
