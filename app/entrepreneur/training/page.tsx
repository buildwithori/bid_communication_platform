'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, BookOpen, Clock, FileText, Layers3, PlayCircle } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/shared/Card';
import { Modal } from '@/components/shared/Modal';
import { Button } from '@/components/shared/Button';
import { ContentRating } from '@/components/entrepreneur/ContentRating';
import { Badge } from '@/components/shared/Badge';
import { MetricGrid } from '@/components/shared/MetricGrid';
import { StatCard } from '@/components/shared/StatCard';
import { ProgressBar } from '@/components/shared/ProgressBar';
import {
  DataTable,
  RowActions,
  TableFilterInput,
  TableFilterSelect,
  TablePagination,
  TableToolbar,
  type Column,
} from '@/components/shared/DataTable';
import { contentItems, programs, modulesForProgram } from '@/lib/mock-data/programs';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { routes } from '@/lib/routes';
import type { Program } from '@/types';

interface FreeResource {
  id: string;
  title: string;
  topic: 'fundraising' | 'finance' | 'operations';
  meta: string;
  durationMin: number;
  accent: 'bid' | 'info' | 'success';
}

const freeResources: FreeResource[] = [
  { id: 'fr-pitch', title: 'Intro to Pitching Investors', topic: 'fundraising', meta: '12 min · Free for all entrepreneurs', durationMin: 12, accent: 'success' },
  { id: 'fr-captable', title: 'Understanding Cap Tables', topic: 'finance', meta: '8 min · Free for all entrepreneurs', durationMin: 8, accent: 'info' },
  { id: 'fr-bookkeeping', title: 'Basics of Bookkeeping', topic: 'operations', meta: '10 min · Free for all entrepreneurs', durationMin: 10, accent: 'bid' },
];

