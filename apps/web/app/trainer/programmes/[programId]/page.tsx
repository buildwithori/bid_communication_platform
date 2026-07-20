'use client';

import { useDebouncedValue } from '@/lib/search';
import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  FileText,
  PlayCircle,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { Card, Skeleton, TableSkeleton } from '@/components/shared/Card';
import {
  DataTable,
  RowActions,
  TableFilterAutocomplete,
  TableFilterInput,
  TablePagination,
  TableToolbar,
  type Column,
} from '@/components/shared/DataTable';
import { Notice, PageHeader } from '@/components/shared/PageHeader';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { Tabs } from '@/components/shared/Tabs';
import {
  ProgrammeCoursePlayer,
  ProgrammeCoursePlayerSkeleton,
} from '@/components/learning/ProgrammeCoursePlayer';
import {
  useEntrepreneursPage,
  type EntrepreneurRecord,
} from '@/lib/api/entrepreneurs';
import {
  useProgrammeDeliverableRulesPage,
  useProgrammeDetailQuery,
  useProgrammeModulesPage,
  useProgrammePlayerQuery,
  type ProgrammeDeliverableRule,
  type ProgrammeDetail,
  type ProgrammeLifecycle,
  type ProgrammeModuleRecord,
} from '@/lib/api/programmes';
import { useLazyBusinessStagesQuery } from '@/lib/api/settings';
import { routes } from '@/lib/routes';

type WorkspaceTab =
  | 'overview'
  | 'curriculum'
  | 'preview'
  | 'deliverables'
  | 'readiness'
  | 'entrepreneurs';

