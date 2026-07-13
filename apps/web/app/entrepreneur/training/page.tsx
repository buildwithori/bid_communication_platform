'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Clock,
  FileText,
  Layers3,
  PlayCircle,
  Star,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/shared/Card';
import { Modal } from '@/components/shared/Modal';
import { Button } from '@/components/shared/Button';
import { ContentRating } from '@/components/entrepreneur/ContentRating';
import { Badge } from '@/components/shared/Badge';
import { ProgressBar } from '@/components/shared/ProgressBar';
import {
  DataTable,
  RowActions,
  TableEmptyState,
  TableFilterAutocomplete,
  TableFilterInput,
  TablePagination,
  TableToolbar,
  type Column,
} from '@/components/shared/DataTable';
import { contentItems, modulesForProgram, programs } from '@/lib/mock-data/programs';
import { useEntrepreneurStore } from '@/lib/stores/entrepreneur-store';
import { cn } from '@/lib/utils';
import { routes } from '@/lib/routes';
import { getEntrepreneurProgrammes, isProgrammeOperational } from '@/lib/programme-access';
import { getProgrammeStatus, getProgrammeStatusLabel, getProgrammeStatusTone } from '@/lib/programme-status';
import { useLearnerProgressOverlay } from '@/lib/training/progress';
import type { BadgeTone, Program } from '@/types';

type CatalogueKind = 'programme' | 'free-resource';
type ProgressFilter = 'all' | 'continue' | 'not-started' | 'completed' | 'available';

type CatalogueRow =
  | {
      id: string;
      kind: 'programme';
      title: string;
      description: string;
      programme: Program;
      progress: number;
      modules: number;
      assets: number;
      videos: number;
      files: number;
      tools: number;
      statusLabel: string;
      statusTone: BadgeTone;
      accessLabel: string;
      progressKey: ProgressFilter;
      topic: 'programme';
      searchText: string;
    }
  | {
      id: string;
      kind: 'free-resource';
      title: string;
      description: string;
      resource: FreeResource;
      progressKey: 'available';
      topic: FreeResource['topic'];
      searchText: string;
    };

interface FreeResource {
  id: string;
  title: string;
  description: string;
  topic: 'fundraising' | 'finance' | 'operations';
  durationMin: number;
  accent: 'bid' | 'info' | 'success';
}

const freeResources: FreeResource[] = [
  {
    id: 'fr-pitch',
    title: 'Intro to Pitching Investors',
    description: 'Learn the structure of a clear investor pitch and how to open a meeting strongly.',
    topic: 'fundraising',
    durationMin: 12,
    accent: 'success',
  },
  {
    id: 'fr-captable',
    title: 'Understanding Cap Tables',
    description: 'Understand ownership, dilution, SAFE notes, and what investors expect to see.',
    topic: 'finance',
    durationMin: 8,
    accent: 'info',
  },
  {
    id: 'fr-bookkeeping',
    title: 'Basics of Bookkeeping',
    description: 'Set up clean bookkeeping habits before investor, grant, or programme reporting.',
    topic: 'operations',
    durationMin: 10,
    accent: 'bid',
  },
  {
    id: 'fr-customer-discovery',
    title: 'Customer Discovery Script',
    description: 'Use a simple interview pattern to validate customer pain without leading the answer.',
    topic: 'operations',
    durationMin: 9,
    accent: 'success',
  },
  {
    id: 'fr-runway',
    title: 'Cash Runway Basics',
    description: 'Estimate runway, burn, and the fundraising timeline your business needs.',
    topic: 'finance',
    durationMin: 11,
    accent: 'info',
  },
];

const accentBg = { bid: 'bg-bid-light', info: 'bg-info-light', success: 'bg-success-light' } as const;
const accentFg = { bid: 'text-bid', info: 'text-info', success: 'text-success-dark' } as const;
const ALL = 'all';

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

