'use client';

import * as React from 'react';
import { notFound } from 'next/navigation';
import { PlayCircle, FileText, Wrench, Check, Star } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { PageHeader } from '@/components/shared/PageHeader';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { Modal } from '@/components/shared/Modal';
import { ContentRating } from '@/components/entrepreneur/ContentRating';
import {
  programById,
  moduleById,
  contentForModule,
} from '@/lib/mock-data/programs';
import { cn } from '@/lib/utils';
import type { ContentItem, ContentType } from '@/types';
import { routes } from '@/lib/routes';

const typeMeta: Record<
  ContentType,
  { icon: LucideIcon; bg: string; fg: string }
> = {
  video: { icon: PlayCircle, bg: 'bg-bid-light', fg: 'text-bid' },
  pdf: { icon: FileText, bg: 'bg-info-light', fg: 'text-info' },
  tool: { icon: Wrench, bg: 'bg-success-light', fg: 'text-success-dark' },
};

function progressBadge(progress: ContentItem['progress']) {
  switch (progress) {
    case 'completed':
      return <Badge tone="brand">Done</Badge>;
    case 'in-progress':
      return <Badge tone="amber">60%</Badge>;
    default:
      return <Badge tone="neutral">Open</Badge>;
  }
}

export default function ModuleContentPage({
  params,
}: {
  params: { programmeId: string; moduleId: string };
}) {
  const [activeVideo, setActiveVideo] = React.useState<ContentItem | null>(null);
  const [activeTool, setActiveTool] = React.useState<ContentItem | null>(null);
  const [ratingItem, setRatingItem] = React.useState<ContentItem | null>(null);

  const program = programById(params.programmeId);
  const trainingModule = moduleById(params.moduleId);
  if (!program || !trainingModule) return notFound();
  const items = contentForModule(trainingModule.id);

  return (
    <>
      <Breadcrumb
        items={[
          { label: 'Training Library', href: routes.entrepreneur.training },
          { label: program.name, href: routes.entrepreneur.trainingProgram(program.id) },
          { label: trainingModule.title },
        ]}
      />
      <PageHeader
        title={trainingModule.title}
        description={`${items.length} content items in this module`}
      />

      <div className="flex flex-col gap-2">
        {items.length === 0 && (
          <div className="rounded-bid border border-line bg-surface-panel px-4 py-6 text-center text-[11px] text-ink-faint">
            No content has been added to this module yet.
          </div>
        )}
        {items.map((item) => {
          const meta = typeMeta[item.type];
          const Icon = meta.icon;
          return (
            <div
              key={item.id}
              className="flex items-center gap-2.5 rounded-lg border border-line bg-surface-panel px-3 py-2.5 transition-colors"
            >
              <button
                onClick={() =>
                  item.type === 'video'
                    ? setActiveVideo(item)
                    : item.type === 'tool'
                      ? setActiveTool(item)
                      : undefined
                }
                className={cn(
                  'flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[7px]',
                  meta.bg,
                  item.type !== 'pdf' && 'cursor-pointer hover:opacity-80',
                )}
                aria-label={`Open ${item.title}`}
              >
                <Icon className={cn('h-3.5 w-3.5', meta.fg)} strokeWidth={1.5} />
              </button>

              <button
                className={cn(
                  'min-w-0 flex-1 text-left',
                  item.type !== 'pdf' && 'cursor-pointer',
                )}
                onClick={() =>
                  item.type === 'video'
                    ? setActiveVideo(item)
                    : item.type === 'tool'
                      ? setActiveTool(item)
                      : undefined
                }
              >
                <div className="text-xs font-medium leading-tight">
                  {item.chapter}: {item.title}
                </div>
                <div className="mt-0.5 text-[10px] text-ink-muted">
                  {item.durationLabel}
                  {item.progress === 'completed' && ' · Watched'}
                  {item.progress === 'in-progress' && ' · In progress'}
                </div>
              </button>

              <button
                onClick={() => setRatingItem(item)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-surface-subtle hover:text-amber-400"
                aria-label={`Rate ${item.title}`}
                title="Rate this content"
              >
                <Star className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>

              {progressBadge(item.progress)}
            </div>
          );
        })}
      </div>

      <div className="mt-3">
        <Button onClick={() => markComplete()}>Mark module complete</Button>
      </div>

      <VideoPlayerModal
        item={activeVideo}
        onClose={() => setActiveVideo(null)}
        onRateClick={(item) => { setActiveVideo(null); setRatingItem(item); }}
      />
      <EmbedToolModal item={activeTool} onClose={() => setActiveTool(null)} />
      <RatingModal item={ratingItem} onClose={() => setRatingItem(null)} />
    </>
  );
}

function markComplete() {
  import('sonner').then(({ toast }) => toast.success('Marked module complete!'));
}

function VideoPlayerModal({
  item,
  onClose,
  onRateClick,
}: {
  item: ContentItem | null;
  onClose: () => void;
  onRateClick: (item: ContentItem) => void;
}) {
  return (
    <Modal
      open={!!item}
      onOpenChange={(o) => !o && onClose()}
      title={item ? `${item.chapter}: ${item.title}` : ''}
      width="xl"
    >
      {item && (
        <>
          <div className="mb-3.5 flex h-[200px] items-center justify-center rounded-lg bg-bid-light">
            <button
              onClick={() =>
                import('sonner').then(({ toast }) => toast.success('Playing video…'))
              }
              className="flex h-12 w-12 items-center justify-center rounded-full bg-bid"
              aria-label="Play video"
            >
              <PlayCircle className="h-5 w-5 text-white" fill="white" stroke="#842751" />
            </button>
          </div>
          <div className="mb-3.5 text-[11px] text-ink-muted">{item.durationLabel}</div>
          <div className="mb-4 flex gap-2">
            <Button className="flex-1">Continue watching</Button>
            <Button
              variant="outline"
              onClick={() =>
                import('sonner').then(({ toast }) => toast.success('Marked complete!'))
              }
            >
              <Check className="h-3.5 w-3.5" /> Mark complete
            </Button>
          </div>
          <ContentRating
            contentId={item.id}
            onSaved={() => {}}
          />
        </>
      )}
    </Modal>
  );
}

function EmbedToolModal({
  item,
  onClose,
}: {
  item: ContentItem | null;
  onClose: () => void;
}) {
  return (
    <Modal
      open={!!item}
      onOpenChange={(o) => !o && onClose()}
      title={item ? `${item.title} — online tool` : ''}
      width="xl"
    >
      {item && (
        <>
          <div className="mb-3.5 flex h-[420px] flex-col items-center justify-center gap-2 rounded-lg bg-surface-subtle">
            <Wrench className="h-8 w-8 text-ink-faint" />
            <div className="text-[11px] text-ink-muted">
              Embedded tool would render here
            </div>
          </div>
          <div className="mb-4 text-[11px] leading-relaxed text-ink-muted">
            This tool runs directly in the browser. Your work is saved automatically
            as you go.
          </div>
          <ContentRating contentId={item.id} onSaved={() => {}} />
        </>
      )}
    </Modal>
  );
}

function RatingModal({
  item,
  onClose,
}: {
  item: ContentItem | null;
  onClose: () => void;
}) {
  return (
    <Modal
      open={!!item}
      onOpenChange={(o) => !o && onClose()}
      title={item ? item.title : ''}
    >
      {item && (
        <ContentRating
          contentId={item.id}
          onSaved={onClose}
        />
      )}
    </Modal>
  );
}
