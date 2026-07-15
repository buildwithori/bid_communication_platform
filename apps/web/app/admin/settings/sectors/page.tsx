"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PageHeader, Notice } from "@/components/shared/PageHeader";
import { Card, CardHeader, TableSkeleton } from "@/components/shared/Card";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import {
  DataTable,
  RowActions,
  TableFilterInput,
  TablePagination,
  TableToolbar,
  type Column,
} from "@/components/shared/DataTable";
import { Modal } from "@/components/shared/Modal";
import { FormField, FormInput } from "@/components/shared/FormField";
import {
  useCreateSectorMutation,
  useSectorsPage,
  useUpdateSectorMutation,
  type LookupRecord,
} from "@/lib/api/settings";
import { newSectorSchema, type NewSectorForm } from "@/lib/forms/schemas";

export default function AdminSectorsPage() {
  const [query, setQuery] = React.useState("");
  const [pageSize, setPageSize] = React.useState(10);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [activeSector, setActiveSector] = React.useState<LookupRecord | null>(
    null,
  );
  const sectors = useSectorsPage({ search: query, take: pageSize });
  const createSector = useCreateSectorMutation({
    onSuccess: () => {
      setCreateOpen(false);
      toast.success("Sector added");
    },
    onError: (error) => toast.error(error.message),
  });
  const updateSector = useUpdateSectorMutation({
    onSuccess: () => {
      setActiveSector(null);
      toast.success("Sector updated");
    },
    onError: (error) => toast.error(error.message),
  });

  const columns: Column<LookupRecord>[] = [
    {
      key: "actions",
      header: "Action",
      cell: (sector) => (
        <RowActions
          actions={[
            { label: "Rename sector", onSelect: () => setActiveSector(sector) },
            {
              label: sector.active ? "Deactivate" : "Activate",
              onSelect: () =>
                updateSector.mutate({
                  id: sector.id,
                  payload: { active: !sector.active },
                }),
              disabled: updateSector.isPending,
            },
          ]}
        />
      ),
      className: "w-[84px]",
    },
    {
      key: "sector",
      header: "Sector",
      cell: (sector) => (
        <button
          type="button"
          onClick={() => setActiveSector(sector)}
          className="text-left font-medium text-ink transition hover:text-bid"
        >
          {sector.name}
        </button>
      ),
      className: "w-[260px]",
    },
    {
      key: "key",
      header: "Key",
      cell: (sector) => (
        <span className="font-mono text-xs text-ink-muted">{sector.key}</span>
      ),
      className: "w-[220px]",
    },
    {
      key: "status",
      header: "Status",
      cell: (sector) => (
        <Badge tone={sector.active ? "green" : "neutral"}>
          {sector.active ? "Active" : "Inactive"}
        </Badge>
      ),
      className: "w-[140px]",
    },
  ];

  if (sectors.isLoading) {
    return (
      <>
        <PageHeader
          title="Sectors"
          description="Manage the sector list used for entrepreneur profiles, trainer matching, and reporting filters."
        />
        <TableSkeleton columns={4} rows={8} />
      </>
    );
  }

  if (sectors.isError) {
    return (
      <>
        <PageHeader
          title="Sectors"
          description="Manage the platform sector list."
        />
        <Card>
          <Notice>Sectors could not be loaded. {sectors.error.message}</Notice>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => void sectors.refetch()}
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
        title="Sectors"
        description="Manage the sector list used for entrepreneur profiles, trainer matching, and reporting filters."
      />

      <Card>
        <CardHeader
          title="Sector list"
          description={`${sectors.totalItems} sector${sectors.totalItems === 1 ? "" : "s"} in this view`}
          actions={
            <Button onClick={() => setCreateOpen(true)}>+ Add sector</Button>
          }
        />
        <TableToolbar>
          <div>
            <div className="text-sm font-medium text-ink">Search sectors</div>
            <div className="mt-0.5 text-sm text-ink-muted">
              Find sectors by name or key.
            </div>
          </div>
          <TableFilterInput
            icon
            className="w-full sm:w-[320px]"
            placeholder="Search sectors..."
            value={query}
            onChange={(event) => {
              sectors.resetPagination();
              setQuery(event.target.value);
            }}
          />
        </TableToolbar>
        <DataTable
          columns={columns}
          rows={sectors.rows}
          rowKey={(sector) => sector.id}
          emptyMessage="No sectors match this search."
        />
        <TablePagination
          page={sectors.page}
          pageSize={pageSize}
          totalItems={sectors.totalItems}
          onPageChange={sectors.setPage}
          onPageSizeChange={(next) => {
            sectors.resetPagination();
            setPageSize(next);
          }}
        />
      </Card>

      <SectorFormModal
        title="Add sector"
        open={createOpen}
        onOpenChange={setCreateOpen}
        isPending={createSector.isPending}
        onSubmit={(values) =>
          createSector.mutate({ name: values.label.trim() })
        }
      />
      <SectorFormModal
        title={activeSector ? `Rename ${activeSector.name}` : "Rename sector"}
        open={!!activeSector}
        initialValue={activeSector?.name}
        onOpenChange={(open) => !open && setActiveSector(null)}
        isPending={updateSector.isPending}
        onSubmit={(values) => {
          if (!activeSector) return;
          updateSector.mutate({
            id: activeSector.id,
            payload: { name: values.label.trim() },
          });
        }}
      />
    </>
  );
}

function SectorFormModal({
  title,
  open,
  initialValue = "",
  isPending,
  onOpenChange,
  onSubmit,
}: {
  title: string;
  open: boolean;
  initialValue?: string;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: NewSectorForm) => void;
}) {
  const form = useForm<NewSectorForm>({
    resolver: zodResolver(newSectorSchema),
    defaultValues: { label: initialValue },
  });

  React.useEffect(() => {
    if (open) form.reset({ label: initialValue });
  }, [form, initialValue, open]);

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          label="Sector name"
          error={form.formState.errors.label?.message}
        >
          <FormInput
            placeholder="e.g. Renewable Energy"
            {...form.register("label")}
          />
        </FormField>
        <div className="mt-5 flex justify-end gap-2">
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
            loadingLabel="Saving sector"
          >
            Save sector
          </Button>
        </div>
      </form>
    </Modal>
  );
}
