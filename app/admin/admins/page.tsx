'use client';

import * as React from 'react';
import { MailPlus } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/shared/Card';
import { MetricGrid } from '@/components/shared/MetricGrid';
import { StatCard } from '@/components/shared/StatCard';
import { Avatar } from '@/components/shared/Avatar';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
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
import { AdminInviteModal } from '@/components/admin/AdminInviteModal';

type AdminStatus = 'active' | 'invited' | 'disabled';
type CalendarStatus = 'connected' | 'not-connected';

interface AdminUser {
  id: string;
  initials: string;
  name: string;
  email: string;
  status: AdminStatus;
  calendarStatus: CalendarStatus;
  lastActive: string;
}

const ALL_FILTER = 'all';

const adminUsers: AdminUser[] = [
  {
    id: 'admin-ama',
    initials: 'AD',
    name: 'Ama Darko',
    email: 'ama.darko@bid.org',
    status: 'active',
    calendarStatus: 'connected',
    lastActive: 'Today',
  },
  {
    id: 'admin-kojo',
    initials: 'KA',
    name: 'Kojo Appiah',
    email: 'kojo.appiah@bid.org',
    status: 'active',
    calendarStatus: 'connected',
    lastActive: 'Yesterday',
  },
  {
    id: 'admin-efua',
    initials: 'EM',
    name: 'Efua Mensah',
    email: 'efua.mensah@bid.org',
    status: 'invited',
    calendarStatus: 'not-connected',
    lastActive: 'Invite sent Jul 6, 2026',
  },
  {
    id: 'admin-yaw',
    initials: 'YO',
    name: 'Yaw Owusu',
    email: 'yaw.owusu@bid.org',
    status: 'active',
    calendarStatus: 'not-connected',
    lastActive: 'Jul 3, 2026',
  },
];

const statusOptions = [
  { value: ALL_FILTER, label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'invited', label: 'Invited' },
  { value: 'disabled', label: 'Disabled' },
];

const calendarOptions = [
  { value: ALL_FILTER, label: 'All calendars' },
  { value: 'connected', label: 'Google connected' },
  { value: 'not-connected', label: 'No calendar' },
];

function statusBadge(status: AdminStatus) {
  if (status === 'active') return <Badge tone="green">Active</Badge>;
  if (status === 'invited') return <Badge tone="amber">Invited</Badge>;
  return <Badge tone="red">Disabled</Badge>;
}

function calendarBadge(status: CalendarStatus) {
  return status === 'connected'
    ? <Badge tone="green">Google Calendar connected</Badge>
    : <Badge tone="red">No calendar connected</Badge>;
}

