'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
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
import { Modal } from '@/components/shared/Modal';
import { Notice, PageHeader } from '@/components/shared/PageHeader';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { Tabs } from '@/components/shared/Tabs';
import {
  useModuleContentItemsPage,
  type ContentItemRecord,
  type ContentItemStatus,
  type ContentItemType,
} from '@/lib/api/content';
import {
  useEntrepreneursPage,
  type EntrepreneurRecord,
} from '@/lib/api/entrepreneurs';
import { useSignedFileUrlQuery } from '@/lib/api/files';
import {
  useProgrammeDeliverableRulesQuery,
  useProgrammeDetailQuery,
  useProgrammeModulesPage,
  type ProgrammeDeliverableRule,
  type ProgrammeDetail,
  type ProgrammeLifecycle,
  type ProgrammeModuleRecord,
} from '@/lib/api/programmes';
import { useLazyBusinessStagesQuery } from '@/lib/api/settings';
import { useSignedVideoPlaybackQuery } from '@/lib/api/videos';
import { routes } from '@/lib/routes';
import type { BadgeTone } from '@/types';

type WorkspaceTab =
  | 'overview'
  | 'curriculum'
  | 'deliverables'
  | 'readiness'
  | 'entrepreneurs';

export default function TrainerProgrammeDetailPage() {
  const params = useParams<{ programId: string }>();
  const programme = useProgrammeDetailQuery(params.programId);
  const [tab, setTab] = React.useState<WorkspaceTab>('overview');

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
                  {formatMonth(detail.startDate)} - {formatMonth(detail.endDate)}
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
                { value: 'deliverables', label: 'Deliverables' },
                { value: 'readiness', label: 'Readiness' },
                { value: 'entrepreneurs', label: 'Entrepreneurs' },
              ]}
              className="mb-0 w-full overflow-x-auto sm:w-fit"
            />
          </div>

          {tab === 'overview' ? <OverviewTab programme={detail} /> : null}
          {tab === 'curriculum' ? (
            <CurriculumTab programmeId={detail.id} />
          ) : null}
          {tab === 'deliverables' ? (
            <DeliverablesTab programmeId={detail.id} />
          ) : null}
          {tab === 'readiness' ? (
            <ReadinessTab programme={detail} />
          ) : null}
          {tab === 'entrepreneurs' ? (
            <EntrepreneursTab programmeId={detail.id} />
          ) : null}
        </Card>
      </section>
    </>
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

