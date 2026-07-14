'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import MuxPlayer from '@mux/mux-player-react/lazy';
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  FileText,
  PlayCircle,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/shared/Button';
import { Card } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { Tabs } from '@/components/shared/Tabs';
import { Modal } from '@/components/shared/Modal';
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
import { listEntrepreneurs, type EntrepreneurRecord } from '@/lib/api/entrepreneurs';
import {
  getProgramme,
  listProgrammeDeliverableRules,
  type ProgrammeContentItem,
  type ProgrammeDeliverableRule,
  type ProgrammeDetail,
  type ProgrammeLifecycle,
} from '@/lib/api/programmes';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import type { BadgeTone } from '@/types';

type WorkspaceTab = 'overview' | 'curriculum' | 'deliverables' | 'readiness' | 'entrepreneurs';
type ProgrammeModule = ProgrammeDetail['modules'][number];

type ReadinessStatus = 'ready' | 'needs_content';

type TrainerDeliverableRow = {
  id: string;
  name: string;
  due: string;
  dueHelper: string;
  requiredFor: string;
  submitted: string;
  active: boolean;
};

const ALL_FILTER = 'all';

const lifecycleMeta: Record<ProgrammeLifecycle, { label: string; tone: BadgeTone }> = {
  draft: { label: 'Draft', tone: 'neutral' },
  scheduled: { label: 'Scheduled', tone: 'blue' },
  active: { label: 'Active', tone: 'green' },
  completed: { label: 'Completed', tone: 'neutral' },
  archived: { label: 'Archived', tone: 'neutral' },
};