export default function TrainerProgrammeDetailPage() {
  const params = useParams<{ programId: string }>();
  const programme = useProgrammeDetailQuery(params.programId);
  const [tab, setTab] = React.useState<WorkspaceTab>('overview');
  const [previewModuleId, setPreviewModuleId] = React.useState<string | null>(
    null,
  );

  if (programme.isLoading && !programme.data) {
    return <TrainerProgrammeDetailSkeleton />;
  }

  if (programme.isError || !programme.data) {
    return (
      <>
        <DetailHeader />
        <Card>
          <Notice>
            This programme could not be loaded.
            {programme.isError ? ' ' + programme.error.message : ''}
          </Notice>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => void programme.refetch()}
          >
            Try again
          </Button>
        </Card>
      </>
    );
  }

  const detail = programme.data;
  const capacityPercentage = Math.round(
    (detail.enrollment.active / Math.max(detail.enrollment.capacity, 1)) * 100,
  );
  const missingModules = Math.max(
    detail.modules.total - detail.modules.ready,
    0,
  );

  return (
    <>
      <DetailHeader />
      <section className="space-y-4">
        <Card accent="bid" padding="lg">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <ProgrammeStatusBadge status={detail.lifecycle} />
                <Badge tone={detail.accessType === 'free' ? 'blue' : 'brand'}>
                  {detail.accessType === 'free'
                    ? 'Free programme'
                    : 'Assigned programme'}
                </Badge>
                <span className="inline-flex items-center gap-1.5 text-sm text-ink-muted">
                  <CalendarDays className="h-4 w-4" />
                  {formatMonth(detail.startDate)} -{' '}
                  {formatMonth(detail.endDate)}
                </span>
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-ink">
                {detail.name}
              </h2>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-ink-muted">
                {detail.description}
              </p>
            </div>
            <div className="w-full rounded-xl border border-line bg-white px-4 py-3 xl:w-[260px]">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-xs font-medium uppercase tracking-[0.04em] text-ink-muted">
                    Learner progress
                  </div>
                  <div className="mt-1 text-3xl font-semibold leading-none text-ink">
                    {detail.learnerProgress.average}%
                  </div>
                </div>
                <div className="text-right text-xs leading-5 text-ink-muted">
                  {detail.learnerProgress.trackedLearners} tracked learners
                </div>
              </div>
              <ProgressBar
                value={detail.learnerProgress.average}
                width="100%"
                className="mt-3 h-1.5"
              />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <ProgrammeHealthCard
              label={detail.accessType === 'free' ? 'Access' : 'Enrollment'}
              value={
                detail.accessType === 'free'
                  ? 'All entrepreneurs'
                  : detail.enrollment.active + '/' + detail.enrollment.capacity
              }
              progress={
                detail.accessType === 'free' ? undefined : capacityPercentage
              }
            />
            <ProgrammeHealthCard
              label="Modules"
              value={detail.modules.total}
              helper={missingModules + ' need content'}
            />
            <ProgrammeHealthCard
              label="Learning assets"
              value={detail.content.total}
              helper={contentBreakdown(detail)}
            />
            <ProgrammeHealthCard
              label="Average progress"
              value={detail.learnerProgress.average + '%'}
              progress={detail.learnerProgress.average}
            />
            <ProgrammeHealthCard
              label="Readiness"
              value={detail.readiness + '%'}
              progress={detail.readiness}
            />
          </div>
        </Card>

        <Card>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-base font-semibold tracking-[-0.01em]">
                Programme workspace
              </div>
              <div className="mt-1 max-w-2xl text-sm leading-5 text-ink-muted">
                Review curriculum, required submissions, readiness, and
                entrepreneurs connected to this programme.
              </div>
            </div>
            <Tabs
              value={tab}
              onChange={setTab}
              tabs={[
                { value: 'overview', label: 'Overview' },
                { value: 'curriculum', label: 'Curriculum' },
                { value: 'preview', label: 'Preview' },
                { value: 'deliverables', label: 'Deliverables' },
                { value: 'readiness', label: 'Readiness' },
                { value: 'entrepreneurs', label: 'Entrepreneurs' },
              ]}
              className="mb-0 w-full overflow-x-auto sm:w-fit"
            />
          </div>

          {tab === 'overview' ? <OverviewTab programme={detail} /> : null}
          {tab === 'curriculum' ? (
            <CurriculumTab
              programmeId={detail.id}
              onPreviewModule={(moduleId) => {
                setPreviewModuleId(moduleId);
                setTab('preview');
              }}
            />
          ) : null}
          {tab === 'preview' ? (
            <TrainerProgrammePreview
              programmeId={detail.id}
              initialModuleId={previewModuleId}
            />
          ) : null}
          {tab === 'deliverables' ? (
            <DeliverablesTab programmeId={detail.id} />
          ) : null}
          {tab === 'readiness' ? <ReadinessTab programme={detail} /> : null}
          {tab === 'entrepreneurs' ? (
            <EntrepreneursTab programmeId={detail.id} />
          ) : null}
        </Card>
      </section>
    </>
  );
}

function TrainerProgrammePreview({
  programmeId,
  initialModuleId,
}: {
  programmeId: string;
  initialModuleId: string | null;
}) {
  const player = useProgrammePlayerQuery(programmeId);

  if (player.isLoading && !player.data) {
    return (
      <div className="mt-5">
        <ProgrammeCoursePlayerSkeleton />
      </div>
    );
  }

  if (player.isError || !player.data) {
    return (
      <div className="mt-5">
        <Notice>
          Programme preview could not be loaded. {player.error?.message}
        </Notice>
        <Button
          type="button"
          variant="outline"
          className="mt-3"
          onClick={() => void player.refetch()}
        >
          Try again
        </Button>
      </div>
    );
  }

  return (
    <ProgrammeCoursePlayer
      data={player.data}
      initialContentId={
        player.data.modules.find(
          (module: { id: string }) => module.id === initialModuleId,
        )?.items[0]?.id ?? null
      }
      className="mt-5"
    />
  );
}

function DetailHeader() {
  return (
    <PageHeader
      title="Programme detail"
      description="Read-only programme context for sessions, learner support, and deliverable reviews."
      actions={
        <Button asChild variant="outline">
          <Link href={routes.trainer.programmes}>
            <ArrowLeft className="h-4 w-4" />
            Back to programmes
          </Link>
        </Button>
      }
    />
  );
}

