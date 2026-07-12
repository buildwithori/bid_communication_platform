'use client';

import * as React from 'react';
import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import MuxPlayer from '@mux/mux-player-react/lazy';
import { ArrowLeft, BookOpen, CalendarDays, CheckCircle2, ExternalLink, FileText, PlayCircle, Users, Wrench, type LucideIcon } from 'lucide-react';
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
  TableFilterAutocomplete,
  TableFilterInput,
  TablePagination,
  TableToolbar,
  type Column,
} from '@/components/shared/DataTable';
import { entrepreneurs } from '@/lib/mock-data/entrepreneurs';
import { deliverableReviews, deliverableReviewStatusMeta } from '@/lib/mock-data/admin-workflows';
import { contentItems, modulesForProgram } from '@/lib/mock-data/programs';
import { trainers } from '@/lib/mock-data/trainers';
import { sectorById, stageById } from '@/lib/mock-data/definitions';
import { getProgrammeStatus, getProgrammeStatusLabel, getProgrammeStatusTone } from '@/lib/programme-status';
import { entrepreneurHasProgramme } from '@/lib/programme-access';
import { getTrainerProgrammes, trainerSupportsEntrepreneur } from '@/lib/content-trainer-access';
import { routes } from '@/lib/routes';
import type { BadgeTone, ContentItem, Entrepreneur, Module, Program } from '@/types';

const currentTrainerId = 't-kofi';
const ALL_FILTER = 'all';

type WorkspaceTab = 'overview' | 'curriculum' | 'deliverables' | 'readiness' | 'entrepreneurs';
type TrainerDeliverableStatus = 'missing' | 'pending-review' | 'changes-requested' | 'approved';

interface ProgrammeDeliverableRequirement {
  id: string;
  programmeId: string;
  name: string;
  dueRule: string;
  requiredFor: string;
}

interface TrainerDeliverableRow {
  id: string;
  name: string;
  dueRule: string;
  requiredFor: string;
  requiredCount: number;
  submittedCount: number;
  status: TrainerDeliverableStatus;
  latestActivity: string;
}

const programmeDeliverableRequirements: ProgrammeDeliverableRequirement[] = [
  { id: 'req-accelerator-bmc', programmeId: 'p-accelerator-c6', name: 'Business Model Canvas', dueRule: 'After Business Model Canvas Deep Dive', requiredFor: 'All entrepreneurs in this programme' },
  { id: 'req-accelerator-finmodel', programmeId: 'p-accelerator-c6', name: 'Financial Model (3yr)', dueRule: 'Before investor-readiness review', requiredFor: 'Growth and scale stage entrepreneurs' },
  { id: 'req-accelerator-q1', programmeId: 'p-accelerator-c6', name: 'Q1 Progress Report', dueRule: 'Quarterly', requiredFor: 'All entrepreneurs in this programme' },
  { id: 'req-accelerator-pitch', programmeId: 'p-accelerator-c6', name: 'Pitch Deck v2', dueRule: 'Before demo day', requiredFor: 'All entrepreneurs in this programme' },
  { id: 'req-fintech-finmodel', programmeId: 'p-readiness-fintech', name: 'Financial Model (3yr)', dueRule: 'Before investor matching', requiredFor: 'All entrepreneurs in this programme' },
  { id: 'req-fintech-dd', programmeId: 'p-readiness-fintech', name: 'Due Diligence Pack', dueRule: 'After due diligence module', requiredFor: 'All entrepreneurs in this programme' },
];

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const formatProgramDate = (date: string) =>
  new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