const contentTypeMeta: Record<ProgrammeContentItem['type'], { label: string; icon: LucideIcon; tone: BadgeTone; bg: string; fg: string }> = {
  video: { label: 'Video', icon: PlayCircle, tone: 'brand', bg: 'bg-bid-light', fg: 'text-bid' },
  pdf: { label: 'PDF', icon: FileText, tone: 'blue', bg: 'bg-info-light', fg: 'text-info' },
  tool: { label: 'Tool', icon: Wrench, tone: 'green', bg: 'bg-success-light', fg: 'text-success-dark' },
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatProgramDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function moduleReadiness(module: ProgrammeModule): ReadinessStatus {
  return module.contentItems.length > 0 && module.contentItems.every((item) => item.status === 'ready')
    ? 'ready'
    : 'needs_content';
}

function contentCounts(items: ProgrammeContentItem[]) {
  return items.reduce(
    (counts, item) => {
      if (item.type === 'video') counts.videos += 1;
      if (item.type === 'pdf') counts.files += 1;
      if (item.type === 'tool') counts.tools += 1;
      counts.total += 1;
      return counts;
    },
    { total: 0, videos: 0, files: 0, tools: 0 },
  );
}

function contentSourceLabel(item: ProgrammeContentItem) {
  if (item.type === 'video') return item.video?.playbackId ? 'Video ready' : 'Video not ready';
  if (item.type === 'pdf') return item.files[0]?.originalFilename ?? 'PDF not attached';
  return item.tool?.toolName ?? item.tool?.url ?? 'Tool link missing';
}

function durationLabel(seconds: number | null) {
  if (!seconds) return null;
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}

function dueLabel(rule: ProgrammeDeliverableRule) {
  if (rule.dueType === 'fixed_date') return rule.dueDate ? formatDate(rule.dueDate) : 'Fixed date not set';
  if (rule.dueType === 'module_completion') return `After ${rule.dueAfterModule?.title ?? 'selected module'}`;
  if (rule.recurringCadence === 'monthly') return 'Monthly';
  if (rule.recurringCadence === 'six_monthly') return 'Every 6 months';
  return 'Quarterly';
}

function dueHelper(rule: ProgrammeDeliverableRule) {
  if (rule.dueType === 'fixed_date') return 'Same due date for every eligible entrepreneur.';
  if (rule.dueType === 'module_completion') return 'Created when a learner completes the selected module.';
  return 'Expected again for every reporting period.';
}

function requiredForLabel(rule: ProgrammeDeliverableRule) {
  return rule.requiredForScope === 'stage' ? `${rule.requiredStage?.name ?? 'Selected'} stage` : 'All entrepreneurs';
}

function mapRuleToRow(rule: ProgrammeDeliverableRule): TrainerDeliverableRow {
  return {
    id: rule.id,
    name: rule.name,
    due: dueLabel(rule),
    dueHelper: dueHelper(rule),
    requiredFor: requiredForLabel(rule),
    submitted: `${rule.submittedCount} / ${rule.assignedCount}`,
    active: rule.active,
  };
}

async function fetchTrainerEntrepreneurs(programme: ProgrammeDetail) {
  const firstPage = await listEntrepreneurs({ take: 50 });
  const items: EntrepreneurRecord[] = [...firstPage.items];
  let cursor = firstPage.nextCursor;

  while (cursor) {
    const nextPage = await listEntrepreneurs({ take: 50, cursor });
    items.push(...nextPage.items);
    cursor = nextPage.nextCursor;
  }

  if (programme.accessType === 'free') return items;
  return items.filter((entrepreneur) =>
    entrepreneur.programmeAccess.assignedProgrammes.some((access) => access.id === programme.id),
  );
}

export default function TrainerProgrammeDetailPage() {
  const params = useParams<{ programId: string }>();
  const router = useRouter();
  const [tab, setTab] = React.useState<WorkspaceTab>('overview');

  const programmeQuery = useQuery({
    queryKey: ['programmes', 'trainer-detail', params.programId],
    queryFn: () => getProgramme(params.programId),
  });
  const rulesQuery = useQuery({
    queryKey: ['programme-deliverable-rules', params.programId, 'trainer'],
    queryFn: () => listProgrammeDeliverableRules(params.programId),
  });
  const entrepreneursQuery = useQuery({
    queryKey: ['entrepreneurs', 'trainer-programme', params.programId, programmeQuery.data?.accessType],
    queryFn: () => fetchTrainerEntrepreneurs(programmeQuery.data as ProgrammeDetail),
    enabled: Boolean(programmeQuery.data),
  });

  if (programmeQuery.isLoading) {
    return <TableEmptyState title="Loading programme" description="Fetching programme context." />;
  }

  if (programmeQuery.isError || !programmeQuery.data) {
    return (
      <Card padding="lg">
        <div className="grid min-h-[320px] place-items-center p-6 text-center">
          <div>
            <div className="text-lg font-semibold text-ink">Programme could not be loaded</div>
            <p className="mt-2 text-sm text-ink-muted">You may not have access to this programme, or it may no longer be available.</p>
            <Button type="button" variant="outline" className="mt-4" onClick={() => router.push(routes.trainer.programmes)}>
              Back to programmes
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  const programme: ProgrammeDetail = programmeQuery.data;
  const modules = programme.modules;
  const contentItems = modules.flatMap((module) => module.contentItems);
  const counts = contentCounts(contentItems);
  const modulesWithoutContent = modules.filter((module) => moduleReadiness(module) !== 'ready');
  const readinessScore = modules.length ? Math.round(((modules.length - modulesWithoutContent.length) / modules.length) * 100) : 0;
  const capacityPercentage = programme.accessType === 'free'
    ? 100
    : Math.round((programme.enrollment.active / Math.max(programme.enrollment.capacity, 1)) * 100);
  const lifecycle = lifecycleMeta[programme.lifecycle];
  const deliverableRows = (rulesQuery.data?.items ?? []).map(mapRuleToRow);
  const entrepreneurs = entrepreneursQuery.data ?? [];

  return (
    <>
      <PageHeader
        title="Programme detail"
        description="Read-only programme context for sessions, learner support, and deliverable reviews."
        actions={
          <Button type="button" variant="outline" onClick={() => router.push(routes.trainer.programmes)}>
            <ArrowLeft className="h-4 w-4" />
            Back to programmes
          </Button>
        }
      />

      <section className="space-y-4">
        <Card padding="lg" accent="bid">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge tone={lifecycle.tone}>{lifecycle.label}</Badge>
                <Badge tone={programme.accessType === 'free' ? 'blue' : 'brand'}>
                  {programme.accessType === 'free' ? 'Free programme' : 'Assigned programme'}
                </Badge>
                <span className="inline-flex items-center gap-1.5 text-sm text-ink-muted">
                  <CalendarDays className="h-4 w-4" />
                  {formatProgramDate(programme.startDate)} - {formatProgramDate(programme.endDate)}
                </span>
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-ink">{programme.name}</h2>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-ink-muted">{programme.description}</p>
            </div>
            <div className="w-full rounded-xl border border-black/[0.08] bg-white px-4 py-3 xl:w-[260px]">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-xs font-medium uppercase tracking-[0.04em] text-ink-muted">Learner progress</div>
                  <div className="mt-1 text-3xl font-semibold leading-none text-ink">{programme.learnerProgress.average}%</div>
                </div>
                <div className="text-right text-xs leading-5 text-ink-muted">{programme.learnerProgress.trackedLearners} tracked</div>
              </div>
              <ProgressBar value={programme.learnerProgress.average} width="100%" className="mt-3 h-1.5" />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <ProgrammeHealthCard label={programme.accessType === 'free' ? 'Access' : 'Enrollment'} value={programme.accessType === 'free' ? 'All entrepreneurs' : `${programme.enrollment.active}/${programme.enrollment.capacity}`} progress={programme.accessType === 'free' ? undefined : capacityPercentage} />
            <ProgrammeHealthCard label="Modules" value={modules.length} helper={`${modulesWithoutContent.length} need content`} />
            <ProgrammeHealthCard label="Learning assets" value={counts.total} helper={`${counts.videos} videos, ${counts.files} PDFs, ${counts.tools} tools`} />
            <ProgrammeHealthCard label="Deliverable rules" value={deliverableRows.length} helper={rulesQuery.isLoading ? 'Loading rules' : 'Configured for this programme'} />
            <ProgrammeHealthCard label="Readiness" value={`${readinessScore}%`} progress={readinessScore} />
          </div>
        </Card>

        <Card>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-base font-semibold tracking-[-0.01em]">Programme workspace</div>
              <div className="mt-1 max-w-2xl text-sm leading-5 text-ink-muted">
                Review curriculum, required submissions, readiness, and entrepreneurs connected to this programme.
              </div>
            </div>
            <Tabs
              value={tab}
              onChange={setTab}
              tabs={[
                { value: 'overview', label: 'Overview' },
                { value: 'curriculum', label: 'Curriculum' },
                { value: 'deliverables', label: 'Deliverables' },
                { value: 'readiness', label: 'Readiness' },
                { value: 'entrepreneurs', label: 'Entrepreneurs' },
              ]}
              className="mb-0 w-full overflow-x-auto sm:w-fit"
            />
          </div>

          {tab === 'overview' && (
            <OverviewTab
              programme={programme}
              modules={modules}
              counts={counts}
              readinessScore={readinessScore}
              modulesWithoutContent={modulesWithoutContent}
              entrepreneurs={entrepreneurs}
            />
          )}
          {tab === 'curriculum' && <CurriculumTab modules={modules} allContentItems={contentItems} />}
          {tab === 'deliverables' && <DeliverablesTab rows={deliverableRows} loading={rulesQuery.isLoading} error={rulesQuery.isError} />}
          {tab === 'readiness' && <ReadinessTab programme={programme} modules={modules} readinessScore={readinessScore} modulesWithoutContent={modulesWithoutContent} capacityPercentage={capacityPercentage} />}
          {tab === 'entrepreneurs' && <EntrepreneursTab entrepreneurs={entrepreneurs} loading={entrepreneursQuery.isLoading} error={entrepreneursQuery.isError} />}
        </Card>
      </section>
    </>
  );
}

function OverviewTab({
  programme,
  modules,
  counts,
  readinessScore,
  modulesWithoutContent,
  entrepreneurs,
}: {
  programme: ProgrammeDetail;
  modules: ProgrammeModule[];
  counts: ReturnType<typeof contentCounts>;
  readinessScore: number;
  modulesWithoutContent: ProgrammeModule[];
  entrepreneurs: EntrepreneurRecord[];
}) {
  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_340px]">
      <Card>
        <div className="mb-4 text-base font-semibold text-ink">Trainer context</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <ContextMetric icon={Users} label="My entrepreneurs" value={entrepreneurs.length} />
          <ContextMetric icon={BookOpen} label="Modules" value={modules.length} />
          <ContextMetric icon={PlayCircle} label="Videos" value={counts.videos} />
          <ContextMetric icon={FileText} label="Files and tools" value={counts.files + counts.tools} />
        </div>
      </Card>
      <Card>
        <div className="mb-2 text-base font-semibold text-ink">Readiness</div>
        <div className="text-sm leading-6 text-ink-muted">{readinessScore}% of modules currently have ready learning content.</div>
        <ProgressBar value={readinessScore} width="100%" className="mt-4 h-2" />
        <div className="mt-4 rounded-xl bg-surface-subtle p-3 text-sm leading-6 text-ink-muted">
          {modulesWithoutContent.length > 0
            ? `${modulesWithoutContent.length} module${modulesWithoutContent.length === 1 ? '' : 's'} still need ready content. Raise this with the admin team before entrepreneurs reach that point.`
            : 'Every module currently has ready content attached.'}
        </div>
        <div className="mt-3 text-xs text-ink-muted">
          {programme.accessType === 'free' ? 'Free programmes are available to every entrepreneur.' : 'Assigned programmes require programme access.'}
        </div>
      </Card>
    </div>
  );
}

function CurriculumTab({ modules, allContentItems }: { modules: ProgrammeModule[]; allContentItems: ProgrammeContentItem[] }) {
  const [query, setQuery] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(6);
  const [activeModule, setActiveModule] = React.useState<ProgrammeModule | null>(null);
  const [previewItem, setPreviewItem] = React.useState<ProgrammeContentItem | null>(null);

  const filteredRows = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return modules;
    return modules.filter((module) =>
      [
        module.title,
        module.description ?? '',
        String(module.position),
        ...module.contentItems.map((item) => `${item.title} ${item.type} ${durationLabel(item.durationSeconds) ?? ''} ${item.trainer?.name ?? ''}`),
      ]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }, [modules, query]);

  React.useEffect(() => setPage(1), [query, pageSize, modules.length]);
  const pageRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  const columns = React.useMemo<Column<ProgrammeModule>[]>(
    () => [
      {
        key: 'actions',
        header: 'Action',
        cell: (module) => (
          <RowActions
            actions={[
              { label: 'View module content', onSelect: () => setActiveModule(module) },
              {
                label: 'Play first item',
                disabled: module.contentItems.length === 0,
                onSelect: () => setPreviewItem(module.contentItems[0] ?? null),
              },
            ]}
          />
        ),
        className: 'w-[84px]',
      },
      { key: 'order', header: 'Order', cell: (module) => <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-surface-subtle text-xs font-semibold text-ink-muted">{module.position}</span> },
      {
        key: 'module',
        header: 'Module',
        cell: (module) => (
          <button
            type="button"
            onClick={() => setActiveModule(module)}
            className="block min-w-[300px] rounded-lg text-left outline-none transition hover:text-bid focus-visible:ring-2 focus-visible:ring-bid/20"
          >
            <span className="block font-semibold text-ink transition-colors group-hover:text-bid">{module.title}</span>
            {module.description && <span className="mt-1 line-clamp-2 block text-sm text-ink-muted">{module.description}</span>}
          </button>
        ),
      },
      { key: 'content', header: 'Learning assets', cell: (module) => <ContentSummary items={module.contentItems} /> },
      { key: 'status', header: 'Readiness', cell: (module) => moduleReadiness(module) === 'ready' ? <Badge tone="green">Ready</Badge> : <Badge tone="amber">Needs content</Badge> },
    ],
    [],
  );

  return (
    <div className="mt-5">
      <TableToolbar>
        <div>
          <div className="text-sm font-medium text-ink">Search modules and attached content</div>
          <div className="mt-0.5 text-sm text-ink-muted">{filteredRows.length} of {modules.length} modules shown</div>
        </div>
        <div className="w-full sm:w-[380px]">
          <TableFilterInput icon placeholder="Search modules, content, or order..." value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
      </TableToolbar>
      <DataTable columns={columns} rows={pageRows} rowKey={(module) => module.id} emptyMessage="No modules match this search." tableClassName="min-w-[980px]" />
      <TablePagination page={page} pageSize={pageSize} totalItems={filteredRows.length} pageSizeOptions={[6, 12, 24]} onPageChange={setPage} onPageSizeChange={(next) => { setPageSize(next); setPage(1); }} />
      <TrainerModuleContentModal module={activeModule} onClose={() => setActiveModule(null)} onPreview={setPreviewItem} />
      <TrainerContentPreviewModal items={activeModule ? activeModule.contentItems : allContentItems} item={previewItem} onChangeItem={setPreviewItem} onClose={() => setPreviewItem(null)} />
    </div>
  );
}

function DeliverablesTab({ rows, loading, error }: { rows: TrainerDeliverableRow[]; loading: boolean; error: boolean }) {
  const [query, setQuery] = React.useState('');
  const [activeFilter, setActiveFilter] = React.useState<typeof ALL_FILTER | 'active' | 'inactive'>(ALL_FILTER);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(5);

  const filteredRows = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesStatus = activeFilter === ALL_FILTER || (activeFilter === 'active' ? row.active : !row.active);
      const matchesSearch = !needle || [row.name, row.due, row.dueHelper, row.requiredFor, row.submitted].join(' ').toLowerCase().includes(needle);
      return matchesStatus && matchesSearch;
    });
  }, [activeFilter, query, rows]);

  React.useEffect(() => setPage(1), [query, activeFilter, pageSize]);
  const pageRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  const columns = React.useMemo<Column<TrainerDeliverableRow>[]>(
    () => [
      { key: 'deliverable', header: 'Deliverable', cell: (row) => <div className="min-w-[260px]"><div className="font-semibold text-ink">{row.name}</div><div className="mt-1 text-sm text-ink-muted">{row.requiredFor}</div></div> },
      { key: 'due', header: 'Due', cell: (row) => <div className="min-w-[260px]"><div className="font-medium text-ink">{row.due}</div><div className="mt-1 text-sm text-ink-muted">{row.dueHelper}</div></div> },
      { key: 'submitted', header: 'Submitted so far', cell: (row) => <span className="font-medium text-ink">{row.submitted}</span> },
      { key: 'status', header: 'Status', cell: (row) => <Badge tone={row.active ? 'green' : 'neutral'}>{row.active ? 'Active' : 'Inactive'}</Badge> },
    ],
    [],
  );

  return (
    <div className="mt-5">
      <TableToolbar>
        <div>
          <div className="text-sm font-medium text-ink">Filter deliverables</div>
          <div className="mt-0.5 text-sm text-ink-muted">Read the submission rules configured by admins for this programme.</div>
        </div>
        <div className="grid w-full gap-2 md:grid-cols-[minmax(220px,1fr)_190px] lg:w-[560px]">
          <TableFilterInput icon placeholder="Search deliverables..." value={query} onChange={(event) => setQuery(event.target.value)} />
          <TableFilterAutocomplete
            value={activeFilter}
            onValueChange={(value) => setActiveFilter(value as typeof activeFilter)}
            options={[
              { value: ALL_FILTER, label: 'All statuses' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
            placeholder="All statuses"
            searchPlaceholder="Search statuses..."
          />
        </div>
      </TableToolbar>
      {loading ? (
        <TableEmptyState title="Loading deliverables" description="Fetching required submissions." />
      ) : error ? (
        <TableEmptyState title="Deliverables could not be loaded" description="Refresh the page or try again shortly." />
      ) : (
        <DataTable columns={columns} rows={pageRows} rowKey={(row) => row.id} emptyMessage="No deliverables match these filters." tableClassName="min-w-[980px]" />
      )}
      <TablePagination page={page} pageSize={pageSize} totalItems={filteredRows.length} pageSizeOptions={[5, 10, 20]} onPageChange={setPage} onPageSizeChange={(next) => { setPageSize(next); setPage(1); }} />
    </div>
  );
}

function ReadinessTab({ programme, modules, readinessScore, modulesWithoutContent, capacityPercentage }: { programme: ProgrammeDetail; modules: ProgrammeModule[]; readinessScore: number; modulesWithoutContent: ProgrammeModule[]; capacityPercentage: number }) {
  const capacityNeedsAttention = programme.accessType !== 'free' && capacityPercentage >= 90;

  return (
    <div className="mt-5 space-y-4">
      <div className="rounded-xl border border-black/[0.08] bg-surface-subtle px-4 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-base font-semibold text-ink">Launch readiness</div>
              <Badge tone={modulesWithoutContent.length ? 'amber' : 'green'}>{modulesWithoutContent.length ? 'Needs attention' : 'Ready'}</Badge>
            </div>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-ink-muted">Read-only checklist for programme health. Trainers can use this context when supporting learners and raising content gaps with admins.</p>
          </div>
          <div className="w-full rounded-xl border border-black/[0.08] bg-white px-4 py-3 lg:w-[280px]">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.04em] text-ink-muted">Readiness score</div>
                <div className="mt-1 text-3xl font-semibold leading-none text-ink">{readinessScore}%</div>
              </div>
              <div className="text-right text-xs leading-5 text-ink-muted">{modules.length - modulesWithoutContent.length}/{modules.length} modules ready</div>
            </div>
            <ProgressBar value={readinessScore} width="100%" className="mt-3 h-1.5" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <ReadinessPanelItem icon={modulesWithoutContent.length ? FileText : CheckCircle2} title="Content coverage" status={modulesWithoutContent.length ? 'Needs content' : 'Complete'} description={modulesWithoutContent.length ? `${modulesWithoutContent.length} module${modulesWithoutContent.length === 1 ? '' : 's'} still need at least one ready learning asset.` : 'Every module currently has ready learning content attached.'} tone={modulesWithoutContent.length ? 'warning' : 'success'} />
        <ReadinessPanelItem icon={Users} title={programme.accessType === 'free' ? 'Access model' : 'Enrollment capacity'} status={programme.accessType === 'free' ? 'Open to all' : capacityNeedsAttention ? 'Nearly full' : 'Seats available'} description={programme.accessType === 'free' ? 'Every entrepreneur can access this programme without manual enrollment.' : `${programme.enrollment.active} of ${programme.enrollment.capacity} seats are currently filled.`} tone={capacityNeedsAttention ? 'warning' : 'neutral'} />
        <ReadinessPanelItem icon={FileText} title="Required submissions" status="Configured" description="Deliverable rules are listed in the Deliverables tab and drive entrepreneur submission queues." tone="neutral" />
      </div>

      <DataTable columns={readinessColumns} rows={modules} rowKey={(module) => module.id} emptyMessage="No modules have been added to this programme yet." tableClassName="min-w-[840px]" />
    </div>
  );
}

function EntrepreneursTab({ entrepreneurs, loading, error }: { entrepreneurs: EntrepreneurRecord[]; loading: boolean; error: boolean }) {
  const [query, setQuery] = React.useState('');
  const [stageFilter, setStageFilter] = React.useState(ALL_FILTER);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(5);

  const stageOptions = React.useMemo(() => {
    const options = entrepreneurs
      .filter((entrepreneur) => entrepreneur.stage)
      .map((entrepreneur) => ({ value: entrepreneur.stage!.id, label: entrepreneur.stage!.name }));
    return [{ value: ALL_FILTER, label: 'All stages' }, ...Array.from(new Map(options.map((option) => [option.value, option])).values())];
  }, [entrepreneurs]);

  const filteredRows = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return entrepreneurs.filter((entrepreneur) => {
      const matchesStage = stageFilter === ALL_FILTER || entrepreneur.stage?.id === stageFilter;
      const matchesSearch = !needle || [entrepreneur.businessName, entrepreneur.representativeName, entrepreneur.email, entrepreneur.country, entrepreneur.stage?.name ?? '', entrepreneur.sector?.name ?? '', String(entrepreneur.learnerProgress.average)].join(' ').toLowerCase().includes(needle);
      return matchesStage && matchesSearch;
    });
  }, [entrepreneurs, query, stageFilter]);

  React.useEffect(() => setPage(1), [entrepreneurs.length, pageSize, query, stageFilter]);
  const pageRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="mt-5">
      <TableToolbar>
        <div>
          <div className="text-sm font-medium text-ink">Filter entrepreneurs</div>
          <div className="mt-0.5 text-sm text-ink-muted">Search entrepreneurs by business, representative, stage, sector, or country.</div>
        </div>
        <div className="grid w-full gap-2 md:grid-cols-[minmax(220px,1fr)_180px] lg:w-[560px]">
          <TableFilterInput icon placeholder="Search entrepreneurs..." value={query} onChange={(event) => setQuery(event.target.value)} />
          <TableFilterAutocomplete value={stageFilter} onValueChange={setStageFilter} options={stageOptions} placeholder="All stages" searchPlaceholder="Search stages..." />
        </div>
      </TableToolbar>
      {loading ? (
        <TableEmptyState title="Loading entrepreneurs" description="Fetching entrepreneurs connected to this programme." />
      ) : error ? (
        <TableEmptyState title="Entrepreneurs could not be loaded" description="Refresh the page or try again shortly." />
      ) : (
        <DataTable columns={entrepreneurColumns} rows={pageRows} rowKey={(entrepreneur) => entrepreneur.entrepreneurUserId} emptyMessage="No entrepreneurs match these filters." tableClassName="min-w-[980px]" />
      )}
      <TablePagination page={page} pageSize={pageSize} totalItems={filteredRows.length} pageSizeOptions={[5, 10, 20]} onPageChange={setPage} onPageSizeChange={(next) => { setPageSize(next); setPage(1); }} />
    </div>
  );
}

