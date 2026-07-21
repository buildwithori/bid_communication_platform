"use client";

import { useDebouncedValue } from '@/lib/search';
import * as React from "react";
import { MailPlus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Notice } from "@/components/shared/PageHeader";
import {
  Card,
  CardHeader,
  Skeleton,
  TableSkeleton,
} from "@/components/shared/Card";
import { MetricGrid } from "@/components/shared/MetricGrid";
import { StatCard } from "@/components/shared/StatCard";
import { Avatar } from "@/components/shared/Avatar";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { Modal } from "@/components/shared/Modal";
import {
  DataTable,
  RowActions,
  TableFilterAutocomplete,
  TableFilterInput,
  TablePagination,
  TableToolbar,
  type Column,
} from "@/components/shared/DataTable";
import { AdminInviteModal } from "@/components/admin/AdminInviteModal";
import {
  useAdminDetailQuery,
  useAdminsPage,
  useInviteAdminMutation,
  useResendAdminInvitationMutation,
  useUpdateAdminStatusMutation,
  type AdminDirectoryStatus,
  type AdminRecord,
} from "@/lib/api/admins";

const ALL_FILTER = "all";

const statusOptions = [
  { value: ALL_FILTER, label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "invited", label: "Invited" },
  { value: "disabled", label: "Disabled" },
];

const calendarOptions = [
  { value: ALL_FILTER, label: "All calendars" },
  { value: "connected", label: "Google connected" },
  { value: "not_connected", label: "No calendar" },
];

function statusBadge(status: AdminDirectoryStatus) {
  if (status === "active") return <Badge tone="green">Active</Badge>;
  if (status === "invited") return <Badge tone="amber">Invited</Badge>;
  return <Badge tone="red">Disabled</Badge>;
}

function calendarBadge(connected: boolean) {
  return connected ? (
    <Badge tone="green">Google Calendar connected</Badge>
  ) : (
    <Badge tone="red">No calendar connected</Badge>
  );
}