function normalise(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function programmeNameMatches(left: string, right: string) {
  return normalise(left).replace(/\s+/g, '') === normalise(right).replace(/\s+/g, '');
}

function deliverableMatchesRequirement(deliverable: string, requirement: string) {
  const left = normalise(deliverable);
  const right = normalise(requirement);
  return left.includes(right) || right.includes(left);
}

function getModuleContentItems(module: Module) {
  return module.contentItemIds
    .map((contentId) => contentItems.find((item) => item.id === contentId))
    .filter(Boolean) as ContentItem[];
}

function StatusBadge({ program }: { program: Program }) {
  const status = getProgrammeStatus(program);
  return <Badge tone={getProgrammeStatusTone(status)}>{getProgrammeStatusLabel(status)}</Badge>;
}

function deliverableStatusMeta(status: TrainerDeliverableStatus): { label: string; tone: BadgeTone } {
  if (status === 'missing') return { label: 'Not submitted', tone: 'amber' };
  if (status === 'pending-review') return deliverableReviewStatusMeta['pending-review'];
  if (status === 'changes-requested') return deliverableReviewStatusMeta['changes-requested'];
  return deliverableReviewStatusMeta.approved;
}

export default function TrainerProgrammeDetailPage() {
  const params = useParams<{ programId: string }>();
  const programmes = React.useMemo(() => getTrainerProgrammes(currentTrainerId), []);
  const programme = programmes.find((item) => item.id === params.programId);
  const [tab, setTab] = React.useState<WorkspaceTab>('overview');

  if (!programme) return notFound();

  const assignedEntrepreneurs = entrepreneurs.filter(
    (entrepreneur) => trainerSupportsEntrepreneur(currentTrainerId, entrepreneur) && entrepreneurHasProgramme(entrepreneur, programme.id),
  );
  const modules = modulesForProgram(programme.id);
  const content = modules.flatMap(getModuleContentItems);
  const ownedContent = content.filter((item) => item.trainerId === currentTrainerId);
  const modulesWithoutContent = modules.filter((module) => module.contentItemIds.length === 0);
  const videos = content.filter((item) => item.type === 'video').length;
  const files = content.filter((item) => item.type === 'pdf').length;
  const tools = content.filter((item) => item.type === 'tool').length;
  const capacityPercentage = Math.round((programme.entrepreneursCount / Math.max(programme.maxEntrepreneurs, 1)) * 100);
  const readinessScore = modules.length ? Math.round(((modules.length - modulesWithoutContent.length) / modules.length) * 100) : 0;

  return (
    <>
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

      <section className="space-y-4">
        <Card accent={programme.accent} padding="lg">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <StatusBadge program={programme} />
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
                  <div className="mt-1 text-3xl font-semibold leading-none text-ink">{programme.progress}%</div>
                </div>
                <div className="text-right text-xs leading-5 text-ink-muted">Across this programme</div>
              </div>
              <ProgressBar value={programme.progress} width="100%" className="mt-3 h-1.5" />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <ProgrammeHealthCard label={programme.accessType === 'free' ? 'Access' : 'Enrollment'} value={programme.accessType === 'free' ? 'All entrepreneurs' : `${programme.entrepreneursCount}/${programme.maxEntrepreneurs}`} progress={programme.accessType === 'free' ? undefined : capacityPercentage} />
            <ProgrammeHealthCard label="Modules" value={modules.length} helper={`${modulesWithoutContent.length} need content`} />
            <ProgrammeHealthCard label="Content assets" value={content.length} helper={`${videos} videos, ${files} PDFs, ${tools} tools`} />
            <ProgrammeHealthCard label="Content you own" value={ownedContent.length} helper="Ratings go to content owners" />
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
            <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_340px]">
              <Card>
                <div className="mb-4 text-base font-semibold text-ink">Trainer context</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <ContextMetric icon={Users} label="My entrepreneurs" value={assignedEntrepreneurs.length} />
                  <ContextMetric icon={BookOpen} label="Modules" value={modules.length} />
                  <ContextMetric icon={PlayCircle} label="Videos" value={videos} />
                  <ContextMetric icon={FileText} label="Files and tools" value={files + tools} />
                </div>
              </Card>
              <Card>
                <div className="mb-2 text-base font-semibold text-ink">Readiness</div>
                <div className="text-sm leading-6 text-ink-muted">{readinessScore}% of modules currently have learning content.</div>
                <ProgressBar value={readinessScore} width="100%" className="mt-4 h-2" />
                <div className="mt-4 rounded-xl bg-surface-subtle p-3 text-sm leading-6 text-ink-muted">
                  {modulesWithoutContent.length > 0
                    ? `${modulesWithoutContent.length} module${modulesWithoutContent.length === 1 ? '' : 's'} still need content. Raise this with the admin team before entrepreneurs reach that point.`
                    : 'Every module currently has at least one content item attached.'}
                </div>
              </Card>
            </div>
          )}

          {tab === 'curriculum' && <CurriculumTab modules={modules} />}
          {tab === 'deliverables' && <DeliverablesTab programme={programme} assignedEntrepreneurs={assignedEntrepreneurs} />}
          {tab === 'readiness' && <ReadinessTab programme={programme} modules={modules} readinessScore={readinessScore} modulesWithoutContent={modulesWithoutContent} capacityPercentage={capacityPercentage} />}
          {tab === 'entrepreneurs' && <EntrepreneursTab entrepreneurs={assignedEntrepreneurs} />}
        </Card>
      </section>
    </>
  );
}

