"use client";

import * as React from "react";
import { toast } from "sonner";
import { BookOpenCheck, CalendarDays, GraduationCap, Mail, Phone, Star, UsersRound } from "lucide-react";
import { PageHeader, Notice } from "@/components/shared/PageHeader";
import { Card, CardHeader, Skeleton } from "@/components/shared/Card";
import { MetricGrid } from "@/components/shared/MetricGrid";
import { StatCard } from "@/components/shared/StatCard";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { Avatar } from "@/components/shared/Avatar";
import {
  DataTable,
  RowActions,
  TableFilterAutocomplete,
  TableFilterInput,
  TableFilterSelect,
  TablePagination,
  TableToolbar,
  type Column,
} from "@/components/shared/DataTable";
import { Tabs } from "@/components/shared/Tabs";
import { Modal } from "@/components/shared/Modal";
import { TrainerModal } from "@/components/admin/TrainerModal";
import {
  useInviteTrainerMutation,
  useResendTrainerInvitationMutation,
  useTrainerDetailQuery,
  useTrainersPage,
  useUpdateTrainerMutation,
  useUpdateTrainerStatusMutation,
  type TrainerAccessLevel,
  type TrainerCalendarFilter,
  type TrainerDirectoryStatus,
  type TrainerRecord,
  type TrainerRoleLabel,
} from "@/lib/api/trainers";
import { useLazySectorsQuery } from "@/lib/api/settings";
import type { TrainerForm } from "@/lib/forms/schemas";

type TrainerTab = "directory" | "workload";
type AllOr<T extends string> = "all" | T;

const trainerTabs: Array<{ value: TrainerTab; label: string }> = [
  { value: "directory", label: "Trainer directory" },
  { value: "workload", label: "Workload overview" },
];

const roleLabels: Record<TrainerRoleLabel, string> = {
  mentor: "Mentor",
  trainer: "Trainer",
  guest_expert: "Guest Expert",
  investment_analyst: "Investment Analyst",
};

function initials(trainer: TrainerRecord) {
  return [trainer.firstName, trainer.lastName]
    .filter(Boolean)
    .map((part) => part?.[0]?.toUpperCase())
    .join("")
    .slice(0, 2) || trainer.email.slice(0, 2).toUpperCase();
}

function CalendarBadge({ connected }: { connected: boolean }) {
  return connected ? (
    <Badge tone="green">Google Calendar connected</Badge>
  ) : (
    <Badge tone="amber">Google Calendar not connected</Badge>
  );
}

function StatusBadge({ trainer }: { trainer: TrainerRecord }) {
  if (trainer.directoryStatus === "invited") {
    return <Badge tone="amber">Invitation pending</Badge>;
  }
  if (trainer.directoryStatus === "inactive") {
    return <Badge tone="neutral">Inactive</Badge>;
  }
  if (
    trainer.accessLevel === "guest" &&
    trainer.accessExpiresOn
  ) {
    return (
      <Badge tone="amber">
        Expires {new Date(trainer.accessExpiresOn).toLocaleDateString()}
      </Badge>
    );
  }
  return <Badge tone="green">Active</Badge>;
}

function PortfolioCell({ trainer }: { trainer: TrainerRecord }) {
  return (
    <div className="min-w-[160px] text-sm">
      <div className="font-medium text-ink">
        {trainer.portfolio.inferredEntrepreneurs} entrepreneur
        {trainer.portfolio.inferredEntrepreneurs === 1 ? "" : "s"}
      </div>
      <div className="mt-0.5 text-ink-muted">
        {trainer.portfolio.contentItems} learning asset
        {trainer.portfolio.contentItems === 1 ? "" : "s"}
      </div>
    </div>
  );
}