function TrainerModuleContentModal({
  module,
  onClose,
  onPreview,
}: {
  module: ProgrammeModule | null;
  onClose: () => void;
  onPreview: (item: ProgrammeContentItem) => void;
}) {
  const [query, setQuery] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(5);
  const items = module?.contentItems ?? [];
  const filteredItems = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) =>
      [item.title, item.type, durationLabel(item.durationSeconds) ?? '', item.trainer?.name ?? '', contentSourceLabel(item)]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }, [items, query]);
  const pageRows = filteredItems.slice((page - 1) * pageSize, page * pageSize);

  React.useEffect(() => {
    setQuery('');
    setPage(1);
  }, [module?.id]);

  React.useEffect(() => setPage(1), [query, pageSize]);

  const columns = React.useMemo<Column<ProgrammeContentItem>[]>(
    () => [
      {
        key: 'actions',
        header: 'Action',
        cell: (item) => <RowActions actions={[{ label: 'Preview content', onSelect: () => onPreview(item) }]} />,
        className: 'w-[84px]',
      },
      {
        key: 'content',
        header: 'Content item',
        cell: (item) => {
          const meta = contentTypeMeta[item.type];
          const Icon = meta.icon;
          return (
            <button
              type="button"
              onClick={() => onPreview(item)}
              className="flex min-w-[320px] items-start gap-3 rounded-lg text-left outline-none transition hover:text-bid focus-visible:ring-2 focus-visible:ring-bid/20"
            >
              <span className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', meta.bg)}>
                <Icon className={cn('h-4 w-4', meta.fg)} />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-ink">{item.title}</span>
                <span className="mt-1 block text-sm text-ink-muted">Item {item.position} · {durationLabel(item.durationSeconds) ?? meta.label}</span>
              </span>
            </button>
          );
        },
      },
      { key: 'type', header: 'Type', cell: (item) => <Badge tone={contentTypeMeta[item.type].tone}>{contentTypeMeta[item.type].label}</Badge> },
      { key: 'trainer', header: 'Trainer owner', cell: (item) => <span className="text-sm text-ink-muted">{item.trainer?.name ?? 'No trainer owner'}</span> },
      { key: 'source', header: 'Source', cell: (item) => <span className="block max-w-[280px] truncate text-sm text-ink-muted">{contentSourceLabel(item)}</span> },
    ],
    [onPreview],
  );

  return (
    <Modal open={!!module} onOpenChange={(open) => !open && onClose()} title={module ? `Module content - ${module.title}` : 'Module content'} width="xl">
      {module ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-line bg-surface-subtle p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={items.length > 0 ? 'green' : 'amber'}>{items.length > 0 ? 'Ready' : 'Needs content'}</Badge>
                  <Badge tone="neutral">Module {module.position}</Badge>
                </div>
                <h3 className="mt-3 text-xl font-semibold tracking-[-0.01em] text-ink">{module.title}</h3>
                {module.description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-muted">{module.description}</p> : null}
              </div>
              <Button type="button" disabled={items.length === 0} onClick={() => items[0] && onPreview(items[0])}>
                <PlayCircle className="h-4 w-4" />
                Play from start
              </Button>
            </div>
          </div>

          <TableToolbar>
            <div>
              <div className="text-sm font-medium text-ink">Find content</div>
              <div className="mt-0.5 text-sm text-ink-muted">{filteredItems.length} of {items.length} learning assets shown</div>
            </div>
            <div className="w-full sm:w-[360px]">
              <TableFilterInput icon placeholder="Search title, type, trainer, or link..." value={query} onChange={(event) => setQuery(event.target.value)} />
            </div>
          </TableToolbar>
          <DataTable columns={columns} rows={pageRows} rowKey={(item) => item.id} emptyMessage="No content item matches this search." tableClassName="min-w-[980px]" />
          <TablePagination page={page} pageSize={pageSize} totalItems={filteredItems.length} pageSizeOptions={[5, 10, 20]} onPageChange={setPage} onPageSizeChange={(next) => { setPageSize(next); setPage(1); }} />
        </div>
      ) : null}
    </Modal>
  );
}

