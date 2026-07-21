"use client";

import * as React from "react";
import MuxPlayer from "@mux/mux-player-react/lazy";
import type MuxPlayerElement from "@mux/mux-player";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  PlayCircle,
  RotateCcw,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { ContentRating } from "@/components/entrepreneur/ContentRating";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { Skeleton } from "@/components/shared/Card";
import { SpreadsheetViewer } from "@/components/shared/SpreadsheetViewer";
import { Modal } from "@/components/shared/Modal";
import {
  type ContentItemRecord,
  type ContentItemType,
} from "@/lib/api/content";
import { useSignedFileUrlQuery } from "@/lib/api/files";
import {
  useLearnerProgressQuery,
  useSyncLearnerProgressMutation,
} from "@/lib/api/learning";
import { useSignedVideoPlaybackQuery } from "@/lib/api/videos";
import { cn } from "@/lib/utils";
import type { BadgeTone } from "@/types";

export type LearningPlaylistEntry = {
  programmeId: string;
  moduleId: string;
  moduleTitle: string;
  item: ContentItemRecord;
};

const typeMeta: Record<
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
  excel: {
    label: "Excel",
    icon: FileSpreadsheet,
    tone: "green",
    iconClass: "bg-success-light text-success",
  },
  tool: {
    label: "Tool",
    icon: Wrench,
    tone: "green",
    iconClass: "bg-success-light text-success-dark",
  },
};

const videoCheckpoints = [10, 25, 50, 75, 90];