function OverviewTab({ programme }: { programme: ProgrammeDetail }) {
  const missingModules = Math.max(
    programme.modules.total - programme.modules.ready,
    0,
  );
  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_340px]">
      <Card>
        <div className="mb-4 text-base font-semibold text-ink">
          Trainer context
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <ContextMetric
            icon={Users}
            label="My entrepreneurs"
            value={programme.enrollment.active}
          />
          <ContextMetric
            icon={BookOpen}
            label="Modules"
            value={programme.modules.total}
          />
          <ContextMetric
            icon={PlayCircle}
            label="Videos"
            value={programme.content.videos}
          />
          <ContextMetric
            icon={FileText}
            label="Files and tools"
            value={programme.content.pdfs + programme.content.tools}
          />
        </div>
      </Card>
      <Card>
        <div className="mb-2 text-base font-semibold text-ink">Readiness</div>
        <div className="text-sm leading-6 text-ink-muted">
          {programme.readiness}% of modules currently have ready learning
          content.
        </div>
        <ProgressBar
          value={programme.readiness}
          width="100%"
          className="mt-4 h-2"
        />
        <div className="mt-4 rounded-xl bg-surface-subtle p-3 text-sm leading-6 text-ink-muted">
          {missingModules > 0
            ? missingModules +
              ' module' +
              (missingModules === 1 ? '' : 's') +
              ' still need ready content. Raise this with the admin team before entrepreneurs reach that point.'
            : 'Every module currently has ready learning content.'}
        </div>
      </Card>
    </div>
  );
}

function CurriculumTab({
  programmeId,
  onPreviewModule,
}: {
  programmeId: string;
  onPreviewModule: (moduleId: string) => void;
}) {
  const [search, setSearch] = React.useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [pageSize, setPageSize] = React.useState(6);
  const modules = useProgrammeModulesPage(programmeId, {
    search: debouncedSearch.trim() || undefined,
    take: pageSize,
  });
  const resetPagination = modules.resetPagination;

  React.useEffect(() => {
    resetPagination();
  }, [debouncedSearch, pageSize, resetPagination]);

  const columns = React.useMemo<Column<ProgrammeModuleRecord>[]>(
    () => [
      {
        key: 'actions',
        header: 'Action',
        cell: (module) => (
          <RowActions
            actions={[
              {
                label: 'Preview module',
                onSelect: () => onPreviewModule(module.id),
              },
            ]}
          />
        ),
        className: 'w-[84px]',
      },
      {
        key: 'order',
        header: 'Order',
        cell: (module) => (
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-surface-subtle text-xs font-semibold text-ink-muted">
            {module.position}
          </span>
        ),
      },
      {
        key: 'module',
        header: 'Module',
        cell: (module) => (
          <button
            type="button"
            onClick={() => onPreviewModule(module.id)}
            className="block min-w-[280px] rounded-lg text-left outline-none transition hover:text-bid focus-visible:ring-2 focus-visible:ring-bid/20"
          >
            <span className="block font-semibold text-ink">{module.title}</span>
            {module.description ? (
              <span className="mt-1 line-clamp-2 block text-sm text-ink-muted">
                {module.description}
              </span>
            ) : null}
          </button>
        ),
      },
      {
        key: 'content',
        header: 'Learning assets',
        cell: (module) => <ContentSummary module={module} />,
      },
      {
        key: 'status',
        header: 'Readiness',
        cell: (module) => (
          <Badge tone={module.readiness === 'ready' ? 'green' : 'amber'}>
            {module.readiness === 'ready' ? 'Ready' : 'Needs content'}
          </Badge>
        ),
      },
    ],
    [onPreviewModule],
  );

  return (
    <div className="mt-5">
      <TableToolbar>
        <div>
          <div className="text-sm font-medium text-ink">
            Search programme modules
          </div>
          <div className="mt-0.5 text-sm text-ink-muted">
            {modules.totalItems} module{modules.totalItems === 1 ? '' : 's'}
            {modules.isFetching ? ' - Updating...' : ''}
          </div>
        </div>
        <div className="w-full sm:w-[380px]">
          <TableFilterInput
            icon
            placeholder="Search module title or description..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </TableToolbar>
      {modules.isLoading && !modules.data ? (
        <TableSkeleton columns={5} rows={6} />
      ) : modules.isError ? (
        <Notice>Modules could not be loaded. {modules.error.message}</Notice>
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={modules.rows}
            rowKey={(module) => module.linkId}
            emptyMessage="No modules match this search."
            tableClassName="min-w-[980px]"
          />
          <TablePagination
            page={modules.page}
            pageSize={pageSize}
            totalItems={modules.totalItems}
            pageSizeOptions={[6, 12, 24]}
            onPageChange={modules.setPage}
            onPageSizeChange={setPageSize}
          />
        </>
      )}
    </div>
  );
}

