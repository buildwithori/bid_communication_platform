"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { Card, CardHeader, TableSkeleton } from "@/components/shared/Card";
import {
  DataTable,
  RowActions,
  TableFilterInput,
  TablePagination,
  TableToolbar,
  type Column,
} from "@/components/shared/DataTable";
import { FormField, FormInput } from "@/components/shared/FormField";
import { Modal } from "@/components/shared/Modal";
import { Notice, PageHeader } from "@/components/shared/PageHeader";
import {
  useCreateSessionTypeMutation,
  useSessionTypesPage,
  useUpdateSessionTypeMutation,
  type SessionTypeRecord,
} from "@/lib/api/settings";
import {
  sessionTypeSchema,
  type SessionTypeForm,
} from "@/lib/forms/schemas";
import { useDebouncedValue } from "@/lib/search";

export default function AdminSessionTypesPage() {
  const [query, setQuery] = React.useState("");
  const debouncedQuery = useDebouncedValue(query.trim());
  const [pageSize, setPageSize] = React.useState(10);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [activeSessionType, setActiveSessionType] =
    React.useState<SessionTypeRecord | null>(null);
  const sessionTypes = useSessionTypesPage({
    search: debouncedQuery || undefined,
    take: pageSize,
  });
  const createSessionType = useCreateSessionTypeMutation({
    onSuccess: () => {
      setCreateOpen(false);
      toast.success("Session type added");
    },
    onError: (error) => toast.error(error.message),
  });
  const updateSessionType = useUpdateSessionTypeMutation({
    onSuccess: () => {
      setActiveSessionType(null);
      toast.success("Session type updated");
    },
    onError: (error) => toast.error(error.message),
  });

  const columns: Column<SessionTypeRecord>[] = [
    {
      key: "actions",
      header: "Action",
      cell: (sessionType) => (
        <RowActions
          actions={[
            {
              label: "Edit session type",
              onSelect: () => setActiveSessionType(sessionType),
            },
            {
              label: sessionType.active ? "Deactivate" : "Activate",
              onSelect: () =>
                updateSessionType.mutate({
                  id: sessionType.id,
                  payload: { active: !sessionType.active },
                }),
              disabled: updateSessionType.isPending,
            },
          ]}
        />
      ),
      className: "w-[84px]",
    },
    {
      key: "name",
      header: "Session type",
      cell: (sessionType) => (
        <button
          type="button"
          onClick={() => setActiveSessionType(sessionType)}
          className="text-left font-medium text-ink transition hover:text-bid"
        >
          {sessionType.name}
        </button>
      ),
      className: "min-w-[280px]",
    },
    {
      key: "duration",
      header: "Duration",
      cell: (sessionType) => formatDuration(sessionType.durationMinutes),
      className: "w-[180px]",
    },
    {
      key: "key",
      header: "Key",
      cell: (sessionType) => (
        <span className="font-mono text-xs text-ink-muted">
          {sessionType.key}
        </span>
      ),
      className: "min-w-[220px]",
    },
    {
      key: "status",
      header: "Status",
      cell: (sessionType) => (
        <Badge tone={sessionType.active ? "green" : "neutral"}>
          {sessionType.active ? "Active" : "Inactive"}
        </Badge>
      ),
      className: "w-[140px]",
    },
  ];

  if (sessionTypes.isLoading) {
    return (
      <>
        <PageHeader
          title="Session types"
          description="Manage the session choices and booking duration shown across BID Hub."
        />
        <TableSkeleton columns={5} rows={8} />
      </>
    );
  }

  if (sessionTypes.isError) {
    return (
      <>
        <PageHeader
          title="Session types"
          description="Manage session choices and booking duration."
        />
        <Card>
          <Notice>
            Session types could not be loaded. {sessionTypes.error.message}
          </Notice>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => void sessionTypes.refetch()}
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
        title="Session types"
        description="Manage the session choices and duration used when BID team members and entrepreneurs book time."
      />
      <Card>
        <CardHeader
          title="Session type list"
          description={`${sessionTypes.totalItems} session type${sessionTypes.totalItems === 1 ? "" : "s"} in this view`}
          actions={
            <Button onClick={() => setCreateOpen(true)}>
              + Add session type
            </Button>
          }
        />
        <TableToolbar>
          <div>
            <div className="text-sm font-medium text-ink">
              Search session types
            </div>
            <div className="mt-0.5 text-sm text-ink-muted">
              Find a type by its name or key.
            </div>
          </div>
          <TableFilterInput
            icon
            className="w-full sm:w-[320px]"
            placeholder="Search session types..."
            value={query}
            onChange={(event) => {
              sessionTypes.resetPagination();
              setQuery(event.target.value);
            }}
          />
        </TableToolbar>
        {sessionTypes.isPlaceholderData ? (
          <TableSkeleton columns={5} rows={Math.min(pageSize, 6)} />
        ) : (
          <DataTable
            columns={columns}
            rows={sessionTypes.rows}
            rowKey={(sessionType) => sessionType.id}
            emptyMessage="No session types match this search."
          />
        )}
        <TablePagination
          page={sessionTypes.page}
          pageSize={pageSize}
          totalItems={sessionTypes.totalItems}
          onPageChange={sessionTypes.setPage}
          onPageSizeChange={(next) => {
            sessionTypes.resetPagination();
            setPageSize(next);
          }}
        />
      </Card>

      <SessionTypeFormModal
        title="Add session type"
        open={createOpen}
        isPending={createSessionType.isPending}
        onOpenChange={setCreateOpen}
        onSubmit={(values) =>
          createSessionType.mutate({
            name: values.name.trim(),
            durationMinutes: values.durationMinutes,
          })
        }
      />
      <SessionTypeFormModal
        title={
          activeSessionType
            ? `Edit ${activeSessionType.name}`
            : "Edit session type"
        }
        open={Boolean(activeSessionType)}
        initial={activeSessionType}
        isPending={updateSessionType.isPending}
        onOpenChange={(open) => !open && setActiveSessionType(null)}
        onSubmit={(values) => {
          if (!activeSessionType) return;
          updateSessionType.mutate({
            id: activeSessionType.id,
            payload: {
              name: values.name.trim(),
              durationMinutes: values.durationMinutes,
            },
          });
        }}
      />
    </>
  );
}

