"use client";

import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/shared/Button";
import { DatePicker, DateRangePicker } from "@/components/shared/DatePicker";
import {
  FormAutocomplete,
  FormField,
  FormInput,
  FormRow2,
  FormTextarea,
} from "@/components/shared/FormField";
import { Modal } from "@/components/shared/Modal";
import {
  useProgrammeAccessQuery,
  useProgrammeGoalsQuery,
  type FundraisingRoundPayload,
  type FundraisingRoundRecord,
  type PeriodicUpdatePayload,
  type PeriodicUpdateRecord,
  type ProgrammeGoalPayload,
  type ProgrammeGoalRecord,
} from "@/lib/api/entrepreneurs";
import { useLazyProgrammeGoalTypesQuery } from "@/lib/api/settings";

const goalSchema = z.object({
  goalTypeId: z.string().min(1, "Select a goal type"),
  programmeId: z.string().optional(),
  targetAmount: z.string().optional(),
  description: z.string().max(1000).optional(),
  milestoneAchieved: z.boolean(),
});
type GoalForm = z.infer<typeof goalSchema>;

const fundingSchema = z.object({
  name: z.string().min(1, "Round name is required"),
  amount: z.string().min(1, "Amount is required"),
  date: z.string().min(1, "Date is required"),
  source: z.string().max(160).optional(),
  programmeId: z.string().optional(),
  programmeGoalId: z.string().optional(),
});
type FundingForm = z.infer<typeof fundingSchema>;

const updateSchema = z.object({
  programmeId: z.string().optional(),
  periodStart: z.string().min(1, "Choose a period start"),
  periodEnd: z.string().min(1, "Choose a period end"),
  jobsWomen: z.coerce.number().int().min(0),
  jobsMen: z.coerce.number().int().min(0),
  notes: z.string().max(1500).optional(),
});
type UpdateForm = z.infer<typeof updateSchema>;

export function ProgrammeGoalRecordModal({
  open,
  onOpenChange,
  entrepreneurId,
  goal,
  isPending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entrepreneurId: string | null;
  goal?: ProgrammeGoalRecord;
  isPending: boolean;
  onSubmit: (payload: ProgrammeGoalPayload) => void;
}) {
  const [typeLookup, setTypeLookup] = React.useState({
    open: false,
    search: "",
  });
  const [programmeLookup, setProgrammeLookup] = React.useState({
    open: false,
    search: "",
  });
  const goalTypes = useLazyProgrammeGoalTypesQuery({
    enabled: open && typeLookup.open,
    search: React.useDeferredValue(typeLookup.search) || undefined,
    active: true,
    take: 20,
  });
  const programmes = useProgrammeAccessQuery(
    open ? entrepreneurId : null,
    {
      search: React.useDeferredValue(programmeLookup.search) || undefined,
      take: 20,
    },
    programmeLookup.open,
  );
  const form = useForm<GoalForm>({
    resolver: zodResolver(goalSchema),
    defaultValues: goalDefaults(goal),
  });
  const goalTypeId = useWatch({ control: form.control, name: "goalTypeId" });
  const programmeId = useWatch({ control: form.control, name: "programmeId" });
  const selectedType =
    goal?.goalType.id === goalTypeId
      ? goal.goalType
      : goalTypes.data?.pages
          .flatMap((page) => page.items)
          .find((item) => item.id === goalTypeId);

  React.useEffect(() => {
    if (open) form.reset(goalDefaults(goal));
  }, [form, goal, open]);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={goal ? "Edit programme goal" : "Add programme goal"}
      width="wide"
    >
      <form
        onSubmit={form.handleSubmit((values) =>
          onSubmit({
            goalTypeId: values.goalTypeId,
            programmeId: values.programmeId || null,
            targetAmountCents: values.targetAmount
              ? Math.round(Number(values.targetAmount) * 100)
              : null,
            description: values.description || null,
            milestoneAchieved: values.milestoneAchieved,
          }),
        )}
        className="space-y-4"
      >
        <FormField
          label="Goal type"
          error={form.formState.errors.goalTypeId?.message}
          className="mb-0"
        >
          <FormAutocomplete
            value={goalTypeId}
            onValueChange={(value) =>
              form.setValue("goalTypeId", value, { shouldValidate: true })
            }
            options={unique([
              ...(goal
                ? [{ value: goal.goalType.id, label: goal.goalType.name }]
                : []),
              ...(
                goalTypes.data?.pages.flatMap((page) => page.items) ?? []
              ).map((item) => ({
                value: item.id,
                label: item.name,
                description: item.description,
              })),
            ])}
            placeholder="Select goal type"
            searchPlaceholder="Search goal types..."
            emptyMessage="No active goal type found."
            isLoading={goalTypes.isFetching}
            onOpenChange={(value) =>
              setTypeLookup((state) => ({ ...state, open: value }))
            }
            onSearchChange={(search) =>
              setTypeLookup((state) => ({ ...state, search }))
            }
            hasMore={Boolean(goalTypes.hasNextPage)}
            onLoadMore={() => void goalTypes.fetchNextPage()}
          />
        </FormField>
        <FormField label="Programme scope" optional className="mb-0">
          <FormAutocomplete
            value={programmeId ?? ""}
            onValueChange={(value) => form.setValue("programmeId", value)}
            options={unique([
              { value: "", label: "Business-level / no programme" },
              ...(goal?.programme
                ? [{ value: goal.programme.id, label: goal.programme.name }]
                : []),
              ...programmes.rows.map((item) => ({
                value: item.id,
                label: item.name,
                description: `${formatDate(item.startDate)} – ${formatDate(item.endDate)}`,
              })),
            ])}
            placeholder="Business-level / no programme"
            searchPlaceholder="Search assigned programmes..."
            emptyMessage="No assigned programme found."
            isLoading={programmes.isFetching}
            onOpenChange={(value) =>
              setProgrammeLookup((state) => ({ ...state, open: value }))
            }
            onSearchChange={(search) =>
              setProgrammeLookup((state) => ({ ...state, search }))
            }
            hasMore={Boolean(programmes.hasNextPage)}
            onLoadMore={() => void programmes.fetchNextPage()}
          />
        </FormField>
        {selectedType?.requiresTargetAmount ? (
          <FormField
            label="Target amount"
            error={form.formState.errors.targetAmount?.message}
            className="mb-0"
          >
            <FormInput
              type="number"
              min="0"
              step="0.01"
              {...form.register("targetAmount")}
            />
          </FormField>
        ) : null}
        <FormField label="Goal description" optional className="mb-0">
          <FormTextarea rows={3} {...form.register("description")} />
        </FormField>
        <label className="flex items-center gap-3 rounded-xl border border-line bg-surface-subtle p-3 text-sm text-ink">
          <input
            type="checkbox"
            className="h-4 w-4 accent-bid"
            {...form.register("milestoneAchieved")}
          />
          <span className="font-semibold">Milestone achieved</span>
        </label>
        <ModalActions
          pending={isPending}
          submitLabel={goal ? "Save goal" : "Add goal"}
          onCancel={() => onOpenChange(false)}
        />
      </form>
    </Modal>
  );
}

