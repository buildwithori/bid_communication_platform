"use client";

import * as React from "react";
import { toast } from "sonner";
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
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={trainer ? `${trainer.name} – profile` : "Trainer profile"} width="xl">
      {isLoading ? (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : error || !trainer ? (
        <Notice>Trainer profile could not be loaded. {error?.message}</Notice>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label="Entrepreneurs" value={trainer.portfolio.inferredEntrepreneurs} subline="Inferred from supported content" dotColor="bid" accent="bid" />
            <StatCard label="Learning assets" value={trainer.portfolio.contentItems} subline="Supported content" dotColor="info" accent="info" />
            <StatCard label="Average progress" value={`${trainer.portfolio.averageLearnerProgress}%`} subline="Across supported learners" dotColor="success" accent="success" />
          </div>
          <div className="rounded-xl border border-line p-4">
            <div className="font-semibold text-ink">Programme coverage</div>
            <div className="mt-3 space-y-2">
              {trainer.portfolio.programmes.length ? trainer.portfolio.programmes.map((programme) => (
                <div key={programme.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-subtle px-3 py-2">
                  <span className="font-medium text-ink">{programme.name}</span>
                  <Badge tone={programme.accessType === "free" ? "green" : "blue"}>
                    {programme.accessType === "free" ? "Free access" : "Assigned"}
                  </Badge>
                </div>
              )) : <span className="text-sm text-ink-muted">No programme coverage yet.</span>}
            </div>
          </div>
        </div>
      )}
    </Modal>
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