function CurriculumTab({ modules }: { modules: Module[] }) {
  const [query, setQuery] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(6);
  const [activeModule, setActiveModule] = React.useState<Module | null>(null);
  const [previewItem, setPreviewItem] = React.useState<ContentItem | null>(null);
  const filteredRows = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return modules;
    return modules.filter((module) => {
      const attachedItems = getModuleContentItems(module);
      return [module.title, module.description ?? '', String(module.order), ...attachedItems.map((item) => `${item.title} ${item.type} ${item.durationLabel ?? ''}`)]
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
  }, [modules, query]);
  const pageRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  const columns = React.useMemo<Column<Module>[]>(
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
                disabled: getModuleContentItems(module).length === 0,
                onSelect: () => setPreviewItem(getModuleContentItems(module)[0] ?? null),
              },
            ]}
          />
        ),
        className: 'w-[84px]',
      },
      { key: 'order', header: 'Order', cell: (module) => <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-surface-subtle text-xs font-semibold text-ink-muted">{module.order}</span> },
      {
        key: 'module',
        header: 'Module',
        cell: (module) => (
          <button
            type="button"
            onClick={() => setActiveModule(module)}
            className="block min-w-[280px] rounded-lg text-left outline-none transition hover:text-bid focus-visible:ring-2 focus-visible:ring-bid/20"
          >
            <span className="block font-semibold text-ink transition-colors group-hover:text-bid">{module.title}</span>
            {module.description && <span className="mt-1 line-clamp-2 block text-sm text-ink-muted">{module.description}</span>}
          </button>
        ),
      },
      { key: 'content', header: 'Learning assets', cell: (module) => <ContentSummary module={module} /> },
      { key: 'status', header: 'Readiness', cell: (module) => module.contentItemIds.length > 0 ? <Badge tone="green">Ready</Badge> : <Badge tone="amber">Needs content</Badge> },
    ],
    [],
  );

  React.useEffect(() => setPage(1), [query, pageSize, modules.length]);

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
      <TrainerModuleContentModal
        module={activeModule}
        onClose={() => setActiveModule(null)}
        onPreview={setPreviewItem}
      />
      <TrainerContentPreviewModal
        items={activeModule ? getModuleContentItems(activeModule) : contentItems}
        item={previewItem}
        onChangeItem={setPreviewItem}
        onClose={() => setPreviewItem(null)}
      />
    </div>
  );
}

