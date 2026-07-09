'use client';

import * as React from 'react';
import { Search } from 'lucide-react';
import { PageHeader, Notice } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/shared/Card';
import { MetricGrid } from '@/components/shared/MetricGrid';
import { StatCard } from '@/components/shared/StatCard';
import { Badge } from '@/components/shared/Badge';
import { ProgrammeAccessList } from '@/components/shared/ProgrammeAccessList';
import { Button } from '@/components/shared/Button';
import { Avatar } from '@/components/shared/Avatar';
import {
  DataTable,
  RowActions,
  TableFilterAutocomplete,
  TableFilterInput,
  TableFilterSelect,
  TablePagination,
  TableToolbar,
  type Column,
} from '@/components/shared/DataTable';
import { Tabs } from '@/components/shared/Tabs';
import { Modal } from '@/components/shared/Modal';
import { TrainerModal } from '@/components/admin/TrainerModal';
import { useAdminStore } from '@/lib/stores/admin-store';
import { adminSessions, deliverableReviews } from '@/lib/mock-data/admin-workflows';
import { tools } from '@/lib/mock-data';
import { sectorById, sectors, stageById, stages } from '@/lib/mock-data/definitions';
import { programs } from '@/lib/mock-data/programs';
import { entrepreneurHasProgramme, getEntrepreneurProgrammes } from '@/lib/programme-access';
import { getTrainerContentItems, getTrainerProgrammes, trainerSupportsEntrepreneur } from '@/lib/content-trainer-access';
import { getEntrepreneurToolAccessSource, type EntrepreneurToolAccessSource } from '@/lib/tool-access';
import type { BadgeTone, Entrepreneur, SectorId, Trainer, Tool } from '@/types';

type TrainerTab = 'directory' | 'workload';

const trainerTabs: { value: TrainerTab; label: string }[] = [
  { value: 'directory', label: 'Trainer directory' },
  { value: 'workload', label: 'Workload overview' },
];

function CalendarStatusBadge({ provider }: { provider?: 'google' | 'calendly' | 'none' }) {
  if (provider === 'google') {
    return <Badge tone="green">Google Calendar connected</Badge>;
  }
  if (provider === 'calendly') {
    return <Badge tone="amber">Google Calendar not connected</Badge>;
  }
  return <Badge tone="red">No calendar connected</Badge>;
}

function TrainerStatusBadge({ trainer }: { trainer: Trainer }) {
  if (trainer.metrics.status === 'active') {
    return <Badge tone="green">Active</Badge>;
  }

  if (trainer.metrics.status === 'expires-soon') {
    return (
      <Badge tone="amber">
        Expires{' '}
        {trainer.accessExpiresOn
          ? new Date(trainer.accessExpiresOn).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })
          : 'soon'}
      </Badge>
    );
  }

  return <Badge tone="neutral">Inactive</Badge>;
}

function TrainerPortfolioCell({ trainer, entrepreneurs }: { trainer: Trainer; entrepreneurs: Entrepreneur[] }) {
  const entrepreneurCount = entrepreneurs.filter((entrepreneur) => trainerSupportsEntrepreneur(trainer.id, entrepreneur)).length;
  const learningAssetCount = getTrainerContentItems(trainer.id).length;

  return (
    <div className="min-w-[160px] text-sm">
      <div className="font-medium text-ink">{entrepreneurCount} entrepreneur{entrepreneurCount === 1 ? '' : 's'}</div>
      <div className="mt-0.5 text-ink-muted">{learningAssetCount} learning asset{learningAssetCount === 1 ? '' : 's'}</div>
    </div>
  );
}

const toolAccessSourceMeta: Record<Exclude<EntrepreneurToolAccessSource, 'none'>, { label: string; tone: BadgeTone }> = {
  global: { label: 'Global', tone: 'green' },
  programme: { label: 'Programme', tone: 'blue' },
  individual: { label: 'Individual', tone: 'brand' },
};