function TrainerContentPreviewModal({
  items,
  item,
  onChangeItem,
  onClose,
}: {
  items: ProgrammeContentItem[];
  item: ProgrammeContentItem | null;
  onChangeItem: (item: ProgrammeContentItem | null) => void;
  onClose: () => void;
}) {
  if (!item) return null;
  const meta = contentTypeMeta[item.type];
  const Icon = meta.icon;
  const currentIndex = Math.max(items.findIndex((candidate) => candidate.id === item.id), 0);
  const previousItem = currentIndex > 0 ? items[currentIndex - 1] : undefined;
  const nextItem = currentIndex < items.length - 1 ? items[currentIndex + 1] : undefined;
  const openUrl = item.type === 'pdf' ? item.files[0]?.downloadUrl : item.type === 'tool' ? item.tool?.url : null;

  return (
    <Modal open={!!item} onOpenChange={(open) => !open && onClose()} title="Preview curriculum content" width="xl">
      <div className="space-y-4">
        <div className="rounded-xl border border-line bg-surface-subtle p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', meta.bg)}>
                <Icon className={cn('h-5 w-5', meta.fg)} />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                  <Badge tone="neutral">Item {item.position}</Badge>
                  <span className="text-sm text-ink-muted">{currentIndex + 1} of {items.length}</span>
                </div>
                <h3 className="mt-2 text-xl font-semibold text-ink">{item.title}</h3>
                <div className="mt-1 text-sm text-ink-muted">{durationLabel(item.durationSeconds) ?? meta.label} · {item.trainer?.name ?? 'No trainer owner'}</div>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button type="button" variant="outline" disabled={!previousItem} onClick={() => previousItem && onChangeItem(previousItem)}>Previous</Button>
              <Button type="button" variant="outline" disabled={!nextItem} onClick={() => nextItem && onChangeItem(nextItem)}>Next</Button>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-line bg-black">
          {item.type === 'video' ? (
            item.video?.playbackId ? (
              <MuxPlayer playbackId={item.video.playbackId} metadataVideoTitle={item.title} streamType="on-demand" className="aspect-video w-full" />
            ) : (
              <PreviewFallback title="Video not ready" description="This content item does not have a ready video yet." />
            )
          ) : item.type === 'pdf' ? (
            item.files[0]?.downloadUrl ? (
              <iframe title={item.title} src={item.files[0].downloadUrl} className="h-[68vh] w-full bg-white" />
            ) : (
              <PreviewFallback title="PDF not attached" description="This content item does not have a PDF file yet." />
            )
          ) : item.tool?.url ? (
            <iframe title={item.title} src={item.tool.url} className="h-[68vh] w-full bg-white" sandbox="allow-forms allow-popups allow-same-origin allow-scripts" />
          ) : (
            <PreviewFallback title="Tool link missing" description="This embedded tool does not have a link yet." />
          )}
        </div>

        {openUrl && item.type !== 'video' ? (
          <div className="flex justify-end">
            <Button asChild variant="outline">
              <a href={openUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
                Open in new tab
              </a>
            </Button>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

function PreviewFallback({ title, description }: { title: string; description: string }) {
  return (
    <div className="grid min-h-[360px] place-items-center bg-surface-subtle p-8 text-center">
      <div>
        <div className="text-base font-semibold text-ink">{title}</div>
        <p className="mt-2 max-w-md text-sm leading-6 text-ink-muted">{description}</p>
      </div>
    </div>
  );
}

const readinessColumns: Column<ProgrammeModule>[] = [
  { key: 'module', header: 'Module', cell: (module) => <div><div className="font-semibold text-ink">{module.title}</div><div className="mt-1 text-xs text-ink-muted">Order {module.position}</div></div>, className: 'min-w-[280px]' },
  { key: 'coverage', header: 'Coverage', cell: (module) => <ContentSummary items={module.contentItems} /> },
  { key: 'status', header: 'Launch status', cell: (module) => moduleReadiness(module) === 'ready' ? <Badge tone="green">Ready</Badge> : <Badge tone="amber">Needs content</Badge> },
];

const entrepreneurColumns: Column<EntrepreneurRecord>[] = [
  { key: 'business', header: 'Business', cell: (entrepreneur) => <div className="min-w-[240px]"><div className="font-semibold text-ink">{entrepreneur.businessName}</div><div className="mt-1 text-sm text-ink-muted">{entrepreneur.representativeName}</div></div> },
  { key: 'stage', header: 'Stage / sector', cell: (entrepreneur) => <div className="flex min-w-[200px] flex-wrap gap-1.5">{entrepreneur.stage ? <Badge tone="blue">{entrepreneur.stage.name}</Badge> : <Badge tone="neutral">No stage</Badge>}{entrepreneur.sector ? <Badge tone="green">{entrepreneur.sector.name}</Badge> : <Badge tone="neutral">No sector</Badge>}</div> },
  { key: 'progress', header: 'Training progress', cell: (entrepreneur) => <div className="min-w-[180px]"><ProgressBar value={entrepreneur.learnerProgress.average} width="100%" className="h-2" /><div className="mt-1 text-sm text-ink-muted">{entrepreneur.learnerProgress.average}% average</div></div> },
  { key: 'access', header: 'Programme access', cell: (entrepreneur) => <span className="text-sm text-ink-muted">{entrepreneur.programmeAccess.assignedProgrammes.length} assigned</span> },
];

function ContentSummary({ items }: { items: ProgrammeContentItem[] }) {
  const counts = contentCounts(items);
  if (items.length === 0) return <span className="text-sm text-ink-muted">No learning assets yet</span>;
  return <div className="flex min-w-[240px] flex-wrap gap-1.5">{counts.videos > 0 && <Badge tone="blue">{counts.videos} videos</Badge>}{counts.files > 0 && <Badge tone="neutral">{counts.files} PDFs</Badge>}{counts.tools > 0 && <Badge tone="brand">{counts.tools} tools</Badge>}</div>;
}

function ProgrammeHealthCard({ label, value, helper, progress }: { label: string; value: React.ReactNode; helper?: string; progress?: number }) {
  return (
    <div className="rounded-xl border border-black/[0.08] bg-white px-3 py-3">
      <div className="text-xs font-medium uppercase tracking-[0.04em] text-ink-muted">{label}</div>
      <div className="mt-1 text-xl font-semibold text-ink">{value}</div>
      {typeof progress === 'number' ? <ProgressBar value={progress} width="100%" className="mt-3 h-1.5" /> : null}
      {helper ? <div className="mt-2 text-xs leading-5 text-ink-muted">{helper}</div> : null}
    </div>
  );
}

function ContextMetric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: React.ReactNode }) {
  return <div className="rounded-xl border border-line bg-surface-subtle p-3"><div className="flex items-center gap-2 text-sm text-ink-muted"><Icon className="h-4 w-4" />{label}</div><div className="mt-2 text-2xl font-semibold text-ink">{value}</div></div>;
}

function ReadinessPanelItem({ icon: Icon, title, status, description, tone = 'neutral' }: { icon: LucideIcon; title: string; status: string; description: string; tone?: 'neutral' | 'warning' | 'success' }) {
  const badgeTone: BadgeTone = tone === 'success' ? 'green' : tone === 'warning' ? 'amber' : 'neutral';
  return (
    <div className="rounded-xl border border-black/[0.08] bg-white px-4 py-4">
      <div className="flex items-start gap-3">
        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', tone === 'warning' ? 'bg-warning-light text-warning-dark' : tone === 'success' ? 'bg-success-light text-success-dark' : 'bg-surface-subtle text-bid')}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2"><div className="font-semibold text-ink">{title}</div><Badge tone={badgeTone}>{status}</Badge></div>
          <div className="mt-2 text-sm leading-5 text-ink-muted">{description}</div>
        </div>
      </div>
    </div>
  );
}