export function LearningContentPlayer({
  entry,
  playlist,
  onChangeEntry,
  onClose,
}: {
  entry: LearningPlaylistEntry | null;
  playlist: LearningPlaylistEntry[];
  onChangeEntry: (entry: LearningPlaylistEntry) => void;
  onClose: () => void;
}) {
  const item = entry?.item ?? null;
  const currentIndex = entry
    ? playlist.findIndex(
        (candidate) =>
          candidate.moduleId === entry.moduleId &&
          candidate.item.id === entry.item.id,
      )
    : -1;
  const previous = currentIndex > 0 ? playlist[currentIndex - 1] : undefined;
  const next =
    currentIndex >= 0 && currentIndex < playlist.length - 1
      ? playlist[currentIndex + 1]
      : undefined;
  const progress = useLearnerProgressQuery(
    entry
      ? {
          programmeId: entry.programmeId,
          moduleId: entry.moduleId,
          contentItemId: entry.item.id,
        }
      : null,
  );
  const syncProgress = useSyncLearnerProgressMutation();
  const signedFile = useSignedFileUrlQuery(
    item?.type === "pdf" ? item.file?.id : undefined,
    Boolean(entry),
  );
  const signedVideo = useSignedVideoPlaybackQuery(
    item?.type === "video" ? item.video?.id : undefined,
    Boolean(entry),
  );
  const [playerKey, setPlayerKey] = React.useState(0);
  const openedItemRef = React.useRef<string | null>(null);
  const lastCheckpointRef = React.useRef(0);

  const submitProgress = React.useCallback(
    (
      status: "in_progress" | "completed",
      progressPercent: number,
      positionSeconds?: number,
      durationSeconds?: number,
      handlers?: {
        onSuccess?: () => void;
        onError?: (error: Error) => void;
      },
    ) => {
      if (!entry) return;
      syncProgress.mutate(
        [
          {
            programmeId: entry.programmeId,
            moduleId: entry.moduleId,
            contentItemId: entry.item.id,
            status,
            progressPercent,
            ...(positionSeconds === undefined
              ? {}
              : {
                  lastPositionSeconds: Math.max(0, Math.round(positionSeconds)),
                }),
            ...(durationSeconds === undefined ||
            !Number.isFinite(durationSeconds)
              ? {}
              : { durationSeconds: Math.max(1, Math.round(durationSeconds)) }),
            clientEventAt: new Date().toISOString(),
            source: status === "completed" ? "explicit_action" : "player",
          },
        ],
        handlers,
      );
    },
    [entry, syncProgress],
  );

  React.useEffect(() => {
    if (!entry || openedItemRef.current === entry.item.id) return;
    openedItemRef.current = entry.item.id;
    lastCheckpointRef.current =
      Math.floor((progress.data?.content?.progressPercent ?? 0) / 10) * 10;
    setPlayerKey((current) => current + 1);
    submitProgress(
      "in_progress",
      Math.max(progress.data?.content?.progressPercent ?? 0, 1),
    );
  }, [entry, progress.data?.content?.progressPercent, submitProgress]);

  if (!entry || !item) return null;

  const currentEntry = entry;
  const meta = typeMeta[item.type];
  const Icon = meta.icon;
  const completed = progress.data?.content?.status === "completed";
  const resumePosition = progress.data?.content?.lastPositionSeconds ?? 0;
  const externalUrl =
    item.type === "pdf"
      ? signedFile.data?.download.url
      : item.type === "tool"
        ? item.toolLink?.url
        : undefined;

  function checkpointVideo(position: number, duration: number) {
    if (!duration || !Number.isFinite(duration)) return;
    const percent = Math.min(99, Math.round((position / duration) * 100));
    const checkpoint = videoCheckpoints.find(
      (value) => percent >= value && lastCheckpointRef.current < value,
    );
    if (!checkpoint) return;
    lastCheckpointRef.current = checkpoint;
    submitProgress("in_progress", checkpoint, position, duration);
  }

  function markComplete() {
    submitProgress(
      "completed",
      100,
      currentEntry.item.type === "video"
        ? (progress.data?.content?.lastPositionSeconds ?? undefined)
        : undefined,
      currentEntry.item.durationSeconds ?? undefined,
      {
        onSuccess: () => toast.success("Content marked complete."),
        onError: (error) => toast.error(error.message),
      },
    );
  }

  return (
    <Modal
      open={Boolean(entry)}
      onOpenChange={(open) => !open && onClose()}
      title="Learning content"
      width="media"
    >
      <div className="grid min-h-[620px] gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          <div className="rounded-xl border border-line bg-surface-subtle p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span
                  className={cn(
                    "grid h-12 w-12 shrink-0 place-items-center rounded-xl",
                    meta.iconClass,
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                    <Badge tone="neutral">{entry.moduleTitle}</Badge>
                    {completed ? <Badge tone="green">Completed</Badge> : null}
                    {item.durationLabel ? (
                      <span className="text-sm text-ink-muted">
                        {item.durationLabel}
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-2 text-2xl font-semibold leading-tight text-ink">
                    {item.title}
                  </h3>
                  <div className="mt-1 text-sm text-ink-muted">
                    {item.trainer
                      ? "By " + item.trainer.name
                      : "BID learning content"}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {item.type === "video" ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      lastCheckpointRef.current = 0;
                      setPlayerKey((current) => current + 1);
                    }}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Start over
                  </Button>
                ) : null}
                {externalUrl ? (
                  <Button type="button" variant="outline" asChild>
                    <a href={externalUrl} target="_blank" rel="noreferrer">
                      Open new tab
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          <ContentFrame
            key={playerKey}
            item={item}
            signedFile={signedFile}
            signedVideo={signedVideo}
            resumePosition={resumePosition}
            onVideoProgress={checkpointVideo}
            onVideoEnded={markComplete}
          />

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              disabled={!previous}
              onClick={() => previous && onChangeEntry(previous)}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="text-center text-sm text-ink-muted">
              {playlist.length > 0
                ? currentIndex + 1 + " of " + playlist.length
                : "No playlist"}
            </div>
            <Button
              type="button"
              disabled={!next}
              onClick={() => next && onChangeEntry(next)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <aside className="flex min-h-0 flex-col gap-4">
          <div className="rounded-xl border border-line bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-ink">
                Learning progress
              </div>
              <span className="text-xs text-ink-muted">
                {progress.data?.content?.progressPercent ?? 0}%
              </span>
            </div>
            <Button
              type="button"
              variant={completed ? "outline" : "success"}
              className="mt-3 w-full"
              disabled={completed}
              isLoading={syncProgress.isPending}
              loadingLabel="Saving..."
              onClick={markComplete}
            >
              <CheckCircle2 className="h-4 w-4" />
              {completed ? "Completed" : "Mark complete"}
            </Button>
          </div>

          <div className="rounded-xl border border-line bg-card p-4">
            <div className="text-sm font-semibold text-ink">Up next</div>
            <div className="mt-3 max-h-[260px] space-y-2 overflow-y-auto pr-1">
              {playlist.map((candidate, index) => {
                const candidateMeta = typeMeta[candidate.item.type];
                const CandidateIcon = candidateMeta.icon;
                const active =
                  candidate.moduleId === entry.moduleId &&
                  candidate.item.id === item.id;
                return (
                  <button
                    key={candidate.moduleId + ":" + candidate.item.id}
                    type="button"
                    onClick={() => onChangeEntry(candidate)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition",
                      active
                        ? "border-bid/30 bg-bid-light/40"
                        : "border-line bg-card hover:bg-surface-subtle",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg",
                        candidateMeta.iconClass,
                      )}
                    >
                      <CandidateIcon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-sm font-medium text-ink">
                        {candidate.item.title}
                      </span>
                      <span className="mt-1 block text-xs text-ink-muted">
                        {index + 1 + ". " + candidate.moduleTitle}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <ContentRating key={item.id} content={item} />
        </aside>
      </div>
    </Modal>
  );
}

type QueryState<T> = {
  data?: T;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
};

function ContentFrame({
  item,
  signedFile,
  signedVideo,
  resumePosition,
  onVideoProgress,
  onVideoEnded,
}: {
  item: ContentItemRecord;
  signedFile: QueryState<{ download: { url: string } }>;
  signedVideo: QueryState<{
    playbackId: string;
    token: string;
    thumbnailToken: string;
  }>;
  resumePosition: number;
  onVideoProgress: (position: number, duration: number) => void;
  onVideoEnded: () => void;
}) {
  if (item.type === "video") {
    if (signedVideo.isLoading) return <PlayerSkeleton />;
    if (signedVideo.isError || !signedVideo.data) {
      return (
        <AssetError
          icon={PlayCircle}
          title="Video could not be loaded"
          description={
            signedVideo.error?.message ?? "Try requesting playback again."
          }
          onRetry={() => void signedVideo.refetch()}
        />
      );
    }
    return (
      <div className="overflow-hidden rounded-xl border border-border bg-black">
        <MuxPlayer
          playbackId={signedVideo.data.playbackId}
          tokens={{
            playback: signedVideo.data.token,
            thumbnail: signedVideo.data.thumbnailToken,
          }}
          metadataVideoTitle={item.title}
          streamType="on-demand"
          startTime={resumePosition || undefined}
          onTimeUpdate={(event: Event) => {
            const player = event.currentTarget as MuxPlayerElement;
            onVideoProgress(player.currentTime, player.duration);
          }}
          onEnded={onVideoEnded}
          className="aspect-video w-full"
        />
      </div>
    );
  }

  if (item.type === "excel") {
    return <SpreadsheetViewer fileId={item.file?.id} title={item.title} />;
  }

  if (item.type === "pdf") {
    if (signedFile.isLoading) return <PlayerSkeleton tall />;
    if (signedFile.isError || !signedFile.data) {
      return (
        <AssetError
          icon={FileText}
          title="PDF could not be loaded"
          description={
            signedFile.error?.message ?? "Try requesting the file again."
          }
          onRetry={() => void signedFile.refetch()}
        />
      );
    }
    return (
      <div className="overflow-hidden rounded-xl border border-line bg-card">
        <iframe
          title={item.title}
          src={signedFile.data.download.url}
          className="h-[560px] w-full"
        />
      </div>
    );
  }

  if (!item.toolLink?.url) {
    return (
      <AssetError
        icon={Wrench}
        title="Tool is not available"
        description="BID has not connected this tool yet."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-card">
      <iframe
        title={item.title}
        src={item.toolLink.url}
        className="h-[560px] w-full"
        sandbox="allow-forms allow-popups allow-same-origin allow-scripts"
      />
    </div>
  );
}

function PlayerSkeleton({ tall = false }: { tall?: boolean }) {
  return (
    <div
      className={cn(
        "space-y-3 rounded-xl border border-line bg-surface-subtle p-4",
        tall ? "h-[560px]" : "aspect-video",
      )}
    >
      <Skeleton className="h-full w-full" />
    </div>
  );
}

function AssetError({
  icon: Icon,
  title,
  description,
  onRetry,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  onRetry?: () => void;
}) {
  return (
    <div className="grid min-h-[420px] place-items-center rounded-xl border border-dashed border-line-strong bg-surface-subtle p-8 text-center">
      <div>
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-xl bg-card text-ink-muted">
          <Icon className="h-6 w-6" />
        </span>
        <div className="mt-4 text-base font-semibold text-ink">{title}</div>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-muted">
          {description}
        </p>
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