function getVisibleToolsForEntrepreneur(entrepreneur: Entrepreneur) {
  return tools.filter((tool) => getEntrepreneurToolAccessSource(tool, entrepreneur) !== 'none');
}

function EntrepreneurToolAccessList({ entrepreneur }: { entrepreneur: Entrepreneur }) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const visibleTools = React.useMemo(() => getVisibleToolsForEntrepreneur(entrepreneur), [entrepreneur]);
  const visible = visibleTools.slice(0, 2);
  const hiddenCount = Math.max(visibleTools.length - visible.length, 0);
  const filteredTools = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return visibleTools;
    return visibleTools.filter((tool) =>
      [tool.name, tool.description, tool.type, getEntrepreneurToolAccessSource(tool, entrepreneur)]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }, [entrepreneur, query, visibleTools]);

  return (
    <>
      <div className="flex min-w-[230px] max-w-[320px] flex-wrap items-center gap-1.5">
        {visible.map((tool) => (
          <Badge
            key={tool.id}
            tone={tool.type === 'pdf' ? 'blue' : 'green'}
            className="max-w-[155px] truncate"
            title={tool.name}
          >
            {tool.name}
          </Badge>
        ))}
        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setOpen(true);
            }}
            className="inline-flex items-center rounded-full bg-surface-subtle px-2.5 py-1 text-xs font-semibold leading-tight text-bid transition hover:bg-bid-light focus:outline-none focus-visible:ring-2 focus-visible:ring-bid/30"
          >
            +{hiddenCount} more
          </button>
        )}
        {visibleTools.length === 0 && <span className="text-sm text-ink-faint">No tools</span>}
      </div>

      <Modal open={open} onOpenChange={setOpen} title={`${entrepreneur.businessName} tool access`} width="wide">
        <div className="space-y-4">
          <div className="rounded-xl border border-line bg-surface-subtle px-4 py-3">
            <div className="text-sm font-semibold text-ink">
              {visibleTools.length} tool{visibleTools.length === 1 ? '' : 's'} visible
            </div>
            <div className="mt-1 text-sm text-ink-muted">
              These are the tools this entrepreneur can open from their workspace.
            </div>
          </div>

          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search tools..."
              className="h-10 w-full rounded-lg border border-line bg-white pl-9 pr-3 text-sm text-ink outline-none transition focus:border-bid focus:ring-2 focus:ring-bid/15"
            />
          </label>

          <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
            {filteredTools.map((tool: Tool) => {
              const source = getEntrepreneurToolAccessSource(tool, entrepreneur) as Exclude<EntrepreneurToolAccessSource, 'none'>;
              const meta = toolAccessSourceMeta[source];
              return (
                <div key={tool.id} className="rounded-xl border border-line bg-white px-4 py-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="font-semibold text-ink">{tool.name}</div>
                      <div className="mt-1 line-clamp-2 text-sm leading-6 text-ink-muted">{tool.description}</div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <Badge tone={tool.type === 'pdf' ? 'blue' : 'green'}>{tool.type === 'pdf' ? 'PDF resource' : 'Online tool'}</Badge>
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredTools.length === 0 && (
              <div className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink-muted">
                No tool matches this search.
              </div>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}

function formatSessionDate(date: string, startTime?: string) {
  const label = new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  return startTime ? `${label}, ${startTime}` : label;
}

function getTrainerWorkload(trainer: Trainer, entrepreneurs: Entrepreneur[]) {
  const assignedEntrepreneurs = entrepreneurs.filter((entrepreneur) => trainerSupportsEntrepreneur(trainer.id, entrepreneur));
  const assignedIds = new Set(assignedEntrepreneurs.map((entrepreneur) => entrepreneur.id));
  const trainerSessions = adminSessions.filter((session) => session.trainerId === trainer.id);
  const pendingSessions = trainerSessions.filter((session) => session.status === 'awaiting-trainer').length;
  const confirmedSessions = trainerSessions.filter((session) => session.status === 'confirmed').length;
  const pendingDeliverableReviews = deliverableReviews.filter(
    (review) =>
      assignedIds.has(review.entrepreneurId) &&
      review.status === 'pending-review',
  ).length;
  const changesRequestedFollowUps = deliverableReviews.filter(
    (review) =>
      assignedIds.has(review.entrepreneurId) &&
      review.status === 'changes-requested',
  ).length;
  const totalProgress = assignedEntrepreneurs.reduce(
    (sum, entrepreneur) => sum + entrepreneur.metrics.trainingProgress,
    0,
  );
  const averageProgress =
    assignedEntrepreneurs.length > 0 ? Math.round(totalProgress / assignedEntrepreneurs.length) : 0;
  const nextSession = trainerSessions
    .filter((session) => session.status === 'confirmed' || session.status === 'awaiting-trainer')
    .sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`))[0];

  return {
    averageProgress,
    changesRequestedFollowUps,
    confirmedSessions,
    nextSession,
    pendingDeliverableReviews,
    pendingSessions,
  };
}

export default function AdminTrainersPage() {
  const { entrepreneurs, trainers } = useAdminStore();
  const [activeTab, setActiveTab] = React.useState<TrainerTab>('directory');
  const [addOpen, setAddOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<Trainer | null>(null);
  const [manageTarget, setManageTarget] = React.useState<Trainer | null>(null);
  const [query, setQuery] = React.useState('');
  const [accessFilter, setAccessFilter] = React.useState<'all' | Trainer['accessLevel']>('all');
  const [statusFilter, setStatusFilter] = React.useState<'all' | Trainer['metrics']['status']>('all');
  const [specialismFilter, setSpecialismFilter] = React.useState('all');
  const [calendarFilter, setCalendarFilter] = React.useState<'all' | 'google' | 'none'>('all');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  const filteredTrainers = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return trainers.filter((trainer) => {
      const specialisms = trainer.specialisms.map((specialism) => sectorById[specialism]?.label ?? specialism).join(' ');
      const matchesQuery =
        !needle ||
        [trainer.fullName, trainer.email, trainer.role, specialisms, trainer.calendarProvider ?? 'none']
          .join(' ')
          .toLowerCase()
          .includes(needle);
      const matchesAccess = accessFilter === 'all' || trainer.accessLevel === accessFilter;
      const matchesStatus = statusFilter === 'all' || trainer.metrics.status === statusFilter;
      const matchesSpecialism =
        specialismFilter === 'all' || trainer.specialisms.includes(specialismFilter as SectorId);
      const matchesCalendar =
        calendarFilter === 'all' ||
        (calendarFilter === 'google' && trainer.calendarProvider === 'google') ||
        (calendarFilter === 'none' && (!trainer.calendarProvider || trainer.calendarProvider === 'none'));
      return matchesQuery && matchesAccess && matchesStatus && matchesSpecialism && matchesCalendar;
    });
  }, [accessFilter, calendarFilter, query, specialismFilter, statusFilter, trainers]);

  React.useEffect(() => {
    setPage(1);
  }, [accessFilter, activeTab, calendarFilter, query, specialismFilter, statusFilter, pageSize]);

  const pageRows = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredTrainers.slice(start, start + pageSize);
  }, [filteredTrainers, page, pageSize]);

  const activeTrainerCount = trainers.filter((trainer) => trainer.metrics.status === 'active').length;
  const googleReadyCount = trainers.filter((trainer) => trainer.calendarProvider === 'google').length;
  const supportedEntrepreneurCount = entrepreneurs.filter((entrepreneur) =>
    trainers.some((trainer) => trainerSupportsEntrepreneur(trainer.id, entrepreneur)),
  ).length;
  const trainerLearningAssetCount = trainers.reduce(
    (total, trainer) => total + getTrainerContentItems(trainer.id).length,
    0,
  );
  const pendingTrainerWork = trainers.reduce((total, trainer) => {
    const workload = getTrainerWorkload(trainer, entrepreneurs);
    return total + workload.pendingSessions + workload.pendingDeliverableReviews + workload.changesRequestedFollowUps;
  }, 0);

  const directoryColumns: Column<Trainer>[] = [
    {
      key: 'action',
      header: 'Action',
      cell: (trainer) => (
        <RowActions
          actions={[
            { label: 'View entrepreneurs', onSelect: () => setManageTarget(trainer) },
            { label: 'Edit profile', onSelect: () => setEditTarget(trainer) },
          ]}
        />
      ),
      className: 'w-[84px]',
    },
    {
      key: 'name',
      header: 'Trainer',
      cell: (trainer) => (
        <div className="flex min-w-[220px] items-center gap-3">
          <Avatar
            initials={trainer.initials}
            size={34}
            tone={trainer.accessLevel === 'guest' ? 'amber' : 'brand'}
          />
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => setManageTarget(trainer)}
              className="block max-w-[220px] truncate text-left font-semibold text-ink transition hover:text-bid"
            >
              {trainer.fullName}
            </button>
            <div className="mt-0.5 max-w-[240px] truncate text-sm text-ink-muted">
              {trainer.email}
            </div>
          </div>
        </div>
      ),
    },
    { key: 'role', header: 'Role', cell: (trainer) => trainer.role },
    {
      key: 'specialisms',
      header: 'Specialisms',
      cell: (trainer) => (
        <div className="flex max-w-[260px] flex-wrap gap-1.5">
          {trainer.specialisms.length > 0 ? (
            trainer.specialisms.map((specialism) => (
              <Badge key={specialism} tone={sectorById[specialism]?.color ?? 'neutral'}>
                {sectorById[specialism]?.label ?? specialism}
              </Badge>
            ))
          ) : (
            <span className="text-ink-faint">No specialism set</span>
          )}
        </div>
      ),
    },
    { key: 'reach', header: 'Entrepreneurs', cell: (trainer) => <TrainerPortfolioCell trainer={trainer} entrepreneurs={entrepreneurs} /> },
    { key: 'calendar', header: 'Calendar support', cell: (trainer) => <CalendarStatusBadge provider={trainer.calendarProvider} /> },
    {
      key: 'access',
      header: 'Access level',
      cell: (t) => (
        <Badge tone={t.accessLevel === 'guest' ? 'amber' : 'green'}>
          {t.accessLevel === 'guest' ? 'Guest · temporary' : 'Full access'}
        </Badge>
      ),
    },
    { key: 'status', header: 'Status', cell: (trainer) => <TrainerStatusBadge trainer={trainer} /> },
  ];

  const workloadColumns: Column<Trainer>[] = [
    {
      key: 'trainer',
      header: 'Trainer',
      className: 'min-w-[190px]',
      headerClassName: 'min-w-[190px]',
      cell: (t) => (
        <div className="flex min-w-[170px] items-center gap-3">
          <Avatar initials={t.initials} size={24} />
          <button
            type="button"
            onClick={() => setManageTarget(t)}
            className="max-w-[150px] truncate text-left font-medium text-ink transition hover:text-bid"
            title={t.fullName}
          >
            {t.fullName}
          </button>
        </div>
      ),
    },
    {
      key: 'reach',
      header: 'Entrepreneurs',
      cell: (trainer) => <TrainerPortfolioCell trainer={trainer} entrepreneurs={entrepreneurs} />,
    },
    {
      key: 'sessions',
      header: 'Session queue',
      cell: (trainer) => {
        const workload = getTrainerWorkload(trainer, entrepreneurs);
        return (
          <div className="min-w-[150px] text-sm">
            <div className="font-medium text-ink">{workload.pendingSessions} awaiting response</div>
            <div className="mt-0.5 text-ink-muted">{workload.confirmedSessions} confirmed</div>
          </div>
        );
      },
    },
    {
      key: 'reviews',
      header: 'Deliverable feedback',
      cell: (trainer) => {
        const workload = getTrainerWorkload(trainer, entrepreneurs);
        const totalFeedbackWork = workload.pendingDeliverableReviews + workload.changesRequestedFollowUps;
        return totalFeedbackWork > 0 ? (
          <div className="min-w-[170px] text-sm">
            <div className="font-medium text-ink">
              {workload.pendingDeliverableReviews} pending review
            </div>
            <div className="mt-0.5 text-ink-muted">
              {workload.changesRequestedFollowUps} changes follow-up
            </div>
          </div>
        ) : (
          <Badge tone="green">Clear</Badge>
        );
      },
    },
    {
      key: 'progress',
      header: 'Avg. training progress',
      cell: (trainer) => {
        const workload = getTrainerWorkload(trainer, entrepreneurs);
        return `${workload.averageProgress}%`;
      },
    },
    {
      key: 'next',
      header: 'Next session',
      cell: (trainer) => {
        const workload = getTrainerWorkload(trainer, entrepreneurs);
        if (!workload.nextSession) return <span className="text-ink-faint">No upcoming session</span>;
        return (
          <div className="min-w-[180px] text-sm">
            <div className="font-medium text-ink">{workload.nextSession.topic}</div>
            <div className="mt-0.5 text-ink-muted">
              {formatSessionDate(workload.nextSession.date, workload.nextSession.startTime)}
            </div>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        title="Trainers"
        description="Manage trainer profiles, programme coverage, calendar readiness, and workload"
        actions={<Button onClick={() => setAddOpen(true)}>+ Add trainer</Button>}
      />
      <Notice>
        Trainers see the entrepreneurs, programmes, sessions, and review work connected to the learning assets they support.
      </Notice>
      <MetricGrid className="mb-4">
        <StatCard
          label="Active trainers"
          value={`${activeTrainerCount}/${trainers.length}`}
          subline="Can support programme delivery"
          dotColor="success"
          accent="success"
        />
        <StatCard
          label="Calendar ready"
          value={googleReadyCount}
          subline="Can accept Google Meet sessions"
          dotColor="info"
          accent="info"
        />
        <StatCard
          label="Entrepreneurs covered"
          value={`${supportedEntrepreneurCount}/${entrepreneurs.length}`}
          subline={`${trainerLearningAssetCount} learning assets supported`}
          dotColor="bid"
          accent="bid"
        />
        <StatCard
          label="Open trainer work"
          value={pendingTrainerWork}
          subline="Sessions and feedback needing action"
          dotColor={pendingTrainerWork > 0 ? 'warning' : 'success'}
          accent={pendingTrainerWork > 0 ? 'warning' : 'success'}
        />
      </MetricGrid>
      <Tabs value={activeTab} onChange={setActiveTab} tabs={trainerTabs} />
      <Card>
        <CardHeader
          title={activeTab === 'directory' ? 'Trainer directory' : 'Trainer workload overview'}
          description={`${filteredTrainers.length} trainer${filteredTrainers.length === 1 ? '' : 's'} in this view`}
        />
        <TableToolbar>
          <div>
            <div className="text-sm font-medium text-ink">Filter trainers</div>
            <div className="mt-0.5 text-sm text-ink-muted">
              Search by name, role, specialism, email, or calendar provider.
            </div>
          </div>
          <div className="grid w-full gap-2">
            <TableFilterInput
              icon
              placeholder="Search trainers..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <TableFilterAutocomplete
              value={specialismFilter}
              onValueChange={setSpecialismFilter}
              options={[
                { value: 'all', label: 'All specialisms' },
                ...sectors.map((sector) => ({ value: sector.id, label: sector.label })),
              ]}
              placeholder="All specialisms"
              searchPlaceholder="Search specialisms..."
              emptyMessage="No specialism found."
            />
            <TableFilterSelect value={accessFilter} onChange={(event) => setAccessFilter(event.target.value as typeof accessFilter)}>
              <option value="all">All access</option>
              <option value="full">Full access</option>
              <option value="guest">Guest access</option>
            </TableFilterSelect>
            <TableFilterSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="expires-soon">Expires soon</option>
              <option value="inactive">Inactive</option>
            </TableFilterSelect>
            <TableFilterSelect value={calendarFilter} onChange={(event) => setCalendarFilter(event.target.value as typeof calendarFilter)}>
              <option value="all">All calendars</option>
              <option value="google">Google connected</option>
              <option value="none">No calendar</option>
            </TableFilterSelect>
          </div>
        </TableToolbar>
        <DataTable
          columns={activeTab === 'directory' ? directoryColumns : workloadColumns}
          rows={pageRows}
          rowKey={(t) => t.id}
          emptyMessage="No trainers match these filters."
          tableClassName={activeTab === 'directory' ? 'min-w-[1120px]' : 'min-w-[1080px]'}
        />
        <TablePagination
          page={page}
          pageSize={pageSize}
          totalItems={filteredTrainers.length}
          onPageChange={setPage}
          onPageSizeChange={(next) => {
            setPageSize(next);
            setPage(1);
          }}
        />
      </Card>

      <TrainerModal open={addOpen} onOpenChange={setAddOpen} mode="add" />
      {editTarget && (
        <TrainerModal
          open={!!editTarget}
          onOpenChange={(o) => !o && setEditTarget(null)}
          mode="edit"
          trainer={editTarget}
        />
      )}
      {manageTarget && (
        <Modal
          open={!!manageTarget}
          onOpenChange={(o) => !o && setManageTarget(null)}
          title={`${manageTarget.fullName} - entrepreneurs`}
          width="xl"
        >
          <div className="mb-4 rounded-xl bg-surface-subtle px-4 py-3 text-sm leading-6 text-ink-muted">
            These entrepreneurs are currently in {manageTarget.fullName}'s training portfolio.
          </div>
          <AssignedTable trainer={manageTarget} entrepreneurs={entrepreneurs} />
        </Modal>
      )}
    </>
  );
}

function AssignedTable({ trainer, entrepreneurs }: { trainer: Trainer; entrepreneurs: Entrepreneur[] }) {
  const [query, setQuery] = React.useState('');
  const [programmeFilter, setProgrammeFilter] = React.useState('all');
  const [sectorFilter, setSectorFilter] = React.useState('all');
  const [stageFilter, setStageFilter] = React.useState('all');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(5);
  const assigned = entrepreneurs.filter((entrepreneur) => trainerSupportsEntrepreneur(trainer.id, entrepreneur));
  const trainerProgrammes = getTrainerProgrammes(trainer.id);
  const filteredAssigned = assigned.filter((e) => {
    const needle = query.trim().toLowerCase();
    const programmeNames = getEntrepreneurProgrammes(e, programs)
      .map((programme) => programme.name)
      .join(' ');
    const toolNames = getVisibleToolsForEntrepreneur(e)
      .map((tool) => tool.name)
      .join(' ');
    const matchesQuery = !needle || [e.representative, e.businessName, e.email, e.stage, e.country, programmeNames, toolNames]
      .join(' ')
      .toLowerCase()
      .includes(needle);
    const matchesProgramme = programmeFilter === 'all' || entrepreneurHasProgramme(e, programmeFilter);
    const matchesSector = sectorFilter === 'all' || e.sector === sectorFilter;
    const matchesStage = stageFilter === 'all' || e.stage === stageFilter;
    const matchesStatus = statusFilter === 'all' || e.status === statusFilter;

    return matchesQuery && matchesProgramme && matchesSector && matchesStage && matchesStatus;
  });

  React.useEffect(() => {
    setPage(1);
  }, [programmeFilter, query, sectorFilter, stageFilter, statusFilter, pageSize]);

  const pageRows = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredAssigned.slice(start, start + pageSize);
  }, [filteredAssigned, page, pageSize]);

  return (
    <>
      <TableToolbar className="mb-3">
        <div>
          <div className="text-sm font-medium text-ink">My entrepreneurs</div>
          <div className="mt-0.5 text-sm text-ink-muted">
            Filter this trainer's entrepreneurs by programme, sector, stage, or status.
          </div>
        </div>
        <div className="grid w-full gap-2">
          <TableFilterInput
            icon
            placeholder="Search assignments..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <TableFilterAutocomplete
            value={programmeFilter}
            onValueChange={setProgrammeFilter}
            options={[
              { value: 'all', label: 'All programmes' },
              ...trainerProgrammes.map((programme) => ({ value: programme.id, label: programme.name })),
            ]}
            placeholder="All programmes"
            searchPlaceholder="Search programmes..."
            emptyMessage="No programme found."
          />
          <TableFilterAutocomplete
            value={sectorFilter}
            onValueChange={setSectorFilter}
            options={[
              { value: 'all', label: 'All sectors' },
              ...sectors.map((sector) => ({ value: sector.id, label: sector.label })),
            ]}
            placeholder="All sectors"
            searchPlaceholder="Search sectors..."
            emptyMessage="No sector found."
          />
          <TableFilterAutocomplete
            value={stageFilter}
            onValueChange={setStageFilter}
            options={[
              { value: 'all', label: 'All stages' },
              ...stages.map((stage) => ({ value: stage.id, label: stage.label })),
            ]}
            placeholder="All stages"
            searchPlaceholder="Search stages..."
            emptyMessage="No stage found."
          />
          <TableFilterSelect
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="unassigned">Unassigned</option>
            <option value="inactive">Inactive</option>
          </TableFilterSelect>
        </div>
      </TableToolbar>
      <DataTable
        columns={[
          {
            key: 'name',
            header: 'Entrepreneur',
            cell: (e) => (
              <div className="flex items-center gap-2">
                <Avatar initials={e.initials} size={24} />
                <span>{e.representative}</span>
              </div>
            ),
          },
          { key: 'biz', header: 'Business', cell: (e) => e.businessName },
          {
            key: 'programme',
            header: 'Programmes',
            cell: (e) => (
              <ProgrammeAccessList
                programmes={getEntrepreneurProgrammes(e, programs)}
                maxVisible={2}
                modalTitle={`${e.businessName} programme access`}
                className="max-w-[300px]"
              />
            ),
          },
          {
            key: 'tools',
            header: 'Tools',
            cell: (e) => <EntrepreneurToolAccessList entrepreneur={e} />,
          },
          {
            key: 'sector',
            header: 'Sector',
            cell: (e) => (
              <Badge tone={sectorById[e.sector]?.color ?? 'neutral'}>
                {sectorById[e.sector]?.label ?? e.sector}
              </Badge>
            ),
          },
          {
            key: 'stage',
            header: 'Stage',
            cell: (e) => (
              <Badge tone={stageById[e.stage]?.color ?? 'brand'}>
                {stageById[e.stage]?.label ?? e.stage}
              </Badge>
            ),
          },
          {
            key: 'status',
            header: 'Status',
            cell: (e) => (
              <Badge tone={e.status === 'active' ? 'green' : e.status === 'unassigned' ? 'red' : 'neutral'}>
                {e.status.charAt(0).toUpperCase() + e.status.slice(1)}
              </Badge>
            ),
          },
        ]}
        rows={pageRows}
        rowKey={(e) => e.id}
        emptyMessage="No entrepreneurs match this search."
        tableClassName="min-w-[1220px]"
      />
      <TablePagination
        page={page}
        pageSize={pageSize}
        totalItems={filteredAssigned.length}
        pageSizeOptions={[5, 10, 25]}
        onPageChange={setPage}
        onPageSizeChange={(next) => {
          setPageSize(next);
          setPage(1);
        }}
      />
    </>
  );
}
