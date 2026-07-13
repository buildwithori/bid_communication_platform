'use client';

import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import MuxPlayer from '@mux/mux-player-react/lazy';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  PlayCircle,
  RotateCcw,
  Star,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/shared/Button';
import { Badge } from '@/components/shared/Badge';
import { Modal } from '@/components/shared/Modal';
import { ContentRating } from '@/components/entrepreneur/ContentRating';
import { getContentTrainer } from '@/lib/content-trainer-access';
import { syncLearnerProgress } from '@/lib/api/learning';
import { cn } from '@/lib/utils';
import type { BadgeTone, ContentItem, ContentType } from '@/types';

const typeMeta: Record<
  ContentType,
  { label: string; icon: LucideIcon; tone: BadgeTone; iconClass: string }
> = {
  video: {
    label: 'Video',
    icon: PlayCircle,
    tone: 'brand',
    iconClass: 'bg-bid-light text-bid',
  },
  pdf: {
    label: 'PDF',
    icon: FileText,
    tone: 'blue',
    iconClass: 'bg-info-light text-info',
  },
  tool: {
    label: 'Tool',
    icon: Wrench,
    tone: 'green',
    iconClass: 'bg-success-light text-success-dark',
  },
};

export function LearningContentPlayer({
  item,
  programmeId,
  playlist,
  onChangeItem,
  onClose,
}: {
  item: ContentItem | null;
  programmeId?: string;
  playlist: ContentItem[];
  onChangeItem: (item: ContentItem) => void;
  onClose: () => void;
}) {
  const [playerKey, setPlayerKey] = React.useState(0);
  const queryClient = useQueryClient();
  const syncMutation = useMutation({
    mutationFn: syncLearnerProgress,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['learning', 'progress'] });
    },
  });
  const lastSyncedAtRef = React.useRef<Record<string, number>>({});
  const currentIndex = item
    ? Math.max(playlist.findIndex((candidate) => candidate.id === item.id), 0)
    : -1;
  const previous = currentIndex > 0 ? playlist[currentIndex - 1] : undefined;
  const next = currentIndex >= 0 && currentIndex < playlist.length - 1
    ? playlist[currentIndex + 1]
    : undefined;

  React.useEffect(() => {
    setPlayerKey((current) => current + 1);
  }, [item?.id]);

  const syncProgress = React.useCallback(
    (
      targetItem: ContentItem,
      progressPercent: number,
      options: {
        completed?: boolean;
        durationSeconds?: number;
        force?: boolean;
        lastPositionSeconds?: number;
      } = {},
    ) => {
      if (!programmeId) return;

      const boundedProgress = Math.max(0, Math.min(100, Math.round(progressPercent)));
      const now = Date.now();
      const lastSyncedAt = lastSyncedAtRef.current[targetItem.id] ?? 0;
      if (!options.force && !options.completed && now - lastSyncedAt < 15_000) return;

      lastSyncedAtRef.current[targetItem.id] = now;
      syncMutation.mutate([
        {
          programmeId,
          moduleId: targetItem.moduleId,
          contentItemId: targetItem.id,
          progressPercent: boundedProgress,
          completed: options.completed,
          durationSeconds: options.durationSeconds,
          lastPositionSeconds: options.lastPositionSeconds,
        },
      ]);
    },
    [programmeId, syncMutation],
  );

  React.useEffect(() => {
    if (!item || item.type === 'video') return;
    syncProgress(item, Math.max(10, item.progress === 'completed' ? 100 : 10));
  }, [item, syncProgress]);

  if (!item) return null;

  const meta = typeMeta[item.type];
  const Icon = meta.icon;
  const trainer = getContentTrainer(item.id);
  const openUrl = item.type === 'pdf' ? item.fileUrl : item.type === 'tool' ? item.toolUrl : undefined;

  return (
    <Modal
      open={!!item}
      onOpenChange={(open) => !open && onClose()}
      title="Learning content"
      width="media"
    >
      <div className="grid min-h-[620px] gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          <div className="rounded-xl border border-line bg-surface-subtle p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className={cn('grid h-12 w-12 shrink-0 place-items-center rounded-xl', meta.iconClass)}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                    <Badge tone="neutral">{item.chapter}</Badge>
                    {item.durationLabel && <span className="text-sm text-ink-muted">{item.durationLabel}</span>}
                  </div>
                  <h3 className="mt-2 text-2xl font-semibold leading-tight text-ink">{item.title}</h3>
                  <div className="mt-1 text-sm text-ink-muted">
                    {trainer ? `By ${trainer.fullName}` : 'BID learning content'}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {item.type === 'video' && (
                  <Button type="button" variant="outline" onClick={() => setPlayerKey((current) => current + 1)}>
                    <RotateCcw className="h-4 w-4" />
                    Start over
                  </Button>
                )}
                {openUrl && (
                  <Button type="button" variant="outline" asChild>
                    <a href={openUrl} target="_blank" rel="noreferrer">
                      Open new tab
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  disabled={syncMutation.isPending}
                  onClick={() => syncProgress(item, 100, { completed: true, force: true })}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {item.progress === 'completed' ? 'Completed' : 'Mark complete'}
                </Button>
              </div>
            </div>
          </div>

          <ContentFrame
            key={playerKey}
            item={item}
            onVideoComplete={(progress) => syncProgress(item, 100, { ...progress, completed: true, force: true })}
            onVideoProgress={(progress) => syncProgress(item, progress.percent, progress)}
          />

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              disabled={!previous}
              onClick={() => previous && onChangeItem(previous)}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="text-center text-sm text-ink-muted">
              {playlist.length > 0 ? `${currentIndex + 1} of ${playlist.length}` : 'No playlist'}
            </div>
            <Button
              type="button"
              disabled={!next}
              onClick={() => next && onChangeItem(next)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <aside className="flex min-h-0 flex-col gap-4">
          <div className="rounded-xl border border-line bg-white p-4">
            <div className="text-sm font-semibold text-ink">Up next</div>
            <div className="mt-3 max-h-[320px] space-y-2 overflow-y-auto pr-1">
              {playlist.map((candidate, index) => {
                const candidateMeta = typeMeta[candidate.type];
                const CandidateIcon = candidateMeta.icon;
                const active = candidate.id === item.id;
                return (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() => onChangeItem(candidate)}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition',
                      active
                        ? 'border-bid/30 bg-bid-light/40'
                        : 'border-line bg-white hover:bg-surface-subtle',
                    )}
                  >
                    <span className={cn('mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg', candidateMeta.iconClass)}>
                      <CandidateIcon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-sm font-medium text-ink">{candidate.title}</span>
                      <span className="mt-1 block text-xs text-ink-muted">
                        {index + 1}. {candidateMeta.label}
                        {candidate.durationLabel ? ` · ${candidate.durationLabel}` : ''}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-line bg-white p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
              <Star className="h-4 w-4 text-warning-dark" />
              Rate this content
            </div>
            <ContentRating contentId={item.id} onSaved={() => {}} />
          </div>
        </aside>
      </div>
    </Modal>
  );
}

function ContentFrame({
  item,
  onVideoComplete,
  onVideoProgress,
}: {
  item: ContentItem;
  onVideoComplete?: (progress: { durationSeconds?: number; lastPositionSeconds?: number }) => void;
  onVideoProgress?: (progress: {
    durationSeconds?: number;
    lastPositionSeconds?: number;
    percent: number;
  }) => void;
}) {
  if (item.type === 'video') {
    if (!item.muxPlaybackId) {
      return (
        <EmptyFrame
          icon={PlayCircle}
          title="Video is not ready"
          description="This video will be available once BID finishes processing it."
        />
      );
    }

    return (
      <div className="overflow-hidden rounded-xl border border-black bg-black">
        <MuxPlayer
          playbackId={item.muxPlaybackId}
          metadataVideoTitle={item.title}
          streamType="on-demand"
          className="aspect-video w-full"
          onEnded={(event) => {
            const target = event.currentTarget as unknown as HTMLMediaElement;
            onVideoComplete?.({
              durationSeconds: target.duration ? Math.floor(target.duration) : undefined,
              lastPositionSeconds: Math.floor(target.currentTime || target.duration || 0),
            });
          }}
          onTimeUpdate={(event) => {
            const target = event.currentTarget as unknown as HTMLMediaElement;
            if (!target.duration || Number.isNaN(target.duration)) return;
            onVideoProgress?.({
              durationSeconds: Math.floor(target.duration),
              lastPositionSeconds: Math.floor(target.currentTime),
              percent: (target.currentTime / target.duration) * 100,
            });
          }}
        />
      </div>
    );
  }

  if (item.type === 'pdf') {
    if (!item.fileUrl) {
      return (
        <EmptyFrame
          icon={FileText}
          title="File is not available"
          description="BID has not attached a file for this item yet."
        />
      );
    }

    return (
      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <iframe
          title={item.title}
          src={item.fileUrl}
          className="h-[560px] w-full"
        />
      </div>
    );
  }

  if (!item.toolUrl) {
    return (
      <EmptyFrame
        icon={Wrench}
        title="Tool is not available"
        description="BID has not connected this online tool yet."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white">
      <iframe
        title={item.title}
        src={item.toolUrl}
        className="h-[560px] w-full"
        sandbox="allow-forms allow-popups allow-same-origin allow-scripts"
      />
    </div>
  );
}

function EmptyFrame({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="grid min-h-[420px] place-items-center rounded-xl border border-dashed border-line-strong bg-surface-subtle p-8 text-center">
      <div>
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-xl bg-white text-ink-muted">
          <Icon className="h-6 w-6" />
        </span>
        <div className="mt-4 text-base font-semibold text-ink">{title}</div>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-muted">{description}</p>
      </div>
    </div>
  );
}
