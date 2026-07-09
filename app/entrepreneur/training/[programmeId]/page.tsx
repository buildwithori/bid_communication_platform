'use client';

import * as React from 'react';
import { notFound, useRouter } from 'next/navigation';
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  FileText,
  Layers3,
  PlayCircle,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { Badge } from '@/components/shared/Badge';
import { ProgressBar } from '@/components/shared/ProgressBar';
import {
  TableEmptyState,
  TableFilterAutocomplete,
  TableFilterInput,
  TablePagination,
  TableToolbar,
} from '@/components/shared/DataTable';
import { LearningContentPlayer } from '@/components/entrepreneur/LearningContentPlayer';
import { contentForModule, modulesForProgram, programById } from '@/lib/mock-data/programs';
import { deliverableGroups } from '@/lib/mock-data';
import { useEntrepreneurStore } from '@/lib/stores/entrepreneur-store';
import { moduleWithProgress } from '@/lib/training/progress';
import { routes } from '@/lib/routes';
import { getProgrammeStatus, getProgrammeStatusLabel, getProgrammeStatusTone } from '@/lib/programme-status';
import { getContentTrainer } from '@/lib/content-trainer-access';
import { cn } from '@/lib/utils';
import type { BadgeTone, ContentItem, ContentProgress, ContentType, Deliverable, ModuleWithProgress } from '@/types';

type ModuleFilter = 'all' | ContentType | ContentProgress;

interface ModuleSummary extends ModuleWithProgress {
  items: ContentItem[];
  videos: number;
  files: number;
  tools: number;
  searchText: string;
}

const ALL = 'all';

const contentMeta: Record<
  ContentType,
  { label: string; icon: LucideIcon; tone: BadgeTone; iconClass: string }
> = {
  video: { label: 'Video', icon: PlayCircle, tone: 'brand', iconClass: 'bg-bid-light text-bid' },
  pdf: { label: 'PDF', icon: FileText, tone: 'blue', iconClass: 'bg-info-light text-info' },
  tool: { label: 'Tool', icon: Wrench, tone: 'green', iconClass: 'bg-success-light text-success-dark' },
};

