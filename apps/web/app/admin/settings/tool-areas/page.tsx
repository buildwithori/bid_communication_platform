"use client";

import { useDebouncedValue } from '@/lib/search';
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
  useCreateToolAreaMutation,
  useToolAreasPage,
  useUpdateToolAreaMutation,
  type LookupRecord,
} from "@/lib/api/settings";
import { toolAreaSchema, type ToolAreaForm } from "@/lib/forms/schemas";

export default function AdminToolAreasPage() {
  const [query, setQuery] = React.useState("");
  const debouncedQuery = useDebouncedValue(query.trim());
  const [pageSize, setPageSize] = React.useState(10);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [activeToolArea, setActiveToolArea] =
    React.useState<LookupRecord | null>(null);
  const toolAreas = useToolAreasPage({ search: debouncedQuery || undefined, take: pageSize });
  const createToolArea = useCreateToolAreaMutation({
    onSuccess: () => {
      setCreateOpen(false);
      toast.success("Tool area added");
    },
    onError: (error) => toast.error(error.message),
  });
  const updateToolArea = useUpdateToolAreaMutation({
    onSuccess: () => {
      setActiveToolArea(null);
      toast.success("Tool area updated");
    },
    onError: (error) => toast.error(error.message),
  });

  const columns: Column<LookupRecord>[] = [
    {
      key: "actions",
      header: "Action",
      cell: (toolArea) => (
        <RowActions
          actions={[
            {
              label: "Rename tool area",
              onSelect: () => setActiveToolArea(toolArea),
            },
            {
              label: toolArea.active ? "Deactivate" : "Activate",
              onSelect: () =>
                updateToolArea.mutate({
                  id: toolArea.id,
                  payload: { active: !toolArea.active },
                }),
              disabled: updateToolArea.isPending,
            },
          ]}
        />
      ),
      className: "w-[84px]",
    },
    {
      key: "name",
      header: "Tool area",
      cell: (toolArea) => (
        <button
          type="button"
          onClick={() => setActiveToolArea(toolArea)}
          className="text-left font-medium text-ink transition hover:text-bid"
        >
          {toolArea.name}
        </button>
      ),
      className: "w-[280px]",
    },
    {
      key: "key",
      header: "Key",
      cell: (toolArea) => (
        <span className="font-mono text-xs text-ink-muted">{toolArea.key}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (toolArea) => (
        <Badge tone={toolArea.active ? "green" : "neutral"}>
          {toolArea.active ? "Active" : "Inactive"}
        </Badge>
      ),
      className: "w-[140px]",
    },
  ];

  if (toolAreas.isLoading) {
    return (
      <>
        <PageHeader
          title="Tool areas"
          description="Manage the categories used to organise entrepreneur tools and tool requests."
        />
        <TableSkeleton columns={4} rows={8} />
      </>
    );
  }

  if (toolAreas.isError) {
    return (
      <>
        <PageHeader
          title="Tool areas"
          description="Manage platform tool categories."
        />
        <Card>
          <Notice>
            Tool areas could not be loaded. {toolAreas.error.message}
          </Notice>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => void toolAreas.refetch()}
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
        title="Tool areas"
        description="Manage the categories used to organise entrepreneur tools and tool requests."
      />
      <Card>
        <CardHeader
          title="Tool area list"
          description={`${toolAreas.totalItems} tool area${toolAreas.totalItems === 1 ? "" : "s"} in this view`}
          actions={
            <Button onClick={() => setCreateOpen(true)}>+ Add tool area</Button>
          }
        />
        <TableToolbar>
          <div>
            <div className="text-sm font-medium text-ink">
              Search tool areas
            </div>
            <div className="mt-0.5 text-sm text-ink-muted">
              Find tool areas by name or key.
            </div>
          </div>
          <TableFilterInput
            icon
            className="w-full sm:w-[320px]"
            placeholder="Search tool areas..."
            value={query}
            onChange={(event) => {
              toolAreas.resetPagination();
              setQuery(event.target.value);
            }}
          />
        </TableToolbar>
        {toolAreas.isPlaceholderData ? (
          <TableSkeleton columns={4} rows={Math.min(pageSize, 6)} />
        ) : (
          <DataTable
            columns={columns}
            rows={toolAreas.rows}
            rowKey={(toolArea) => toolArea.id}
            emptyMessage="No tool areas match this search."
          />
        )}
        <TablePagination
          page={toolAreas.page}
          pageSize={pageSize}
          totalItems={toolAreas.totalItems}
          onPageChange={toolAreas.setPage}
          onPageSizeChange={(next) => {
            toolAreas.resetPagination();
            setPageSize(next);
          }}
        />
      </Card>

      <ToolAreaFormModal
        title="Add tool area"
        open={createOpen}
        isPending={createToolArea.isPending}
        onOpenChange={setCreateOpen}
        onSubmit={(values) =>
          createToolArea.mutate({ name: values.name.trim() })
        }
      />
      <ToolAreaFormModal
        title={
          activeToolArea ? `Rename ${activeToolArea.name}` : "Rename tool area"
        }
        open={!!activeToolArea}
        initialValue={activeToolArea?.name}
        isPending={updateToolArea.isPending}
        onOpenChange={(open) => !open && setActiveToolArea(null)}
        onSubmit={(values) => {
          if (!activeToolArea) return;
          updateToolArea.mutate({
            id: activeToolArea.id,
            payload: { name: values.name.trim() },
          });
        }}
      />
    </>
  );
}

function ToolAreaFormModal({
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
  onSubmit: (values: ToolAreaForm) => void;
}) {
  const form = useForm<ToolAreaForm>({
    resolver: zodResolver(toolAreaSchema),
    defaultValues: { name: initialValue },
  });

  React.useEffect(() => {
    if (open) form.reset({ name: initialValue });
  }, [form, initialValue, open]);

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          label="Tool area name"
          error={form.formState.errors.name?.message}
        >
          <FormInput
            placeholder="e.g. Financial Management"
            {...form.register("name")}
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
            loadingLabel="Saving tool area"
          >
            Save tool area
          </Button>
        </div>
      </form>
    </Modal>
  );
}