function getProgrammeContent(program: Program) {
  const modules = modulesForProgram(program.id);
  const attachedItems = modules.flatMap((module) =>
    module.contentItemIds
      .map((contentId) => contentItems.find((item) => item.id === contentId))
      .filter(Boolean) as typeof contentItems,
  );
  const nextModule = modules.find((module) =>
    module.contentItemIds.some((contentId) => contentItems.find((item) => item.id === contentId)?.progress !== 'completed'),
  ) ?? modules[0];
  const typeCounts = attachedItems.reduce<Record<string, number>>(
    (acc, item) => ({ ...acc, [item.type]: (acc[item.type] ?? 0) + 1 }),
    { video: 0, pdf: 0, tool: 0 },
  );

  return { modules, attachedItems, nextModule, typeCounts };
}

function getProgressKey(progress: number): ProgressFilter {
  if (progress >= 100) return 'completed';
  if (progress > 0) return 'continue';
  return 'not-started';
}

function buildProgrammeRow(programme: Program): CatalogueRow {
  const content = getProgrammeContent(programme);
  const status = getProgrammeStatus(programme);
  const progressKey = getProgressKey(programme.progress);
  const accessLabel = programme.accessType === 'free' ? 'Free programme' : 'Programme access';

  return {
    id: `programme-${programme.id}`,
    kind: 'programme',
    title: programme.name,
    description: programme.description ?? '',
    programme,
    progress: programme.progress,
    modules: content.modules.length,
    assets: content.attachedItems.length,
    videos: content.typeCounts.video ?? 0,
    files: content.typeCounts.pdf ?? 0,
    tools: content.typeCounts.tool ?? 0,
    statusLabel: getProgrammeStatusLabel(status),
    statusTone: getProgrammeStatusTone(status),
    accessLabel,
    progressKey,
    topic: 'programme',
    searchText: [
      programme.name,
      programme.description ?? '',
      getProgrammeStatusLabel(status),
      accessLabel,
      progressKey,
      ...content.modules.map((module) => module.title),
      ...content.attachedItems.map((item) => `${item.title} ${item.type}`),
    ].join(' '),
  };
}

function buildResourceRow(resource: FreeResource): CatalogueRow {
  return {
    id: `resource-${resource.id}`,
    kind: 'free-resource',
    title: resource.title,
    description: resource.description,
    resource,
    progressKey: 'available',
    topic: resource.topic,
    searchText: [resource.title, resource.description, resource.topic, 'free resource available'].join(' '),
  };
}

