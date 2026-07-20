"use client";

import { useDebouncedValue } from '@/lib/search';
import * as React from "react";
import { toast } from "sonner";
import { Mail, MapPin, Phone } from "lucide-react";
import { EntrepreneurFormModal } from "@/components/admin/entrepreneurs/EntrepreneurFormModal";
import { Avatar } from "@/components/shared/Avatar";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { Card, CardHeader, Skeleton } from "@/components/shared/Card";
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
import { MetricGrid } from "@/components/shared/MetricGrid";
import { Modal } from "@/components/shared/Modal";
import { Notice, PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import {
  useEffectiveToolsQuery,
  useEntrepreneurDetailQuery,
  useEntrepreneursPage,
  useGrantProgrammeAccessMutation,
  useGrantToolAccessMutation,
  useHideToolAccessMutation,
  useInviteEntrepreneurMutation,
  useLazyGrantableProgrammesQuery,
  useProgrammeAccessQuery,
  useResendEntrepreneurInvitationMutation,
  useRestoreToolAccessMutation,
  useRevokeProgrammeAccessMutation,
  useRevokeToolAccessMutation,
  useUpdateEntrepreneurMutation,
  useUpdateEntrepreneurStatusMutation,
  type EffectiveToolAccess,
  type EntrepreneurRecord,
  type EntrepreneurSource,
  type EntrepreneurStatus,
} from "@/lib/api/entrepreneurs";
import {
  useLazyBusinessStagesQuery,
  useLazySectorsQuery,
} from "@/lib/api/settings";
import type { EntrepreneurProfileForm } from "@/lib/forms/schemas";

type AllOr<T extends string> = "all" | T;

function initials(record: EntrepreneurRecord) {
  return (
    [record.firstName, record.lastName]
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase())
      .join("")
      .slice(0, 2) || record.email.slice(0, 2).toUpperCase()
  );
}

function StatusBadge({ record }: { record: EntrepreneurRecord }) {
  if (record.userStatus === "pending")
    return <Badge tone="amber">Invitation pending</Badge>;
  if (record.status === "active") return <Badge tone="green">Active</Badge>;
  if (record.status === "archived")
    return <Badge tone="neutral">Archived</Badge>;
  return <Badge tone="amber">Inactive</Badge>;
}

