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
import {
  FormField,
  FormInput,
  FormTextarea,
} from "@/components/shared/FormField";
import {
  useCreateProgrammeGoalTypeMutation,
  useProgrammeGoalTypesPage,
  useUpdateProgrammeGoalTypeMutation,
  type ProgrammeGoalTypeRecord,
} from "@/lib/api/settings";
import {
  programmeGoalTypeSchema,
  type ProgrammeGoalTypeForm,
} from "@/lib/forms/schemas";

export default function AdminGoalTypesPage() {
  const [query, setQuery] = React.useState("");
  const [pageSize, setPageSize] = React.useState(10);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [activeGoalType, setActiveGoalType] =
    React.useState<ProgrammeGoalTypeRecord | null>(null);
  const goalTypes = useProgrammeGoalTypesPage({
    search: query,
    take: pageSize,
  });
  const createGoalType = useCreateProgrammeGoalTypeMutation({
    onSuccess: () => {
      setCreateOpen(false);
      toast.success("Goal type added");
    },
    onError: (error) => toast.error(error.message),
  });
  const updateGoalType = useUpdateProgrammeGoalTypeMutation({
    onSuccess: () => {
      setActiveGoalType(null);
      toast.success("Goal type updated");
    },
    onError: (error) => toast.error(error.message),
  });

  const columns: Column<ProgrammeGoalTypeRecord>[] = [
    {
      key: "actions",
      header: "Action",
      cell: (goalType) => (
        <RowActions
          actions={[
            {
              label: "Edit goal type",
              onSelect: () => setActiveGoalType(goalType),
            },
            {
              label: goalType.active ? "Deactivate" : "Activate",
              onSelect: () =>
                updateGoalType.mutate({
                  id: goalType.id,
                  payload: { active: !goalType.active },
                }),
              disabled: updateGoalType.isPending,
            },
          ]}
        />
      ),
      className: "w-[84px]",
    },
    {
      key: "name",
      header: "Goal type",
      cell: (goalType) => (
        <button
          type="button"
          onClick={() => setActiveGoalType(goalType)}
          className="text-left font-medium text-ink transition hover:text-bid"
        >
          {goalType.name}
        </button>
      ),
    },
    {
      key: "key",
      header: "Key",
      cell: (goalType) => (
        <span className="font-mono text-xs text-ink-muted">{goalType.key}</span>
      ),
    },
    {
      key: "description",
      header: "Description",
      cell: (goalType) => (
        <p className="max-w-2xl text-sm leading-6 text-ink-muted">
          {goalType.description ?? "No description added yet."}
        </p>
      ),
    },
    {
      key: "target",
      header: "Target amount",
      cell: (goalType) => (
        <Badge tone={goalType.requiresTargetAmount ? "blue" : "neutral"}>
          {goalType.requiresTargetAmount ? "Required" : "Not required"}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (goalType) => (
        <Badge tone={goalType.active ? "green" : "neutral"}>
          {goalType.active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ];

  if (goalTypes.isLoading) {
    return (
      <>
        <PageHeader
          title="Goal types"
          description="Manage the goal types entrepreneurs can attach to programme goals."
        />
        <TableSkeleton columns={6} rows={8} />
      </>
    );
  }

  if (goalTypes.isError) {
    return (
      <>
        <PageHeader
          title="Goal types"
          description="Manage programme goal types."
        />
        <Card>
          <Notice>
            Goal types could not be loaded. {goalTypes.error.message}
          </Notice>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => void goalTypes.refetch()}
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
        title="Goal types"
        description="Manage the goal types entrepreneurs can attach to programme goals."
      />
      <Card>
        <CardHeader
          title="Programme goal type list"
          description={`${goalTypes.totalItems} goal type${goalTypes.totalItems === 1 ? "" : "s"} in this view`}
          actions={
            <Button onClick={() => setCreateOpen(true)}>+ Add goal type</Button>
          }
        />
        <TableToolbar>
          <div>
            <div className="text-sm font-medium text-ink">
              Search goal types
            </div>
            <div className="mt-0.5 text-sm text-ink-muted">
              Find goal types by name, key, or description.
            </div>
          </div>
          <TableFilterInput
            icon
            className="w-full sm:w-[320px]"
            placeholder="Search goal types..."
            value={query}
            onChange={(event) => {
              goalTypes.resetPagination();
              setQuery(event.target.value);
            }}
          />
        </TableToolbar>
        <DataTable
          columns={columns}
          rows={goalTypes.rows}
          rowKey={(goalType) => goalType.id}
          emptyMessage="No goal types match this search."
          tableClassName="min-w-[980px]"
        />
        <TablePagination
          page={goalTypes.page}
          pageSize={pageSize}
          totalItems={goalTypes.totalItems}
          onPageChange={goalTypes.setPage}
          onPageSizeChange={(next) => {
            goalTypes.resetPagination();
            setPageSize(next);
          }}
        />
      </Card>

      <GoalTypeModal
        title="Add goal type"
        open={createOpen}
        isPending={createGoalType.isPending}
        onOpenChange={setCreateOpen}
        onSubmit={(values) =>
          createGoalType.mutate({
            name: values.label.trim(),
            description: values.description?.trim() || undefined,
            requiresTargetAmount: !!values.requiresTargetAmount,
          })
        }
      />
      <GoalTypeModal
        title={
          activeGoalType ? `Edit ${activeGoalType.name}` : "Edit goal type"
        }
        open={!!activeGoalType}
        initialValue={activeGoalType}
        isPending={updateGoalType.isPending}
        onOpenChange={(open) => !open && setActiveGoalType(null)}
        onSubmit={(values) => {
          if (!activeGoalType) return;
          updateGoalType.mutate({
            id: activeGoalType.id,
            payload: {
              name: values.label.trim(),
              description: values.description?.trim() || "",
              requiresTargetAmount: !!values.requiresTargetAmount,
            },
          });
        }}
      />
    </>
  );
}

function GoalTypeModal({
  title,
  open,
  initialValue,
  isPending,
  onOpenChange,
  onSubmit,
}: {
  title: string;
  open: boolean;
  initialValue?: ProgrammeGoalTypeRecord | null;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ProgrammeGoalTypeForm) => void;
}) {
  const form = useForm<ProgrammeGoalTypeForm>({
    resolver: zodResolver(programmeGoalTypeSchema),
    defaultValues: {
      label: initialValue?.name ?? "",
      description: initialValue?.description ?? "",
      requiresTargetAmount: initialValue?.requiresTargetAmount ?? false,
    },
  });

  React.useEffect(() => {
    if (!open) return;
    form.reset({
      label: initialValue?.name ?? "",
      description: initialValue?.description ?? "",
      requiresTargetAmount: initialValue?.requiresTargetAmount ?? false,
    });
  }, [form, initialValue, open]);

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title} width="wide">
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          label="Goal type name"
          error={form.formState.errors.label?.message}
        >
          <FormInput
            placeholder="e.g. Revenue growth target"
            {...form.register("label")}
          />
        </FormField>
        <FormField
          label="Description"
          optional
          error={form.formState.errors.description?.message}
        >
          <FormTextarea
            rows={3}
            placeholder="Explain when entrepreneurs should use this goal type."
            {...form.register("description")}
          />
        </FormField>
        <label className="mb-5 flex items-start gap-3 rounded-xl border border-line bg-surface-subtle px-4 py-3">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-line text-bid focus:ring-bid"
            {...form.register("requiresTargetAmount")}
          />
          <span>
            <span className="block text-sm font-medium text-ink">
              Requires a target amount
            </span>
            <span className="mt-1 block text-sm leading-5 text-ink-muted">
              Use this for goal types such as fundraising where entrepreneurs
              should enter a target amount.
            </span>
          </span>
        </label>
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
            loadingLabel="Saving goal type"
          >
            Save goal type
          </Button>
        </div>
      </form>
    </Modal>
  );
}