export default function AdminTrainersPage() {
  const [activeTab, setActiveTab] = React.useState<TrainerTab>("directory");
  const [addOpen, setAddOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<TrainerRecord | null>(null);
  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const deferredSearch = React.useDeferredValue(search);
  const [access, setAccess] = React.useState<AllOr<TrainerAccessLevel>>("all");
  const [status, setStatus] = React.useState<AllOr<TrainerDirectoryStatus>>("all");
  const [calendar, setCalendar] = React.useState<AllOr<TrainerCalendarFilter>>("all");
  const [sectorId, setSectorId] = React.useState("all");
  const [sectorOpen, setSectorOpen] = React.useState(false);
  const [sectorSearch, setSectorSearch] = React.useState("");
  const deferredSectorSearch = React.useDeferredValue(sectorSearch);
  const [pageSize, setPageSize] = React.useState(10);

  const trainers = useTrainersPage({
    search: deferredSearch.trim() || undefined,
    accessLevel: access === "all" ? undefined : access,
    status: status === "all" ? undefined : status,
    calendarStatus: calendar === "all" ? undefined : calendar,
    sectorId: sectorId === "all" ? undefined : sectorId,
    take: pageSize,
  });
  const sectors = useLazySectorsQuery({
    enabled: sectorOpen,
    search: deferredSectorSearch.trim() || undefined,
    active: true,
    take: 20,
  });
  const detail = useTrainerDetailQuery(detailId);

  const resetPagination = trainers.resetPagination;

  React.useEffect(() => {
    resetPagination();
  }, [
    access,
    calendar,
    deferredSearch,
    pageSize,
    sectorId,
    status,
    resetPagination,
  ]);

  const invite = useInviteTrainerMutation({
    onSuccess: () => {
      toast.success("Trainer invitation sent");
      setAddOpen(false);
    },
    onError: (error) => toast.error(error.message),
  });
  const update = useUpdateTrainerMutation({
    onSuccess: () => {
      toast.success("Trainer updated");
      setEditTarget(null);
    },
    onError: (error) => toast.error(error.message),
  });
  const updateStatus = useUpdateTrainerStatusMutation({
    onSuccess: (trainer) =>
      toast.success(
        trainer.directoryStatus === "active"
          ? "Trainer activated"
          : "Trainer deactivated",
      ),
    onError: (error) => toast.error(error.message),
  });
  const resend = useResendTrainerInvitationMutation({
    onSuccess: () => toast.success("Trainer invitation resent"),
    onError: (error) => toast.error(error.message),
  });

  const submitInvite = (values: TrainerForm) => {
    invite.mutate({
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      roleLabel: values.roleLabel,
      accessLevel: values.accessLevel,
      accessExpiresOn:
        values.accessLevel === "guest" ? values.accessExpiresOn : undefined,
      sectorIds: values.sectorIds,
    });
  };

  const submitEdit = (values: TrainerForm) => {
    if (!editTarget) return;
    update.mutate({
      id: editTarget.trainerUserId,
      payload: {
        firstName: values.firstName,
        lastName: values.lastName,
        phone: editTarget.phone ?? undefined,
        roleLabel: values.roleLabel,
        accessLevel: values.accessLevel,
        accessExpiresOn:
          values.accessLevel === "guest" ? values.accessExpiresOn : undefined,
        sectorIds: values.sectorIds,
      },
    });
  };

  const actionsFor = (trainer: TrainerRecord) => {
    const actions: Parameters<typeof RowActions>[0]["actions"] = [
      { label: "View profile", onSelect: () => setDetailId(trainer.trainerUserId) },
      { label: "Edit profile", onSelect: () => setEditTarget(trainer) },
    ];
    if (trainer.directoryStatus === "invited") {
      actions.push({
        label: "Resend invitation",
        onSelect: () => resend.mutate(trainer.trainerUserId),
        disabled: resend.isPending,
      });
    } else {
      actions.push("separator", {
        label: trainer.directoryStatus === "inactive" ? "Activate trainer" : "Deactivate trainer",
        onSelect: () =>
          updateStatus.mutate({
            id: trainer.trainerUserId,
            status: trainer.directoryStatus === "inactive" ? "active" : "inactive",
          }),
        disabled: updateStatus.isPending,
        destructive: trainer.directoryStatus !== "inactive",
      });
    }
    return actions;
  };

  const directoryColumns: Column<TrainerRecord>[] = [
    {
      key: "action",
      header: "Action",
      className: "w-[84px]",
      cell: (trainer) => <RowActions actions={actionsFor(trainer)} />,
    },
    {
      key: "trainer",
      header: "Trainer",
      cell: (trainer) => (
        <div className="flex min-w-[220px] items-center gap-3">
          <Avatar
            initials={initials(trainer)}
            size={34}
            tone={trainer.accessLevel === "guest" ? "amber" : "brand"}
          />
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => setDetailId(trainer.trainerUserId)}
              className="block max-w-[220px] truncate text-left font-semibold text-ink hover:text-bid"
            >
              {trainer.name}
            </button>
            <div className="mt-0.5 max-w-[240px] truncate text-sm text-ink-muted">
              {trainer.email}
            </div>
          </div>
        </div>
      ),
    },
    { key: "role", header: "Role", cell: (trainer) => roleLabels[trainer.roleLabel] },
    {
      key: "specialisms",
      header: "Specialisms",
      cell: (trainer) => (
        <div className="flex max-w-[280px] flex-wrap gap-1.5">
          {trainer.specialisms.length ? (
            trainer.specialisms.map((sector) => (
              <Badge key={sector.id} tone="blue">{sector.name}</Badge>
            ))
          ) : (
            <span className="text-ink-faint">No specialism set</span>
          )}
        </div>
      ),
    },
    { key: "portfolio", header: "Portfolio", cell: (trainer) => <PortfolioCell trainer={trainer} /> },
    { key: "calendar", header: "Calendar", cell: (trainer) => <CalendarBadge connected={trainer.calendar.connected} /> },
    {
      key: "access",
      header: "Access",
      cell: (trainer) => (
        <Badge tone={trainer.accessLevel === "guest" ? "amber" : "green"}>
          {trainer.accessLevel === "guest" ? "Guest · temporary" : "Full access"}
        </Badge>
      ),
    },
    { key: "status", header: "Status", cell: (trainer) => <StatusBadge trainer={trainer} /> },
  ];

  const workloadColumns: Column<TrainerRecord>[] = [
    directoryColumns[1],
    { key: "portfolio", header: "Coverage", cell: (trainer) => <PortfolioCell trainer={trainer} /> },
    {
      key: "programmes",
      header: "Programmes",
      cell: (trainer) => (
        <div className="min-w-[180px] text-sm">
          <div className="font-medium text-ink">{trainer.portfolio.programmes.length} programme{trainer.portfolio.programmes.length === 1 ? "" : "s"}</div>
          <div className="mt-0.5 text-ink-muted">{trainer.portfolio.contentItems} supported assets</div>
        </div>
      ),
    },
    {
      key: "progress",
      header: "Avg. learner progress",
      cell: (trainer) => `${trainer.portfolio.averageLearnerProgress}%`,
    },
    {
      key: "rating",
      header: "Rating",
      cell: (trainer) =>
        trainer.ratings.average == null ? (
          <span className="text-ink-faint">No ratings</span>
        ) : (
          <div>
            <span className="font-medium">{trainer.ratings.average.toFixed(1)}/5</span>
            <span className="ml-1 text-ink-muted">({trainer.ratings.count})</span>
          </div>
        ),
    },
    { key: "calendar", header: "Calendar", cell: (trainer) => <CalendarBadge connected={trainer.calendar.connected} /> },
  ];

  const sectorOptions = [
    { value: "all", label: "All specialisms" },
    ...(sectors.data?.pages.flatMap((page) => page.items) ?? []).map((sector) => ({
      value: sector.id,
      label: sector.name,
    })),
  ];

  if (trainers.isLoading && !trainers.data) {
    return <TrainersSkeleton />;
  }

  return (
    <>
      <PageHeader
        title="Trainers"
        description="Manage trainer profiles, programme coverage, calendar readiness, and workload"
        actions={<Button onClick={() => setAddOpen(true)}>+ Invite trainer</Button>}
      />
      <Notice>
        Trainers see the entrepreneurs, programmes, sessions, and review work connected to the learning assets they support.
      </Notice>
      <MetricGrid className="mb-4">
        <StatCard label="Total trainers" value={trainers.summary.totalTrainers} subline="Across every status" dotColor="bid" accent="bid" />
        <StatCard label="Active trainers" value={trainers.summary.activeTrainers} subline="Can support delivery" dotColor="success" accent="success" />
        <StatCard label="Pending invites" value={trainers.summary.pendingInvites} subline="Awaiting activation" dotColor="warning" accent="warning" />
        <StatCard label="Calendar ready" value={trainers.summary.calendarReady} subline="Google Calendar connected" dotColor="info" accent="info" />
      </MetricGrid>
      <Tabs value={activeTab} onChange={setActiveTab} tabs={trainerTabs} />
      <Card>
        <CardHeader
          title={activeTab === "directory" ? "Trainer directory" : "Trainer workload overview"}
          description={`${trainers.totalItems} trainer${trainers.totalItems === 1 ? "" : "s"} in this view`}
        />
        <TableToolbar>
          <div>
            <div className="text-sm font-medium text-ink">Filter trainers</div>
            <div className="mt-0.5 text-sm text-ink-muted">
              Search and filter against the full trainer directory.
            </div>
          </div>
          <div className="grid w-full gap-2">
            <TableFilterInput icon placeholder="Search trainers..." value={search} onChange={(event) => setSearch(event.target.value)} />
            <TableFilterAutocomplete
              value={sectorId}
              onValueChange={setSectorId}
              options={sectorOptions}
              placeholder="All specialisms"
              searchPlaceholder="Search specialisms..."
              emptyMessage="No active specialism found."
              isLoading={sectors.isFetching}
              onOpenChange={setSectorOpen}
              onSearchChange={setSectorSearch}
              hasMore={Boolean(sectors.hasNextPage)}
              onLoadMore={() => void sectors.fetchNextPage()}
            />
            <TableFilterSelect value={access} onChange={(event) => setAccess(event.target.value as typeof access)}>
              <option value="all">All access</option>
              <option value="full">Full access</option>
              <option value="guest">Guest access</option>
            </TableFilterSelect>
            <TableFilterSelect value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="invited">Invited</option>
              <option value="inactive">Inactive</option>
            </TableFilterSelect>
            <TableFilterSelect value={calendar} onChange={(event) => setCalendar(event.target.value as typeof calendar)}>
              <option value="all">All calendars</option>
              <option value="connected">Google connected</option>
              <option value="not_connected">Not connected</option>
            </TableFilterSelect>
          </div>
        </TableToolbar>
        {trainers.isError ? (
          <Notice>
            Trainers could not be loaded. {trainers.error.message}
            <Button className="ml-3" variant="outline" onClick={() => void trainers.refetch()}>
              Try again
            </Button>
          </Notice>
        ) : (
          <>
            <DataTable
              columns={activeTab === "directory" ? directoryColumns : workloadColumns}
              rows={trainers.rows}
              rowKey={(trainer) => trainer.trainerUserId}
              emptyMessage="No trainers match these filters."
              tableClassName={activeTab === "directory" ? "min-w-[1120px]" : "min-w-[980px]"}
            />
            <TablePagination
              page={trainers.page}
              pageSize={pageSize}
              totalItems={trainers.totalItems}
              onPageChange={trainers.setPage}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </Card>

      <TrainerModal
        open={addOpen}
        onOpenChange={setAddOpen}
        mode="add"
        isPending={invite.isPending}
        onSubmit={submitInvite}
      />
      {editTarget ? (
        <TrainerModal
          open
          onOpenChange={(open) => !open && setEditTarget(null)}
          mode="edit"
          trainer={editTarget}
          isPending={update.isPending}
          onSubmit={submitEdit}
        />
      ) : null}
      <TrainerDetailModal
        key={detailId ?? "closed"}
        open={Boolean(detailId)}
        onOpenChange={(open) => !open && setDetailId(null)}
        trainer={detail.data}
        isLoading={detail.isLoading}
        error={detail.error}
      />
    </>
  );
}

function TrainerDetailModal({
  open,
  onOpenChange,
  trainer,
  isLoading,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trainer?: TrainerRecord;
  isLoading: boolean;
  error: Error | null;
}) {
  const [showAllProgrammes, setShowAllProgrammes] = React.useState(false);
  const programmes = trainer?.portfolio.programmes ?? [];
  const visibleProgrammes = showAllProgrammes ? programmes : programmes.slice(0, 3);
  const hiddenProgrammeCount = Math.max(programmes.length - visibleProgrammes.length, 0);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Trainer profile"
      width="xl"
    >
      {isLoading ? (
        <TrainerProfileSkeleton />
      ) : error || !trainer ? (
        <Notice>Trainer profile could not be loaded. {error?.message}</Notice>
      ) : (
        <div className="space-y-5">
          <section className="overflow-hidden rounded-2xl border border-bid/15 bg-gradient-to-br from-bid-light via-white to-info-light/40">
            <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
              <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
                <Avatar
                  initials={initials(trainer)}
                  size={76}
                  tone={trainer.accessLevel === "guest" ? "amber" : "brand"}
                  className="ring-4 ring-white shadow-sm"
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-2xl font-semibold tracking-[-0.02em] text-ink">
                      {trainer.name}
                    </h2>
                    <StatusBadge trainer={trainer} />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-muted">
                    <a
                      href={`mailto:${trainer.email}`}
                      className="inline-flex min-w-0 items-center gap-2 transition hover:text-bid"
                    >
                      <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span className="truncate">{trainer.email}</span>
                    </a>
                    {trainer.phone ? (
                      <a
                        href={`tel:${trainer.phone}`}
                        className="inline-flex items-center gap-2 transition hover:text-bid"
                      >
                        <Phone className="h-4 w-4" aria-hidden="true" />
                        {trainer.phone}
                      </a>
                    ) : null}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge tone="brand">{roleLabels[trainer.roleLabel]}</Badge>
                    <Badge tone={trainer.accessLevel === "guest" ? "amber" : "green"}>
                      {trainer.accessLevel === "guest" ? "Guest access" : "Full access"}
                    </Badge>
                    {trainer.accessLevel === "guest" && trainer.accessExpiresOn ? (
                      <Badge tone="neutral">
                        Access ends {new Date(trainer.accessExpiresOn).toLocaleDateString()}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/80 bg-white/85 p-4 shadow-sm backdrop-blur-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-faint">
                  Session readiness
                </div>
                <div className="mt-3 flex items-start gap-3">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                      trainer.calendar.connected
                        ? "bg-success-light text-success-dark"
                        : "bg-warning-light text-warning-dark"
                    }`}
                  >
                    <CalendarDays className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <div className="font-semibold text-ink">
                      {trainer.calendar.connected
                        ? "Calendar connected"
                        : "Calendar action needed"}
                    </div>
                    <p className="mt-1 text-sm leading-5 text-ink-muted">
                      {trainer.calendar.connected
                        ? trainer.calendar.accountEmail ?? "Ready for Google Meet sessions"
                        : "The trainer must connect Google Calendar before accepting sessions."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ProfileMetric
              icon={<UsersRound className="h-5 w-5" />}
              label="Entrepreneurs"
              value={trainer.portfolio.inferredEntrepreneurs}
              detail="Reached through owned content"
              tone="brand"
            />
            <ProfileMetric
              icon={<BookOpenCheck className="h-5 w-5" />}
              label="Learning assets"
              value={trainer.portfolio.contentItems}
              detail="Supported content items"
              tone="blue"
            />
            <ProfileMetric
              icon={<GraduationCap className="h-5 w-5" />}
              label="Learner progress"
              value={`${trainer.portfolio.averageLearnerProgress}%`}
              detail="Average across learners"
              tone="green"
            />
            <ProfileMetric
              icon={<Star className="h-5 w-5" />}
              label="Trainer rating"
              value={
                trainer.ratings.average == null
                  ? "—"
                  : `${trainer.ratings.average.toFixed(1)}/5`
              }
              detail={
                trainer.ratings.count
                  ? `${trainer.ratings.count} rating${trainer.ratings.count === 1 ? "" : "s"}`
                  : "No ratings yet"
              }
              tone="amber"
            />
          </section>

          <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
            <section className="rounded-xl border border-line bg-surface-panel p-4">
              <h3 className="font-semibold text-ink">Specialisms</h3>
              <p className="mt-1 text-sm leading-5 text-ink-muted">
                Sectors this trainer is equipped to support.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {trainer.specialisms.length ? (
                  trainer.specialisms.map((specialism) => (
                    <Badge key={specialism.id} tone="blue">
                      {specialism.name}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-ink-faint">
                    No specialisms assigned.
                  </span>
                )}
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-black/[0.08] bg-surface-panel shadow-[0_12px_32px_rgba(26,26,26,0.04)]">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line bg-gradient-to-r from-bid-light/70 via-surface-panel to-info-light/30 px-4 py-4">
                <div>
                  <h3 className="font-semibold text-ink">Programme coverage</h3>
                  <p className="mt-1 text-sm leading-5 text-ink-muted">
                    Access derived from this trainer&apos;s content ownership.
                  </p>
                </div>
                <Badge tone="brand">
                  {programmes.length} programme{programmes.length === 1 ? "" : "s"}
                </Badge>
              </div>

              {programmes.length ? (
                <>
                  <div
                    className={`space-y-2.5 p-3 ${
                      showAllProgrammes
                        ? "max-h-[320px] overflow-y-auto overscroll-contain"
                        : ""
                    }`}
                  >
                    {visibleProgrammes.map((programme) => (
                      <div
                        key={programme.id}
                        className="group relative flex flex-col gap-3 overflow-hidden rounded-xl border border-black/[0.08] bg-surface-panel px-4 py-3.5 shadow-[0_6px_18px_rgba(26,26,26,0.035)] transition hover:border-bid/25 hover:shadow-[0_10px_24px_rgba(123,29,75,0.08)] sm:flex-row sm:items-center sm:justify-between"
                      >
                        <span
                          className="absolute inset-y-0 left-0 w-1 bg-bid opacity-75"
                          aria-hidden="true"
                        />
                        <div className="flex min-w-0 items-start gap-3 pl-1">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-bid-light text-bid-dark">
                            <BookOpenCheck className="h-4.5 w-4.5" aria-hidden="true" />
                          </span>
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-ink">
                              {programme.name}
                            </div>
                            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-muted">
                              <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                              <span>
                                {new Date(programme.startDate).toLocaleDateString()} –{" "}
                                {new Date(programme.endDate).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Badge
                          tone={programme.accessType === "free" ? "green" : "brand"}
                          className="ml-12 w-fit shrink-0 sm:ml-0"
                        >
                          {programme.accessType === "free" ? "Free access" : "Assigned"}
                        </Badge>
                      </div>
                    ))}
                  </div>

                  {programmes.length > 3 ? (
                    <div className="flex items-center justify-between gap-3 border-t border-line bg-surface-subtle/60 px-4 py-3">
                      <span className="text-xs text-ink-muted">
                        {showAllProgrammes
                          ? `Showing all ${programmes.length} programmes`
                          : `${hiddenProgrammeCount} more programme${hiddenProgrammeCount === 1 ? "" : "s"}`}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAllProgrammes((current) => !current)}
                      >
                        {showAllProgrammes ? "Show less" : "View all"}
                      </Button>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="m-3 rounded-xl border border-dashed border-line bg-surface-subtle/50 px-4 py-8 text-center text-sm text-ink-muted">
                  No programme coverage yet.
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </Modal>
  );
}

function ProfileMetric({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  detail: string;
  tone: "brand" | "blue" | "green" | "amber";
}) {
  const tones = {
    brand: "bg-bid-light text-bid-dark",
    blue: "bg-info-light text-info-dark",
    green: "bg-success-light text-success-dark",
    amber: "bg-warning-light text-warning-dark",
  };

  return (
    <div className="rounded-xl border border-black/[0.08] bg-white p-4 shadow-[0_10px_28px_rgba(26,26,26,0.04)]">
      <div className="flex items-center justify-between gap-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${tones[tone]}`}>
          {icon}
        </span>
        <span className="text-2xl font-semibold tracking-[-0.02em] text-ink">
          {value}
        </span>
      </div>
      <div className="mt-4 text-sm font-semibold text-ink">{label}</div>
      <div className="mt-1 text-xs leading-5 text-ink-muted">{detail}</div>
    </div>
  );
}

function TrainerProfileSkeleton() {
  return (
    <div className="space-y-5" aria-label="Loading trainer profile" aria-busy="true">
      <Skeleton className="h-44 w-full rounded-2xl" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-32 w-full" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  );
}

function TrainersSkeleton() {
  return (
    <div aria-label="Loading trainers" aria-busy="true">
      <Skeleton className="h-16 w-full" />
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-28 w-full" />)}
      </div>
      <Skeleton className="mt-4 h-[440px] w-full" />
    </div>
  );
}
