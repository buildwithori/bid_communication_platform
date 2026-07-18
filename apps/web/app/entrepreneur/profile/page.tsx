"use client";

import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Mail } from "lucide-react";
import { NotificationPreferencesCard } from "@/components/settings/NotificationPreferencesCard";
import {
  FundraisingRoundRecordModal,
  PeriodicUpdateRecordModal,
  ProgrammeGoalRecordModal,
} from "@/components/entrepreneur/profile/ProfileRecordModals";
import { Avatar } from "@/components/shared/Avatar";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { Card, CardHeader, Skeleton } from "@/components/shared/Card";
import {
  DataTable,
  RowActions,
  TableFilterInput,
  TableToolbar,
  type Column,
} from "@/components/shared/DataTable";
import {
  FormAutocomplete,
  FormField,
  FormInput,
  FormRow2,
} from "@/components/shared/FormField";
import { Notice } from "@/components/shared/PageHeader";
import { Tabs } from "@/components/shared/Tabs";
import { Modal } from "@/components/shared/Modal";
import {
  useEntrepreneurProfileQuery,
  useFundraisingRoundsQuery,
  usePeriodicUpdatesQuery,
  useProgrammeAccessQuery,
  useProgrammeGoalsQuery,
  useSaveFundraisingRoundMutation,
  useSavePeriodicUpdateMutation,
  useSaveProgrammeGoalMutation,
  useUpdateEntrepreneurProfileMutation,
  type FundraisingRoundPayload,
  type FundraisingRoundRecord,
  type PeriodicUpdatePayload,
  type PeriodicUpdateRecord,
  type ProgrammeGoalPayload,
  type ProgrammeGoalRecord,
} from "@/lib/api/entrepreneurs";
import {
  useLazyBusinessStagesQuery,
  useLazySectorsQuery,
} from "@/lib/api/settings";
import { countries } from "@/lib/mock-data/definitions";

type ProfileTab = "business" | "goals" | "funding" | "updates";

const profileSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  country: z.enum(countries),
  sectorId: z.string().optional(),
  stageId: z.string().optional(),
});
type ProfileForm = z.infer<typeof profileSchema>;

const tabs = [
  { value: "business" as const, label: "Business details" },
  { value: "goals" as const, label: "Programme goals" },
  { value: "funding" as const, label: "Fundraising history" },
  { value: "updates" as const, label: "Periodic updates" },
];