function DeliverablesTab({ programmeId }: { programmeId: string }) {
  const [search, setSearch] = React.useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [pageSize, setPageSize] = React.useState(5);
  const rules = useProgrammeDeliverableRulesPage(programmeId, {
    search: debouncedSearch || undefined,
    take: pageSize,
  });

  const resetRulePagination = rules.resetPagination;
  React.useEffect(() => {
    resetRulePagination();
  }, [debouncedSearch, pageSize, resetRulePagination]);

  const columns: Column<ProgrammeDeliverableRule>[] = [
    {
      key: 'deliverable',
      header: 'Deliverable',
      cell: (rule) => (
        <div className="min-w-[260px]">
          <div className="font-semibold text-ink">{rule.name}</div>
          <div className="mt-1 text-sm text-ink-muted">
            {requiredScopeLabel(rule)}
          </div>
        </div>
      ),
    },
    {
      key: 'due',
      header: 'Due rule',
      cell: (rule) => (
        <span className="text-sm text-ink-muted">{dueRuleLabel(rule)}</span>
      ),
    },
    {
      key: 'submitted',
      header: 'Learner submissions',
      cell: (rule) => (
        <span className="font-medium text-ink">
          {rule.submittedCount}/{rule.assignedCount}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (rule) => (
        <Badge tone={rule.active ? 'green' : 'neutral'}>
          {rule.active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
  ];

  return (
    <div className="mt-5">
      <TableToolbar>
        <div>
          <div className="text-sm font-medium text-ink">
            Programme deliverables
          </div>
          <div className="mt-0.5 text-sm text-ink-muted">
            Read-only submission requirements and current completion counts.
          </div>
        </div>
        <div className="w-full sm:w-[360px]">
          <TableFilterInput
            icon
            placeholder="Search deliverables..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </TableToolbar>
      {rules.isLoading ? (
        <TableSkeleton columns={4} rows={5} />
      ) : rules.isError ? (
        <Notice>Deliverables could not be loaded. {rules.error.message}</Notice>
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={rules.rows}
            rowKey={(rule) => rule.id}
            emptyMessage="No deliverable rules match this search."
            tableClassName="min-w-[900px]"
          />
          <TablePagination
            page={rules.page}
            pageSize={pageSize}
            totalItems={rules.totalItems}
            pageSizeOptions={[5, 10, 20]}
            onPageChange={rules.setPage}
            onPageSizeChange={setPageSize}
          />
        </>
      )}
    </div>
  );
}

function ReadinessTab({ programme }: { programme: ProgrammeDetail }) {
  const [pageSize, setPageSize] = React.useState(8);
  const modules = useProgrammeModulesPage(programme.id, { take: pageSize });
  const missingModules = Math.max(
    programme.modules.total - programme.modules.ready,
    0,
  );
  const capacityPercentage = Math.round(
    (programme.enrollment.active / Math.max(programme.enrollment.capacity, 1)) *
      100,
  );
  const capacityNeedsAttention =
    programme.accessType !== 'free' && capacityPercentage >= 90;

  const columns: Column<ProgrammeModuleRecord>[] = [
    {
      key: 'module',
      header: 'Module',
      cell: (module) => (
        <div className="min-w-[280px]">
          <div className="font-semibold text-ink">{module.title}</div>
          <div className="mt-1 text-xs text-ink-muted">
            Order {module.position}
          </div>
        </div>
      ),
    },
    {
      key: 'coverage',
      header: 'Coverage',
      cell: (module) => <ContentSummary module={module} />,
    },
    {
      key: 'status',
      header: 'Launch status',
      cell: (module) => (
        <Badge tone={module.readiness === 'ready' ? 'green' : 'amber'}>
          {module.readiness === 'ready' ? 'Ready' : 'Needs content'}
        </Badge>
      ),
    },
  ];

  return (
    <div className="mt-5 space-y-4">
      <div className="grid gap-3 lg:grid-cols-2">
        <ReadinessPanelItem
          icon={missingModules ? FileText : CheckCircle2}
          title="Content coverage"
          status={missingModules ? 'Needs content' : 'Complete'}
          description={
            missingModules
              ? missingModules +
                ' module' +
                (missingModules === 1 ? '' : 's') +
                ' still need ready learning assets.'
              : 'Every module currently has ready learning assets.'
          }
          tone={missingModules ? 'warning' : 'success'}
        />
        <ReadinessPanelItem
          icon={Users}
          title={
            programme.accessType === 'free'
              ? 'Access model'
              : 'Enrollment capacity'
          }
          status={
            programme.accessType === 'free'
              ? 'Open to all'
              : capacityNeedsAttention
                ? 'Nearly full'
                : 'Seats available'
          }
          description={
            programme.accessType === 'free'
              ? 'Every entrepreneur can access this programme.'
              : programme.enrollment.active +
                ' of ' +
                programme.enrollment.capacity +
                ' seats are currently filled.'
          }
          tone={capacityNeedsAttention ? 'warning' : 'neutral'}
        />
      </div>
      {modules.isLoading && !modules.data ? (
        <TableSkeleton columns={3} rows={8} />
      ) : modules.isError ? (
        <Notice>Readiness details could not be loaded.</Notice>
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={modules.rows}
            rowKey={(module) => module.linkId}
            emptyMessage="No modules have been added to this programme yet."
            tableClassName="min-w-[840px]"
          />
          <TablePagination
            page={modules.page}
            pageSize={pageSize}
            totalItems={modules.totalItems}
            pageSizeOptions={[8, 16, 32]}
            onPageChange={modules.setPage}
            onPageSizeChange={setPageSize}
          />
        </>
      )}
    </div>
  );
}

function EntrepreneursTab({ programmeId }: { programmeId: string }) {
  const [search, setSearch] = React.useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [stageId, setStageId] = React.useState('all');
  const [stageSearch, setStageSearch] = React.useState('');
  const [pageSize, setPageSize] = React.useState(5);
  const entrepreneurs = useEntrepreneursPage({
    programmeId,
    search: debouncedSearch.trim() || undefined,
    stageId: stageId === 'all' ? undefined : stageId,
    take: pageSize,
  });
  const stages = useLazyBusinessStagesQuery({
    enabled: true,
    search: stageSearch.trim() || undefined,
    active: true,
    take: 20,
  });
  const resetPagination = entrepreneurs.resetPagination;
  const stageRows = stages.data?.pages.flatMap((page) => page.items) ?? [];

  React.useEffect(() => {
    resetPagination();
  }, [debouncedSearch, pageSize, resetPagination, stageId]);

  const columns: Column<EntrepreneurRecord>[] = [
    {
      key: 'business',
      header: 'Business',
      cell: (entrepreneur) => (
        <div className="min-w-[240px]">
          <div className="font-semibold text-ink">
            {entrepreneur.businessName}
          </div>
          <div className="mt-1 text-sm text-ink-muted">
            {entrepreneur.representativeName}
          </div>
        </div>
      ),
    },
    {
      key: 'stage',
      header: 'Stage / sector',
      cell: (entrepreneur) => (
        <div className="flex min-w-[180px] flex-wrap gap-1.5">
          <Badge tone="neutral">
            {entrepreneur.stage?.name ?? 'Stage not set'}
          </Badge>
          <Badge tone="blue">
            {entrepreneur.sector?.name ?? 'Sector not set'}
          </Badge>
        </div>
      ),
    },
    {
      key: 'country',
      header: 'Country',
      cell: (entrepreneur) => (
        <span className="text-sm text-ink-muted">{entrepreneur.country}</span>
      ),
    },
    {
      key: 'progress',
      header: 'Training progress',
      cell: (entrepreneur) => (
        <div className="min-w-[180px]">
          <ProgressBar
            value={entrepreneur.learnerProgress.average}
            width="100%"
            className="h-2"
          />
          <div className="mt-1 text-sm text-ink-muted">
            {entrepreneur.learnerProgress.average}% average
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="mt-5">
      <TableToolbar>
        <div>
          <div className="text-sm font-medium text-ink">
            Filter entrepreneurs
          </div>
          <div className="mt-0.5 text-sm text-ink-muted">
            {entrepreneurs.totalItems} entrepreneur
            {entrepreneurs.totalItems === 1 ? '' : 's'} in this programme
          </div>
        </div>
        <div className="grid w-full gap-2 md:grid-cols-[minmax(220px,1fr)_190px] lg:w-[580px]">
          <TableFilterInput
            icon
            placeholder="Search entrepreneurs..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <TableFilterAutocomplete
            value={stageId}
            onValueChange={setStageId}
            options={[
              { value: 'all', label: 'All stages' },
              ...stageRows.map((stage) => ({
                value: stage.id,
                label: stage.name,
              })),
            ]}
            placeholder="All stages"
            searchPlaceholder="Search stages..."
            onSearchChange={setStageSearch}
            isLoading={stages.isLoading || stages.isFetchingNextPage}
            hasMore={Boolean(stages.hasNextPage)}
            onLoadMore={() => void stages.fetchNextPage()}
          />
        </div>
      </TableToolbar>
      {entrepreneurs.isLoading && !entrepreneurs.data ? (
        <TableSkeleton columns={4} rows={5} />
      ) : entrepreneurs.isError ? (
        <Notice>
          Entrepreneurs could not be loaded. {entrepreneurs.error.message}
        </Notice>
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={entrepreneurs.rows}
            rowKey={(entrepreneur) => entrepreneur.entrepreneurUserId}
            emptyMessage="No entrepreneurs match these filters."
            tableClassName="min-w-[880px]"
          />
          <TablePagination
            page={entrepreneurs.page}
            pageSize={pageSize}
            totalItems={entrepreneurs.totalItems}
            pageSizeOptions={[5, 10, 20]}
            onPageChange={entrepreneurs.setPage}
            onPageSizeChange={setPageSize}
          />
        </>
      )}
    </div>
  );
}

function ContentSummary({ module }: { module: ProgrammeModuleRecord }) {
  if (module.content.total === 0) {
    return (
      <span className="text-sm text-ink-muted">No learning assets yet</span>
    );
  }
  return (
    <div className="flex min-w-[240px] flex-wrap gap-1.5">
      {module.content.videos > 0 ? (
        <Badge tone="blue">{module.content.videos} videos</Badge>
      ) : null}
      {module.content.pdfs > 0 ? (
        <Badge tone="neutral">{module.content.pdfs} files</Badge>
      ) : null}
      {module.content.tools > 0 ? (
        <Badge tone="brand">{module.content.tools} tools</Badge>
      ) : null}
    </div>
  );
}

function ProgrammeStatusBadge({ status }: { status: ProgrammeLifecycle }) {
  const tones = {
    draft: 'neutral',
    scheduled: 'blue',
    active: 'green',
    completed: 'amber',
    archived: 'red',
  } as const;
  const labels = {
    draft: 'Draft',
    scheduled: 'Scheduled',
    active: 'Active',
    completed: 'Completed',
    archived: 'Archived',
  };
  return <Badge tone={tones[status]}>{labels[status]}</Badge>;
}

function ProgrammeHealthCard({
  label,
  value,
  helper,
  progress,
}: {
  label: string;
  value: React.ReactNode;
  helper?: string;
  progress?: number;
}) {
  return (
    <div className="rounded-xl border border-line bg-white px-3 py-3">
      <div className="text-xs font-medium uppercase tracking-[0.04em] text-ink-muted">
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold text-ink">{value}</div>
      {typeof progress === 'number' ? (
        <ProgressBar value={progress} width="100%" className="mt-3 h-1.5" />
      ) : null}
      {helper ? (
        <div className="mt-2 text-xs leading-5 text-ink-muted">{helper}</div>
      ) : null}
    </div>
  );
}

function ContextMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface-subtle p-3">
      <div className="flex items-center gap-2 text-sm text-ink-muted">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-ink">{value}</div>
    </div>
  );
}

function ReadinessPanelItem({
  icon: Icon,
  title,
  status,
  description,
  tone = 'neutral',
}: {
  icon: LucideIcon;
  title: string;
  status: string;
  description: string;
  tone?: 'neutral' | 'warning' | 'success';
}) {
  const badgeTone =
    tone === 'success' ? 'green' : tone === 'warning' ? 'amber' : 'neutral';
  const iconClass =
    tone === 'warning'
      ? 'bg-warning-light text-warning-dark'
      : tone === 'success'
        ? 'bg-success-light text-success-dark'
        : 'bg-surface-subtle text-bid';
  return (
    <div className="rounded-xl border border-line bg-white px-4 py-4">
      <div className="flex items-start gap-3">
        <div
          className={
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ' +
            iconClass
          }
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-semibold text-ink">{title}</div>
            <Badge tone={badgeTone}>{status}</Badge>
          </div>
          <div className="mt-2 text-sm leading-5 text-ink-muted">
            {description}
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewLoading() {
  return (
    <div className="grid min-h-[360px] place-items-center bg-surface-subtle p-8">
      <div className="w-full max-w-md space-y-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
    </div>
  );
}

function PreviewFallback({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="grid min-h-[360px] place-items-center bg-surface-subtle p-8 text-center">
      <div>
        <div className="text-base font-semibold text-ink">{title}</div>
        <p className="mt-2 max-w-md text-sm leading-6 text-ink-muted">
          {description}
        </p>
      </div>
    </div>
  );
}

function TrainerProgrammeDetailSkeleton() {
  return (
    <>
      <DetailHeader />
      <Card padding="lg">
        <div className="flex flex-col gap-5 xl:flex-row xl:justify-between">
          <div className="w-full max-w-3xl space-y-3">
            <Skeleton className="h-5 w-52" />
            <Skeleton className="h-8 w-3/5" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
          <Skeleton className="h-28 w-full xl:w-[260px]" />
        </div>
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-24 w-full" />
          ))}
        </div>
      </Card>
      <Card className="mt-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="mt-3 h-4 w-full max-w-xl" />
        <div className="mt-6">
          <TableSkeleton columns={5} rows={6} />
        </div>
      </Card>
    </>
  );
}

function dueRuleLabel(rule: ProgrammeDeliverableRule) {
  if (rule.dueType === 'fixed_date' && rule.dueDate) {
    return 'Due ' + formatDate(rule.dueDate);
  }
  if (rule.dueType === 'module_completion') {
    return rule.dueAfterModule
      ? 'After ' + rule.dueAfterModule.title
      : 'After module completion';
  }
  const cadence = rule.recurringCadence?.replace('_', ' ') ?? 'Recurring';
  return cadence.charAt(0).toUpperCase() + cadence.slice(1);
}

function requiredScopeLabel(rule: ProgrammeDeliverableRule) {
  return rule.requiredForScope === 'stage' && rule.requiredStage
    ? rule.requiredStage.name + ' stage entrepreneurs'
    : 'All entrepreneurs in this programme';
}

function contentBreakdown(programme: ProgrammeDetail) {
  return (
    programme.content.videos +
    ' videos, ' +
    programme.content.pdfs +
    ' PDFs, ' +
    programme.content.tools +
    ' tools'
  );
}

function formatMonth(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