function DeliverablesTab({ programme, assignedEntrepreneurs }: { programme: Program; assignedEntrepreneurs: Entrepreneur[] }) {
  const [query, setQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<typeof ALL_FILTER | TrainerDeliverableStatus>(ALL_FILTER);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(5);
  const assignedIds = React.useMemo(() => new Set(assignedEntrepreneurs.map((entrepreneur) => entrepreneur.id)), [assignedEntrepreneurs]);
  const requirements = React.useMemo(() => programmeDeliverableRequirements.filter((requirement) => requirement.programmeId === programme.id), [programme.id]);

  const rows = React.useMemo<TrainerDeliverableRow[]>(() => requirements.map((requirement) => {
    const matchingReviews = deliverableReviews.filter((review) =>
      assignedIds.has(review.entrepreneurId) &&
      programmeNameMatches(review.programme, programme.name) &&
      deliverableMatchesRequirement(review.deliverable, requirement.name),
    );
    const latestReview = matchingReviews.slice().sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0];
    const status: TrainerDeliverableStatus =
      matchingReviews.some((review) => review.status === 'changes-requested')
        ? 'changes-requested'
        : matchingReviews.some((review) => review.status === 'pending-review')
          ? 'pending-review'
          : matchingReviews.length >= assignedEntrepreneurs.length && matchingReviews.length > 0
            ? 'approved'
            : 'missing';

    return {
      id: requirement.id,
      name: requirement.name,
      dueRule: requirement.dueRule,
      requiredFor: requirement.requiredFor,
      requiredCount: assignedEntrepreneurs.length,
      submittedCount: matchingReviews.length,
      status,
      latestActivity: latestReview ? `${latestReview.businessName} submitted ${formatDate(latestReview.submittedAt)}` : 'No submission from your entrepreneurs yet',
    };
  }), [assignedEntrepreneurs.length, assignedIds, programme.name, requirements]);

  const filteredRows = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      const meta = deliverableStatusMeta(row.status);
      const matchesStatus = statusFilter === ALL_FILTER || row.status === statusFilter;
      const matchesSearch = !needle || [row.name, row.dueRule, row.requiredFor, meta.label, row.latestActivity].join(' ').toLowerCase().includes(needle);
      return matchesStatus && matchesSearch;
    });
  }, [query, rows, statusFilter]);
  const pageRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  React.useEffect(() => setPage(1), [query, statusFilter, pageSize, programme.id]);

  return (
    <div className="mt-5">
      <TableToolbar>
        <div>
          <div className="text-sm font-medium text-ink">Filter deliverables</div>
          <div className="mt-0.5 text-sm text-ink-muted">Track required submissions from your entrepreneurs in this programme.</div>
        </div>
        <div className="grid w-full gap-2 md:grid-cols-[minmax(220px,1fr)_190px] lg:w-[560px]">
          <TableFilterInput icon placeholder="Search deliverables..." value={query} onChange={(event) => setQuery(event.target.value)} />
          <TableFilterAutocomplete
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}
            options={[
              { value: ALL_FILTER, label: 'All statuses' },
              { value: 'missing', label: 'Not submitted' },
              { value: 'pending-review', label: 'Pending review' },
              { value: 'changes-requested', label: 'Changes required' },
              { value: 'approved', label: 'Approved' },
            ]}
            placeholder="All statuses"
            searchPlaceholder="Search statuses..."
          />
        </div>
      </TableToolbar>
      <DataTable columns={deliverableColumns} rows={pageRows} rowKey={(row) => row.id} emptyMessage="No deliverables match these filters." tableClassName="min-w-[980px]" />
      <TablePagination page={page} pageSize={pageSize} totalItems={filteredRows.length} pageSizeOptions={[5, 10, 20]} onPageChange={setPage} onPageSizeChange={(next) => { setPageSize(next); setPage(1); }} />
    </div>
  );
}

