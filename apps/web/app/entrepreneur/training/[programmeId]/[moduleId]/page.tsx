'use client';

import * as React from 'react';
import { notFound, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  FileText,
  PlayCircle,
  Star,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { PageHeader } from '@/components/shared/PageHeader';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { Card, CardHeader } from '@/components/shared/Card';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { LearningContentPlayer } from '@/components/entrepreneur/LearningContentPlayer';
import {
  programById,
  moduleById,
  contentForModule,
  modulesForProgram,
} from '@/lib/mock-data/programs';
import { moduleWithProgress } from '@/lib/training/progress';
import { getContentTrainer } from '@/lib/content-trainer-access';
import { cn } from '@/lib/utils';
import type { BadgeTone, ContentItem, ContentProgress, ContentType } from '@/types';
import { routes } from '@/lib/routes';

const contentMeta: Record<
  ContentType,
  { label: string; icon: LucideIcon; tone: BadgeTone; iconClass: string }
> = {
  video: { label: 'Video', icon: PlayCircle, tone: 'brand', iconClass: 'bg-bid-light text-bid' },
  pdf: { label: 'PDF', icon: FileText, tone: 'blue', iconClass: 'bg-info-light text-info' },
  tool: { label: 'Tool', icon: Wrench, tone: 'green', iconClass: 'bg-success-light text-success-dark' },
};

export default function ModuleContentPage({
  params,
}: {
  params: { programmeId: string; moduleId: string };
}) {
  const router = useRouter();
  const [activeContent, setActiveContent] = React.useState<ContentItem | null>(null);

  const program = programById(params.programmeId);
  const trainingModule = moduleById(params.moduleId);
  if (!program || !trainingModule || !program.moduleIds.includes(trainingModule.id)) return notFound();

  const programmeModules = modulesForProgram(program.id).map(moduleWithProgress);
  const moduleIndex = programmeModules.findIndex((module) => module.id === trainingModule.id);
  const previousModule = moduleIndex > 0 ? programmeModules[moduleIndex - 1] : undefined;
  const nextModule = moduleIndex >= 0 && moduleIndex < programmeModules.length - 1
    ? programmeModules[moduleIndex + 1]
    : undefined;
  const moduleProgress = moduleWithProgress(trainingModule);
  const items = contentForModule(trainingModule.id);
  const firstOpenItem = items.find((item) => item.progress !== 'completed') ?? items[0] ?? null;
  const completedItems = items.filter((item) => item.progress === 'completed').length;
  const videos = items.filter((item) => item.type === 'video').length;
  const files = items.filter((item) => item.type === 'pdf').length;
  const tools = items.filter((item) => item.type === 'tool').length;

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
        description={trainingModule.description ?? 'Open each learning item and complete this module when ready.'}
        actions={
          <Button variant="outline" onClick={() => router.push(routes.entrepreneur.trainingProgram(program.id))}>
            <ChevronLeft className="h-4 w-4" />
            Programme
          </Button>
        }
      />

      <Card padding="lg" className="mb-4">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {moduleStatusBadge(moduleProgress.status)}
              <Badge tone="neutral">Module {moduleIndex + 1} of {programmeModules.length}</Badge>
              <Badge tone="brand">{videos} video{videos === 1 ? '' : 's'}</Badge>
              <Badge tone="blue">{files} file{files === 1 ? '' : 's'}</Badge>
              <Badge tone="green">{tools} tool{tools === 1 ? '' : 's'}</Badge>
            </div>

            <div className="mt-5 max-w-3xl">
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-ink">Module progress</span>
                <span className="text-ink-muted">{moduleProgress.progress}% complete</span>
              </div>
              <ProgressBar value={moduleProgress.progress} width="100%" className="h-2.5" />
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Button type="button" disabled={!firstOpenItem} onClick={() => firstOpenItem && setActiveContent(firstOpenItem)}>
                {moduleProgress.status === 'completed' ? 'Review content' : 'Continue content'}
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button type="button" variant="outline" onClick={markComplete}>
                <CheckCircle2 className="h-4 w-4" />
                Mark module complete
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <ModuleMetric icon={CheckCircle2} label="Completed" value={`${completedItems}/${items.length}`} />
            <ModuleMetric icon={PlayCircle} label="Learning items" value={items.length} />
            <ModuleMetric icon={Star} label="Ratings" value="After each item" />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader
            title="Module content"
            description="Open a video, file, or tool without leaving your learning flow."
          />
          {items.length > 0 ? (
            <div className="space-y-3">
              {items.map((item, index) => (
                <ContentLessonRow
                  key={item.id}
                  item={item}
                  index={index}
                  onOpen={() => setActiveContent(item)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-line-strong bg-surface-subtle px-4 py-12 text-center text-sm text-ink-muted">
              Content has not been added to this module yet.
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Module navigation" description="Move through the programme in order." />
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start"
                disabled={!previousModule}
                onClick={() => previousModule && router.push(routes.entrepreneur.trainingModule(program.id, previousModule.id))}
              >
                <ArrowLeft className="h-4 w-4" />
                Previous module
              </Button>
              <Button
                type="button"
                className="w-full justify-start"
                disabled={!nextModule}
                onClick={() => nextModule && router.push(routes.entrepreneur.trainingModule(program.id, nextModule.id))}
              >
                Next module
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </Card>

          <Card>
            <CardHeader title="Programme" description={program.name} />
            <p className="text-sm leading-6 text-ink-muted">{program.description}</p>
            <Button
              type="button"
              variant="outline"
              className="mt-4 w-full"
              onClick={() => router.push(routes.entrepreneur.trainingProgram(program.id))}
            >
              View programme modules
            </Button>
          </Card>
        </div>
      </div>

      <LearningContentPlayer
        item={activeContent}
        programmeId={program.id}
        playlist={items}
        onChangeItem={setActiveContent}
        onClose={() => setActiveContent(null)}
      />
    </>
  );
}

function ContentLessonRow({
  item,
  index,
  onOpen,
}: {
  item: ContentItem;
  index: number;
  onOpen: () => void;
}) {
  const meta = contentMeta[item.type];
  const Icon = meta.icon;
  const trainer = getContentTrainer(item.id);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full items-start gap-3 rounded-xl border border-line bg-white p-4 text-left transition hover:border-bid/20 hover:bg-surface-subtle/50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bid/20"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-subtle text-sm font-semibold text-ink-muted">
        {index + 1}
      </span>
      <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-xl', meta.iconClass)}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-base font-semibold text-ink group-hover:text-bid">{item.title}</span>
          <Badge tone={meta.tone}>{meta.label}</Badge>
          {progressBadge(item.progress)}
        </span>
        <span className="mt-1 block text-sm leading-6 text-ink-muted">
          {item.chapter}
          {item.durationLabel ? ` · ${item.durationLabel}` : ''}
          {trainer ? ` · ${trainer.fullName}` : ''}
        </span>
      </span>
      <span className="hidden shrink-0 text-sm font-medium text-bid sm:block">Open</span>
    </button>
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

function moduleStatusBadge(status: 'not-started' | 'in-progress' | 'completed') {
  if (status === 'completed') return <Badge tone="green">Completed</Badge>;
  if (status === 'in-progress') return <Badge tone="amber">In progress</Badge>;
  return <Badge tone="neutral">Not started</Badge>;
}

function progressBadge(progress: ContentProgress) {
  if (progress === 'completed') return <Badge tone="green">Done</Badge>;
  if (progress === 'in-progress') return <Badge tone="amber">In progress</Badge>;
  return <Badge tone="neutral">Not started</Badge>;
}

function markComplete() {
  toast.success('Module marked complete');
}