export default function TrainingLibraryPage() {
  const router = useRouter();
  const { entrepreneur } = useEntrepreneurStore();
  const progressOverlay = useLearnerProgressOverlay();
  const accessibleProgrammes = React.useMemo(
    () => getEntrepreneurProgrammes(entrepreneur, programs)
      .filter(isProgrammeOperational)
      .map(progressOverlay.overlayProgramme),
    [entrepreneur, progressOverlay.overlayProgramme],
  );
  const currentProgramme = accessibleProgrammes.find((programme) => programme.accessType !== 'free') ?? accessibleProgrammes[0];
  const currentProgrammeContent = currentProgramme ? getProgrammeContent(currentProgramme) : null;
  const [query, setQuery] = React.useState('');
  const [kindFilter, setKindFilter] = React.useState<typeof ALL | CatalogueKind>(ALL);
  const [progressFilter, setProgressFilter] = React.useState<ProgressFilter>(ALL);
  const [topicFilter, setTopicFilter] = React.useState<typeof ALL | FreeResource['topic'] | 'programme'>(ALL);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [activeResource, setActiveResource] = React.useState<FreeResource | null>(null);

  const catalogueRows = React.useMemo<CatalogueRow[]>(() => {
    return [
      ...accessibleProgrammes.map(buildProgrammeRow),
      ...freeResources.map(buildResourceRow),
    ];
  }, [accessibleProgrammes]);

  const filteredRows = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return catalogueRows.filter((row) => {
      const matchesQuery = !needle || row.searchText.toLowerCase().includes(needle);
      const matchesKind = kindFilter === ALL || row.kind === kindFilter;
      const matchesProgress = progressFilter === ALL || row.progressKey === progressFilter;
      const matchesTopic = topicFilter === ALL || row.topic === topicFilter;
      return matchesQuery && matchesKind && matchesProgress && matchesTopic;
    });
  }, [catalogueRows, kindFilter, progressFilter, query, topicFilter]);

  React.useEffect(() => {
    setPage(1);
  }, [kindFilter, pageSize, progressFilter, query, topicFilter]);

  const pageRows = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  const programmeCount = catalogueRows.filter((row) => row.kind === 'programme').length;
  const freeResourceCount = catalogueRows.filter((row) => row.kind === 'free-resource').length;
  const inProgressCount = catalogueRows.filter((row) => row.progressKey === 'continue').length;
  const completedCount = catalogueRows.filter((row) => row.progressKey === 'completed').length;

  const openRow = React.useCallback((row: CatalogueRow) => {
    if (row.kind === 'programme') {
      router.push(routes.entrepreneur.trainingProgram(row.programme.id));
      return;
    }
    setActiveResource(row.resource);
  }, [router]);

  const columns = React.useMemo<Column<CatalogueRow>[]>(
    () => [
      {
        key: 'action',
        header: 'Action',
        cell: (row) => (
          <RowActions
            actions={[
              {
                label: row.kind === 'programme' ? 'Open programme' : 'Open resource',
                onSelect: () => openRow(row),
              },
            ]}
          />
        ),
        className: 'w-[84px]',
      },
      {
        key: 'learning',
        header: 'Learning item',
        cell: (row) => {
          const Icon = row.kind === 'programme' ? BookOpen : PlayCircle;
          const iconClass = row.kind === 'programme'
            ? row.programme.accent === 'info'
              ? 'bg-info-light text-info'
              : row.programme.accent === 'success'
                ? 'bg-success-light text-success-dark'
                : 'bg-bid-light text-bid'
            : `${accentBg[row.resource.accent]} ${accentFg[row.resource.accent]}`;
          return (
            <button
              type="button"
              onClick={() => openRow(row)}
              className="flex min-w-[340px] max-w-[620px] items-start gap-3 rounded-lg text-left outline-none transition hover:text-bid focus-visible:ring-2 focus-visible:ring-bid/20"
            >
              <span className={cn('mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl', iconClass)}>
                <Icon className="h-4.5 w-4.5" />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-ink transition-colors group-hover:text-bid">{row.title}</span>
                <span className="mt-1 line-clamp-2 block text-sm leading-5 text-ink-muted">{row.description}</span>
              </span>
            </button>
          );
        },
      },
      {
        key: 'type',
        header: 'Type',
        cell: (row) => row.kind === 'programme' ? <Badge tone="brand">Programme</Badge> : <Badge tone="blue">Free resource</Badge>,
      },
      {
        key: 'status',
        header: 'Status',
        cell: (row) => row.kind === 'programme'
          ? <Badge tone={row.statusTone}>{row.statusLabel}</Badge>
          : <Badge tone="green">Available</Badge>,
      },
      {
        key: 'progress',
        header: 'Progress',
        cell: (row) => row.kind === 'programme' ? (
          <div className="min-w-[180px]">
            <ProgressBar
              value={row.progress}
              width="100%"
              className="h-2"
              barClassName={row.programme.accent === 'info' ? 'bg-info' : row.programme.accent === 'success' ? 'bg-success' : 'bg-bid'}
            />
            <div className="mt-1 text-sm text-ink-muted">{row.progress}% complete</div>
          </div>
        ) : (
          <div className="flex min-w-[150px] items-center gap-2 text-sm text-ink-muted">
            <Clock className="h-4 w-4" />
            {row.resource.durationMin} min
          </div>
        ),
      },
      {
        key: 'contents',
        header: 'Contents',
        cell: (row) => row.kind === 'programme' ? (
          <div className="flex min-w-[260px] flex-wrap gap-1.5">
            <Badge tone="neutral">{row.modules} modules</Badge>
            <Badge tone="blue">{row.videos} videos</Badge>
            <Badge tone="neutral">{row.files} files</Badge>
            <Badge tone="brand">{row.tools} tools</Badge>
          </div>
        ) : (
          <div className="flex min-w-[180px] flex-wrap gap-1.5">
            <Badge tone="neutral">Video</Badge>
            <Badge tone="brand" className="capitalize">{row.resource.topic}</Badge>
          </div>
        ),
      },
      {
        key: 'timeline',
        header: 'Timeline',
        cell: (row) => row.kind === 'programme' ? (
          <span className="whitespace-nowrap text-sm text-ink-muted">
            {formatDate(row.programme.startDate)} - {formatDate(row.programme.endDate)}
          </span>
        ) : (
          <span className="text-sm text-ink-muted">Available anytime</span>
        ),
      },
    ],
    [openRow],
  );

  return (
    <>
      <PageHeader
        title="Training Library"
        description="Continue your programme learning and use free BID resources anytime."
      />

      <Card padding="lg" className="mb-4">
        {currentProgramme ? (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge tone="brand">Continue learning</Badge>
                <Badge tone={currentProgramme.accessType === 'free' ? 'blue' : 'brand'}>
                  {currentProgramme.accessType === 'free' ? 'Free programme' : 'Programme access'}
                </Badge>
                <Badge tone={getProgrammeStatusTone(getProgrammeStatus(currentProgramme))}>
                  {getProgrammeStatusLabel(getProgrammeStatus(currentProgramme))}
                </Badge>
              </div>
              <h2 className="text-2xl font-semibold leading-tight text-ink">{currentProgramme.name}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-muted">{currentProgramme.description}</p>

              <div className="mt-5 max-w-2xl">
                <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-ink">Programme progress</span>
                  <span className="text-ink-muted">{currentProgramme.progress}% complete</span>
                </div>
                <ProgressBar
                  value={currentProgramme.progress}
                  width="100%"
                  className="h-2.5"
                  barClassName={currentProgramme.accent === 'info' ? 'bg-info' : currentProgramme.accent === 'success' ? 'bg-success' : 'bg-bid'}
                />
              </div>

              <div className="mt-5 rounded-xl border border-line bg-surface-subtle px-4 py-3">
                <div className="text-sm text-ink-muted">Next module</div>
                <div className="mt-1 font-semibold text-ink">{currentProgrammeContent?.nextModule?.title ?? 'No modules yet'}</div>
                {currentProgrammeContent?.nextModule?.description && (
                  <p className="mt-1 text-sm leading-6 text-ink-muted">{currentProgrammeContent.nextModule.description}</p>
                )}
              </div>

              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <Button onClick={() => router.push(routes.entrepreneur.trainingProgram(currentProgramme.id))}>
                  Continue learning
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={() => setKindFilter('free-resource')}>
                  Browse free resources
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <LearningSummary icon={BookOpen} label="Modules" value={currentProgrammeContent?.modules.length ?? 0} />
              <LearningSummary icon={PlayCircle} label="Videos" value={currentProgrammeContent?.typeCounts.video ?? 0} />
              <LearningSummary icon={FileText} label="Files & tools" value={(currentProgrammeContent?.typeCounts.pdf ?? 0) + (currentProgrammeContent?.typeCounts.tool ?? 0)} />
            </div>
          </div>
        ) : (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge tone="blue">Free resources</Badge>
                <Badge tone="green">Available</Badge>
              </div>
              <h2 className="text-2xl font-semibold leading-tight text-ink">Free learning resources</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-muted">
                You are not enrolled in a programme yet, but you can still use BID&apos;s free learning resources.
              </p>
              <div className="mt-5">
                <Button onClick={() => setKindFilter('free-resource')}>
                  Browse free resources
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="grid gap-3 rounded-xl border border-line bg-surface-subtle p-4">
              <div className="text-sm font-semibold text-ink">Access summary</div>
              <div className="rounded-lg bg-white px-3 py-2 text-sm text-ink-muted">
                Free resources: <span className="font-medium text-ink">{freeResourceCount}</span>
              </div>
              <div className="rounded-lg bg-white px-3 py-2 text-sm text-ink-muted">
                Programmes: <span className="font-medium text-ink">{programmeCount}</span>
              </div>
            </div>
          </div>
        )}
      </Card>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <LearningStat label="Programmes" value={programmeCount} helper="Learning paths you can open" tone="brand" />
        <LearningStat label="Free resources" value={freeResourceCount} helper="Available to every entrepreneur" tone="blue" />
        <LearningStat label="Continue" value={inProgressCount} helper="Learning already started" tone="amber" />
        <LearningStat label="Completed" value={completedCount} helper="Finished learning paths" tone="green" />
      </div>

      <Card>
        <CardHeader
          title="Learning catalogue"
          description={`${filteredRows.length} item${filteredRows.length === 1 ? '' : 's'} in this view`}
        />
        <TableToolbar>
          <div>
            <div className="text-sm font-medium text-ink">Find learning content</div>
            <div className="mt-0.5 text-sm text-ink-muted">
              Search programmes and free resources from one catalogue.
            </div>
          </div>
          <div className="grid w-full gap-2 lg:w-auto lg:grid-cols-[minmax(220px,280px)_170px_170px_170px]">
            <TableFilterInput
              icon
              placeholder="Search learning..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <TableFilterAutocomplete
              value={kindFilter}
              onValueChange={(value) => setKindFilter(value as typeof kindFilter)}
              options={[
                { value: ALL, label: 'All learning' },
                { value: 'programme', label: 'Programmes' },
                { value: 'free-resource', label: 'Free resources' },
              ]}
              placeholder="All learning"
              searchPlaceholder="Search types..."
            />
            <TableFilterAutocomplete
              value={progressFilter}
              onValueChange={(value) => setProgressFilter(value as ProgressFilter)}
              options={[
                { value: ALL, label: 'All progress' },
                { value: 'continue', label: 'Continue' },
                { value: 'not-started', label: 'Not started' },
                { value: 'completed', label: 'Completed' },
                { value: 'available', label: 'Available' },
              ]}
              placeholder="All progress"
              searchPlaceholder="Search progress..."
            />
            <TableFilterAutocomplete
              value={topicFilter}
              onValueChange={(value) => setTopicFilter(value as typeof topicFilter)}
              options={[
                { value: ALL, label: 'All topics' },
                { value: 'programme', label: 'Programme' },
                { value: 'fundraising', label: 'Fundraising' },
                { value: 'finance', label: 'Finance' },
                { value: 'operations', label: 'Operations' },
              ]}
              placeholder="All topics"
              searchPlaceholder="Search topics..."
            />
          </div>
        </TableToolbar>

        {pageRows.length > 0 ? (
          <DataTable
            columns={columns}
            rows={pageRows}
            rowKey={(row) => row.id}
            rowProps={(row) => ({ onDoubleClick: () => openRow(row) })}
            emptyMessage="No learning content matches your filters."
            tableClassName="min-w-[1180px]"
          />
        ) : (
          <TableEmptyState
            title="No learning content found"
            description="Try changing the search term, content type, progress, or topic filter."
          />
        )}
        <TablePagination
          page={page}
          pageSize={pageSize}
          totalItems={filteredRows.length}
          pageSizeOptions={[10, 25, 50]}
          onPageChange={setPage}
          onPageSizeChange={(next) => {
            setPageSize(next);
            setPage(1);
          }}
        />
      </Card>

      <FreeResourceModal
        resource={activeResource}
        resources={freeResources}
        onChangeResource={setActiveResource}
        onClose={() => setActiveResource(null)}
      />
    </>
  );
}