export function FundraisingRoundRecordModal({
  open,
  onOpenChange,
  entrepreneurId,
  round,
  isPending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entrepreneurId: string | null;
  round?: FundraisingRoundRecord;
  isPending: boolean;
  onSubmit: (payload: FundraisingRoundPayload) => void;
}) {
  const [programmeLookup, setProgrammeLookup] = React.useState({
    open: false,
    search: "",
  });
  const [goalLookup, setGoalLookup] = React.useState({
    open: false,
    search: "",
  });
  const programmes = useProgrammeAccessQuery(
    open ? entrepreneurId : null,
    {
      search: React.useDeferredValue(programmeLookup.search) || undefined,
      take: 20,
    },
    programmeLookup.open,
  );
  const goals = useProgrammeGoalsQuery(
    open ? entrepreneurId : null,
    {
      search: React.useDeferredValue(goalLookup.search) || undefined,
      linkableOnly: true,
      take: 20,
    },
    goalLookup.open,
  );
  const form = useForm<FundingForm>({
    resolver: zodResolver(fundingSchema),
    defaultValues: fundingDefaults(round),
  });
  const programmeId = useWatch({ control: form.control, name: "programmeId" });
  const programmeGoalId = useWatch({
    control: form.control,
    name: "programmeGoalId",
  });
  React.useEffect(() => {
    if (open) form.reset(fundingDefaults(round));
  }, [form, open, round]);
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={round ? "Edit fundraising round" : "Add fundraising round"}
      width="wide"
    >
      <form
        onSubmit={form.handleSubmit((values) =>
          onSubmit({
            name: values.name,
            amountCents: Math.round(Number(values.amount) * 100),
            currency: round?.currency ?? "USD",
            date: values.date,
            source: values.source || null,
            programmeId: values.programmeId || null,
            programmeGoalId: values.programmeGoalId || null,
          }),
        )}
        className="space-y-4"
      >
        <FormField
          label="Round name"
          error={form.formState.errors.name?.message}
          className="mb-0"
        >
          <FormInput
            {...form.register("name")}
            placeholder="Pre-seed, Seed, Series A..."
          />
        </FormField>
        <FormRow2>
          <FormField
            label={`Amount (${round?.currency ?? "USD"})`}
            error={form.formState.errors.amount?.message}
            className="mb-0"
          >
            <FormInput
              type="number"
              min="0"
              step="0.01"
              {...form.register("amount")}
            />
          </FormField>
          <FormField
            label="Date"
            error={form.formState.errors.date?.message}
            className="mb-0"
          >
            <DatePicker
              value={useWatch({ control: form.control, name: "date" })}
              onChange={(value) =>
                form.setValue("date", value, { shouldValidate: true })
              }
            />
          </FormField>
        </FormRow2>
        <FormField label="Funding source" optional className="mb-0">
          <FormInput {...form.register("source")} />
        </FormField>
        <FormField label="Programme attribution" optional className="mb-0">
          <FormAutocomplete
            value={programmeId ?? ""}
            onValueChange={(value) => form.setValue("programmeId", value)}
            options={unique([
              { value: "", label: "Company-wide / unattributed" },
              ...(round?.programme
                ? [{ value: round.programme.id, label: round.programme.name }]
                : []),
              ...programmes.rows.map((item) => ({
                value: item.id,
                label: item.name,
              })),
            ])}
            placeholder="Company-wide / unattributed"
            searchPlaceholder="Search assigned programmes..."
            emptyMessage="No assigned programme found."
            isLoading={programmes.isFetching}
            onOpenChange={(value) =>
              setProgrammeLookup((state) => ({ ...state, open: value }))
            }
            onSearchChange={(search) =>
              setProgrammeLookup((state) => ({ ...state, search }))
            }
            hasMore={Boolean(programmes.hasNextPage)}
            onLoadMore={() => void programmes.fetchNextPage()}
          />
        </FormField>
        <FormField label="Linked programme goal" optional className="mb-0">
          <FormAutocomplete
            value={programmeGoalId ?? ""}
            onValueChange={(value) => form.setValue("programmeGoalId", value)}
            options={unique([
              { value: "", label: "Not linked to a goal" },
              ...(round?.programmeGoal?.linkable
                ? [
                    {
                      value: round.programmeGoal.id,
                      label:
                        round.programmeGoal.description ||
                        round.programmeGoal.goalType.name,
                    },
                  ]
                : []),
              ...goals.rows.map((item) => ({
                value: item.id,
                label: item.description || item.goalType.name,
                description: item.programme?.name,
              })),
            ])}
            placeholder="Not linked to a goal"
            searchPlaceholder="Search goals..."
            emptyMessage="No programme goal found."
            isLoading={goals.isFetching}
            onOpenChange={(value) =>
              setGoalLookup((state) => ({ ...state, open: value }))
            }
            onSearchChange={(search) =>
              setGoalLookup((state) => ({ ...state, search }))
            }
            hasMore={Boolean(goals.hasNextPage)}
            onLoadMore={() => void goals.fetchNextPage()}
          />
        </FormField>
        <ModalActions
          pending={isPending}
          submitLabel={round ? "Save round" : "Add round"}
          onCancel={() => onOpenChange(false)}
        />
      </form>
    </Modal>
  );
}