export default function AdminsPage() {
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [viewAdminId, setViewAdminId] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const debouncedQuery = useDebouncedValue(query.trim());
  const [status, setStatus] = React.useState(ALL_FILTER);
  const [calendar, setCalendar] = React.useState(ALL_FILTER);
  const [pageSize, setPageSize] = React.useState(10);

  const admins = useAdminsPage({
    search: debouncedQuery || undefined,
    status:
      status === ALL_FILTER ? undefined : (status as AdminDirectoryStatus),
    calendarStatus:
      calendar === ALL_FILTER
        ? undefined
        : (calendar as "connected" | "not_connected"),
    take: pageSize,
  });
  const adminDetail = useAdminDetailQuery(viewAdminId);
  const inviteAdmin = useInviteAdminMutation({
    onSuccess: (admin) => {
      setInviteOpen(false);
      toast.success(`Invitation sent to ${admin.email}`);
    },
    onError: (error) => toast.error(error.message),
  });
  const resendInvitation = useResendAdminInvitationMutation({
    onSuccess: () => toast.success("Admin invitation resent"),
    onError: (error) => toast.error(error.message),
  });
  const updateStatus = useUpdateAdminStatusMutation({
    onSuccess: (admin) =>
      toast.success(
        admin.status === "active"
          ? "Admin account enabled"
          : "Admin account disabled",
      ),
    onError: (error) => toast.error(error.message),
  });

  const selectedAdmin =
    adminDetail.data ??
    admins.rows.find((admin) => admin.id === viewAdminId) ??
    null;

  const columns: Column<AdminRecord>[] = [
    {
      key: "action",
      header: "Action",
      className: "w-[84px]",
      cell: (admin) => (
        <RowActions
          actions={[
            {
              label: "View admin",
              onSelect: () => setViewAdminId(admin.id),
            },
            ...(admin.status === "invited"
              ? [
                  {
                    label: "Resend invite",
                    onSelect: () => resendInvitation.mutate(admin.id),
                    disabled: resendInvitation.isPending,
                  },
                ]
              : [
                  {
                    label:
                      admin.status === "active"
                        ? "Disable account"
                        : "Enable account",
                    onSelect: () =>
                      updateStatus.mutate({
                        id: admin.id,
                        status:
                          admin.status === "active" ? "inactive" : "active",
                      }),
                    disabled: updateStatus.isPending,
                  },
                ]),
          ]}
        />
      ),
    },
    {
      key: "admin",
      header: "Admin",
      cell: (admin) => (
        <button
          type="button"
          onClick={() => setViewAdminId(admin.id)}
          className="flex min-w-[240px] items-center gap-3 rounded-lg text-left outline-none transition hover:text-bid focus-visible:ring-2 focus-visible:ring-bid/20"
        >
          <Avatar initials={initials(admin)} size={32} />
          <span className="min-w-0">
            <span className="block truncate font-medium text-ink">
              {admin.name}
            </span>
            <span className="block truncate text-sm text-ink-muted">
              {admin.email}
            </span>
          </span>
        </button>
      ),
    },
    {
      key: "calendar",
      header: "Calendar support",
      cell: (admin) => calendarBadge(admin.calendar.connected),
    },
    {
      key: "status",
      header: "Status",
      cell: (admin) => statusBadge(admin.status),
    },
    {
      key: "lastActive",
      header: "Last active",
      cell: (admin) => (
        <span className="text-ink-muted">{lastActiveLabel(admin)}</span>
      ),
    },
  ];

  if (admins.isLoading) {
    return <AdminsPageSkeleton />;
  }

  if (admins.isError) {
    return (
      <>
        <PageHeader
          title="Admins"
          description="Invite and manage BID team members who can operate the admin workspace."
        />
        <Card>
          <Notice>Admins could not be loaded. {admins.error.message}</Notice>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => void admins.refetch()}
          >
            Try again
          </Button>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Admins"
        description="Invite and manage BID team members who can operate the admin workspace."
        actions={
          <Button onClick={() => setInviteOpen(true)}>
            <MailPlus className="h-4 w-4" />
            Invite admin
          </Button>
        }
      />

      <MetricGrid className="mb-4">
        <StatCard
          label="Total admins"
          value={admins.summary.totalAdmins}
          subline="BID team accounts"
          dotColor="bid"
          accent="bid"
        />
        <StatCard
          label="Active admins"
          value={admins.summary.activeAdmins}
          subline="Can access workspace"
          dotColor="success"
          accent="success"
        />
        <StatCard
          label="Pending invites"
          value={admins.summary.pendingInvites}
          subline="Awaiting account setup"
          dotColor="warning"
          accent="warning"
        />
        <StatCard
          label="Calendar ready"
          value={admins.summary.calendarReady}
          subline="Can own Google Meet sessions"
          dotColor="info"
          accent="info"
        />
      </MetricGrid>

      <Card>
        <CardHeader
          title="Admin directory"
          description={`${admins.totalItems} admin${admins.totalItems === 1 ? "" : "s"} in this view`}
        />
        <TableToolbar>
          <div>
            <div className="text-sm font-medium text-ink">Filter admins</div>
            <div className="mt-0.5 text-sm text-ink-muted">
              Search by name or email, then refine by status or calendar.
            </div>
          </div>
          <div className="grid w-full gap-2 md:grid-cols-[minmax(220px,1fr)_170px_190px] lg:w-[680px]">
            <TableFilterInput
              icon
              placeholder="Search admins..."
              value={query}
              onChange={(event) => {
                admins.resetPagination();
                setQuery(event.target.value);
              }}
            />
            <TableFilterAutocomplete
              value={status}
              onValueChange={(value) => {
                admins.resetPagination();
                setStatus(value);
              }}
              options={statusOptions}
              placeholder="All statuses"
              searchPlaceholder="Search statuses..."
            />
            <TableFilterAutocomplete
              value={calendar}
              onValueChange={(value) => {
                admins.resetPagination();
                setCalendar(value);
              }}
              options={calendarOptions}
              placeholder="All calendars"
              searchPlaceholder="Search calendars..."
            />
          </div>
        </TableToolbar>
        <DataTable
          columns={columns}
          rows={admins.rows}
          rowKey={(admin) => admin.id}
          emptyMessage="No admins match these filters."
        />
        <TablePagination
          page={admins.page}
          pageSize={pageSize}
          totalItems={admins.totalItems}
          pageSizeOptions={[10, 25, 50]}
          onPageChange={admins.setPage}
          onPageSizeChange={(next) => {
            admins.resetPagination();
            setPageSize(next);
          }}
        />
      </Card>

      <AdminInviteModal
        open={inviteOpen}
        isPending={inviteAdmin.isPending}
        onOpenChange={setInviteOpen}
        onSubmit={(values) =>
          inviteAdmin.mutate({
            firstName: values.firstName.trim(),
            lastName: values.lastName.trim(),
            email: values.email.trim(),
          })
        }
      />
      {viewAdminId ? (
        <AdminDetailsModal
          admin={selectedAdmin}
          isLoading={adminDetail.isLoading}
          isResending={resendInvitation.isPending}
          isUpdatingStatus={updateStatus.isPending}
          open
          onOpenChange={(open) => !open && setViewAdminId(null)}
          onResend={() => resendInvitation.mutate(viewAdminId)}
          onToggleStatus={() => {
            if (!selectedAdmin || selectedAdmin.status === "invited") return;
            updateStatus.mutate({
              id: selectedAdmin.id,
              status: selectedAdmin.status === "active" ? "inactive" : "active",
            });
          }}
        />
      ) : null}
    </>
  );
}

