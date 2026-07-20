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
import {
  FormField,
  FormInput,
  FormTextarea,
} from "@/components/shared/FormField";
import {
  useBusinessStagesPage,
  useCreateBusinessStageMutation,
  useUpdateBusinessStageMutation,
  type BusinessStageRecord,
} from "@/lib/api/settings";
import {
  businessStageSchema,
  type BusinessStageForm,
} from "@/lib/forms/schemas";

export default function AdminBusinessStagesPage() {
  const [query, setQuery] = React.useState("");
  const debouncedQuery = useDebouncedValue(query.trim());
  const [pageSize, setPageSize] = React.useState(10);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [activeStage, setActiveStage] =
    React.useState<BusinessStageRecord | null>(null);
  const stages = useBusinessStagesPage({ search: debouncedQuery || undefined, take: pageSize });
  const createStage = useCreateBusinessStageMutation({
    onSuccess: () => {
      setCreateOpen(false);
      toast.success("Business stage added");
    },
    onError: (error) => toast.error(error.message),
  });
  const updateStage = useUpdateBusinessStageMutation({
    onSuccess: () => {
      setActiveStage(null);
      toast.success("Business stage updated");
    },
    onError: (error) => toast.error(error.message),
  });

  const columns: Column<BusinessStageRecord>[] = [
    {
      key: "actions",
      header: "Action",
      cell: (stage) => (
        <RowActions
          actions={[
            { label: "Edit stage", onSelect: () => setActiveStage(stage) },
            {
              label: stage.active ? "Deactivate" : "Activate",
              onSelect: () =>
                updateStage.mutate({
                  id: stage.id,
                  payload: { active: !stage.active },
                }),
              disabled: updateStage.isPending,
            },
          ]}
        />
      ),
      className: "w-[84px]",
    },
    {
      key: "stage",
      header: "Stage",
      cell: (stage) => (
        <button
          type="button"
          onClick={() => setActiveStage(stage)}
          className="text-left font-medium text-ink transition hover:text-bid"
        >
          {stage.name}
        </button>
      ),
      className: "w-[220px]",
    },
    {
      key: "key",
      header: "Key",
      cell: (stage) => (
        <span className="font-mono text-xs text-ink-muted">{stage.key}</span>
      ),
      className: "w-[180px]",
    },
    {
      key: "definition",
      header: "Definition",
      cell: (stage) => (
        <p className="max-w-3xl text-sm leading-6 text-ink-muted">
          {stage.definition}
        </p>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (stage) => (
        <Badge tone={stage.active ? "green" : "neutral"}>
          {stage.active ? "Active" : "Inactive"}
        </Badge>
      ),
      className: "w-[140px]",
    },
  ];

  if (stages.isLoading) {
    return (
      <>
        <PageHeader
          title="Business stages"
          description="Manage the stage definitions used across entrepreneur profiles and reporting."
        />
        <TableSkeleton columns={5} rows={8} />
      </>
    );
  }

  if (stages.isError) {
    return (
      <>
        <PageHeader
          title="Business stages"
          description="Manage platform stage definitions."
        />
        <Card>
          <Notice>
            Business stages could not be loaded. {stages.error.message}
          </Notice>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => void stages.refetch()}
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
        title="Business stages"
        description="Manage the stage definitions used across entrepreneur profiles and reporting."
      />
      <Card>
        <CardHeader
          title="Stage definitions"
          description={`${stages.totalItems} stage${stages.totalItems === 1 ? "" : "s"} in this view`}
          actions={
            <Button onClick={() => setCreateOpen(true)}>+ Add stage</Button>
          }
        />
        <TableToolbar>
          <div>
            <div className="text-sm font-medium text-ink">Search stages</div>
            <div className="mt-0.5 text-sm text-ink-muted">
              Find a stage by name, key, or definition.
            </div>
          </div>
          <TableFilterInput
            icon
            className="w-full sm:w-[320px]"
            placeholder="Search stages..."
            value={query}
            onChange={(event) => {
              stages.resetPagination();
              setQuery(event.target.value);
            }}
          />
        </TableToolbar>
        <DataTable
          columns={columns}
          rows={stages.rows}
          rowKey={(stage) => stage.id}
          emptyMessage="No business stages match this search."
        />
        <TablePagination
          page={stages.page}
          pageSize={pageSize}
          totalItems={stages.totalItems}
          onPageChange={stages.setPage}
          onPageSizeChange={(next) => {
            stages.resetPagination();
            setPageSize(next);
          }}
        />
      </Card>

      <StageFormModal
        title="Add stage"
        open={createOpen}
        isPending={createStage.isPending}
        onOpenChange={setCreateOpen}
        onSubmit={(values) =>
          createStage.mutate({
            name: values.label.trim(),
            definition: values.definition.trim(),
          })
        }
      />
      <StageFormModal
        title={activeStage ? `Edit ${activeStage.name}` : "Edit stage"}
        open={!!activeStage}
        initialValue={activeStage}
        isPending={updateStage.isPending}
        onOpenChange={(open) => !open && setActiveStage(null)}
        onSubmit={(values) => {
          if (!activeStage) return;
          updateStage.mutate({
            id: activeStage.id,
            payload: {
              name: values.label.trim(),
              definition: values.definition.trim(),
            },
          });
        }}
      />
    </>
  );
}

function StageFormModal({
  title,
  open,
  initialValue,
  isPending,
  onOpenChange,
  onSubmit,
}: {
  title: string;
  open: boolean;
  initialValue?: BusinessStageRecord | null;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: BusinessStageForm) => void;
}) {
  const form = useForm<BusinessStageForm>({
    resolver: zodResolver(businessStageSchema),
    defaultValues: {
      label: initialValue?.name ?? "",
      definition: initialValue?.definition ?? "",
    },
  });

  React.useEffect(() => {
    if (!open) return;
    form.reset({
      label: initialValue?.name ?? "",
      definition: initialValue?.definition ?? "",
    });
  }, [form, initialValue, open]);

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title} width="wide">
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          label="Stage name"
          error={form.formState.errors.label?.message}
        >
          <FormInput placeholder="e.g. Expansion" {...form.register("label")} />
        </FormField>
        <FormField
          label="Stage definition"
          error={form.formState.errors.definition?.message}
        >
          <FormTextarea
            rows={5}
            placeholder="Describe when an entrepreneur belongs in this stage."
            {...form.register("definition")}
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
            loadingLabel="Saving stage"
          >
            Save stage
          </Button>
        </div>
      </form>
    </Modal>
  );
}