function FreeResourceModal({
  resource,
  resources,
  onChangeResource,
  onClose,
}: {
  resource: FreeResource | null;
  resources: FreeResource[];
  onChangeResource: (resource: FreeResource | null) => void;
  onClose: () => void;
}) {
  if (!resource) return null;
  const currentIndex = Math.max(resources.findIndex((item) => item.id === resource.id), 0);
  const previous = currentIndex > 0 ? resources[currentIndex - 1] : undefined;
  const next = currentIndex < resources.length - 1 ? resources[currentIndex + 1] : undefined;

  return (
    <Modal
      open={!!resource}
      onOpenChange={(open) => !open && onClose()}
      title="Free resource"
      width="xl"
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-line bg-surface-subtle p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-xl', accentBg[resource.accent])}>
                <PlayCircle className={cn('h-5 w-5', accentFg[resource.accent])} />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="blue">Free resource</Badge>
                  <Badge tone="neutral" className="capitalize">{resource.topic}</Badge>
                  <span className="inline-flex items-center gap-1 text-sm text-ink-muted">
                    <Clock className="h-4 w-4" />
                    {resource.durationMin} min
                  </span>
                </div>
                <h3 className="mt-2 text-xl font-semibold text-ink">{resource.title}</h3>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-muted">{resource.description}</p>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button type="button" variant="outline" disabled={!previous} onClick={() => previous && onChangeResource(previous)}>
                Previous
              </Button>
              <Button type="button" variant="outline" disabled={!next} onClick={() => next && onChangeResource(next)}>
                Next
              </Button>
            </div>
          </div>
        </div>

        <div className={cn('grid min-h-[360px] place-items-center rounded-xl border border-line p-8 text-center', accentBg[resource.accent])}>
          <div>
            <button
              type="button"
              onClick={() => toast.success('Playing resource')}
              className={cn('mx-auto grid h-16 w-16 place-items-center rounded-full border-2 border-current bg-white/70 shadow-sm transition hover:scale-[1.02]', accentFg[resource.accent])}
              aria-label={`Play ${resource.title}`}
            >
              <PlayCircle className="h-7 w-7" />
            </button>
            <div className="mt-4 text-base font-semibold text-ink">{resource.title}</div>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-muted">
              Open this resource, rate it after watching, and continue to the next free resource when ready.
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="rounded-xl border border-line bg-white p-4">
            <div className="text-sm font-semibold text-ink">What you will learn</div>
            <p className="mt-2 text-sm leading-6 text-ink-muted">{resource.description}</p>
          </div>
          <div className="rounded-xl border border-line bg-white p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
              <Star className="h-4 w-4 text-warning-dark" />
              Rate this resource
            </div>
            <ContentRating contentId={resource.id} persist={false} onSaved={() => {}} />
          </div>
        </div>
      </div>
    </Modal>
  );
}

function LearningSummary({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
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

function LearningStat({
  label,
  value,
  helper,
  tone,
}: {
  label: string;
  value: number;
  helper: string;
  tone: BadgeTone;
}) {
  const toneClass = {
    brand: 'border-bid/25 bg-bid-light/35',
    blue: 'border-info/25 bg-info-light/45',
    amber: 'border-warning/25 bg-warning-light/45',
    green: 'border-success/25 bg-success-light/45',
    neutral: 'border-line bg-surface-subtle',
    red: 'border-danger/25 bg-danger-light/45',
  }[tone];

  return (
    <div className={cn('rounded-xl border bg-white px-4 py-3 shadow-[0_14px_34px_rgba(26,26,26,0.035)]', toneClass)}>
      <div className="text-sm text-ink-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-ink">{value}</div>
      <div className="mt-1 text-sm text-ink-muted">{helper}</div>
    </div>
  );
}