function SessionTypeFormModal({
  title,
  open,
  initial,
  isPending,
  onOpenChange,
  onSubmit,
}: {
  title: string;
  open: boolean;
  initial?: SessionTypeRecord | null;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: SessionTypeForm) => void;
}) {
  const form = useForm<SessionTypeForm>({
    resolver: zodResolver(sessionTypeSchema),
    defaultValues: {
      name: initial?.name ?? "",
      durationMinutes: initial?.durationMinutes ?? 60,
    },
  });
  React.useEffect(() => {
    if (!open) return;
    form.reset({
      name: initial?.name ?? "",
      durationMinutes: initial?.durationMinutes ?? 60,
    });
  }, [form, initial, open]);

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          label="Session type name"
          error={form.formState.errors.name?.message}
        >
          <FormInput
            placeholder="e.g. Portfolio review"
            {...form.register("name")}
          />
        </FormField>
        <FormField
          label="Session duration"
          error={form.formState.errors.durationMinutes?.message}
        >
          <FormInput
            type="number"
            min={15}
            max={480}
            step={15}
            placeholder="60"
            {...form.register("durationMinutes", { valueAsNumber: true })}
          />
          <p className="mt-1 text-xs text-ink-muted">
            Enter 15 to 480 minutes. Future booking slots use this duration.
          </p>
        </FormField>
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={isPending}
            loadingLabel="Saving session type"
          >
            Save session type
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} minutes`;
  const hours = minutes / 60;
  return Number.isInteger(hours)
    ? `${hours} hour${hours === 1 ? "" : "s"}`
    : `${minutes} minutes`;
}