export function PeriodicUpdateRecordModal({
  open,
  onOpenChange,
  entrepreneurId,
  update,
  isPending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entrepreneurId: string | null;
  update?: PeriodicUpdateRecord;
  isPending: boolean;
  onSubmit: (payload: PeriodicUpdatePayload) => void;
}) {
  const [programmeLookup, setProgrammeLookup] = React.useState({
    open: false,
    search: "",
  });
  const programmes = useProgrammeAccessQuery(
    open ? entrepreneurId : null,
    {
      search: React.useDeferredValue(programmeLookup.search) || undefined,
      take: 20,
    },
    programmeLookup.open,
  );
  const form = useForm<UpdateForm>({
    resolver: zodResolver(updateSchema),
    defaultValues: updateDefaults(update),
  });
  const programmeId = useWatch({ control: form.control, name: "programmeId" });
  const periodStart = useWatch({ control: form.control, name: "periodStart" });
  const periodEnd = useWatch({ control: form.control, name: "periodEnd" });
  React.useEffect(() => {
    if (open) form.reset(updateDefaults(update));
  }, [form, open, update]);
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={update ? "Edit periodic update" : "Submit periodic update"}
      width="wide"
    >
      <form
        onSubmit={form.handleSubmit((values) =>
          onSubmit({
            programmeId: values.programmeId || null,
            periodStart: values.periodStart,
            periodEnd: values.periodEnd,
            jobsWomen: values.jobsWomen,
            jobsMen: values.jobsMen,
            jobsCreated: values.jobsWomen + values.jobsMen,
            notes: values.notes || null,
          }),
        )}
        className="space-y-4"
      >
        <div className="rounded-xl border border-line bg-surface-subtle p-4 text-sm text-ink-muted">
          Report jobs created for one period. Funding is recorded separately to
          avoid double counting.
        </div>
        <FormField label="Reporting scope" optional className="mb-0">
          <FormAutocomplete
            value={programmeId ?? ""}
            onValueChange={(value) => form.setValue("programmeId", value)}
            options={unique([
              { value: "", label: "Company-wide" },
              ...(update?.programme
                ? [{ value: update.programme.id, label: update.programme.name }]
                : []),
              ...programmes.rows.map((item) => ({
                value: item.id,
                label: item.name,
              })),
            ])}
            placeholder="Company-wide"
            searchPlaceholder="Search assigned programmes..."
            emptyMessage="No assigned programme found."
            isLoading={programmes.isFetching}
            onOpenChange={(value) =>
              setProgrammeLookup((state) => ({ ...state, open: value }))
            }
            onSearchChange={(search) =>
              setProgrammeLookup((state) => ({ ...state, search }))
            }
            hasMore={Boolean(programmes.hasNextPage)}
            onLoadMore={() => void programmes.fetchNextPage()}
          />
        </FormField>
        <FormField
          label="Reporting period"
          error={
            form.formState.errors.periodStart?.message ??
            form.formState.errors.periodEnd?.message
          }
          className="mb-0"
        >
          <DateRangePicker
            startValue={periodStart}
            endValue={periodEnd}
            onChange={(value) => {
              form.setValue("periodStart", value.start, {
                shouldValidate: true,
              });
              form.setValue("periodEnd", value.end, { shouldValidate: true });
            }}
          />
        </FormField>
        <FormRow2>
          <FormField label="Women jobs created" className="mb-0">
            <FormInput type="number" min="0" {...form.register("jobsWomen")} />
          </FormField>
          <FormField label="Men jobs created" className="mb-0">
            <FormInput type="number" min="0" {...form.register("jobsMen")} />
          </FormField>
        </FormRow2>
        <FormField label="Update notes" optional className="mb-0">
          <FormTextarea rows={3} {...form.register("notes")} />
        </FormField>
        <ModalActions
          pending={isPending}
          submitLabel={update ? "Save update" : "Submit update"}
          onCancel={() => onOpenChange(false)}
        />
      </form>
    </Modal>
  );
}