export default function AdminsPage() {
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [viewAdmin, setViewAdmin] = React.useState<AdminUser | null>(null);
  const [query, setQuery] = React.useState('');
  const [status, setStatus] = React.useState(ALL_FILTER);
  const [calendar, setCalendar] = React.useState(ALL_FILTER);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  const resetPage = (nextPageSize?: number) => {
    if (nextPageSize) setPageSize(nextPageSize);
    setPage(1);
  };

  const filteredAdmins = adminUsers.filter((admin) => {
    const needle = query.trim().toLowerCase();
    const matchesSearch = !needle || [
      admin.name,
      admin.email,
      admin.status,
      admin.calendarStatus,
    ].join(' ').toLowerCase().includes(needle);
    const matchesStatus = status === ALL_FILTER || admin.status === status;
    const matchesCalendar = calendar === ALL_FILTER || admin.calendarStatus === calendar;

    return matchesSearch && matchesStatus && matchesCalendar;
  });

  const activeAdmins = adminUsers.filter((admin) => admin.status === 'active').length;
  const pendingInvites = adminUsers.filter((admin) => admin.status === 'invited').length;
  const calendarReadyAdmins = adminUsers.filter((admin) => admin.calendarStatus === 'connected').length;
  const pageRows = filteredAdmins.slice((page - 1) * pageSize, page * pageSize);

  const columns: Column<AdminUser>[] = [
    {
      key: 'action',
      header: 'Action',
      className: 'w-[84px]',
      cell: (admin) => (
        <RowActions
          actions={[
            { label: 'View admin', onSelect: () => setViewAdmin(admin) },
            ...(admin.status === 'invited'
              ? [{ label: 'Resend invite', onSelect: () => toast.success(`Invite resent to ${admin.email}`) }]
              : []),
          ]}
        />
      ),
    },
    {
      key: 'admin',
      header: 'Admin',
      cell: (admin) => (
        <button
          type="button"
          onClick={() => setViewAdmin(admin)}
          className="flex min-w-[240px] items-center gap-3 rounded-lg text-left outline-none transition hover:text-bid focus-visible:ring-2 focus-visible:ring-bid/20"
        >
          <Avatar initials={admin.initials} size={32} />
          <span className="min-w-0">
            <span className="block truncate font-medium text-ink transition-colors group-hover:text-bid">{admin.name}</span>
            <span className="block truncate text-sm text-ink-muted">{admin.email}</span>
          </span>
        </button>
      ),
    },
    {
      key: 'calendar',
      header: 'Calendar support',
      cell: (admin) => calendarBadge(admin.calendarStatus),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (admin) => statusBadge(admin.status),
    },
    {
      key: 'lastActive',
      header: 'Last active',
      cell: (admin) => <span className="text-ink-muted">{admin.lastActive}</span>,
    },
  ];

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
          value={adminUsers.length}
          subline="BID team accounts"
          dotColor="bid"
          accent="bid"
        />
        <StatCard
          label="Active admins"
          value={activeAdmins}
          subline="Can access workspace"
          dotColor="success"
          accent="success"
        />
        <StatCard
          label="Pending invites"
          value={pendingInvites}
          subline="Awaiting account setup"
          dotColor="warning"
          accent="warning"
        />
        <StatCard
          label="Calendar ready"
          value={calendarReadyAdmins}
          subline="Can own Google Meet sessions"
          dotColor="info"
          accent="info"
        />
      </MetricGrid>

      <Card>
        <CardHeader
          title="Admin directory"
          description={`${filteredAdmins.length} admins in this view`}
        />
        <TableToolbar>
          <div>
            <div className="text-sm font-medium text-ink">Filter admins</div>
            <div className="mt-0.5 text-sm text-ink-muted">
              Search by name, email, status, or calendar connection.
            </div>
          </div>
          <div className="grid w-full gap-2 md:grid-cols-[minmax(220px,1fr)_170px_190px] lg:w-[680px]">
            <TableFilterInput
              icon
              placeholder="Search admins..."
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                resetPage();
              }}
            />
            <TableFilterAutocomplete
              value={status}
              onValueChange={(value) => {
                setStatus(value);
                resetPage();
              }}
              options={statusOptions}
              placeholder="All statuses"
              searchPlaceholder="Search statuses..."
            />
            <TableFilterAutocomplete
              value={calendar}
              onValueChange={(value) => {
                setCalendar(value);
                resetPage();
              }}
              options={calendarOptions}
              placeholder="All calendars"
              searchPlaceholder="Search calendars..."
            />
          </div>
        </TableToolbar>
        <DataTable
          columns={columns}
          rows={pageRows}
          rowKey={(admin) => admin.id}
          emptyMessage="No admins match these filters."
        />
        <TablePagination
          page={page}
          pageSize={pageSize}
          totalItems={filteredAdmins.length}
          pageSizeOptions={[10, 25, 50]}
          onPageChange={setPage}
          onPageSizeChange={resetPage}
        />
      </Card>

      <AdminInviteModal open={inviteOpen} onOpenChange={setInviteOpen} />
      {viewAdmin && (
        <AdminDetailsModal
          admin={viewAdmin}
          open={!!viewAdmin}
          onOpenChange={(open) => !open && setViewAdmin(null)}
        />
      )}
    </>
  );
}

function AdminDetailsModal({
  admin,
  open,
  onOpenChange,
}: {
  admin: AdminUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Admin details" width="wide">
      <div className="space-y-4">
        <div className="flex flex-col gap-4 rounded-xl border border-line bg-surface-subtle p-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <Avatar initials={admin.initials} size={44} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-lg font-semibold text-ink">{admin.name}</h3>
                {statusBadge(admin.status)}
              </div>
              <p className="mt-1 truncate text-sm text-ink-muted">{admin.email}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-line bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Calendar support</div>
            <div className="mt-2">{calendarBadge(admin.calendarStatus)}</div>
          </div>
          <div className="rounded-xl border border-line bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Status</div>
            <div className="mt-2">{statusBadge(admin.status)}</div>
          </div>
          <div className="rounded-xl border border-line bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Last active</div>
            <div className="mt-1 text-sm font-medium text-ink">{admin.lastActive}</div>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-white p-4">
          <div className="text-sm font-semibold text-ink">Workspace access</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone="brand">Admin workspace</Badge>
            <Badge tone="blue">Session operations</Badge>
            <Badge tone="neutral">Reporting visibility</Badge>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {admin.status === 'invited' && (
            <Button
              type="button"
              onClick={() => toast.success(`Invite resent to ${admin.email}`)}
            >
              Resend invite
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