function ReadinessTab({ programme, modules, readinessScore, modulesWithoutContent, capacityPercentage }: { programme: Program; modules: Module[]; readinessScore: number; modulesWithoutContent: Module[]; capacityPercentage: number }) {
  const capacityNeedsAttention = programme.accessType !== 'free' && capacityPercentage >= 90;

  return (
    <div className="mt-5 space-y-4">
      <div className="rounded-xl border border-black/[0.08] bg-surface-subtle px-4 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-base font-semibold text-ink">Launch readiness</div>
              <Badge tone={modulesWithoutContent.length ? 'amber' : 'green'}>{modulesWithoutContent.length ? 'Needs attention' : 'Ready to launch'}</Badge>
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
        <ReadinessPanelItem icon={modulesWithoutContent.length ? FileText : CheckCircle2} title="Content coverage" status={modulesWithoutContent.length ? 'Needs content' : 'Complete'} description={modulesWithoutContent.length ? `${modulesWithoutContent.length} module${modulesWithoutContent.length === 1 ? '' : 's'} still need at least one learning asset.` : 'Every module currently has at least one learning asset attached.'} tone={modulesWithoutContent.length ? 'warning' : 'success'} />
        <ReadinessPanelItem icon={Users} title={programme.accessType === 'free' ? 'Access model' : 'Enrollment capacity'} status={programme.accessType === 'free' ? 'Open to all' : capacityNeedsAttention ? 'Nearly full' : 'Seats available'} description={programme.accessType === 'free' ? 'Every entrepreneur can access this programme without manual enrollment.' : `${programme.entrepreneursCount} of ${programme.maxEntrepreneurs} seats are currently filled.`} tone={capacityNeedsAttention ? 'warning' : 'neutral'} />
        <ReadinessPanelItem icon={FileText} title="Required submissions" status="Configured" description="Deliverable rules are listed in the Deliverables tab and drive entrepreneur submission queues." tone="neutral" />
      </div>

      <DataTable columns={readinessColumns} rows={modules} rowKey={(module) => module.id} emptyMessage="No modules have been added to this programme yet." tableClassName="min-w-[840px]" />
    </div>
  );
}

function EntrepreneursTab({ entrepreneurs }: { entrepreneurs: Entrepreneur[] }) {
  const [query, setQuery] = React.useState('');
  const [stageFilter, setStageFilter] = React.useState(ALL_FILTER);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(5);
  const stageOptions = React.useMemo(() => {
    const options = entrepreneurs.map((entrepreneur) => {
      const stage = stageById[entrepreneur.stage];
      return { value: entrepreneur.stage, label: stage?.label ?? entrepreneur.stage };
    });
    return [{ value: ALL_FILTER, label: 'All stages' }, ...Array.from(new Map(options.map((option) => [option.value, option])).values())];
  }, [entrepreneurs]);
  const filteredRows = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return entrepreneurs.filter((entrepreneur) => {
      const stage = stageById[entrepreneur.stage];
      const sector = sectorById[entrepreneur.sector];
      const matchesStage = stageFilter === ALL_FILTER || entrepreneur.stage === stageFilter;
      const matchesSearch = !needle || [entrepreneur.businessName, entrepreneur.representative, entrepreneur.email, entrepreneur.country, stage?.label ?? entrepreneur.stage, sector?.label ?? entrepreneur.sector, String(entrepreneur.metrics.trainingProgress)].join(' ').toLowerCase().includes(needle);
      return matchesStage && matchesSearch;
    });
  }, [entrepreneurs, query, stageFilter]);
  const pageRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  React.useEffect(() => setPage(1), [entrepreneurs.length, pageSize, query, stageFilter]);

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
      <DataTable columns={entrepreneurColumns} rows={pageRows} rowKey={(entrepreneur) => entrepreneur.id} emptyMessage="No entrepreneurs match these filters." tableClassName="min-w-[880px]" />
      <TablePagination page={page} pageSize={pageSize} totalItems={filteredRows.length} pageSizeOptions={[5, 10, 20]} onPageChange={setPage} onPageSizeChange={(next) => { setPageSize(next); setPage(1); }} />
    </div>
  );
}


const contentTypeMeta: Record<ContentItem['type'], { label: string; icon: LucideIcon; tone: BadgeTone; bg: string; fg: string }> = {
  video: { label: 'Video', icon: PlayCircle, tone: 'brand', bg: 'bg-bid-light', fg: 'text-bid' },
  pdf: { label: 'PDF', icon: FileText, tone: 'blue', bg: 'bg-info-light', fg: 'text-info' },
  tool: { label: 'Tool', icon: Wrench, tone: 'green', bg: 'bg-success-light', fg: 'text-success-dark' },
};

function getTrainerName(trainerId?: string) {
  return trainers.find((trainer) => trainer.id === trainerId)?.fullName ?? 'No trainer owner';
}

function getContentSourceLabel(item: ContentItem) {
  if (item.type === 'video') return item.muxPlaybackId ? 'Video ready' : 'Video not uploaded';
  if (item.type === 'pdf') return item.fileUrl ? 'PDF attached' : 'PDF not attached';
  return item.toolUrl ? item.toolUrl : 'Tool link not attached';
}

