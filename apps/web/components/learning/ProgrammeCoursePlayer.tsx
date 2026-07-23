"use client";

import * as React from "react";
import MuxPlayer from "@mux/mux-player-react/lazy";
import type MuxPlayerElement from "@mux/mux-player";
import {
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Layers3,
  LoaderCircle,
  Play,
  PlayCircle,
  RotateCcw,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { ContentRatingModal } from "@/components/entrepreneur/ContentRatingModal";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { Skeleton } from "@/components/shared/Card";
import { SpreadsheetViewer } from "@/components/shared/SpreadsheetViewer";
import { ToolFramePreview } from "@/components/shared/ToolFramePreview";
import { ProgressBar } from "@/components/shared/ProgressBar";
import { useSignedFileUrlQuery } from "@/lib/api/files";
import {
  useLearnerProgressQuery,
  usePlaybackProgressCheckpoint,
  useSyncLearnerProgressMutation,
} from "@/lib/api/learning";
import type {
  ProgrammePlayerItem,
  ProgrammePlayerModule,
  ProgrammePlayerPayload,
} from "@/lib/api/programmes";
import {
  usePrefetchSignedVideoPlayback,
  useSignedVideoPlaybackQuery,
} from "@/lib/api/videos";
import { cn } from "@/lib/utils";
import type { BadgeTone } from "@/types";

type PlaylistEntry = {
  module: ProgrammePlayerModule;
  item: ProgrammePlayerItem;
};

type CompletionAction = "mark" | "next";

type QueryState<T> = {
  data?: T;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
};

const typeMeta: Record<
  ProgrammePlayerItem["type"],
  { label: string; icon: LucideIcon; tone: BadgeTone }
> = {
  video: { label: "Video", icon: PlayCircle, tone: "brand" },
  pdf: { label: "PDF", icon: FileText, tone: "blue" },
  excel: { label: "Excel", icon: FileSpreadsheet, tone: "green" },
  tool: { label: "Interactive tool", icon: Wrench, tone: "green" },
};


export function ProgrammeCoursePlayer({
  data,
  initialContentId,
  onContentChange,
  className,
}: {
  data: ProgrammePlayerPayload;
  initialContentId?: string | null;
  onContentChange?: (contentItemId: string) => void;
  className?: string;
}) {
  const playlist = React.useMemo<PlaylistEntry[]>(
    () =>
      data.modules.flatMap((module) =>
        module.items.map((item) => ({ module, item })),
      ),
    [data.modules],
  );
  const preferred =
    playlist.find((entry) => entry.item.id === initialContentId) ??
    playlist.find(
      (entry) =>
        entry.module.id === data.resume?.moduleId &&
        entry.item.id === data.resume?.contentItemId,
    ) ??
    playlist[0] ??
    null;
  const [activeKey, setActiveKey] = React.useState(
    preferred ? entryKey(preferred) : null,
  );
  const active =
    playlist.find((entry) => entryKey(entry) === activeKey) ?? preferred;
  const activeIndex = active
    ? playlist.findIndex((entry) => entryKey(entry) === entryKey(active))
    : -1;
  const nextEntry =
    activeIndex >= 0 && activeIndex < playlist.length - 1
      ? playlist[activeIndex + 1]
      : null;
  const [expanded, setExpanded] = React.useState<Set<string>>(
    () => new Set(active ? [active.module.id] : []),
  );
  const [playerKey, setPlayerKey] = React.useState(0);
  const [transitioningToKey, setTransitioningToKey] = React.useState<
    string | null
  >(null);
  const [restartFromBeginningKey, setRestartFromBeginningKey] = React.useState<
    string | null
  >(null);
  const [ratingPrompt, setRatingPrompt] = React.useState<{
    entry: PlaylistEntry;
    target: PlaylistEntry | null;
  } | null>(null);
  const ratingPromptedForVisitRef = React.useRef<string | null>(null);
  const [locallyCompletedIds, setLocallyCompletedIds] = React.useState(
    () => new Set<string>(),
  );
  const canTrack = data.viewer.canTrackProgress;
  const progress = useLearnerProgressQuery(
    canTrack && active
      ? {
          programmeId: data.programme.id,
          moduleId: active.module.id,
          contentItemId: active.item.id,
        }
      : null,
  );
  const syncProgress = useSyncLearnerProgressMutation();
  const [completionAction, setCompletionAction] =
    React.useState<CompletionAction | null>(null);
  const signedFile = useSignedFileUrlQuery(
    active?.item.type === "pdf"
      ? active.item.file?.id
      : active?.item.type === "tool" && active.item.toolLink?.toolType === "pdf"
        ? (active.item.toolLink.fileId ?? undefined)
        : undefined,
    Boolean(active),
  );
  const signedVideo = useSignedVideoPlaybackQuery(
    active?.item.type === "video" ? active.item.video?.id : undefined,
    Boolean(active),
  );
  usePrefetchSignedVideoPlayback(
    nextEntry?.item.type === "video" ? nextEntry.item.video?.id : undefined,
  );
  const itemProgress = progress.data?.content ?? active?.item.progress;
  const activeModuleId = active?.module.id;
  const activeContentItemId = active?.item.id;
  const playbackContext = React.useMemo(
    () =>
      activeModuleId && activeContentItemId
        ? {
            userId: data.viewer.userId,
            programmeId: data.programme.id,
            moduleId: activeModuleId,
            contentItemId: activeContentItemId,
          }
        : null,
    [
      activeContentItemId,
      activeModuleId,
      data.programme.id,
      data.viewer.userId,
    ],
  );
  const playback = usePlaybackProgressCheckpoint({
    enabled: Boolean(canTrack && active?.item.type === "video"),
    context: playbackContext,
    serverProgress: itemProgress,
    contentDurationSeconds:
      active?.item.video?.durationSeconds ?? active?.item.durationSeconds,
  });
  const flushPlayback = playback.flush;

  const choose = React.useCallback(
    (entry: PlaylistEntry) => {
      const nextKey = entryKey(entry);
      if (nextKey === activeKey) return;
      void flushPlayback();
      ratingPromptedForVisitRef.current = null;
      setTransitioningToKey(entry.item.type === "video" ? nextKey : null);
      setRestartFromBeginningKey(null);
      setActiveKey(nextKey);
      setExpanded((current) => new Set(current).add(entry.module.id));
      onContentChange?.(entry.item.id);
    },
    [activeKey, flushPlayback, onContentChange],
  );

  React.useEffect(() => {
    if (!initialContentId) return;
    const requested = playlist.find(
      (entry) => entry.item.id === initialContentId,
    );
    if (!requested || entryKey(requested) === activeKey) return;
    const frame = window.requestAnimationFrame(() => {
      ratingPromptedForVisitRef.current = null;
      setActiveKey(entryKey(requested));
      setExpanded((current) => new Set(current).add(requested.module.id));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeKey, initialContentId, playlist]);

  const saveProgress = React.useCallback(
    (
      status: "in_progress" | "completed",
      percent: number,
      position?: number,
      duration?: number,
      notify = false,
      pendingAction?: CompletionAction,
      onSaved?: () => void,
    ) => {
      if (!active || !canTrack) return;
      if (pendingAction) setCompletionAction(pendingAction);
      syncProgress.mutate(
        [
          {
            programmeId: data.programme.id,
            moduleId: active.module.id,
            contentItemId: active.item.id,
            status,
            progressPercent: percent,
            ...(position === undefined
              ? {}
              : { lastPositionSeconds: Math.max(0, Math.round(position)) }),
            ...(duration === undefined || !Number.isFinite(duration)
              ? {}
              : { durationSeconds: Math.max(1, Math.round(duration)) }),
            clientEventAt: new Date().toISOString(),
            source: status === "completed" ? "explicit_action" : "player",
          },
        ],
        notify || pendingAction || onSaved
          ? {
              onSuccess: () => {
                if (notify) toast.success("Learning progress saved.");
                onSaved?.();
              },
              onError: (error) => {
                if (notify || pendingAction) toast.error(error.message);
              },
              onSettled: () => {
                if (pendingAction) setCompletionAction(null);
              },
            }
          : undefined,
      );
    },
    [active, canTrack, data.programme.id, syncProgress],
  );

  if (!active) return <EmptyPlayer className={className} />;

  const currentIndex = activeIndex;
  const previous = currentIndex > 0 ? playlist[currentIndex - 1] : null;
  const next = nextEntry;
  const completed =
    itemProgress?.status === "completed" ||
    locallyCompletedIds.has(active.item.id);
  const meta = typeMeta[active.item.type];
  const TypeIcon = meta.icon;

  function promptForRating(
    completedEntry: PlaylistEntry,
    target: PlaylistEntry | null,
  ) {
    if (!canTrack || !completedEntry.item.trainer) {
      if (target) choose(target);
      return;
    }
    const completedKey = entryKey(completedEntry);
    if (ratingPromptedForVisitRef.current === completedKey) {
      if (target) choose(target);
      return;
    }
    ratingPromptedForVisitRef.current = completedKey;
    setRatingPrompt({ entry: completedEntry, target });
  }

  function handleCompletionSaved(
    completedEntry: PlaylistEntry,
    target: PlaylistEntry | null,
  ) {
    playback.clear();
    setLocallyCompletedIds((current) =>
      new Set(current).add(completedEntry.item.id),
    );
    promptForRating(completedEntry, target);
  }

  function finishRatingPrompt() {
    const target = ratingPrompt?.target ?? null;
    setRatingPrompt(null);
    if (target) choose(target);
  }

  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-line bg-card shadow-sm",
        className,
      )}
    >
      <div className="grid xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 border-b border-line xl:border-b-0 xl:border-r">
          <header className="flex min-h-14 items-center justify-between gap-3 border-b border-white/10 bg-[#161116] px-4 py-3 text-white sm:px-5">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">
                {data.programme.name}
              </div>
              <div className="mt-0.5 truncate text-xs text-white/60">
                Module {active.module.position} · {active.module.title}
              </div>
            </div>
            <Badge tone={canTrack ? "brand" : "neutral"}>
              {canTrack ? "Learning" : "Preview mode"}
            </Badge>
          </header>

          <MediaStage
            key={playerKey + ":" + active.item.id}
            item={active.item}
            signedFile={signedFile}
            signedVideo={signedVideo}
            transitioning={transitioningToKey === entryKey(active)}
            onReady={() => setTransitioningToKey(null)}
            resumeReady={playback.isHydrated}
            resumePosition={
              restartFromBeginningKey === entryKey(active)
                ? 0
                : playback.resumePositionSeconds
            }
            onProgress={playback.record}
            onPause={(position, duration) => {
              playback.record(position, duration);
              void playback.flush();
            }}
            onEnded={(duration) => {
              const finalDuration =
                Number.isFinite(duration) && duration > 0
                  ? duration
                  : (active.item.durationSeconds ?? undefined);
              if (finalDuration !== undefined) {
                playback.record(finalDuration, finalDuration);
              }
              saveProgress(
                "completed",
                100,
                finalDuration,
                finalDuration,
                true,
                undefined,
                () => handleCompletionSaved(active, next),
              );
            }}
          />

          <div className="border-t border-line p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={meta.tone}>
                    <TypeIcon className="mr-1 h-3.5 w-3.5" />
                    {meta.label}
                  </Badge>
                  {active.item.durationLabel ? (
                    <span className="text-xs text-ink-muted">
                      {active.item.durationLabel}
                    </span>
                  ) : null}
                  {completed ? <Badge tone="green">Completed</Badge> : null}
                  {!canTrack && active.item.status !== "ready" ? (
                    <Badge tone="amber">{active.item.status}</Badge>
                  ) : null}
                </div>
                <h2 className="mt-2 text-xl font-semibold tracking-tight text-ink sm:text-2xl">
                  {active.item.title}
                </h2>
                <p className="mt-1 text-sm text-ink-muted">
                  {active.item.trainer
                    ? "Facilitated by " + active.item.trainer.name
                    : "BID Hub learning content"}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {active.item.type === "video" ? (
                  <Button
                    type="button"
                    variant="outline"
                    title="Restart playback at 00:00. Your completion stays saved."
                    onClick={() => {
                      playback.restart();
                      setRestartFromBeginningKey(entryKey(active));
                      setPlayerKey((value) => value + 1);
                      toast.success("Restarted from the beginning.");
                    }}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Play from beginning
                  </Button>
                ) : null}
                {canTrack ? (
                  <Button
                    type="button"
                    variant={completed ? "outline" : "success"}
                    disabled={completed || completionAction !== null}
                    isLoading={completionAction === "mark"}
                    loadingLabel="Saving..."
                    onClick={() =>
                      saveProgress(
                        "completed",
                        100,
                        undefined,
                        undefined,
                        true,
                        "mark",
                        () => handleCompletionSaved(active, next),
                      )
                    }
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {completed ? "Completed" : "Mark complete"}
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
              <Button
                type="button"
                variant="outline"
                disabled={!previous}
                onClick={() => previous && choose(previous)}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-xs font-medium text-ink-muted">
                {currentIndex + 1} of {playlist.length}
              </span>
              <Button
                type="button"
                disabled={
                  completionAction !== null ||
                  (!next && completed) ||
                  (!next &&
                    (!canTrack || (active.item.type === "video" && !completed)))
                }
                isLoading={completionAction === "next"}
                loadingLabel="Saving..."
                onClick={() => {
                  if (canTrack && active.item.type !== "video") {
                    saveProgress(
                      "completed",
                      100,
                      undefined,
                      undefined,
                      false,
                      "next",
                      () => handleCompletionSaved(active, next),
                    );
                    return;
                  }
                  if (canTrack && completed) {
                    promptForRating(active, next);
                    return;
                  }
                  if (next) choose(next);
                }}
              >
                {next ? "Next" : completed ? "Course complete" : "Finish lesson"}
                {next ? <ChevronRight className="h-4 w-4" /> : null}
              </Button>
            </div>
          </div>
        </div>

        <CurriculumPanel
          data={data}
          active={active}
          expanded={expanded}
          onToggle={(moduleId) =>
            setExpanded((current) => {
              const value = new Set(current);
              if (value.has(moduleId)) value.delete(moduleId);
              else value.add(moduleId);
              return value;
            })
          }
          onSelect={choose}
        />
      </div>

      {canTrack ? (
        <div className="border-t border-line bg-surface-subtle/40 p-4 sm:p-5">
          <div className="rounded-xl border border-line bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-ink">Your progress</h3>
                <p className="mt-1 text-sm text-ink-muted">
                  {data.progress?.completedContentCount ?? 0} of{" "}
                  {data.progress?.totalContentCount ?? playlist.length} lessons
                  completed
                </p>
              </div>
              <span className="text-lg font-semibold text-bid">
                {data.progress?.progressPercent ?? 0}%
              </span>
            </div>
            <ProgressBar
              value={data.progress?.progressPercent ?? 0}
              width="100%"
              className="mt-3 h-2"
            />
          </div>
        </div>
      ) : null}

      <ContentRatingModal
        content={ratingPrompt?.entry.item ?? null}
        programmeId={data.programme.id}
        moduleId={ratingPrompt?.entry.module.id ?? null}
        onContinue={finishRatingPrompt}
      />
    </section>
  );
}

function CurriculumPanel({
  data,
  active,
  expanded,
  onToggle,
  onSelect,
}: {
  data: ProgrammePlayerPayload;
  active: PlaylistEntry;
  expanded: Set<string>;
  onToggle: (moduleId: string) => void;
  onSelect: (entry: PlaylistEntry) => void;
}) {
  return (
    <aside className="flex min-h-[560px] flex-col bg-surface-subtle/40 xl:max-h-[820px]">
      <div className="border-b border-line bg-card px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-ink">Course content</h3>
            <p className="mt-0.5 text-xs text-ink-muted">
              {data.summary.modules} modules · {data.summary.contentItems}{" "}
              lessons
            </p>
          </div>
          <Layers3 className="h-5 w-5 text-bid" />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {data.modules.map((module) => (
          <div key={module.id} className="border-b border-line last:border-b-0">
            <button
              type="button"
              onClick={() => onToggle(module.id)}
              className={cn(
                "flex w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-bid-light/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-bid/30",
                module.id === active.module.id && "bg-bid-light/25",
              )}
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line bg-card text-xs font-semibold text-ink-muted">
                {module.position}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">
                  {module.title}
                </span>
                <span className="mt-1 block text-xs text-ink-muted">
                  {module.items.length} lesson
                  {module.items.length === 1 ? "" : "s"}
                  {module.progress
                    ? " · " + module.progress.progressPercent + "% complete"
                    : ""}
                </span>
              </span>
              <ChevronDown
                className={cn(
                  "mt-1 h-4 w-4 shrink-0 text-ink-muted transition-transform",
                  expanded.has(module.id) && "rotate-180",
                )}
              />
            </button>
            {expanded.has(module.id) ? (
              <div className="border-t border-line bg-card py-1">
                {module.items.length ? (
                  module.items.map((item) => {
                    const itemActive =
                      module.id === active.module.id &&
                      item.id === active.item.id;
                    const ItemIcon = typeMeta[item.type].icon;
                    const done = item.progress?.status === "completed";
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onSelect({ module, item })}
                        className={cn(
                          "group flex w-full items-start gap-3 border-l-2 border-transparent px-4 py-3 text-left transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-bid/30",
                          itemActive && "border-l-bid bg-bid-light/35",
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border",
                            done
                              ? "border-success/30 bg-success-light text-success-dark"
                              : itemActive
                                ? "border-bid/30 bg-bid text-white"
                                : "border-line bg-card text-ink-muted",
                          )}
                        >
                          {done ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : itemActive ? (
                            <Play className="h-3 w-3 fill-current" />
                          ) : (
                            <ItemIcon className="h-3.5 w-3.5" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={cn(
                              "line-clamp-2 text-sm font-medium text-ink group-hover:text-bid",
                              itemActive && "text-bid",
                            )}
                          >
                            {item.position}. {item.title}
                          </span>
                          <span className="mt-1 block text-xs text-ink-muted">
                            {typeMeta[item.type].label}
                            {item.durationLabel
                              ? " · " + item.durationLabel
                              : ""}
                            {!data.viewer.canTrackProgress &&
                            item.status !== "ready"
                              ? " · " + item.status
                              : ""}
                          </span>
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <p className="px-5 py-4 text-xs leading-5 text-ink-muted">
                    No content has been added to this module yet.
                  </p>
                )}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </aside>
  );
}

function MediaStage({
  item,
  signedFile,
  signedVideo,
  transitioning,
  onReady,
  resumeReady,
  resumePosition,
  onProgress,
  onPause,
  onEnded,
}: {
  item: ProgrammePlayerItem;
  signedFile: QueryState<{ download: { url: string } }>;
  signedVideo: QueryState<{
    playbackId: string;
    token: string;
    thumbnailToken: string;
  }>;
  transitioning: boolean;
  onReady: () => void;
  resumeReady: boolean;
  resumePosition: number;
  onProgress: (position: number, duration: number) => void;
  onPause: (position: number, duration: number) => void;
  onEnded: (duration: number) => void;
}) {
  if (item.status !== "ready") {
    return (
      <StageMessage
        icon={item.type === "video" ? PlayCircle : FileText}
        title="This content is not ready to preview"
        description={
          "Current processing status: " +
          item.status +
          ". The player will become available after the asset is ready."
        }
      />
    );
  }
  if (item.type === "video") {
    const loading = !resumeReady || signedVideo.isLoading;
    return (
      <div className="relative aspect-video w-full overflow-hidden bg-black">
        {loading ? (
          <VideoStageLoading title={item.title} switching={transitioning} />
        ) : signedVideo.isError || !signedVideo.data ? (
          <div className="absolute inset-0">
            <StageMessage
              compact
              icon={PlayCircle}
              title="Video could not be loaded"
              description={
                signedVideo.error?.message ?? "Request playback again."
              }
              onRetry={() => void signedVideo.refetch()}
            />
          </div>
        ) : (
          <>
            <MuxPlayer
              playbackId={signedVideo.data.playbackId}
              tokens={{
                playback: signedVideo.data.token,
                thumbnail: signedVideo.data.thumbnailToken,
              }}
              metadataVideoTitle={item.title}
              streamType="on-demand"
              startTime={resumePosition}
              onLoadedMetadata={(event: Event) => {
                const player = event.currentTarget as MuxPlayerElement;
                const maximum = Number.isFinite(player.duration)
                  ? Math.max(0, player.duration - 1)
                  : resumePosition;
                const target = Math.min(resumePosition, maximum);
                if (target > 0 && Math.abs(player.currentTime - target) > 1) {
                  player.currentTime = target;
                }
              }}
              onCanPlay={() => window.requestAnimationFrame(onReady)}
              onTimeUpdate={(event: Event) => {
                const player = event.currentTarget as MuxPlayerElement;
                onProgress(player.currentTime, player.duration);
              }}
              onPause={(event: Event) => {
                const player = event.currentTarget as MuxPlayerElement;
                onPause(player.currentTime, player.duration);
              }}
              onEnded={(event: Event) => {
                const player = event.currentTarget as MuxPlayerElement;
                onEnded(player.duration);
              }}
              className="absolute inset-0 h-full w-full"
            />
            <div
              aria-hidden={!transitioning}
              className={cn(
                "pointer-events-none absolute inset-0 z-10 grid place-items-center bg-[#0d0a0d]/92 px-6 text-center text-white transition-opacity duration-300 motion-reduce:transition-none",
                transitioning ? "opacity-100" : "opacity-0",
              )}
            >
              <div>
                <LoaderCircle className="mx-auto h-7 w-7 animate-spin text-bid-pink" />
                <p className="mt-3 text-sm font-semibold">Loading next lesson</p>
                <p className="mt-1 max-w-sm truncate text-xs text-white/55">
                  {item.title}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }
  const workbookFileId =
    item.type === "excel"
      ? item.file?.id
      : item.toolLink?.toolType === "excel"
        ? item.toolLink.fileId
        : null;
  if (workbookFileId) {
    return <SpreadsheetViewer fileId={workbookFileId} title={item.title} />;
  }
  if (item.type === "pdf" || item.toolLink?.toolType === "pdf") {
    if (signedFile.isLoading) return <StageSkeleton tall />;
    if (signedFile.isError || !signedFile.data) {
      return (
        <StageMessage
          icon={FileText}
          title="PDF could not be loaded"
          description={signedFile.error?.message ?? "Request the file again."}
          onRetry={() => void signedFile.refetch()}
        />
      );
    }
    return (
      <ToolFramePreview
        key={`${item.id}:${signedFile.data.download.url}`}
        title={item.title}
        url={signedFile.data.download.url}
        type="pdf"
        className="min-h-[620px] rounded-none border-0 shadow-none [&>iframe]:h-[620px]"
      />
    );
  }
  if (!item.toolLink?.url) {
    return (
      <StageMessage
        icon={Wrench}
        title="Tool is not available"
        description="A working embedded tool link has not been connected yet."
      />
    );
  }
  return <EmbeddedToolFrame title={item.title} url={item.toolLink.url} />;
}

function EmbeddedToolFrame({ title, url }: { title: string; url: string }) {
  const [loaded, setLoaded] = React.useState(false);
  const [takingLonger, setTakingLonger] = React.useState(false);
  const [frameKey, setFrameKey] = React.useState(0);

  React.useEffect(() => {
    if (loaded) return;
    const timeout = window.setTimeout(() => setTakingLonger(true), 8000);
    return () => window.clearTimeout(timeout);
  }, [frameKey, loaded]);

  function retry() {
    setLoaded(false);
    setTakingLonger(false);
    setFrameKey((current) => current + 1);
  }

  return (
    <div className="relative h-[620px] w-full overflow-hidden bg-[#0d0a0d]">
      <iframe
        key={frameKey}
        title={title}
        src={url}
        onLoad={() => setLoaded(true)}
        className={cn(
          "absolute inset-0 h-full w-full bg-white transition-opacity duration-300 motion-reduce:transition-none",
          loaded ? "opacity-100" : "opacity-0",
        )}
        sandbox="allow-forms allow-popups allow-same-origin allow-scripts"
      />
      {!loaded ? (
        <div
          role="status"
          aria-live="polite"
          className="absolute inset-0 grid place-items-center bg-[#0d0a0d] px-6 text-center text-white"
        >
          <div className="max-w-sm">
            <div className="relative mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-bid-pink/25 bg-bid-pink/10 text-bid-pink">
              <Wrench className="h-6 w-6" />
              <LoaderCircle className="absolute -inset-1 h-16 w-16 animate-spin text-bid-pink/70" />
            </div>
            <p className="mt-5 text-base font-semibold">
              {takingLonger
                ? "This tool is taking a little longer"
                : "Opening interactive tool"}
            </p>
            <p className="mt-1 truncate text-sm text-white/60">{title}</p>
            <p className="mt-2 text-xs leading-5 text-white/45">
              {takingLonger
                ? "You can wait a moment longer or try loading it again."
                : "Preparing the tool inside your lesson…"}
            </p>
            {takingLonger ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-4 border-white/20 bg-white/5 text-white hover:border-bid-pink/60 hover:bg-bid-pink/10 hover:text-white"
                onClick={retry}
              >
                <RotateCcw className="h-4 w-4" />
                Try again
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function VideoStageLoading({
  title,
  switching,
}: {
  title: string;
  switching: boolean;
}) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-[#0d0a0d] px-6 text-center text-white">
      <div>
        <LoaderCircle className="mx-auto h-7 w-7 animate-spin text-bid-pink" />
        <p className="mt-3 text-sm font-semibold">
          {switching ? "Loading next lesson" : "Preparing video"}
        </p>
        <p className="mt-1 max-w-sm truncate text-xs text-white/55">{title}</p>
      </div>
    </div>
  );
}

function StageSkeleton({ tall = false }: { tall?: boolean }) {
  return (
    <div
      className={cn(
        "bg-[#161116] p-5",
        tall
          ? "h-[620px]"
          : "grid min-h-[360px] place-items-center xl:min-h-[600px]",
      )}
    >
      <Skeleton className="h-full min-h-[280px] w-full bg-white/10" />
    </div>
  );
}

function StageMessage({
  icon: Icon,
  title,
  description,
  onRetry,
  compact = false,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  onRetry?: () => void;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid place-items-center bg-[#161116] px-6 text-center text-white",
        compact
          ? "h-full min-h-0 py-8"
          : "min-h-[420px] py-16 xl:min-h-[600px]",
      )}
    >
      <div className="max-w-md">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/5 text-white/70">
          <Icon className="h-6 w-6" />
        </span>
        <h3 className="mt-4 text-lg font-semibold">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-white/60">{description}</p>
        {onRetry ? (
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={onRetry}
          >
            Try again
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function EmptyPlayer({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-line bg-card px-6 py-20 text-center",
        className,
      )}
    >
      <BookOpen className="mx-auto h-10 w-10 text-ink-faint" />
      <h3 className="mt-4 text-lg font-semibold text-ink">
        No learning content yet
      </h3>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-ink-muted">
        Add ready video, PDF, or interactive content to a module before the
        programme can be played.
      </p>
    </div>
  );
}

function entryKey(entry: PlaylistEntry) {
  return entry.module.id + ":" + entry.item.id;
}

export function ProgrammeCoursePlayerSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-card">
      <div className="grid xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="border-b border-line xl:border-b-0 xl:border-r">
          <div className="bg-[#161116] p-4">
            <Skeleton className="h-4 w-52 bg-white/10" />
            <Skeleton className="mt-2 h-3 w-72 bg-white/10" />
          </div>
          <StageSkeleton />
          <div className="space-y-3 p-5">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-48" />
            <div className="flex justify-between pt-5">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
        </div>
        <div>
          <div className="border-b border-line p-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="mt-2 h-3 w-24" />
          </div>
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3].map((item) => (
              <Skeleton key={item} className="h-20 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
