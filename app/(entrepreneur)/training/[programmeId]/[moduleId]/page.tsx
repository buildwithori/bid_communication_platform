'use client';

import * as React from 'react';
import { notFound } from 'next/navigation';
import { PlayCircle, FileText, Wrench, Check } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { PageHeader } from '@/components/shared/PageHeader';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { Modal } from '@/components/shared/Modal';
import {
  programById,
  moduleById,
  contentForModule,
} from '@/lib/mock-data/programs';
import { cn } from '@/lib/utils';
import type { ContentItem, ContentType } from '@/types';

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
  const program = programById(params.programmeId);
  const module = moduleById(params.moduleId);
  if (!program || !module) return notFound();
  const items = contentForModule(module.id);

  const [activeVideo, setActiveVideo] = React.useState<ContentItem | null>(null);
  const [activeTool, setActiveTool] = React.useState<ContentItem | null>(null);

  return (
    <>
      <Breadcrumb
        items={[
          { label: 'Training Library', href: '/training' },
          { label: program.name, href: `/training/${program.id}` },
          { label: module.title },
        ]}
      />
      <PageHeader
        title={module.title}
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
              onClick={() =>
                item.type === 'video'
                  ? setActiveVideo(item)
                  : item.type === 'tool'
                    ? setActiveTool(item)
                    : undefined
              }
              className={cn(
                'flex items-center gap-2.5 rounded-lg border border-line bg-surface-panel px-3 py-2.5 transition-colors',
                item.type !== 'pdf' && 'cursor-pointer hover:border-bid',
              )}
            >
              <span
                className={cn(
                  'flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[7px]',
                  meta.bg,
                )}
              >
                <Icon className={cn('h-3.5 w-3.5', meta.fg)} strokeWidth={1.5} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium leading-tight">{item.chapter}: {item.title}</div>
                <div className="mt-0.5 text-[10px] text-ink-muted">
                  {item.durationLabel}
                  {item.progress === 'completed' && ' · Watched'}
                  {item.progress === 'in-progress' && ' · In progress'}
                </div>
              </div>
              {progressBadge(item.progress)}
            </div>
          );
        })}
      </div>

      <div className="mt-3">
        <Button onClick={() => toast()}>Mark module complete</Button>
      </div>

      <VideoPlayerModal item={activeVideo} onClose={() => setActiveVideo(null)} />
      <EmbedToolModal item={activeTool} onClose={() => setActiveTool(null)} />
    </>
  );
}

function toast() {
  import('sonner').then(({ toast }) => toast.success('Marked module complete!'));
}

function VideoPlayerModal({
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
      title={item ? `${item.chapter}: ${item.title}` : ''}
      width="wide"
    >
      {item && (
        <>
          <div className="mb-3.5 flex h-[200px] items-center justify-center rounded-lg bg-bid-light">
            <button
              onClick={() => toast()}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-bid"
              aria-label="Play video"
            >
              <PlayCircle className="h-5 w-5 text-white" fill="white" stroke="#842751" />
            </button>
          </div>
          <div className="mb-3.5 text-[11px] text-ink-muted">{item.durationLabel}</div>
          <div className="mb-4 flex gap-2">
            <Button className="flex-1">Continue watching</Button>
            <Button variant="outline" onClick={() => toast()}>
              <Check className="h-3.5 w-3.5" /> Mark complete
            </Button>
          </div>
          <div className="mb-2.5 text-xs font-medium text-ink-muted">Rate this content</div>
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
      width="wide"
    >
      <div className="mb-3.5 flex h-[220px] flex-col items-center justify-center gap-2 rounded-lg bg-surface-subtle">
        <Wrench className="h-8 w-8 text-ink-faint" />
        <div className="text-[11px] text-ink-muted">Embedded tool would render here</div>
      </div>
      <div className="text-[11px] leading-relaxed text-ink-muted">
        This tool runs directly in the browser. Your work is saved automatically as
        you go.
      </div>
    </Modal>
  );
}