export default function EntrepreneurProfilePage() {
  const [tab, setTab] = React.useState<ProfileTab>("business");
  const [goalSearch, setGoalSearch] = React.useState("");
  const [fundingSearch, setFundingSearch] = React.useState("");
  const [updateSearch, setUpdateSearch] = React.useState("");
  const [goalOpen, setGoalOpen] = React.useState(false);
  const [fundingOpen, setFundingOpen] = React.useState(false);
  const [updateOpen, setUpdateOpen] = React.useState(false);
  const [activeGoal, setActiveGoal] = React.useState<ProgrammeGoalRecord>();
  const [activeRound, setActiveRound] =
    React.useState<FundraisingRoundRecord>();
  const [activeUpdate, setActiveUpdate] =
    React.useState<PeriodicUpdateRecord>();
  const [viewUpdate, setViewUpdate] = React.useState<PeriodicUpdateRecord>();
  const profile = useEntrepreneurProfileQuery();
  const entrepreneurId = profile.data?.entrepreneurUserId ?? null;
  const programmes = useProgrammeAccessQuery(
    entrepreneurId,
    { take: 10 },
    Boolean(entrepreneurId),
  );
  const goals = useProgrammeGoalsQuery(
    entrepreneurId,
    { search: React.useDeferredValue(goalSearch) || undefined, take: 10 },
    tab === "goals",
  );
  const funding = useFundraisingRoundsQuery(
    entrepreneurId,
    { search: React.useDeferredValue(fundingSearch) || undefined, take: 10 },
    tab === "funding",
  );
  const updates = usePeriodicUpdatesQuery(
    entrepreneurId,
    { search: React.useDeferredValue(updateSearch) || undefined, take: 10 },
    tab === "updates",
  );

  const updateProfile = useUpdateEntrepreneurProfileMutation({
    onSuccess: () => toast.success("Business profile updated"),
    onError: (error) => toast.error(error.message),
  });
  const saveGoal = useSaveProgrammeGoalMutation({
    onSuccess: () => {
      toast.success(activeGoal ? "Goal updated" : "Goal added");
      setGoalOpen(false);
      setActiveGoal(undefined);
    },
    onError: (error) => toast.error(error.message),
  });
  const saveFunding = useSaveFundraisingRoundMutation({
    onSuccess: () => {
      toast.success(
        activeRound ? "Fundraising round updated" : "Fundraising round added",
      );
      setFundingOpen(false);
      setActiveRound(undefined);
    },
    onError: (error) => toast.error(error.message),
  });
  const saveUpdate = useSavePeriodicUpdateMutation({
    onSuccess: () => {
      toast.success(
        activeUpdate ? "Periodic update updated" : "Periodic update submitted",
      );
      setUpdateOpen(false);
      setActiveUpdate(undefined);
    },
    onError: (error) => toast.error(error.message),
  });

  if (profile.isLoading) return <ProfilePageSkeleton />;
  if (profile.isError || !profile.data)
    return (
      <Notice>
        Your profile could not be loaded. {profile.error?.message}
        <Button
          className="ml-3"
          variant="outline"
          onClick={() => void profile.refetch()}
        >
          Try again
        </Button>
      </Notice>
    );
  const record = profile.data;

  const goalColumns: Column<ProgrammeGoalRecord>[] = [
    {
      key: "action",
      header: "Action",
      className: "w-[84px]",
      cell: (goal) => (
        <RowActions
          actions={[
            {
              label: "Edit goal",
              onSelect: () => {
                setActiveGoal(goal);
                setGoalOpen(true);
              },
            },
          ]}
        />
      ),
    },
    {
      key: "scope",
      header: "Scope",
      cell: (goal) =>
        goal.programme ? (
          <Badge tone="blue">{goal.programme.name}</Badge>
        ) : (
          <span className="text-ink-muted">Business-level</span>
        ),
    },
    { key: "type", header: "Goal type", cell: (goal) => goal.goalType.name },
    {
      key: "target",
      header: "Target",
      cell: (goal) =>
        goal.targetAmountCents == null ? (
          <span className="text-ink-faint">Not monetary</span>
        ) : (
          formatMoney(goal.targetAmountCents)
        ),
    },
    {
      key: "description",
      header: "Description",
      cell: (goal) => (
        <div className="max-w-[360px] truncate text-ink-muted">
          {goal.description || "No description"}
        </div>
      ),
    },
    {
      key: "evidence",
      header: "Evidence",
      cell: (goal) => (
        <div className="max-w-[320px] truncate text-ink-muted">
          {goal.evidence || "No evidence recorded"}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (goal) => (
        <Badge tone={goal.milestoneAchieved ? "green" : "blue"}>
          {goal.milestoneAchieved ? "Achieved" : "In progress"}
        </Badge>
      ),
    },
  ];
  const fundingColumns: Column<FundraisingRoundRecord>[] = [
    {
      key: "action",
      header: "Action",
      className: "w-[84px]",
      cell: (round) => (
        <RowActions
          actions={[
            {
              label: "Edit round",
              onSelect: () => {
                setActiveRound(round);
                setFundingOpen(true);
              },
            },
          ]}
        />
      ),
    },
    {
      key: "round",
      header: "Round",
      cell: (round) => (
        <button
          type="button"
          className="font-semibold text-ink hover:text-bid"
          onClick={() => {
            setActiveRound(round);
            setFundingOpen(true);
          }}
        >
          {round.name}
        </button>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      cell: (round) => formatMoney(round.amountCents, round.currency),
    },
    { key: "date", header: "Date", cell: (round) => formatDate(round.date) },
    {
      key: "source",
      header: "Source",
      cell: (round) =>
        round.source || <span className="text-ink-faint">Not recorded</span>,
    },
    {
      key: "programme",
      header: "Programme",
      cell: (round) =>
        round.programme?.name ?? (
          <span className="text-ink-muted">Company-wide</span>
        ),
    },
    {
      key: "goal",
      header: "Linked goal",
      cell: (round) =>
        round.programmeGoal?.description ||
        round.programmeGoal?.goalType.name || (
          <span className="text-ink-faint">Not linked</span>
        ),
    },
  ];
  const updateColumns: Column<PeriodicUpdateRecord>[] = [
    {
      key: "action",
      header: "Action",
      className: "w-[84px]",
      cell: (update) => (
        <RowActions
          actions={[
            { label: "View update", onSelect: () => setViewUpdate(update) },
            {
              label: "Edit update",
              onSelect: () => {
                setActiveUpdate(update);
                setUpdateOpen(true);
              },
            },
          ]}
        />
      ),
    },
    {
      key: "period",
      header: "Reporting period",
      cell: (update) => (
        <button
          type="button"
          className="font-semibold text-ink hover:text-bid"
          onClick={() => setViewUpdate(update)}
        >
          {formatDate(update.periodStart)} – {formatDate(update.periodEnd)}
        </button>
      ),
    },
    {
      key: "submitted",
      header: "Submitted",
      cell: (update) => formatDate(update.submittedAt),
    },
    {
      key: "scope",
      header: "Scope",
      cell: (update) =>
        update.programme?.name ?? (
          <span className="text-ink-muted">Company-wide</span>
        ),
    },
    {
      key: "jobs",
      header: "Jobs created",
      cell: (update) => (
        <div>
          <strong>{update.jobsCreated}</strong>
          <div className="mt-0.5 text-sm text-ink-muted">
            {update.jobsWomen} women · {update.jobsMen} men
          </div>
        </div>
      ),
    },
    {
      key: "notes",
      header: "Notes",
      cell: (update) => (
        <div className="max-w-[360px] truncate text-ink-muted">
          {update.notes || "No notes"}
        </div>
      ),
    },
  ];

  return (
    <>
      <section className="mb-4 overflow-hidden rounded-2xl border border-bid/15 bg-gradient-to-r from-bid via-bid-dark to-bid p-5 text-white shadow-sm dark:border-white/15 dark:from-bid-light dark:via-bid-dark dark:to-bid-light">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar
            initials={initials(record.firstName, record.lastName, record.email)}
            size={68}
            tone="brand"
            className="border-2 border-white/60 bg-white/20 text-white dark:bg-black/15"
          />
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold">
              {record.businessName}
            </h1>
            <div className="mt-1 text-sm text-white/85">
              {record.representativeName} · {record.country}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {record.sector ? (
                <span className="rounded-full border border-white/20 bg-black/10 px-2.5 py-1 text-xs text-white/90">
                  {record.sector.name}
                </span>
              ) : null}
              {record.stage ? (
                <span className="rounded-full border border-white/20 bg-black/10 px-2.5 py-1 text-xs text-white/90">
                  {record.stage.name}
                </span>
              ) : null}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:ml-auto">
            <HeaderMetric
              label="Learning progress"
              value={`${record.learnerProgress.average}%`}
            />
            <HeaderMetric
              label="Programmes"
              value={String(record.programmeAccess.assignedProgrammeCount)}
            />
          </div>
        </div>
      </section>
      <Tabs value={tab} onChange={setTab} tabs={tabs} />
      {tab === "business" ? (
        <>
          <BusinessTab
            record={record}
            programmes={programmes}
            isPending={updateProfile.isPending}
            onSubmit={(values) => updateProfile.mutate(values)}
          />
          <NotificationPreferencesCard />
        </>
      ) : null}
      {tab === "goals" ? (
        <RecordsCard
          title="Programme goals"
          description="Track business-level and programme-linked outcomes."
          actionLabel="+ Add goal"
          onAction={() => {
            setActiveGoal(undefined);
            setGoalOpen(true);
          }}
          search={goalSearch}
          onSearch={setGoalSearch}
          isLoading={goals.isLoading}
          error={goals.error}
          rows={
            <DataTable
              columns={goalColumns}
              rows={goals.rows}
              rowKey={(goal) => goal.id}
              emptyMessage="No programme goals match this search."
              tableClassName="min-w-[1040px]"
            />
          }
          hasMore={Boolean(goals.hasNextPage)}
          isLoadingMore={goals.isFetchingNextPage}
          onLoadMore={() => void goals.fetchNextPage()}
        />
      ) : null}
      {tab === "funding" ? (
        <RecordsCard
          title="Fundraising history"
          description="Capital reported by your business, optionally attributed to a programme goal."
          actionLabel="+ Add round"
          onAction={() => {
            setActiveRound(undefined);
            setFundingOpen(true);
          }}
          search={fundingSearch}
          onSearch={setFundingSearch}
          isLoading={funding.isLoading}
          error={funding.error}
          rows={
            <DataTable
              columns={fundingColumns}
              rows={funding.rows}
              rowKey={(round) => round.id}
              emptyMessage="No fundraising rounds match this search."
              tableClassName="min-w-[980px]"
            />
          }
          hasMore={Boolean(funding.hasNextPage)}
          isLoadingMore={funding.isFetchingNextPage}
          onLoadMore={() => void funding.fetchNextPage()}
        />
      ) : null}
      {tab === "updates" ? (
        <RecordsCard
          title="Periodic updates"
          description="Job-impact reports used for BID programme reporting."
          actionLabel="+ Submit update"
          onAction={() => {
            setActiveUpdate(undefined);
            setUpdateOpen(true);
          }}
          search={updateSearch}
          onSearch={setUpdateSearch}
          isLoading={updates.isLoading}
          error={updates.error}
          rows={
            <DataTable
              columns={updateColumns}
              rows={updates.rows}
              rowKey={(update) => update.id}
              emptyMessage="No periodic updates match this search."
              tableClassName="min-w-[920px]"
            />
          }
          hasMore={Boolean(updates.hasNextPage)}
          isLoadingMore={updates.isFetchingNextPage}
          onLoadMore={() => void updates.fetchNextPage()}
        />
      ) : null}
      <ProgrammeGoalRecordModal
        open={goalOpen}
        onOpenChange={(open) => {
          setGoalOpen(open);
          if (!open) setActiveGoal(undefined);
        }}
        entrepreneurId={entrepreneurId}
        goal={activeGoal}
        isPending={saveGoal.isPending}
        onSubmit={(payload: ProgrammeGoalPayload) =>
          entrepreneurId &&
          saveGoal.mutate({ entrepreneurId, recordId: activeGoal?.id, payload })
        }
      />
      <FundraisingRoundRecordModal
        open={fundingOpen}
        onOpenChange={(open) => {
          setFundingOpen(open);
          if (!open) setActiveRound(undefined);
        }}
        entrepreneurId={entrepreneurId}
        round={activeRound}
        isPending={saveFunding.isPending}
        onSubmit={(payload: FundraisingRoundPayload) =>
          entrepreneurId &&
          saveFunding.mutate({
            entrepreneurId,
            recordId: activeRound?.id,
            payload,
          })
        }
      />
      <PeriodicUpdateRecordModal
        open={updateOpen}
        onOpenChange={(open) => {
          setUpdateOpen(open);
          if (!open) setActiveUpdate(undefined);
        }}
        entrepreneurId={entrepreneurId}
        update={activeUpdate}
        isPending={saveUpdate.isPending}
        onSubmit={(payload: PeriodicUpdatePayload) =>
          entrepreneurId &&
          saveUpdate.mutate({
            entrepreneurId,
            recordId: activeUpdate?.id,
            payload,
          })
        }
      />
      <PeriodicUpdateDetails
        update={viewUpdate}
        onClose={() => setViewUpdate(undefined)}
      />
    </>
  );
}

function BusinessTab({
  record,
  programmes,
  isPending,
  onSubmit,
}: {
  record: NonNullable<ReturnType<typeof useEntrepreneurProfileQuery>["data"]>;
  programmes: ReturnType<typeof useProgrammeAccessQuery>;
  isPending: boolean;
  onSubmit: (values: ProfileForm) => void;
}) {
  const [sectorLookup, setSectorLookup] = React.useState({
    open: false,
    search: "",
  });
  const [stageLookup, setStageLookup] = React.useState({
    open: false,
    search: "",
  });
  const sectors = useLazySectorsQuery({
    enabled: sectorLookup.open,
    search: React.useDeferredValue(sectorLookup.search) || undefined,
    active: true,
    take: 20,
  });
  const stages = useLazyBusinessStagesQuery({
    enabled: stageLookup.open,
    search: React.useDeferredValue(stageLookup.search) || undefined,
    active: true,
    take: 20,
  });
  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: profileDefaults(record),
  });
  const country = useWatch({ control: form.control, name: "country" });
  const sectorId = useWatch({ control: form.control, name: "sectorId" });
  const stageId = useWatch({ control: form.control, name: "stageId" });
  React.useEffect(() => form.reset(profileDefaults(record)), [form, record]);
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card>
        <CardHeader
          title="Business details"
          description="Keep your business identity and representative contact accurate."
        />
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="max-w-[780px] space-y-4"
        >
          <FormField
            label="Business name"
            error={form.formState.errors.businessName?.message}
            className="mb-0"
          >
            <FormInput {...form.register("businessName")} />
          </FormField>
          <FormRow2>
            <FormField
              label="First name"
              error={form.formState.errors.firstName?.message}
              className="mb-0"
            >
              <FormInput {...form.register("firstName")} />
            </FormField>
            <FormField
              label="Last name"
              error={form.formState.errors.lastName?.message}
              className="mb-0"
            >
              <FormInput {...form.register("lastName")} />
            </FormField>
          </FormRow2>
          <FormRow2>
            <FormField label="Phone" className="mb-0">
              <FormInput {...form.register("phone")} />
            </FormField>
            <FormField label="Country" className="mb-0">
              <FormAutocomplete
                value={country}
                onValueChange={(value) =>
                  form.setValue("country", value as ProfileForm["country"])
                }
                options={countries.map((item) => ({
                  value: item,
                  label: item,
                }))}
                placeholder="Select country"
                searchPlaceholder="Search countries..."
                emptyMessage="No country found."
              />
            </FormField>
          </FormRow2>
          <FormRow2>
            <FormField label="Sector" optional className="mb-0">
              <FormAutocomplete
                value={sectorId ?? ""}
                onValueChange={(value) => form.setValue("sectorId", value)}
                options={unique([
                  { value: "", label: "Not set" },
                  ...(record.sector
                    ? [{ value: record.sector.id, label: record.sector.name }]
                    : []),
                  ...(
                    sectors.data?.pages.flatMap((page) => page.items) ?? []
                  ).map((item) => ({ value: item.id, label: item.name })),
                ])}
                placeholder="Select sector"
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
            </FormField>
            <FormField label="Business stage" optional className="mb-0">
              <FormAutocomplete
                value={stageId ?? ""}
                onValueChange={(value) => form.setValue("stageId", value)}
                options={unique([
                  { value: "", label: "Not set" },
                  ...(record.stage
                    ? [
                        {
                          value: record.stage.id,
                          label: record.stage.name,
                          description: record.stage.definition,
                        },
                      ]
                    : []),
                  ...(
                    stages.data?.pages.flatMap((page) => page.items) ?? []
                  ).map((item) => ({
                    value: item.id,
                    label: item.name,
                    description: item.definition,
                  })),
                ])}
                placeholder="Select stage"
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
            </FormField>
          </FormRow2>
          <div className="rounded-xl border border-line bg-surface-subtle p-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
              <Mail className="h-4 w-4" />
              Login email
            </div>
            <div className="mt-1 font-medium text-ink">{record.email}</div>
            <div className="mt-1 text-xs text-ink-muted">
              Contact an administrator to change your login email.
            </div>
          </div>
          <Button
            type="submit"
            isLoading={isPending}
            loadingLabel="Saving changes..."
          >
            Save changes
          </Button>
        </form>
      </Card>
      <Card>
        <CardHeader
          title="Programme access"
          description={`${programmes.totalItems} assigned programme${programmes.totalItems === 1 ? "" : "s"}, plus free resources`}
        />
        <div className="space-y-2">
          {programmes.rows.map((item) => (
            <div
              key={item.grantId}
              className="rounded-xl border border-line bg-surface-subtle p-3"
            >
              <div className="font-semibold text-ink">{item.name}</div>
              <div className="mt-1 text-sm text-ink-muted">
                {formatDate(item.startDate)} – {formatDate(item.endDate)}
              </div>
              {item.progress ? (
                <div className="mt-2 text-sm font-medium text-bid">
                  {item.progress.percent}% complete
                </div>
              ) : (
                <div className="mt-2 text-sm text-ink-faint">Not started</div>
              )}
            </div>
          ))}
          {!programmes.isLoading && programmes.rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line p-5 text-center text-sm text-ink-muted">
              You currently have free resources only.
            </div>
          ) : null}
        </div>
        {programmes.hasNextPage ? (
          <Button
            className="mt-3 w-full"
            variant="outline"
            isLoading={programmes.isFetchingNextPage}
            onClick={() => void programmes.fetchNextPage()}
          >
            Load more programmes
          </Button>
        ) : null}
      </Card>
    </div>
  );
}