function CurriculumTab({ programmeId }: { programmeId: string }) {
  const [search, setSearch] = React.useState('');
  const deferredSearch = React.useDeferredValue(search);
  const [pageSize, setPageSize] = React.useState(6);
  const [activeModule, setActiveModule] =
    React.useState<ProgrammeModuleRecord | null>(null);
  const [previewItem, setPreviewItem] =
    React.useState<ContentItemRecord | null>(null);
  const [previewItems, setPreviewItems] = React.useState<ContentItemRecord[]>([]);
  const modules = useProgrammeModulesPage(programmeId, {
    search: deferredSearch.trim() || undefined,
    take: pageSize,
  });
  const resetPagination = modules.resetPagination;

  React.useEffect(() => {
    resetPagination();
  }, [deferredSearch, pageSize, resetPagination]);

  const columns = React.useMemo<Column<ProgrammeModuleRecord>[]>(
    () => [
      {
        key: 'actions',
        header: 'Action',
        cell: (module) => (
          <RowActions
            actions={[
              {
                label: 'View module content',
                onSelect: () => setActiveModule(module),
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
            onClick={() => setActiveModule(module)}
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
    [],
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
      <TrainerModuleContentModal
        key={activeModule?.id ?? 'closed'}
        module={activeModule}
        onClose={() => setActiveModule(null)}
        onPreview={(item, items) => {
          setPreviewItems(items);
          setPreviewItem(item);
        }}
      />
      <TrainerContentPreviewModal
        items={previewItems}
        item={previewItem}
        onChangeItem={setPreviewItem}
        onClose={() => setPreviewItem(null)}
      />
    </div>
  );
}

function TrainerModuleContentModal({
  module,
  onClose,
  onPreview,
}: {
  module: ProgrammeModuleRecord | null;
  onClose: () => void;
  onPreview: (item: ContentItemRecord, items: ContentItemRecord[]) => void;
}) {
  const [search, setSearch] = React.useState('');
  const deferredSearch = React.useDeferredValue(search);
  const [pageSize, setPageSize] = React.useState(5);
  const content = useModuleContentItemsPage(
    module?.id ?? '',
    { search: deferredSearch.trim() || undefined, take: pageSize },
    Boolean(module),
  );
  const resetPagination = content.resetPagination;

  React.useEffect(() => {
    resetPagination();
  }, [deferredSearch, pageSize, resetPagination]);

  const columns = React.useMemo<Column<ContentItemRecord>[]>(
    () => [
      {
        key: 'actions',
        header: 'Action',
        cell: (item) => (
          <RowActions
            actions={[
              {
                label: 'Preview content',
                onSelect: () => onPreview(item, content.rows),
              },
            ]}
          />
        ),
        className: 'w-[84px]',
      },
      {
        key: 'content',
        header: 'Content item',
        cell: (item) => <ContentItemButton item={item} onOpen={() => onPreview(item, content.rows)} />,
      },
      {
        key: 'type',
        header: 'Type',
        cell: (item) => (
          <Badge tone={contentTypeMeta[item.type].tone}>
            {contentTypeMeta[item.type].label}
          </Badge>
        ),
      },
      {
        key: 'trainer',
        header: 'Trainer',
        cell: (item) => (
          <span className="text-sm text-ink-muted">
            {item.trainer?.name ?? 'No trainer attributed'}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        cell: (item) => <ContentStatusBadge status={item.status} />,
      },
    ],
    [content.rows, onPreview],
  );

  return (
    <Modal
      open={Boolean(module)}
      onOpenChange={(open) => !open && onClose()}
      title={module ? 'Module content: ' + module.title : 'Module content'}
      width="xl"
    >
      {module ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-line bg-surface-subtle p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={module.readiness === 'ready' ? 'green' : 'amber'}>
                    {module.readiness === 'ready' ? 'Ready' : 'Needs content'}
                  </Badge>
                  <Badge tone="neutral">Module {module.position}</Badge>
                </div>
                <h3 className="mt-3 text-xl font-semibold text-ink">
                  {module.title}
                </h3>
                {module.description ? (
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-muted">
                    {module.description}
                  </p>
                ) : null}
              </div>
              <Button
                type="button"
                disabled={!content.rows[0]}
                onClick={() =>
                  content.rows[0] && onPreview(content.rows[0], content.rows)
                }
              >
                <PlayCircle className="h-4 w-4" />
                Play from start
              </Button>
            </div>
          </div>
          <TableToolbar>
            <div>
              <div className="text-sm font-medium text-ink">Find content</div>
              <div className="mt-0.5 text-sm text-ink-muted">
                {content.totalItems} learning asset
                {content.totalItems === 1 ? '' : 's'}
              </div>
            </div>
            <div className="w-full sm:w-[360px]">
              <TableFilterInput
                icon
                placeholder="Search title or trainer..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </TableToolbar>
          {content.isLoading && !content.data ? (
            <TableSkeleton columns={5} rows={5} />
          ) : content.isError ? (
            <Notice>
              Module content could not be loaded. {content.error.message}
            </Notice>
          ) : (
            <>
              <DataTable
                columns={columns}
                rows={content.rows}
                rowKey={(item) => item.id}
                emptyMessage="No content item matches this search."
                tableClassName="min-w-[980px]"
              />
              <TablePagination
                page={content.page}
                pageSize={pageSize}
                totalItems={content.totalItems}
                pageSizeOptions={[5, 10, 20]}
                onPageChange={content.setPage}
                onPageSizeChange={setPageSize}
              />
            </>
          )}
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
  items: ContentItemRecord[];
  item: ContentItemRecord | null;
  onChangeItem: (item: ContentItemRecord | null) => void;
  onClose: () => void;
}) {
  const file = useSignedFileUrlQuery(
    item?.type === 'pdf' ? item.file?.id : undefined,
    Boolean(item),
  );
  const playback = useSignedVideoPlaybackQuery(
    item?.type === 'video' ? item.video?.id : undefined,
    Boolean(item),
  );

  if (!item) return null;
  const meta = contentTypeMeta[item.type];
  const Icon = meta.icon;
  const currentIndex = Math.max(
    items.findIndex((candidate) => candidate.id === item.id),
    0,
  );
  const previousItem = currentIndex > 0 ? items[currentIndex - 1] : undefined;
  const nextItem =
    currentIndex < items.length - 1 ? items[currentIndex + 1] : undefined;
  const externalUrl =
    item.type === 'pdf'
      ? file.data?.download.url
      : item.type === 'tool'
        ? item.toolLink?.url
        : undefined;

  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      title="Preview curriculum content"
      width="xl"
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-line bg-surface-subtle p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className={'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ' + meta.bg}>
                <Icon className={'h-5 w-5 ' + meta.fg} />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                  <ContentStatusBadge status={item.status} />
                  <span className="text-sm text-ink-muted">
                    {currentIndex + 1} of {items.length}
                  </span>
                </div>
                <h3 className="mt-2 text-xl font-semibold text-ink">
                  {item.title}
                </h3>
                <div className="mt-1 text-sm text-ink-muted">
                  {item.durationLabel ?? meta.label} -{' '}
                  {item.trainer?.name ?? 'No trainer attributed'}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!previousItem}
                onClick={() => previousItem && onChangeItem(previousItem)}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!nextItem}
                onClick={() => nextItem && onChangeItem(nextItem)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-line bg-black">
          {item.type === 'video' ? (
            playback.isLoading ? (
              <PreviewLoading />
            ) : playback.isError ? (
              <PreviewFallback
                title="Video unavailable"
                description={playback.error.message}
              />
            ) : playback.data ? (
              <MuxPlayer
                playbackId={playback.data.playbackId}
                tokens={{ playback: playback.data.token }}
                metadataVideoTitle={item.title}
                streamType="on-demand"
                className="aspect-video w-full"
              />
            ) : (
              <PreviewFallback
                title="Video not ready"
                description="This video is still being prepared."
              />
            )
          ) : item.type === 'pdf' ? (
            file.isLoading ? (
              <PreviewLoading />
            ) : file.isError ? (
              <PreviewFallback
                title="PDF unavailable"
                description={file.error.message}
              />
            ) : file.data ? (
              <iframe
                title={item.title}
                src={file.data.download.url}
                className="h-[68vh] w-full bg-white"
              />
            ) : (
              <PreviewFallback
                title="PDF not attached"
                description="This content item does not have a ready PDF file."
              />
            )
          ) : item.toolLink?.url ? (
            <iframe
              title={item.title}
              src={item.toolLink.url}
              className="h-[68vh] w-full bg-white"
            />
          ) : (
            <PreviewFallback
              title="Tool link missing"
              description="This embedded tool does not have a link yet."
            />
          )}
        </div>

        {externalUrl ? (
          <div className="flex justify-end">
            <Button asChild variant="outline">
              <a href={externalUrl} target="_blank" rel="noreferrer">
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

function DeliverablesTab({ programmeId }: { programmeId: string }) {
  const rules = useProgrammeDeliverableRulesQuery(programmeId);
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(5);
  const rows = React.useMemo(() => {
    const needle = search.trim().toLowerCase();
    const items: ProgrammeDeliverableRule[] = rules.data?.items ?? [];
    if (!needle) return items;
    return items.filter((rule) =>
      [rule.name, dueRuleLabel(rule), requiredScopeLabel(rule)]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }, [rules.data?.items, search]);
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);

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
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
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
            rows={pageRows}
            rowKey={(rule) => rule.id}
            emptyMessage="No deliverable rules match this search."
            tableClassName="min-w-[900px]"
          />
          <TablePagination
            page={page}
            pageSize={pageSize}
            totalItems={rows.length}
            pageSizeOptions={[5, 10, 20]}
            onPageChange={setPage}
            onPageSizeChange={(nextPageSize) => {
              setPageSize(nextPageSize);
              setPage(1);
            }}
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
  const deferredSearch = React.useDeferredValue(search);
  const [stageId, setStageId] = React.useState('all');
  const [stageLookupOpen, setStageLookupOpen] = React.useState(false);
  const [stageSearch, setStageSearch] = React.useState('');
  const [pageSize, setPageSize] = React.useState(5);
  const entrepreneurs = useEntrepreneursPage({
    programmeId,
    search: deferredSearch.trim() || undefined,
    stageId: stageId === 'all' ? undefined : stageId,
    take: pageSize,
  });
  const stages = useLazyBusinessStagesQuery({
    enabled: stageLookupOpen,
    search: stageSearch.trim() || undefined,
    active: true,
    take: 20,
  });
  const resetPagination = entrepreneurs.resetPagination;
  const stageRows =
    stages.data?.pages.flatMap((page) => page.items) ?? [];

  React.useEffect(() => {
    resetPagination();
  }, [deferredSearch, pageSize, resetPagination, stageId]);

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
            onOpenChange={setStageLookupOpen}
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

const contentTypeMeta: Record<
  ContentItemType,
  {
    label: string;
    icon: LucideIcon;
    tone: BadgeTone;
    bg: string;
    fg: string;
  }
> = {
  video: {
    label: 'Video',
    icon: PlayCircle,
    tone: 'brand',
    bg: 'bg-bid-light',
    fg: 'text-bid',
  },
  pdf: {
    label: 'PDF',
    icon: FileText,
    tone: 'blue',
    bg: 'bg-info-light',
    fg: 'text-info',
  },
  tool: {
    label: 'Tool',
    icon: Wrench,
    tone: 'green',
    bg: 'bg-success-light',
    fg: 'text-success-dark',
  },
};

function ContentItemButton({
  item,
  onOpen,
}: {
  item: ContentItemRecord;
  onOpen: () => void;
}) {
  const meta = contentTypeMeta[item.type];
  const Icon = meta.icon;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex min-w-[320px] items-start gap-3 rounded-lg text-left outline-none transition hover:text-bid focus-visible:ring-2 focus-visible:ring-bid/20"
    >
      <span className={'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ' + meta.bg}>
        <Icon className={'h-4 w-4 ' + meta.fg} />
      </span>
      <span className="min-w-0">
        <span className="block font-semibold text-ink">{item.title}</span>
        <span className="mt-1 block text-sm text-ink-muted">
          {item.durationLabel ?? meta.label}
        </span>
      </span>
    </button>
  );
}

function ContentStatusBadge({ status }: { status: ContentItemStatus }) {
  const meta: Record<ContentItemStatus, { label: string; tone: BadgeTone }> = {
    draft: { label: 'Draft', tone: 'neutral' },
    processing: { label: 'Processing', tone: 'amber' },
    ready: { label: 'Ready', tone: 'green' },
    failed: { label: 'Failed', tone: 'red' },
    archived: { label: 'Archived', tone: 'neutral' },
  };
  return <Badge tone={meta[status].tone}>{meta[status].label}</Badge>;
}

function ContentSummary({ module }: { module: ProgrammeModuleRecord }) {
  if (module.content.total === 0) {
    return <span className="text-sm text-ink-muted">No learning assets yet</span>;
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
        <div className={'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ' + iconClass}>
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
