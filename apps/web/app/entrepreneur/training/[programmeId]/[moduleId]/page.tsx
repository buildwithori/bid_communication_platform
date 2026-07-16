"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileText,
  Layers3,
  PlayCircle,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/shared/Badge";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { Button } from "@/components/shared/Button";
import { Card, CardHeader, Skeleton } from "@/components/shared/Card";
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
  useProgrammeModuleDetailQuery,
} from "@/lib/api/programmes";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { BadgeTone } from "@/types";

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

export default function TrainingModulePage() {
  const params = useParams<{ programmeId: string; moduleId: string }>();
  const programme = useProgrammeDetailQuery(params.programmeId);
  const moduleQuery = useProgrammeModuleDetailQuery(params.programmeId, params.moduleId);
  const content = useModuleContentItemsInfinite(params.moduleId, {
    programmeId: params.programmeId,
    take: 10,
    enabled: true,
  });
  const [activeEntry, setActiveEntry] = React.useState<LearningPlaylistEntry | null>(null);

  const playlist = content.rows.map((item) => ({
    programmeId: params.programmeId,
    moduleId: params.moduleId,
    moduleTitle: moduleQuery.data?.title ?? "Module",
    item,
  }));

  if (
    (programme.isLoading && !programme.data) ||
    (moduleQuery.isLoading && !moduleQuery.data) ||
    (content.isLoading && content.rows.length === 0)
  ) {
    return <TrainingModuleSkeleton />;
  }

  if (
    programme.isError ||
    moduleQuery.isError ||
    content.isError ||
    !programme.data ||
    !moduleQuery.data
  ) {
    const error = programme.isError
      ? programme.error
      : moduleQuery.isError
        ? moduleQuery.error
        : content.error;
    return (
      <>
        <ModuleBreadcrumb programmeName="Programme" moduleName="Module" programmeId={params.programmeId} />
        <PageHeader title="Module" description="Open learning content and track your progress." />
        <Card>
          <Notice>
            This module could not be loaded. {error?.message ?? "Please try again."}
          </Notice>
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={() => {
              void programme.refetch();
              void moduleQuery.refetch();
              void content.refetch();
            }}
          >
            Try again
          </Button>
        </Card>
      </>
    );
  }

  const programmeDetail = programme.data;
  const moduleDetail = moduleQuery.data;
  const progress = moduleDetail.learnerProgress?.progressPercent ?? 0;
  const completedItems = moduleDetail.learnerProgress?.completedContentCount ?? 0;
  const totalItems = moduleDetail.learnerProgress?.totalContentCount ?? moduleDetail.content.total;
  const nextEntry =
    playlist.find((entry) => entry.item.learnerProgress?.status !== "completed") ??
    playlist[0] ??
    null;

  return (
    <>
      <ModuleBreadcrumb
        programmeName={programmeDetail.name}
        moduleName={moduleDetail.title}
        programmeId={programmeDetail.id}
      />
      <PageHeader
        title={moduleDetail.title}
        description={moduleDetail.description || "Open each learning item and complete the module in order."}
        actions={
          nextEntry ? (
            <Button type="button" onClick={() => setActiveEntry(nextEntry)}>
              {progress > 0 ? "Resume module" : "Start module"}
              <PlayCircle className="h-4 w-4" />
            </Button>
          ) : undefined
        }
      />

      <Card padding="lg" accent="bid" className="mb-4">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <ModuleStatusBadge status={moduleDetail.learnerProgress?.status ?? "not_started"} />
              <Badge tone="neutral">Module {moduleDetail.position}</Badge>
              <Badge tone={moduleDetail.readiness === "ready" ? "green" : "amber"}>
                {moduleDetail.readiness === "ready" ? "Ready" : "Content pending"}
              </Badge>
            </div>
            <div className="mt-5 max-w-2xl">
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-ink">Module progress</span>
                <span className="text-ink-muted">{progress}% complete</span>
              </div>
              <ProgressBar value={progress} width="100%" className="h-2.5" />
              <p className="mt-2 text-sm text-ink-muted">
                {completedItems + " of " + totalItems + " learning items completed"}
              </p>
            </div>
            {nextEntry ? (
              <div className="mt-5 rounded-xl border border-line bg-surface-subtle p-4">
                <div className="text-sm font-medium text-ink">Up next</div>
                <div className="mt-1 text-lg font-semibold text-ink">{nextEntry.item.title}</div>
                <p className="mt-1 text-sm text-ink-muted">
                  {contentMeta[nextEntry.item.type].label}
                  {nextEntry.item.durationLabel ? " · " + nextEntry.item.durationLabel : ""}
                </p>
                <Button type="button" size="sm" className="mt-3" onClick={() => setActiveEntry(nextEntry)}>
                  Open content
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <ModuleMetric icon={Layers3} label="Learning items" value={moduleDetail.content.total} />
            <ModuleMetric icon={CheckCircle2} label="Completed" value={completedItems} />
            <ModuleMetric
              icon={PlayCircle}
              label="Remaining"
              value={Math.max(totalItems - completedItems, 0)}
            />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader
            title="Module content"
            description="Open each item to learn, save progress, and provide feedback."
          />
          {content.rows.length > 0 ? (
            <div className="space-y-3">
              {content.rows.map((item, index) => (
                <ContentLessonRow
                  key={item.id}
                  item={item}
                  index={index}
                  onOpen={() => {
                    const entry = playlist.find((candidate) => candidate.item.id === item.id);
                    if (entry) setActiveEntry(entry);
                  }}
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
            <div className="rounded-xl border border-dashed border-line-strong bg-surface-subtle px-4 py-12 text-center text-sm text-ink-muted">
              Ready learning content has not been added to this module yet.
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Module navigation" description="Move through the programme in sequence." />
            <div className="space-y-2">
              {moduleDetail.navigation.previous ? (
                <Button asChild type="button" variant="outline" className="w-full justify-start">
                  <Link href={routes.entrepreneur.trainingModule(programmeDetail.id, moduleDetail.navigation.previous.id)}>
                    <ArrowLeft className="h-4 w-4" />
                    <span className="truncate">{moduleDetail.navigation.previous.title}</span>
                  </Link>
                </Button>
              ) : (
                <Button type="button" variant="outline" className="w-full justify-start" disabled>
                  <ArrowLeft className="h-4 w-4" />
                  First module
                </Button>
              )}
              {moduleDetail.navigation.next ? (
                <Button asChild type="button" className="w-full justify-start">
                  <Link href={routes.entrepreneur.trainingModule(programmeDetail.id, moduleDetail.navigation.next.id)}>
                    <span className="truncate">{moduleDetail.navigation.next.title}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <Button type="button" className="w-full justify-start" disabled>
                  Last module
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Programme" description={programmeDetail.name} />
            <p className="text-sm leading-6 text-ink-muted">{programmeDetail.description}</p>
            <Button asChild variant="outline" className="mt-4 w-full">
              <Link href={routes.entrepreneur.trainingProgram(programmeDetail.id)}>
                View programme learning path
              </Link>
            </Button>
          </Card>
        </div>
      </div>

      <LearningContentPlayer
        entry={activeEntry}
        playlist={playlist}
        onChangeEntry={setActiveEntry}
        onClose={() => setActiveEntry(null)}
      />
    </>
  );
}

function ContentLessonRow({
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
  const status = item.learnerProgress?.status ?? "not_started";
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full items-start gap-3 rounded-xl border border-line bg-white p-4 text-left transition hover:border-bid/20 hover:bg-surface-subtle/50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bid/20"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-subtle text-sm font-semibold text-ink-muted">
        {index + 1}
      </span>
      <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl", meta.iconClass)}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-base font-semibold text-ink group-hover:text-bid">{item.title}</span>
          <Badge tone={meta.tone}>{meta.label}</Badge>
          <ContentProgressBadge status={status} />
        </span>
        <span className="mt-1 block text-sm leading-6 text-ink-muted">
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

function ModuleBreadcrumb({
  programmeName,
  moduleName,
  programmeId,
}: {
  programmeName: string;
  moduleName: string;
  programmeId: string;
}) {
  return (
    <Breadcrumb
      items={[
        { label: "Training Library", href: routes.entrepreneur.training },
        { label: programmeName, href: routes.entrepreneur.trainingProgram(programmeId) },
        { label: moduleName },
      ]}
    />
  );
}

function TrainingModuleSkeleton() {
  return (
    <>
      <ModuleBreadcrumb programmeName="Programme" moduleName="Module" programmeId="loading" />
      <PageHeader title="Module" description="Loading content and progress." />
      <Card padding="lg" className="mb-4">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-20 w-full" />)}
          </div>
        </div>
      </Card>
      <Card>
        <Skeleton className="h-6 w-44" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-24 w-full" />)}
        </div>
      </Card>
    </>
  );
}

function ModuleMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface-subtle px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-ink-muted">
        <Icon className="h-4 w-4 text-bid" />
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-ink">{value}</div>
    </div>
  );
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
  return <Badge tone="neutral">Not started</Badge>;
}