export default function AdminEntrepreneursPage() {
  const [addOpen, setAddOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<EntrepreneurRecord>();
  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [programmeId, setProgrammeId] = React.useState<string | null>(null);
  const [toolId, setToolId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const timeout = window.setTimeout(() => {
      setDetailId(params.get("entrepreneur"));
      setProgrammeId(params.get("programme"));
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<AllOr<EntrepreneurStatus>>("all");
  const [source, setSource] = React.useState<AllOr<EntrepreneurSource>>("all");
  const [sectorId, setSectorId] = React.useState("all");
  const [stageId, setStageId] = React.useState("all");
  const [sectorLookup, setSectorLookup] = React.useState({
    open: false,
    search: "",
  });
  const [stageLookup, setStageLookup] = React.useState({
    open: false,
    search: "",
  });
  const [pageSize, setPageSize] = React.useState(10);
  const debouncedSearch = useDebouncedValue(search);
  const directory = useEntrepreneursPage({
    search: debouncedSearch.trim() || undefined,
    status: status === "all" ? undefined : status,
    source: source === "all" ? undefined : source,
    sectorId: sectorId === "all" ? undefined : sectorId,
    stageId: stageId === "all" ? undefined : stageId,
    take: pageSize,
  });
  const sectors = useLazySectorsQuery({
    enabled: sectorLookup.open,
    search: sectorLookup.search || undefined,
    active: true,
    take: 20,
  });
  const stages = useLazyBusinessStagesQuery({
    enabled: stageLookup.open,
    search: stageLookup.search || undefined,
    active: true,
    take: 20,
  });
  const detail = useEntrepreneurDetailQuery(detailId);
  const resetPagination = directory.resetPagination;

  React.useEffect(
    () => resetPagination(),
    [
      debouncedSearch,
      pageSize,
      resetPagination,
      sectorId,
      source,
      stageId,
      status,
    ],
  );

  const invite = useInviteEntrepreneurMutation({
    onSuccess: () => {
      toast.success("Entrepreneur invitation sent");
      setAddOpen(false);
    },
    onError: (error) => toast.error(error.message),
  });
  const update = useUpdateEntrepreneurMutation({
    onSuccess: () => {
      toast.success("Entrepreneur updated");
      setEditTarget(undefined);
    },
    onError: (error) => toast.error(error.message),
  });
  const updateStatus = useUpdateEntrepreneurStatusMutation({
    onSuccess: (record) =>
      toast.success(
        record.status === "active"
          ? "Entrepreneur activated"
          : "Entrepreneur deactivated",
      ),
    onError: (error) => toast.error(error.message),
  });
  const resend = useResendEntrepreneurInvitationMutation({
    onSuccess: () => toast.success("Invitation resent"),
    onError: (error) => toast.error(error.message),
  });

  const submitInvite = (values: EntrepreneurProfileForm) =>
    invite.mutate({
      ...profilePayload(values),
      email: values.email,
      programmeIds: values.programmeIds,
    });
  const submitEdit = (values: EntrepreneurProfileForm) =>
    editTarget &&
    update.mutate({
      id: editTarget.entrepreneurUserId,
      payload: profilePayload(values),
    });
  const actionsFor = (
    record: EntrepreneurRecord,
  ): Parameters<typeof RowActions>[0]["actions"] => {
    const actions: Parameters<typeof RowActions>[0]["actions"] = [
      {
        label: "View profile",
        onSelect: () => setDetailId(record.entrepreneurUserId),
      },
      { label: "Edit profile", onSelect: () => setEditTarget(record) },
      {
        label: "Manage programmes",
        onSelect: () => setProgrammeId(record.entrepreneurUserId),
      },
      {
        label: "Manage tool access",
        onSelect: () => setToolId(record.entrepreneurUserId),
      },
    ];
    if (record.userStatus === "pending")
      actions.push("separator", {
        label: "Resend invitation",
        onSelect: () => resend.mutate(record.entrepreneurUserId),
        disabled: resend.isPending,
      });
    else
      actions.push("separator", {
        label:
          record.status === "active"
            ? "Deactivate entrepreneur"
            : "Activate entrepreneur",
        onSelect: () =>
          updateStatus.mutate({
            id: record.entrepreneurUserId,
            status: record.status === "active" ? "inactive" : "active",
          }),
        disabled: updateStatus.isPending,
        destructive: record.status === "active",
      });
    return actions;
  };

  const columns: Column<EntrepreneurRecord>[] = [
    {
      key: "action",
      header: "Action",
      className: "w-[84px]",
      cell: (record) => <RowActions actions={actionsFor(record)} />,
    },
    {
      key: "business",
      header: "Business",
      cell: (record) => (
        <button
          type="button"
          onClick={() => setDetailId(record.entrepreneurUserId)}
          className="min-w-[180px] text-left font-semibold text-ink hover:text-bid"
        >
          {record.businessName}
          <span className="mt-0.5 block font-normal text-ink-muted">
            {record.email}
          </span>
        </button>
      ),
    },
    {
      key: "representative",
      header: "Representative",
      cell: (record) => record.representativeName,
    },
    {
      key: "sector",
      header: "Sector",
      cell: (record) =>
        record.sector ? (
          <Badge tone="blue">{record.sector.name}</Badge>
        ) : (
          <span className="text-ink-faint">Not set</span>
        ),
    },
    { key: "country", header: "Country", cell: (record) => record.country },
    {
      key: "stage",
      header: "Stage",
      cell: (record) =>
        record.stage ? (
          <Badge tone="neutral">{record.stage.name}</Badge>
        ) : (
          <span className="text-ink-faint">Not set</span>
        ),
    },
    {
      key: "programmes",
      header: "Programme access",
      cell: (record) => (
        <button
          type="button"
          onClick={() => setProgrammeId(record.entrepreneurUserId)}
          className="min-w-[190px] text-left"
        >
          <span className="font-medium text-ink">
            {record.programmeAccess.assignedProgrammeCount} assigned
          </span>
          <span className="mt-0.5 block text-ink-muted">
            {record.programmeAccess.assignedProgrammes
              .slice(0, 2)
              .map((item) => item.name)
              .join(" · ") || "Free resources only"}
          </span>
        </button>
      ),
    },
    {
      key: "tools",
      header: "Tool access",
      cell: (record) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setToolId(record.entrepreneurUserId)}
        >
          Manage tools
        </Button>
      ),
    },
    {
      key: "source",
      header: "Source",
      cell: (record) => (
        <Badge tone={record.source === "admin_invited" ? "brand" : "neutral"}>
          {record.source === "admin_invited"
            ? "Admin-invited"
            : "Self-registered"}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (record) => <StatusBadge record={record} />,
    },
  ];

  if (directory.isLoading && !directory.data) return <EntrepreneursSkeleton />;
  const sectorOptions = [
    { value: "all", label: "All sectors" },
    ...(sectors.data?.pages.flatMap((page) => page.items) ?? []).map(
      (item) => ({ value: item.id, label: item.name }),
    ),
  ];
  const stageOptions = [
    { value: "all", label: "All stages" },
    ...(stages.data?.pages.flatMap((page) => page.items) ?? []).map((item) => ({
      value: item.id,
      label: item.name,
      description: item.definition,
    })),
  ];

  return (
    <>
      <PageHeader
        title="Entrepreneurs"
        description="Manage entrepreneur profiles, business details, programme access, and invitations"
        actions={
          <Button onClick={() => setAddOpen(true)}>
            + Invite entrepreneur
          </Button>
        }
      />
      <Notice>
        Self-registered entrepreneurs start with free resources. Grant published
        assigned programmes when they are ready to join structured delivery.
      </Notice>
      <MetricGrid className="mb-4">
        <StatCard
          label="Total entrepreneurs"
          value={directory.summary.totalEntrepreneurs}
          accent="bid"
          dotColor="bid"
        />
        <StatCard
          label="Active"
          value={directory.summary.activeEntrepreneurs}
          accent="success"
          dotColor="success"
        />
        <StatCard
          label="Unassigned"
          value={directory.summary.unassignedEntrepreneurs}
          accent="warning"
          dotColor="warning"
        />
        <StatCard
          label="With programmes"
          value={directory.summary.withProgrammes}
          accent="info"
          dotColor="info"
        />
      </MetricGrid>
      <Card>
        <CardHeader
          title="Entrepreneur directory"
          description={`${directory.totalItems} entrepreneur${directory.totalItems === 1 ? "" : "s"} in this view`}
        />
        <TableToolbar>
          <div>
            <div className="text-sm font-medium text-ink">
              Filter entrepreneurs
            </div>
            <div className="mt-0.5 text-sm text-ink-muted">
              Search and filter against the full directory.
            </div>
          </div>
          <div className="grid w-full gap-2">
            <TableFilterInput
              icon
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search business, representative, email, phone, or country..."
            />
            <TableFilterAutocomplete
              value={sectorId}
              onValueChange={setSectorId}
              options={sectorOptions}
              placeholder="All sectors"
              searchPlaceholder="Search sectors..."
              emptyMessage="No active sector found."
              isLoading={sectors.isFetching}
              onOpenChange={(open) =>
                setSectorLookup((state) => ({ ...state, open }))
              }
              onSearchChange={(search) =>
                setSectorLookup((state) => ({ ...state, search }))
              }
              hasMore={Boolean(sectors.hasNextPage)}
              onLoadMore={() => void sectors.fetchNextPage()}
            />
            <TableFilterAutocomplete
              value={stageId}
              onValueChange={setStageId}
              options={stageOptions}
              placeholder="All stages"
              searchPlaceholder="Search stages..."
              emptyMessage="No active stage found."
              isLoading={stages.isFetching}
              onOpenChange={(open) =>
                setStageLookup((state) => ({ ...state, open }))
              }
              onSearchChange={(search) =>
                setStageLookup((state) => ({ ...state, search }))
              }
              hasMore={Boolean(stages.hasNextPage)}
              onLoadMore={() => void stages.fetchNextPage()}
            />
            <TableFilterSelect
              value={source}
              onChange={(event) =>
                setSource(event.target.value as typeof source)
              }
            >
              <option value="all">All sources</option>
              <option value="admin_invited">Admin-invited</option>
              <option value="self_registered">Self-registered</option>
            </TableFilterSelect>
            <TableFilterSelect
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as typeof status)
              }
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </TableFilterSelect>
          </div>
        </TableToolbar>
        {directory.isError ? (
          <Notice>
            Entrepreneurs could not be loaded. {directory.error.message}{" "}
            <Button
              variant="outline"
              className="ml-3"
              onClick={() => void directory.refetch()}
            >
              Try again
            </Button>
          </Notice>
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={directory.rows}
              rowKey={(record) => record.entrepreneurUserId}
              emptyMessage="No entrepreneurs match these filters."
              tableClassName="min-w-[1320px]"
            />
            <TablePagination
              page={directory.page}
              pageSize={pageSize}
              totalItems={directory.totalItems}
              onPageChange={directory.setPage}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </Card>
      <EntrepreneurFormModal
        open={addOpen}
        onOpenChange={setAddOpen}
        isPending={invite.isPending}
        onSubmit={submitInvite}
      />
      {editTarget ? (
        <EntrepreneurFormModal
          open
          onOpenChange={(open) => !open && setEditTarget(undefined)}
          entrepreneur={editTarget}
          isPending={update.isPending}
          onSubmit={submitEdit}
        />
      ) : null}
      <EntrepreneurDetailModal
        open={Boolean(detailId)}
        onOpenChange={(open) => !open && setDetailId(null)}
        record={detail.data}
        isLoading={detail.isLoading}
        error={detail.error}
        onEdit={setEditTarget}
        onProgrammes={(record) => setProgrammeId(record.entrepreneurUserId)}
        onTools={(record) => setToolId(record.entrepreneurUserId)}
      />
      <ProgrammeAccessModal
        entrepreneurId={programmeId}
        onOpenChange={(open) => !open && setProgrammeId(null)}
      />
      <ToolAccessModal
        entrepreneurId={toolId}
        onOpenChange={(open) => !open && setToolId(null)}
      />
    </>
  );
}

function profilePayload(values: EntrepreneurProfileForm) {
  return {
    firstName: values.firstName,
    lastName: values.lastName,
    phone: values.phone || undefined,
    businessName: values.businessName,
    country: values.country,
    sectorId: values.sectorId || null,
    stageId: values.stageId || null,
  };
}

function ProgrammeAccessModal({
  entrepreneurId,
  onOpenChange,
}: {
  entrepreneurId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [lookup, setLookup] = React.useState({ open: false, search: "" });
  const [selected, setSelected] = React.useState("");
  const access = useProgrammeAccessQuery(entrepreneurId, { take: 10 });
  const programmes = useLazyGrantableProgrammesQuery({
    enabled: Boolean(entrepreneurId && lookup.open),
    search: lookup.search || undefined,
  });
  const grant = useGrantProgrammeAccessMutation({
    onSuccess: () => {
      toast.success("Programme access granted");
      setSelected("");
    },
    onError: (error) => toast.error(error.message),
  });
  const revoke = useRevokeProgrammeAccessMutation({
    onSuccess: () => toast.success("Programme access revoked"),
    onError: (error) => toast.error(error.message),
  });
  const existingIds = new Set(access.rows.map((item) => item.id));
  const options = programmes.rows
    .filter((item) => !existingIds.has(item.id))
    .map((item) => ({ value: item.id, label: item.name }));
  return (
    <Modal
      open={Boolean(entrepreneurId)}
      onOpenChange={onOpenChange}
      title="Programme access"
      width="wide"
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-line bg-surface-subtle p-4">
          <div className="font-semibold text-ink">
            {access.totalItems} assigned programme
            {access.totalItems === 1 ? "" : "s"}
          </div>
          <div className="mt-1 text-sm text-ink-muted">
            The list loads in pages as access grows.
          </div>
        </div>
        <div className="space-y-2">
          {access.rows.map((item) => (
            <div
              key={item.grantId}
              className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white p-3"
            >
              <div>
                <div className="font-medium text-ink">{item.name}</div>
                <div className="mt-0.5 text-sm text-ink-muted">
                  {item.progress
                    ? `${item.progress.percent}% progress`
                    : "Not started"}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                isLoading={
                  revoke.isPending && revoke.variables?.programmeId === item.id
                }
                onClick={() =>
                  entrepreneurId &&
                  revoke.mutate({ id: entrepreneurId, programmeId: item.id })
                }
              >
                Revoke
              </Button>
            </div>
          ))}
        </div>
        {access.hasNextPage ? (
          <Button
            variant="outline"
            className="w-full"
            isLoading={access.isFetchingNextPage}
            onClick={() => void access.fetchNextPage()}
          >
            Load more programmes
          </Button>
        ) : null}
        <div className="grid gap-2 border-t border-line pt-4 sm:grid-cols-[1fr_auto]">
          <TableFilterAutocomplete
            value={selected}
            onValueChange={setSelected}
            options={options}
            placeholder="Add published programme"
            searchPlaceholder="Search programmes..."
            emptyMessage="No additional programme found."
            isLoading={programmes.isFetching}
            onOpenChange={(open) => setLookup((state) => ({ ...state, open }))}
            onSearchChange={(search) =>
              setLookup((state) => ({ ...state, search }))
            }
            hasMore={Boolean(programmes.hasNextPage)}
            onLoadMore={() => void programmes.fetchNextPage()}
          />
          <Button
            disabled={!selected || !entrepreneurId}
            isLoading={grant.isPending}
            onClick={() =>
              entrepreneurId &&
              selected &&
              grant.mutate({ id: entrepreneurId, programmeId: selected })
            }
          >
            Grant access
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ToolAccessModal({
  entrepreneurId,
  onOpenChange,
}: {
  entrepreneurId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [search, setSearch] = React.useState("");
  const tools = useEffectiveToolsQuery(entrepreneurId, {
    search: useDebouncedValue(search) || undefined,
    includeUnavailable: true,
    take: 10,
  });
  const mutationHandlers = {
    onError: (error: Error) => toast.error(error.message),
  };
  const grant = useGrantToolAccessMutation({
    ...mutationHandlers,
    onSuccess: () => toast.success("Tool access granted"),
  });
  const revoke = useRevokeToolAccessMutation({
    ...mutationHandlers,
    onSuccess: () => toast.success("Direct tool access revoked"),
  });
  const hide = useHideToolAccessMutation({
    ...mutationHandlers,
    onSuccess: () => toast.success("Tool hidden from entrepreneur"),
  });
  const restore = useRestoreToolAccessMutation({
    ...mutationHandlers,
    onSuccess: () => toast.success("Tool restored for entrepreneur"),
  });

  return (
    <Modal
      open={Boolean(entrepreneurId)}
      onOpenChange={onOpenChange}
      title="Manage tool access"
      width="wide"
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-line bg-surface-subtle p-4">
          <div className="font-semibold text-ink">
            {tools.totalItems} published tool{tools.totalItems === 1 ? "" : "s"}
          </div>
          <div className="mt-1 text-sm text-ink-muted">
            Inherited access, direct grants, and hidden overrides are resolved
            by the platform.
          </div>
        </div>
        <TableFilterInput
          icon
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search published tools..."
        />
        {tools.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ) : null}
        {tools.isError ? (
          <Notice>Tools could not be loaded. {tools.error.message}</Notice>
        ) : null}
        <div className="space-y-2">
          {tools.rows.map((tool) => (
            <ToolRow
              key={tool.id}
              tool={tool}
              isPending={[grant, revoke, hide, restore].some(
                (mutation) =>
                  mutation.isPending && mutation.variables?.toolId === tool.id,
              )}
              onAction={(action) => {
                if (!entrepreneurId) return;
                const variables = { entrepreneurId, toolId: tool.id };
                if (action === "grant") grant.mutate(variables);
                if (action === "revoke") revoke.mutate(variables);
                if (action === "hide") hide.mutate(variables);
                if (action === "restore") restore.mutate(variables);
              }}
            />
          ))}
          {!tools.isLoading && !tools.isError && tools.rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-ink-muted">
              No published tool matches this search.
            </div>
          ) : null}
        </div>
        {tools.hasNextPage ? (
          <Button
            variant="outline"
            className="w-full"
            isLoading={tools.isFetchingNextPage}
            onClick={() => void tools.fetchNextPage()}
          >
            Load more tools
          </Button>
        ) : null}
      </div>
    </Modal>
  );
}

type ToolAccessAction = "grant" | "revoke" | "hide" | "restore";

function ToolRow({
  tool,
  isPending,
  onAction,
}: {
  tool: EffectiveToolAccess;
  isPending: boolean;
  onAction: (action: ToolAccessAction) => void;
}) {
  const source = tool.hidden
    ? "Hidden override"
    : tool.accessSource === "global"
      ? "Global access"
      : tool.accessSource === "programme"
        ? "Programme access"
        : tool.accessSource === "individual"
          ? "Direct access"
          : "No access";
  const action: ToolAccessAction = tool.hidden
    ? "restore"
    : tool.directGranted
      ? "revoke"
      : tool.visible
        ? "hide"
        : "grant";
  const actionLabel =
    action === "restore"
      ? "Restore"
      : action === "revoke"
        ? "Revoke direct"
        : action === "hide"
          ? "Hide"
          : "Grant access";
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-medium text-ink">{tool.name}</div>
            <Badge
              tone={
                tool.hidden
                  ? "amber"
                  : tool.accessSource === "global"
                    ? "green"
                    : tool.accessSource === "programme"
                      ? "blue"
                      : tool.accessSource === "individual"
                        ? "brand"
                        : "neutral"
              }
            >
              {source}
            </Badge>
          </div>
          <div className="mt-1 line-clamp-2 text-sm text-ink-muted">
            {tool.description}
          </div>
          <div className="mt-2 text-xs font-medium text-ink-faint">
            {tool.toolArea.name} · {tool.type === "pdf" ? "PDF" : "Online tool"}
          </div>
        </div>
        <Button
          size="sm"
          variant={
            action === "grant" || action === "restore" ? "primary" : "outline"
          }
          isLoading={isPending}
          onClick={() => onAction(action)}
        >
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}

function EntrepreneurDetailModal({
  open,
  onOpenChange,
  record,
  isLoading,
  error,
  onEdit,
  onProgrammes,
  onTools,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record?: EntrepreneurRecord;
  isLoading: boolean;
  error: Error | null;
  onEdit: (record: EntrepreneurRecord) => void;
  onProgrammes: (record: EntrepreneurRecord) => void;
  onTools: (record: EntrepreneurRecord) => void;
}) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Entrepreneur profile"
      width="xl"
    >
      {isLoading ? (
        <ProfileSkeleton />
      ) : error || !record ? (
        <Notice>Profile could not be loaded. {error?.message}</Notice>
      ) : (
        <div className="space-y-5">
          <section className="rounded-2xl border border-bid/15 bg-gradient-to-br from-bid-light via-white to-info-light/40 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Avatar
                initials={initials(record)}
                size={72}
                tone="brand"
                className="ring-4 ring-white"
              />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-semibold text-ink">
                    {record.businessName}
                  </h2>
                  <StatusBadge record={record} />
                </div>
                <div className="mt-2 text-ink-muted">
                  {record.representativeName}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {record.sector ? (
                    <Badge tone="blue">{record.sector.name}</Badge>
                  ) : null}
                  {record.stage ? (
                    <Badge tone="neutral">{record.stage.name}</Badge>
                  ) : null}
                  <Badge tone="brand">
                    {record.source === "admin_invited"
                      ? "Admin-invited"
                      : "Self-registered"}
                  </Badge>
                </div>
              </div>
            </div>
          </section>
          <div className="grid gap-4 lg:grid-cols-3">
            <ProfileCard
              icon={<Mail className="h-4 w-4" />}
              label="Email"
              value={record.email}
            />
            <ProfileCard
              icon={<Phone className="h-4 w-4" />}
              label="Phone"
              value={record.phone || "Not provided"}
            />
            <ProfileCard
              icon={<MapPin className="h-4 w-4" />}
              label="Country"
              value={record.country}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard
              label="Assigned programmes"
              value={record.programmeAccess.assignedProgrammeCount}
              subline="Plus free resources"
              accent="bid"
            />
            <StatCard
              label="Average learning progress"
              value={`${record.learnerProgress.average}%`}
              subline={`${record.learnerProgress.trackedProgrammes} tracked programmes`}
              accent="info"
            />
          </div>
          <div className="flex flex-col gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => onEdit(record)}>
              Edit profile
            </Button>
            <Button variant="outline" onClick={() => onTools(record)}>
              Manage tools
            </Button>
            <Button onClick={() => onProgrammes(record)}>
              Manage programmes
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function ProfileCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
        {icon}
        {label}
      </div>
      <div className="mt-2 truncate font-medium text-ink">{value}</div>
    </div>
  );
}
function ProfileSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-32 rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    </div>
  );
}
function EntrepreneursSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-16" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton className="h-[460px] rounded-xl" />
    </div>
  );
}