export default function ProgrammeModulesPage({
  params,
}: {
  params: { programmeId: string };
}) {
  const router = useRouter();
  const { deliverables } = useEntrepreneurStore();
  const program = programById(params.programmeId);
  if (!program) return notFound();

  const moduleSummaries = React.useMemo<ModuleSummary[]>(() => {
    return modulesForProgram(program.id).map((module) => {
      const moduleItems = contentForModule(module.id);
      return {
        ...moduleWithProgress(module),
        items: moduleItems,
        videos: moduleItems.filter((item) => item.type === 'video').length,
        files: moduleItems.filter((item) => item.type === 'pdf').length,
        tools: moduleItems.filter((item) => item.type === 'tool').length,
        searchText: [
          module.title,
          module.description ?? '',
          ...moduleItems.map((item) => `${item.title} ${item.type} ${item.chapter} ${item.durationLabel ?? ''}`),
        ].join(' '),
      };
    });
  }, [program.id]);

  const programmeDeliverables = React.useMemo(
    () => deliverables.filter((deliverable) => deliverable.programmeId === program.id),
    [deliverables, program.id],
  );
  const contentPlaylist = React.useMemo(
    () => moduleSummaries.flatMap((module) => module.items),
    [moduleSummaries],
  );
  const completedModules = moduleSummaries.filter((module) => module.status === 'completed').length;
  const contentCount = contentPlaylist.length;
  const completedContent = contentPlaylist.filter((item) => item.progress === 'completed').length;
  const nextModule =
    moduleSummaries.find((module) => module.status !== 'completed') ?? moduleSummaries[0];
  const nextContent =
    contentPlaylist.find((item) => item.progress !== 'completed') ?? contentPlaylist[0] ?? null;
  const deliverableGroup = deliverableGroups.find((group) => group.programmeId === program.id);

  const [query, setQuery] = React.useState('');
  const [filter, setFilter] = React.useState<ModuleFilter>(ALL);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(5);
  const [expandedModuleIds, setExpandedModuleIds] = React.useState<string[]>(() =>
    nextModule ? [nextModule.id] : [],
  );
  const [activeContent, setActiveContent] = React.useState<ContentItem | null>(null);

  const filteredModules = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return moduleSummaries.filter((module) => {
      const matchesQuery = !needle || module.searchText.toLowerCase().includes(needle);
      const matchesFilter =
        filter === ALL ||
        module.status === filter ||
        module.items.some((item) => item.type === filter || item.progress === filter);
      return matchesQuery && matchesFilter;
    });
  }, [filter, moduleSummaries, query]);

  React.useEffect(() => {
    setPage(1);
  }, [filter, pageSize, query]);

  const pageModules = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredModules.slice(start, start + pageSize);
  }, [filteredModules, page, pageSize]);

  function toggleModule(moduleId: string) {
    setExpandedModuleIds((current) =>
      current.includes(moduleId)
        ? current.filter((id) => id !== moduleId)
        : [...current, moduleId],
    );
  }

  function openModule(module: ModuleSummary) {
    const firstOpenItem = module.items.find((item) => item.progress !== 'completed') ?? module.items[0];
    if (firstOpenItem) {
      setActiveContent(firstOpenItem);
      return;
    }
    toggleModule(module.id);
  }

  const status = getProgrammeStatus(program);
  const progress = program.progress;

  return (
    <>
      <Breadcrumb
        items={[
          { label: 'Training Library', href: routes.entrepreneur.training },
          { label: program.name },
        ]}
      />
      <PageHeader
        title={program.name}
        description={program.description ?? 'Work through the programme modules, content, and deliverables.'}
        actions={
          nextContent ? (
            <Button type="button" onClick={() => setActiveContent(nextContent)}>
              Continue learning
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : undefined
        }
      />

      <Card padding="lg" accent={program.accent} className="mb-4">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={getProgrammeStatusTone(status)}>{getProgrammeStatusLabel(status)}</Badge>
              <Badge tone={program.accessType === 'free' ? 'blue' : 'brand'}>
                {program.accessType === 'free' ? 'Free programme' : 'Programme access'}
              </Badge>
              <span className="inline-flex items-center gap-1.5 text-sm text-ink-muted">
                <CalendarDays className="h-4 w-4" />
                {formatDate(program.startDate)} - {formatDate(program.endDate)}
              </span>
            </div>

            <div className="mt-5 max-w-3xl">
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-ink">Programme progress</span>
                <span className="text-ink-muted">{progress}% complete</span>
              </div>
              <ProgressBar
                value={progress}
                width="100%"
                className="h-2.5"
                barClassName={program.accent === 'info' ? 'bg-info' : program.accent === 'success' ? 'bg-success' : 'bg-bid'}
              />
            </div>

            {nextModule && (
              <div className="mt-5 rounded-xl border border-line bg-surface-subtle p-4">
                <div className="text-sm font-medium text-ink">Next step</div>
                <div className="mt-1 text-lg font-semibold text-ink">{nextModule.title}</div>
                {nextModule.description && (
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-muted">{nextModule.description}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" onClick={() => openModule(nextModule)}>
                    Start next content
                  </Button>
                  <Button type="button" variant="outline" onClick={() => toggleModule(nextModule.id)}>
                    Show module
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <ProgrammeMetric icon={Layers3} label="Modules completed" value={`${completedModules}/${moduleSummaries.length}`} />
            <ProgrammeMetric icon={PlayCircle} label="Content completed" value={`${completedContent}/${contentCount}`} />
            <ProgrammeMetric icon={FileText} label="Deliverables" value={formatDeliverableSummary(programmeDeliverables)} />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader
            title="Programme curriculum"
            description="Expand a module to view the learning content inside it."
          />
          <TableToolbar>
            <div>
              <div className="text-sm font-medium text-ink">Find modules and content</div>
              <div className="mt-0.5 text-sm text-ink-muted">
                Search by module, video, file, tool, or progress.
              </div>
            </div>
            <div className="grid w-full gap-2 md:w-auto md:grid-cols-[minmax(220px,320px)_190px]">
              <TableFilterInput
                icon
                placeholder="Search curriculum..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <TableFilterAutocomplete
                value={filter}
                onValueChange={(value) => setFilter(value as ModuleFilter)}
                options={[
                  { value: ALL, label: 'All content' },
                  { value: 'video', label: 'Videos' },
                  { value: 'pdf', label: 'PDFs' },
                  { value: 'tool', label: 'Tools' },
                  { value: 'in-progress', label: 'In progress' },
                  { value: 'not-started', label: 'Not started' },
                  { value: 'completed', label: 'Completed' },
                ]}
                placeholder="All content"
                searchPlaceholder="Search filters..."
              />
            </div>
          </TableToolbar>

          {pageModules.length > 0 ? (
            <div className="space-y-3">
              {pageModules.map((module) => (
                <ModuleAccordion
                  key={module.id}
                  module={module}
                  expanded={expandedModuleIds.includes(module.id)}
                  onToggle={() => toggleModule(module.id)}
                  onOpenContent={setActiveContent}
                  onStartModule={() => openModule(module)}
                />
              ))}
            </div>
          ) : (
            <TableEmptyState
              title="No modules found"
              description="Try changing your search or content filter."
            />
          )}

          <TablePagination
            page={page}
            pageSize={pageSize}
            totalItems={filteredModules.length}
            pageSizeOptions={[5, 10, 25]}
            onPageChange={setPage}
            onPageSizeChange={(next) => {
              setPageSize(next);
              setPage(1);
            }}
          />
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Programme work"
              description="Deliverables connected to this programme."
              actions={
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => router.push(deliverableGroup ? routes.entrepreneur.deliverableGroup(deliverableGroup.id) : routes.entrepreneur.deliverables)}
                >
                  View all
                </Button>
              }
            />
            {programmeDeliverables.length > 0 ? (
              <div className="space-y-2">
                {programmeDeliverables.slice(0, 4).map((deliverable) => (
                  <button
                    key={deliverable.id}
                    type="button"
                    onClick={() => router.push(deliverableGroup ? routes.entrepreneur.deliverableGroup(deliverableGroup.id) : routes.entrepreneur.deliverables)}
                    className="w-full rounded-xl border border-line bg-white p-3 text-left transition hover:bg-surface-subtle"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-ink">{deliverable.name}</div>
                        <div className="mt-1 text-sm text-ink-muted">
                          {deliverable.dueDate ? `Due ${formatDate(deliverable.dueDate)}` : deliverable.submittedAt ? `Submitted ${formatDate(deliverable.submittedAt)}` : 'No due date'}
                        </div>
                      </div>
                      {deliverableStatusBadge(deliverable.status)}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-line-strong bg-surface-subtle px-4 py-8 text-center text-sm text-ink-muted">
                No deliverables are required for this programme yet.
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Content mix" description="What this programme includes." />
            <div className="grid grid-cols-3 gap-2">
              <ContentMix label="Videos" value={moduleSummaries.reduce((sum, module) => sum + module.videos, 0)} tone="brand" />
              <ContentMix label="Files" value={moduleSummaries.reduce((sum, module) => sum + module.files, 0)} tone="blue" />
              <ContentMix label="Tools" value={moduleSummaries.reduce((sum, module) => sum + module.tools, 0)} tone="green" />
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-4">
        <Button variant="outline" onClick={() => router.push(routes.entrepreneur.training)}>
          Back to training library
        </Button>
      </div>

      <LearningContentPlayer
        item={activeContent}
        playlist={contentPlaylist}
        onChangeItem={setActiveContent}
        onClose={() => setActiveContent(null)}
      />
    </>
  );
}

function ModuleAccordion({
  module,
  expanded,
  onToggle,
  onOpenContent,
  onStartModule,
}: {
  module: ModuleSummary;
  expanded: boolean;
  onToggle: () => void;
  onOpenContent: (item: ContentItem) => void;
  onStartModule: () => void;
}) {
  const completedItems = module.items.filter((item) => item.progress === 'completed').length;

  return (
    <section className="overflow-hidden rounded-xl border border-black/[0.08] bg-white">
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
              {moduleStatusBadge(module.status)}
            </span>
            {module.description && (
              <span className="mt-1 line-clamp-2 block text-sm leading-5 text-ink-muted">{module.description}</span>
            )}
            <span className="mt-2 flex flex-wrap gap-1.5">
              <Badge tone="neutral">{module.items.length} items</Badge>
              {module.videos > 0 && <Badge tone="brand">{module.videos} video{module.videos === 1 ? '' : 's'}</Badge>}
              {module.files > 0 && <Badge tone="blue">{module.files} file{module.files === 1 ? '' : 's'}</Badge>}
              {module.tools > 0 && <Badge tone="green">{module.tools} tool{module.tools === 1 ? '' : 's'}</Badge>}
            </span>
          </span>
        </button>

        <div className="min-w-[220px]">
          <div className="mb-1 flex items-center justify-between gap-2 text-sm">
            <span className="text-ink-muted">{completedItems}/{module.items.length} done</span>
            <span className="font-medium text-ink">{module.progress}%</span>
          </div>
          <ProgressBar value={module.progress} width="100%" className="h-2" />
          <Button type="button" size="sm" className="mt-3 w-full" onClick={onStartModule} disabled={module.items.length === 0}>
            {module.status === 'completed' ? 'Review module' : 'Continue module'}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-line bg-surface-subtle/45 p-3">
          {module.items.length > 0 ? (
            <div className="space-y-2">
              {module.items.map((item, index) => (
                <ContentRow
                  key={item.id}
                  item={item}
                  index={index}
                  onOpen={() => onOpenContent(item)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-line-strong bg-white px-4 py-8 text-center text-sm text-ink-muted">
              Content has not been added to this module yet.
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function ContentRow({
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
      className="group flex w-full items-center gap-3 rounded-xl border border-line bg-white px-3 py-3 text-left transition hover:border-bid/20 hover:bg-white hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bid/20"
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-subtle text-sm font-semibold text-ink-muted">
        {index + 1}
      </span>
      <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', meta.iconClass)}>
        <Icon className="h-4.5 w-4.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-ink group-hover:text-bid">{item.title}</span>
          <Badge tone={meta.tone}>{meta.label}</Badge>
          {progressBadge(item.progress)}
        </span>
        <span className="mt-1 block text-sm text-ink-muted">
          {item.chapter}
          {item.durationLabel ? ` · ${item.durationLabel}` : ''}
          {trainer ? ` · ${trainer.fullName}` : ''}
        </span>
      </span>
      <span className="hidden shrink-0 text-sm font-medium text-bid sm:block">Open</span>
    </button>
  );
}

function ProgrammeMetric({
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

function ContentMix({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: BadgeTone;
}) {
  const className = {
    brand: 'bg-bid-light/45 text-bid-dark',
    blue: 'bg-info-light/55 text-info',
    green: 'bg-success-light/55 text-success-dark',
    amber: 'bg-warning-light text-warning-dark',
    neutral: 'bg-surface-subtle text-ink-muted',
    red: 'bg-danger-light text-danger',
  }[tone];

  return (
    <div className={cn('rounded-xl px-3 py-3 text-center', className)}>
      <div className="text-2xl font-semibold text-ink">{value}</div>
      <div className="mt-1 text-xs font-medium">{label}</div>
    </div>
  );
}

function moduleStatusBadge(status: ModuleWithProgress['status']) {
  if (status === 'completed') return <Badge tone="green">Completed</Badge>;
  if (status === 'in-progress') return <Badge tone="amber">In progress</Badge>;
  return <Badge tone="neutral">Not started</Badge>;
}

function progressBadge(progress: ContentProgress) {
  if (progress === 'completed') return <Badge tone="green">Done</Badge>;
  if (progress === 'in-progress') return <Badge tone="amber">In progress</Badge>;
  return <Badge tone="neutral">Not started</Badge>;
}

function deliverableStatusBadge(status: Deliverable['status']) {
  switch (status) {
    case 'reviewed':
      return <Badge tone="green">Approved</Badge>;
    case 'changes-requested':
      return <Badge tone="amber">Changes required</Badge>;
    case 'submitted':
      return <Badge tone="blue">Under review</Badge>;
    case 'overdue':
      return <Badge tone="red">Late</Badge>;
    default:
      return <Badge tone="neutral">To submit</Badge>;
  }
}

function formatDeliverableSummary(deliverables: Deliverable[]) {
  if (deliverables.length === 0) return '0';
  const approved = deliverables.filter((deliverable) => deliverable.status === 'reviewed').length;
  return `${approved}/${deliverables.length}`;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