function AdminsPageSkeleton() {
  return (
    <>
      <PageHeader
        title="Admins"
        description="Invite and manage BID team members who can operate the admin workspace."
      />
      <MetricGrid className="mb-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index}>
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-4 h-9 w-16" />
            <Skeleton className="mt-3 h-4 w-36" />
          </Card>
        ))}
      </MetricGrid>
      <TableSkeleton columns={5} rows={8} />
    </>
  );
}

function AdminDetailsModal({
  admin,
  open,
  isLoading,
  isResending,
  isUpdatingStatus,
  onOpenChange,
  onResend,
  onToggleStatus,
}: {
  admin: AdminRecord | null;
  open: boolean;
  isLoading: boolean;
  isResending: boolean;
  isUpdatingStatus: boolean;
  onOpenChange: (open: boolean) => void;
  onResend: () => void;
  onToggleStatus: () => void;
}) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Admin details"
      width="wide"
    >
      {isLoading && !admin ? (
        <div className="space-y-4" aria-busy="true">
          <Skeleton className="h-24 w-full" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      ) : admin ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-4 rounded-xl border border-line bg-surface-subtle p-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <Avatar initials={initials(admin)} size={44} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-lg font-semibold text-ink">
                    {admin.name}
                  </h3>
                  {statusBadge(admin.status)}
                </div>
                <p className="mt-1 truncate text-sm text-ink-muted">
                  {admin.email}
                </p>
                {admin.phone ? (
                  <p className="mt-1 text-sm text-ink-muted">{admin.phone}</p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <DetailCard label="Calendar support">
              {calendarBadge(admin.calendar.connected)}
            </DetailCard>
            <DetailCard label="Status">{statusBadge(admin.status)}</DetailCard>
            <DetailCard label="Last active">
              {lastActiveLabel(admin)}
            </DetailCard>
            <DetailCard label="Invited by">
              {admin.invitedBy?.name ?? "System administrator"}
            </DetailCard>
          </div>

          <div className="rounded-xl border border-line bg-card p-4">
            <div className="text-sm font-semibold text-ink">
              Workspace access
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone="brand">Admin workspace</Badge>
              <Badge tone="blue">Session operations</Badge>
              <Badge tone="neutral">Reporting visibility</Badge>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            {admin.status === "invited" ? (
              <Button
                type="button"
                onClick={onResend}
                isLoading={isResending}
                loadingLabel="Resending invite"
              >
                Resend invite
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={onToggleStatus}
                isLoading={isUpdatingStatus}
                loadingLabel="Updating account"
              >
                {admin.status === "active"
                  ? "Disable account"
                  : "Enable account"}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <Notice>Admin details could not be loaded.</Notice>
      )}
    </Modal>
  );
}

function DetailCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
        {label}
      </div>
      <div className="mt-2 text-sm font-medium text-ink">{children}</div>
    </div>
  );
}

function initials(
  admin: Pick<AdminRecord, "firstName" | "lastName" | "email">,
) {
  const value = [admin.firstName, admin.lastName]
    .filter(Boolean)
    .map((part) => part?.[0])
    .join("");
  return (value || admin.email.slice(0, 2)).toUpperCase();
}

function lastActiveLabel(admin: AdminRecord) {
  if (admin.lastActiveAt) return formatDateTime(admin.lastActiveAt);
  if (admin.invitation?.sentAt) {
    return `Invite sent ${formatDateTime(admin.invitation.sentAt)}`;
  }
  return "Not active yet";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