const accentBg = { bid: 'bg-bid-light', info: 'bg-info-light', success: 'bg-success-light' } as const;
const accentFg = { bid: 'text-bid', info: 'text-info', success: 'text-success-dark' } as const;
const ALL = 'all';

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default function TrainingLibraryPage() {
  const router = useRouter();
  const [query, setQuery] = React.useState('');
  const [status, setStatus] = React.useState<string>(ALL);
  const [resourceTopic, setResourceTopic] = React.useState<string>(ALL);
  const [programPage, setProgramPage] = React.useState(1);
  const [programPageSize, setProgramPageSize] = React.useState(10);
  const [resourcePage, setResourcePage] = React.useState(1);
  const [resourcePageSize, setResourcePageSize] = React.useState(6);
  const [activeResource, setActiveResource] = React.useState<FreeResource | null>(null);

  const filteredPrograms = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return programs.filter((program) =>
      (status === ALL || program.status === status) &&
      (!needle ||
        [program.name, program.description ?? '', program.status]
        .join(' ')
        .toLowerCase()
        .includes(needle)),
    );
  }, [query, status]);

  const filteredResources = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return freeResources.filter((resource) =>
      (resourceTopic === ALL || resource.topic === resourceTopic) &&
      (!needle || [resource.title, resource.topic, resource.meta].join(' ').toLowerCase().includes(needle)),
    );
  }, [query, resourceTopic]);

  React.useEffect(() => {
    setProgramPage(1);
    setResourcePage(1);
  }, [query, resourceTopic, status, programPageSize, resourcePageSize]);

  const programRows = React.useMemo(() => {
    const start = (programPage - 1) * programPageSize;
    return filteredPrograms.slice(start, start + programPageSize);
  }, [filteredPrograms, programPage, programPageSize]);

  const resourceRows = React.useMemo(() => {
    const start = (resourcePage - 1) * resourcePageSize;
    return filteredResources.slice(start, start + resourcePageSize);
  }, [filteredResources, resourcePage, resourcePageSize]);

  const avgProgress = Math.round(
    programs.reduce((sum, program) => sum + program.progress, 0) / Math.max(programs.length, 1),
  );
  const moduleTotal = programs.reduce((sum, program) => sum + program.moduleIds.length, 0);
  const featuredPrograms = filteredPrograms.slice(0, 3);

  const columns: Column<Program>[] = [
    {
      key: 'action',
      header: 'Action',
      cell: (program) => (
        <RowActions
          actions={[
            {
              label: 'Open programme',
              onSelect: () => router.push(routes.entrepreneur.trainingProgram(program.id)),
            },
          ]}
        />
      ),
      className: 'w-[84px]',
    },
    {
      key: 'programme',
      header: 'Programme',
      cell: (program) => (
        <button
          type="button"
          onClick={() => router.push(routes.entrepreneur.trainingProgram(program.id))}
          className="block max-w-[420px] rounded-lg text-left outline-none transition-colors hover:text-bid focus-visible:ring-2 focus-visible:ring-bid/20"
        >
          <div className="font-medium">{program.name}</div>
          <div className="mt-1 line-clamp-2 text-sm leading-5 text-ink-muted">{program.description}</div>
        </button>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (program) => (
        <Badge tone={program.status === 'active' ? 'green' : program.status === 'draft' ? 'amber' : 'neutral'}>
          {program.status === 'active' ? 'Active' : program.status === 'draft' ? 'Draft' : 'Completed'}
        </Badge>
      ),
    },
    {
      key: 'progress',
      header: 'Progress',
      cell: (program) => (
        <div className="min-w-[180px]">
          <ProgressBar
            value={program.progress}
            width="100%"
            barClassName={program.accent === 'info' ? 'bg-info' : program.accent === 'success' ? 'bg-success' : 'bg-bid'}
          />
          <div className="mt-1 text-sm text-ink-muted">{program.progress}% complete</div>
        </div>
      ),
    },
    {
      key: 'modules',
      header: 'Modules',
      cell: (program) => `${modulesForProgram(program.id).length} modules`,
    },
    {
      key: 'timeline',
      header: 'Timeline',
      cell: (program) => (
        <span className="whitespace-nowrap">
          {formatDate(program.startDate)} - {formatDate(program.endDate)}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Training Library"
        description="Find programme modules, continue learning, and open standalone resources."
      />
      <MetricGrid columns={3}>
        <StatCard label="Programmes" value={programs.length} subline={`${moduleTotal} modules total`} dotColor="bid" accent="bid" />
        <StatCard label="Average progress" value={`${avgProgress}%`} subline="Across active programmes" dotColor="success" accent="success" />
        <StatCard label="Free resources" value={freeResources.length} subline="Standalone learning assets" dotColor="info" accent="info" />
      </MetricGrid>

      <TableToolbar className="mt-4">
        <div>
          <div className="text-sm font-medium text-ink">Search the catalogue</div>
          <div className="mt-0.5 text-sm text-ink-muted">
            Filter programmes and standalone resources without losing context.
          </div>
        </div>
        <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-[320px_150px_170px]">
          <TableFilterInput
            icon
            placeholder="Search programmes or resources..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <TableFilterSelect value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value={ALL}>All programmes</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="draft">Draft</option>
          </TableFilterSelect>
          <TableFilterSelect value={resourceTopic} onChange={(event) => setResourceTopic(event.target.value)}>
            <option value={ALL}>All resources</option>
            <option value="fundraising">Fundraising</option>
            <option value="finance">Finance</option>
            <option value="operations">Operations</option>
          </TableFilterSelect>
        </div>
      </TableToolbar>

      <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        {featuredPrograms.map((program) => (
          <ProgrammeLearningCard
            key={program.id}
            program={program}
            onOpen={() => router.push(routes.entrepreneur.trainingProgram(program.id))}
          />
        ))}
      </div>

      <Card>
        <CardHeader
          title="All programmes"
          description={`${filteredPrograms.length} programme${filteredPrograms.length === 1 ? '' : 's'} in this view`}
        />
        <DataTable
          columns={columns}
          rows={programRows}
          rowKey={(program) => program.id}
          emptyMessage="No programmes match your filters."
          tableClassName="min-w-[980px]"
        />
        <TablePagination
          page={programPage}
          pageSize={programPageSize}
          totalItems={filteredPrograms.length}
          onPageChange={setProgramPage}
          onPageSizeChange={(next) => {
            setProgramPageSize(next);
            setProgramPage(1);
          }}
        />
      </Card>

      <div className="mt-6">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-base font-semibold">Standalone resources</div>
            <p className="mt-1 text-sm text-ink-muted">
              Short learning assets that sit outside a formal programme.
            </p>
          </div>
          <div className="text-sm text-ink-muted">
            {filteredResources.length} resource{filteredResources.length === 1 ? '' : 's'} available
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {resourceRows.map((r) => (
            <button
              key={r.id}
              onClick={() => setActiveResource(r)}
              className="group flex min-h-[170px] flex-col rounded-xl border border-black/[0.08] bg-surface-panel p-5 text-left shadow-[0_14px_34px_rgba(26,26,26,0.045)] transition-colors hover:border-bid"
            >
              <div className={cn('mb-2.5 flex h-8 w-8 items-center justify-center rounded-[7px]', accentBg[r.accent])}>
                <PlayCircle className={cn('h-4 w-4', accentFg[r.accent])} strokeWidth={1.5} />
              </div>
              <div className="text-base font-semibold leading-tight">{r.title}</div>
              <div className="mt-2 flex items-center gap-3 text-sm text-ink-muted">
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {r.durationMin} min
                </span>
                <span className="inline-flex items-center gap-1 capitalize">
                  <FileText className="h-3.5 w-3.5" />
                  {r.topic}
                </span>
              </div>
              <div className="mt-auto pt-5 text-sm font-medium text-bid">Open resource</div>
            </button>
          ))}
        </div>
        <TablePagination
          page={resourcePage}
          pageSize={resourcePageSize}
          totalItems={filteredResources.length}
          pageSizeOptions={[6, 12, 24]}
          onPageChange={setResourcePage}
          onPageSizeChange={(next) => {
            setResourcePageSize(next);
            setResourcePage(1);
          }}
        />
      </div>

      {/* Video modal for free resources */}
      <Modal
        open={!!activeResource}
        onOpenChange={(o) => !o && setActiveResource(null)}
        title={activeResource?.title ?? ''}
        width="wide"
      >
        {activeResource && (
          <>
            <div className={cn('mb-3.5 flex h-[200px] items-center justify-center rounded-lg', accentBg[activeResource.accent])}>
              <button
                onClick={() => toast.success('Video playing…')}
                className={cn('flex h-12 w-12 items-center justify-center rounded-full', accentBg[activeResource.accent], 'border-2', 'border-current', accentFg[activeResource.accent])}
                aria-label="Play video"
              >
                <PlayCircle className={cn('h-5 w-5', accentFg[activeResource.accent])} strokeWidth={1.5} />
              </button>
            </div>
            <div className="mb-4 text-[11px] text-ink-muted">{activeResource.meta}</div>
            <Button className="mb-4 w-full" onClick={() => toast.success('Playing…')}>
              ▶ Play video
            </Button>
            <ContentRating contentId={activeResource.id} onSaved={() => {}} />
          </>
        )}
      </Modal>
    </>
  );
}

function ProgrammeLearningCard({
  program,
  onOpen,
}: {
  program: Program;
  onOpen: () => void;
}) {
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

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex min-h-[270px] flex-col rounded-xl border border-black/[0.08] bg-surface-panel p-5 text-left shadow-[0_18px_45px_rgba(26,26,26,0.055)] transition-colors hover:border-bid"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-bid-light text-bid">
          <BookOpen className="h-5 w-5" />
        </div>
        <Badge tone={program.status === 'active' ? 'green' : program.status === 'draft' ? 'amber' : 'neutral'}>
          {program.status === 'active' ? 'Active' : program.status === 'draft' ? 'Draft' : 'Completed'}
        </Badge>
      </div>
      <div className="text-lg font-semibold leading-6">{program.name}</div>
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink-muted">{program.description}</p>
      <div className="mt-4">
        <ProgressBar
          value={program.progress}
          width="100%"
          className="h-2"
          barClassName={program.accent === 'info' ? 'bg-info' : program.accent === 'success' ? 'bg-success' : 'bg-bid'}
        />
        <div className="mt-2 text-sm text-ink-muted">{program.progress}% complete</div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <LearningChip icon={PlayCircle} label="Videos" value={typeCounts.video ?? 0} />
        <LearningChip icon={FileText} label="Files" value={typeCounts.pdf ?? 0} />
        <LearningChip icon={Layers3} label="Tools" value={typeCounts.tool ?? 0} />
      </div>
      <div className="mt-auto flex items-center justify-between gap-3 pt-5">
        <div className="min-w-0 text-sm text-ink-muted">
          Next: <span className="font-medium text-ink">{nextModule?.title ?? 'No modules yet'}</span>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-bid transition-transform group-hover:translate-x-0.5" />
      </div>
    </button>
  );
}

function LearningChip({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof PlayCircle;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg bg-surface-subtle px-2.5 py-2">
      <div className="flex items-center gap-1.5 text-xs text-ink-muted">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-ink">{value}</div>
    </div>
  );
}
