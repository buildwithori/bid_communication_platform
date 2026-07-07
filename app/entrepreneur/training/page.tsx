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
import { contentItems, modulesForProgram, programById, programs } from '@/lib/mock-data/programs';
import { useEntrepreneurStore } from '@/lib/stores/entrepreneur-store';
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

export default function TrainingLibraryPage() {
  const router = useRouter();
  const { entrepreneur } = useEntrepreneurStore();
  const currentProgramme = programById(entrepreneur.programmeId) ?? programs[0];
  const currentProgrammeContent = getProgrammeContent(currentProgramme);
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
      (!needle || [program.name, program.description ?? '', program.status].join(' ').toLowerCase().includes(needle)),
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
          className="block max-w-[460px] rounded-lg text-left outline-none transition-colors hover:text-bid focus-visible:ring-2 focus-visible:ring-bid/20"
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
        description="Continue your assigned programme, then browse extra learning when you need it."
      />

      <Card padding="lg" className="mb-4">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge tone="brand">Your programme</Badge>
              <Badge tone={currentProgramme.status === 'active' ? 'green' : 'neutral'}>
                {currentProgramme.status === 'active' ? 'Active' : currentProgramme.status}
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
              <div className="mt-1 font-semibold text-ink">{currentProgrammeContent.nextModule?.title ?? 'No modules yet'}</div>
              {currentProgrammeContent.nextModule?.description && (
                <p className="mt-1 text-sm leading-6 text-ink-muted">{currentProgrammeContent.nextModule.description}</p>
              )}
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Button onClick={() => router.push(routes.entrepreneur.trainingProgram(currentProgramme.id))}>
                Continue learning
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => router.push(routes.entrepreneur.trainingProgram(currentProgramme.id))}>
                View learning path
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <LearningSummary icon={BookOpen} label="Modules" value={currentProgrammeContent.modules.length} />
            <LearningSummary icon={PlayCircle} label="Videos" value={currentProgrammeContent.typeCounts.video ?? 0} />
            <LearningSummary icon={FileText} label="Files & tools" value={(currentProgrammeContent.typeCounts.pdf ?? 0) + (currentProgrammeContent.typeCounts.tool ?? 0)} />
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Programme catalogue"
          description="Use this when you need to open another programme or check available learning paths."
        />
        <TableToolbar>
          <div>
            <div className="text-sm font-medium text-ink">Find a programme</div>
            <div className="mt-0.5 text-sm text-ink-muted">
              {filteredPrograms.length} programme{filteredPrograms.length === 1 ? '' : 's'} shown.
            </div>
          </div>
          <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-[320px_150px]">
            <TableFilterInput
              icon
              placeholder="Search programmes..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <TableFilterSelect value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value={ALL}>All statuses</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="draft">Draft</option>
            </TableFilterSelect>
          </div>
        </TableToolbar>
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

      <Card className="mt-4">
        <CardHeader
          title="Free resources"
          description="Short learning assets available to every entrepreneur."
          actions={
            <div className="w-full sm:w-[190px]">
              <TableFilterSelect value={resourceTopic} onChange={(event) => setResourceTopic(event.target.value)}>
                <option value={ALL}>All topics</option>
                <option value="fundraising">Fundraising</option>
                <option value="finance">Finance</option>
                <option value="operations">Operations</option>
              </TableFilterSelect>
            </div>
          }
        />
        <div className="grid gap-2">
          {resourceRows.map((resource) => (
            <button
              key={resource.id}
              type="button"
              onClick={() => setActiveResource(resource)}
              className="flex flex-col gap-3 rounded-xl border border-line bg-white px-4 py-3 text-left transition hover:border-bid hover:bg-surface-subtle sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-lg', accentBg[resource.accent])}>
                  <PlayCircle className={cn('h-4 w-4', accentFg[resource.accent])} />
                </span>
                <span className="min-w-0">
                  <span className="block font-medium text-ink">{resource.title}</span>
                  <span className="mt-1 block text-sm text-ink-muted">{resource.meta}</span>
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-4 text-sm text-ink-muted">
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {resource.durationMin} min
                </span>
                <span className="inline-flex items-center gap-1 capitalize">
                  <Layers3 className="h-3.5 w-3.5" />
                  {resource.topic}
                </span>
              </span>
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
      </Card>

      <Modal
        open={!!activeResource}
        onOpenChange={(open) => !open && setActiveResource(null)}
        title={activeResource?.title ?? ''}
        width="wide"
      >
        {activeResource && (
          <>
            <div className={cn('mb-3.5 flex h-[220px] items-center justify-center rounded-lg', accentBg[activeResource.accent])}>
              <button
                onClick={() => toast.success('Video playing...')}
                className={cn('flex h-12 w-12 items-center justify-center rounded-full border-2 border-current', accentBg[activeResource.accent], accentFg[activeResource.accent])}
                aria-label="Play video"
              >
                <PlayCircle className={cn('h-5 w-5', accentFg[activeResource.accent])} strokeWidth={1.5} />
              </button>
            </div>
            <div className="mb-4 text-sm text-ink-muted">{activeResource.meta}</div>
            <Button className="mb-4 w-full" onClick={() => toast.success('Playing...')}>
              Play video
            </Button>
            <ContentRating contentId={activeResource.id} onSaved={() => {}} />
          </>
        )}
      </Modal>
    </>
  );
}

function LearningSummary({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BookOpen;
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