function TrainerModuleContentModal({
  module,
  onClose,
  onPreview,
}: {
  module: Module | null;
  onClose: () => void;
  onPreview: (item: ContentItem) => void;
}) {
  const [query, setQuery] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(5);
  const items = React.useMemo(() => (module ? getModuleContentItems(module) : []), [module]);
  const filteredItems = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) =>
      [item.title, item.chapter, item.type, item.durationLabel ?? '', getTrainerName(item.trainerId), getContentSourceLabel(item)]
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

  const columns = React.useMemo<Column<ContentItem>[]>(
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
              <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.bg}`}>
                <Icon className={`h-4 w-4 ${meta.fg}`} />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-ink">{item.title}</span>
                <span className="mt-1 block text-sm text-ink-muted">{item.chapter} · {item.durationLabel ?? meta.label}</span>
              </span>
            </button>
          );
        },
      },
      { key: 'type', header: 'Type', cell: (item) => <Badge tone={contentTypeMeta[item.type].tone}>{contentTypeMeta[item.type].label}</Badge> },
      { key: 'trainer', header: 'Trainer owner', cell: (item) => <span className="text-sm text-ink-muted">{getTrainerName(item.trainerId)}</span> },
      { key: 'source', header: 'Source', cell: (item) => <span className="block max-w-[260px] truncate text-sm text-ink-muted">{getContentSourceLabel(item)}</span> },
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
                  <Badge tone="neutral">Module {module.order}</Badge>
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
  items: ContentItem[];
  item: ContentItem | null;
  onChangeItem: (item: ContentItem | null) => void;
  onClose: () => void;
}) {
  if (!item) return null;
  const meta = contentTypeMeta[item.type];
  const Icon = meta.icon;
  const currentIndex = Math.max(items.findIndex((candidate) => candidate.id === item.id), 0);
  const previousItem = currentIndex > 0 ? items[currentIndex - 1] : undefined;
  const nextItem = currentIndex < items.length - 1 ? items[currentIndex + 1] : undefined;

  return (
    <Modal open={!!item} onOpenChange={(open) => !open && onClose()} title="Preview curriculum content" width="xl">
      <div className="space-y-4">
        <div className="rounded-xl border border-line bg-surface-subtle p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${meta.bg}`}>
                <Icon className={`h-5 w-5 ${meta.fg}`} />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                  <Badge tone="neutral">{item.chapter}</Badge>
                  <span className="text-sm text-ink-muted">{currentIndex + 1} of {items.length}</span>
                </div>
                <h3 className="mt-2 text-xl font-semibold text-ink">{item.title}</h3>
                <div className="mt-1 text-sm text-ink-muted">{item.durationLabel ?? meta.label} · {getTrainerName(item.trainerId)}</div>
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
            item.muxPlaybackId ? (
              <MuxPlayer playbackId={item.muxPlaybackId} metadataVideoTitle={item.title} streamType="on-demand" className="aspect-video w-full" />
            ) : (
              <PreviewFallback title="Video not uploaded" description="This content item does not have a video file yet." />
            )
          ) : item.type === 'pdf' ? (
            item.fileUrl ? (
              <iframe title={item.title} src={item.fileUrl} className="h-[68vh] w-full bg-white" />
            ) : (
              <PreviewFallback title="PDF not attached" description="This content item does not have a PDF file yet." />
            )
          ) : item.toolUrl ? (
            <iframe title={item.title} src={item.toolUrl} className="h-[68vh] w-full bg-white" />
          ) : (
            <PreviewFallback title="Tool link missing" description="This embedded tool does not have a link yet." />
          )}
        </div>

        {(item.fileUrl || item.toolUrl) && item.type !== 'video' ? (
          <div className="flex justify-end">
            <Button asChild variant="outline">
              <a href={item.fileUrl ?? item.toolUrl} target="_blank" rel="noreferrer">
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

const deliverableColumns: Column<TrainerDeliverableRow>[] = [
  { key: 'deliverable', header: 'Deliverable', cell: (row) => <div className="min-w-[260px]"><div className="font-semibold text-ink">{row.name}</div><div className="mt-1 text-sm text-ink-muted">{row.requiredFor}</div></div> },
  { key: 'due', header: 'Due rule', cell: (row) => <span className="text-sm text-ink-muted">{row.dueRule}</span> },
  { key: 'submitted', header: 'Learner submissions', cell: (row) => <span className="font-medium text-ink">{row.submittedCount}/{row.requiredCount}</span> },
  { key: 'status', header: 'Status', cell: (row) => { const meta = deliverableStatusMeta(row.status); return <Badge tone={meta.tone}>{meta.label}</Badge>; } },
  { key: 'latest', header: 'Latest activity', cell: (row) => <span className="line-clamp-2 min-w-[260px] text-sm text-ink-muted">{row.latestActivity}</span> },
];

const readinessColumns: Column<Module>[] = [
  { key: 'module', header: 'Module', cell: (module) => <div><div className="font-semibold text-ink">{module.title}</div><div className="mt-1 text-xs text-ink-muted">Order {module.order}</div></div>, className: 'min-w-[280px]' },
  { key: 'coverage', header: 'Coverage', cell: (module) => <ContentSummary module={module} /> },
  { key: 'status', header: 'Launch status', cell: (module) => module.contentItemIds.length > 0 ? <Badge tone="green">Ready</Badge> : <Badge tone="amber">Needs content</Badge> },
];

const entrepreneurColumns: Column<Entrepreneur>[] = [
  { key: 'business', header: 'Business', cell: (entrepreneur) => <div className="min-w-[240px]"><div className="font-semibold text-ink">{entrepreneur.businessName}</div><div className="mt-1 text-sm text-ink-muted">{entrepreneur.representative}</div></div> },
  { key: 'stage', header: 'Stage / sector', cell: (entrepreneur) => <div className="flex min-w-[180px] flex-wrap gap-1.5"><Badge tone={stageById[entrepreneur.stage]?.color ?? 'neutral'}>{stageById[entrepreneur.stage]?.label ?? entrepreneur.stage}</Badge><Badge tone={sectorById[entrepreneur.sector]?.color ?? 'neutral'}>{sectorById[entrepreneur.sector]?.label ?? entrepreneur.sector}</Badge></div> },
  { key: 'progress', header: 'Training progress', cell: (entrepreneur) => <div className="min-w-[180px]"><ProgressBar value={entrepreneur.metrics.trainingProgress} width="100%" className="h-2" /><div className="mt-1 text-sm text-ink-muted">{entrepreneur.metrics.trainingProgress}% complete</div></div> },
  { key: 'deliverables', header: 'Deliverables', cell: (entrepreneur) => `${entrepreneur.metrics.deliverablesDone}/${entrepreneur.metrics.deliverablesTotal}` },
];

function ContentSummary({ module }: { module: Module }) {
  const items = getModuleContentItems(module);
  const counts = items.reduce<Record<ContentItem['type'], number>>((acc, item) => ({ ...acc, [item.type]: acc[item.type] + 1 }), { video: 0, pdf: 0, tool: 0 });
  if (items.length === 0) return <span className="text-sm text-ink-muted">No learning assets yet</span>;
  return <div className="flex min-w-[240px] flex-wrap gap-1.5">{counts.video > 0 && <Badge tone="blue">{counts.video} videos</Badge>}{counts.pdf > 0 && <Badge tone="neutral">{counts.pdf} files</Badge>}{counts.tool > 0 && <Badge tone="brand">{counts.tool} tools</Badge>}</div>;
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
  const badgeTone = tone === 'success' ? 'green' : tone === 'warning' ? 'amber' : 'neutral';
  return (
    <div className="rounded-xl border border-black/[0.08] bg-white px-4 py-4">
      <div className="flex items-start gap-3">
        <div className={tone === 'warning' ? 'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-warning-light text-warning-dark' : tone === 'success' ? 'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-success-light text-success-dark' : 'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-bid'}>
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