function ModalActions({
  pending,
  submitLabel,
  onCancel,
}: {
  pending: boolean;
  submitLabel: string;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
      <Button type="button" variant="outline" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="submit" isLoading={pending} loadingLabel="Saving...">
        {submitLabel}
      </Button>
    </div>
  );
}
function goalDefaults(goal?: ProgrammeGoalRecord): GoalForm {
  return {
    goalTypeId: goal?.goalType.id ?? "",
    programmeId: goal?.programme?.id ?? "",
    targetAmount:
      goal?.targetAmountCents == null
        ? ""
        : String(goal.targetAmountCents / 100),
    description: goal?.description ?? "",
    milestoneAchieved: goal?.milestoneAchieved ?? false,
  };
}
function fundingDefaults(round?: FundraisingRoundRecord): FundingForm {
  return {
    name: round?.name ?? "",
    amount: round ? String(round.amountCents / 100) : "",
    date: round?.date.slice(0, 10) ?? "",
    source: round?.source ?? "",
    programmeId: round?.programme?.id ?? "",
    programmeGoalId: round?.programmeGoal?.linkable
      ? round.programmeGoal.id
      : "",
  };
}
function updateDefaults(update?: PeriodicUpdateRecord): UpdateForm {
  return {
    programmeId: update?.programme?.id ?? "",
    periodStart: update?.periodStart.slice(0, 10) ?? "",
    periodEnd: update?.periodEnd.slice(0, 10) ?? "",
    jobsWomen: update?.jobsWomen ?? 0,
    jobsMen: update?.jobsMen ?? 0,
    notes: update?.notes ?? "",
  };
}
function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
function unique<T extends { value: string }>(items: T[]) {
  return items.filter(
    (item, index) =>
      items.findIndex((candidate) => candidate.value === item.value) === index,
  );
}