function RecordsCard({
  title,
  description,
  actionLabel,
  onAction,
  search,
  onSearch,
  isLoading,
  error,
  rows,
  hasMore,
  isLoadingMore,
  onLoadMore,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  search: string;
  onSearch: (value: string) => void;
  isLoading: boolean;
  error: Error | null;
  rows: React.ReactNode;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
}) {
  return (
    <Card>
      <CardHeader
        title={title}
        description={description}
        actions={
          <Button size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        }
      />
      <TableToolbar>
        <div>
          <div className="text-sm font-medium text-ink">Search records</div>
          <div className="mt-0.5 text-sm text-ink-muted">
            Search is handled across the complete record history.
          </div>
        </div>
        <TableFilterInput
          icon
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder={`Search ${title.toLowerCase()}...`}
        />
      </TableToolbar>
      {isLoading ? (
        <RecordsSkeleton />
      ) : error ? (
        <Notice>Records could not be loaded. {error.message}</Notice>
      ) : (
        rows
      )}
      {hasMore ? (
        <div className="mt-4 flex justify-center">
          <Button
            variant="outline"
            isLoading={isLoadingMore}
            onClick={onLoadMore}
          >
            Load more
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
function PeriodicUpdateDetails({
  update,
  onClose,
}: {
  update?: PeriodicUpdateRecord;
  onClose: () => void;
}) {
  return (
    <Modal
      open={Boolean(update)}
      onOpenChange={(open) => !open && onClose()}
      title="Periodic update"
      width="wide"
    >
      {update ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Info
              label="Period"
              value={`${formatDate(update.periodStart)} – ${formatDate(update.periodEnd)}`}
            />
            <Info label="Submitted" value={formatDate(update.submittedAt)} />
            <Info
              label="Scope"
              value={update.programme?.name ?? "Company-wide"}
            />
            <Info label="Jobs created" value={String(update.jobsCreated)} />
            <Info label="Women" value={String(update.jobsWomen)} />
            <Info label="Men" value={String(update.jobsMen)} />
          </div>
          <div className="rounded-xl border border-line bg-surface-subtle p-4">
            <div className="text-sm font-semibold text-ink">Notes</div>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              {update.notes || "No notes were added."}
            </p>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-card p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
        {label}
      </div>
      <div className="mt-1 font-medium text-ink">{value}</div>
    </div>
  );
}
function HeaderMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[120px] rounded-xl border border-white/15 bg-black/10 px-4 py-3 text-center shadow-sm backdrop-blur dark:bg-black/20">
      <div className="text-xl font-semibold">{value}</div>
      <div className="mt-0.5 text-xs text-white/85">{label}</div>
    </div>
  );
}
function RecordsSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-14" />
      <Skeleton className="h-14" />
      <Skeleton className="h-14" />
      <Skeleton className="h-14" />
    </div>
  );
}
function ProfilePageSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-36 rounded-2xl" />
      <Skeleton className="h-10 w-[620px] max-w-full" />
      <Skeleton className="h-[480px] rounded-xl" />
    </div>
  );
}
function profileDefaults(
  record: NonNullable<ReturnType<typeof useEntrepreneurProfileQuery>["data"]>,
): ProfileForm {
  return {
    businessName: record.businessName,
    firstName: record.firstName,
    lastName: record.lastName,
    phone: record.phone ?? "",
    country: record.country as ProfileForm["country"],
    sectorId: record.sector?.id ?? "",
    stageId: record.stage?.id ?? "",
  };
}
function initials(firstName: string, lastName: string, email: string) {
  return (
    [firstName, lastName]
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase())
      .join("")
      .slice(0, 2) || email.slice(0, 2).toUpperCase()
  );
}
function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
function formatMoney(cents: number, currency = "USD") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
function unique<T extends { value: string }>(items: T[]) {
  return items.filter(
    (item, index) =>
      items.findIndex((candidate) => candidate.value === item.value) === index,
  );
}
