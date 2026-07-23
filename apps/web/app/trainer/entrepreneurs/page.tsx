"use client";

import { useDebouncedValue } from '@/lib/search';
import * as React from "react";
import { Eye, GraduationCap, Star, Target } from "lucide-react";
import { Avatar } from "@/components/shared/Avatar";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { Card, CardHeader, Skeleton, TableSkeleton } from "@/components/shared/Card";
import {
  DataTable,
  RowActions,
  TableEmptyState,
  TableFilterAutocomplete,
  TableFilterInput,
  TablePagination,
  TableToolbar,
  type Column,
} from "@/components/shared/DataTable";
import { MetricGrid } from "@/components/shared/MetricGrid";
import { Modal } from "@/components/shared/Modal";
import { Notice, PageHeader } from "@/components/shared/PageHeader";
import { ProgressBar } from "@/components/shared/ProgressBar";
import { StatCard } from "@/components/shared/StatCard";
import {
  useEntrepreneurDetailQuery,
  useEntrepreneursPage,
  useEntrepreneurSummaryQuery,
  useProgrammeAccessQuery,
  type EntrepreneurRecord,
} from "@/lib/api/entrepreneurs";
import { useLazyProgrammesLookup } from "@/lib/api/programmes";
import { formatRating } from "@/lib/format-rating";

const ALL = "all";

export default function TrainerEntrepreneursPage() {
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [programmeId, setProgrammeId] = React.useState(ALL);
  const [programmeSearch, setProgrammeSearch] = React.useState("");
  const [pageSize, setPageSize] = React.useState(10);
  const [viewId, setViewId] = React.useState<string | null>(null);
  const entrepreneurs = useEntrepreneursPage({
    search: debouncedSearch.trim() || undefined,
    programmeId: programmeId === ALL ? undefined : programmeId,
    take: pageSize,
  });
  const entrepreneurSummary = useEntrepreneurSummaryQuery();
  const programmes = useLazyProgrammesLookup({
    enabled: true,
    search: programmeSearch.trim() || undefined,
    take: 20,
  });
  const resetPagination = entrepreneurs.resetPagination;

  React.useEffect(() => {
    resetPagination();
  }, [debouncedSearch, pageSize, programmeId, resetPagination]);

  const columns = React.useMemo<Column<EntrepreneurRecord>[]>(
    () => [
      {
        key: "action",
        header: "Action",
        cell: (entrepreneur) => (
          <RowActions
            actions={[
              {
                label: "View learner impact",
                onSelect: () => setViewId(entrepreneur.entrepreneurUserId),
              },
            ]}
          />
        ),
        className: "w-[84px]",
      },
      {
        key: "business",
        header: "Business",
        cell: (entrepreneur) => (
          <button
            type="button"
            onClick={() => setViewId(entrepreneur.entrepreneurUserId)}
            className="flex min-w-[260px] items-center gap-3 rounded-lg text-left outline-none transition hover:text-bid focus-visible:ring-2 focus-visible:ring-bid/20"
          >
            <Avatar initials={initials(entrepreneur)} size={36} />
            <span className="min-w-0">
              <span className="block font-semibold text-ink">{entrepreneur.businessName}</span>
              <span className="mt-1 block text-sm text-ink-muted">
                {entrepreneur.representativeName + " · " + entrepreneur.email}
              </span>
            </span>
          </button>
        ),
      },
      {
        key: "programmes",
        header: "Supported programmes",
        cell: (entrepreneur) => (
          <ProgrammePreview entrepreneur={entrepreneur} />
        ),
      },
      {
        key: "stage",
        header: "Stage / sector",
        cell: (entrepreneur) => (
          <div className="flex min-w-[190px] flex-wrap gap-1.5">
            <Badge tone="neutral">{entrepreneur.stage?.name ?? "Stage not set"}</Badge>
            <Badge tone="blue">{entrepreneur.sector?.name ?? "Sector not set"}</Badge>
          </div>
        ),
      },
      {
        key: "progress",
        header: "Learning impact",
        cell: (entrepreneur) => (
          <div className="min-w-[200px]">
            <div className="mb-1 flex items-center justify-between gap-3 text-sm">
              <span className="text-ink-muted">
                {entrepreneur.learnerProgress.trackedProgrammes} tracked
              </span>
              <span className="font-medium text-ink">
                {entrepreneur.learnerProgress.average}%
              </span>
            </div>
            <ProgressBar
              value={entrepreneur.learnerProgress.average}
              width="100%"
              className="h-2"
            />
          </div>
        ),
      },
      {
        key: "followup",
        header: "Coaching signal",
        cell: (entrepreneur) => (
          <CoachingSignal
            progress={entrepreneur.learnerProgress.average}
            tracked={entrepreneur.learnerProgress.trackedProgrammes}
          />
        ),
      },
    ],
    [],
  );

  if (
    (entrepreneurs.isLoading && !entrepreneurs.data) ||
    (entrepreneurSummary.isLoading && !entrepreneurSummary.data)
  ) {
    return <TrainerEntrepreneursSkeleton />;
  }

  if (entrepreneurs.isError) {
    return (
      <>
        <PageHeader
          title="My Entrepreneurs"
          description="Learners connected to programmes containing your training content."
        />
        <Card>
          <Notice>
            Your learner impact view could not be loaded. {entrepreneurs.error.message}
          </Notice>
          <Button type="button" variant="outline" className="mt-4" onClick={() => void entrepreneurs.refetch()}>
            Try again
          </Button>
        </Card>
      </>
    );
  }

  const impact = entrepreneurSummary.data?.learnerImpact;

  return (
    <>
      <PageHeader
        title="My Entrepreneurs"
        description="Learners connected to programmes containing your training content."
      />

      <MetricGrid columns={4}>
        <StatCard
          label="Supported entrepreneurs"
          value={entrepreneurSummary.data?.totalEntrepreneurs ?? 0}
          subline="In your content-owned programmes"
          dotColor="bid"
          accent="bid"
        />
        <StatCard
          label="Average progress"
          value={(impact?.averageProgrammeProgress ?? 0) + "%"}
          subline={(impact?.trackedProgrammeProgress ?? 0) + " tracked programme records"}
          dotColor="success"
          accent="success"
        />
        <StatCard
          label="Content completions"
          value={impact?.completedContent ?? 0}
          subline="Completed trainer-attributed assets"
          dotColor="info"
          accent="info"
        />
        <StatCard
          label="Content rating"
          value={impact?.ratingCount ? formatRating(impact.averageRating) : "—"}
          subline={(impact?.ratingCount ?? 0) + " learner ratings"}
          dotColor="warning"
          accent="warning"
        />
      </MetricGrid>

      <Card className="mt-4">
        <CardHeader
          title="Learner impact"
          description={
            entrepreneurs.totalItems + " entrepreneur" +
            (entrepreneurs.totalItems === 1 ? "" : "s") +
            " in this view" +
            (entrepreneurs.isFetching ? " · Updating..." : "")
          }
        />
        <TableToolbar>
          <div>
            <div className="text-sm font-medium text-ink">Find supported entrepreneurs</div>
            <div className="mt-0.5 text-sm text-ink-muted">
              Search business or representative details and filter by a programme you support.
            </div>
          </div>
          <div className="grid w-full gap-2 lg:w-[560px] lg:grid-cols-[minmax(240px,1fr)_250px]">
            <TableFilterInput
              icon
              placeholder="Search entrepreneurs..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <TableFilterAutocomplete
              value={programmeId}
              onValueChange={setProgrammeId}
              options={[
                { value: ALL, label: "All supported programmes" },
                ...programmes.rows.map((programme) => ({
                  value: programme.id,
                  label: programme.name,
                })),
              ]}
              placeholder="All supported programmes"
              searchPlaceholder="Search programmes..."
              emptyMessage="No supported programme found."
              onSearchChange={setProgrammeSearch}
              isLoading={programmes.isLoading}
              hasMore={Boolean(programmes.hasNextPage)}
              onLoadMore={() => void programmes.fetchNextPage()}
            />
          </div>
        </TableToolbar>

        {entrepreneurs.isPlaceholderData ? (
          <TableSkeleton rows={Math.min(pageSize, 6)} columns={7} />
        ) : entrepreneurs.rows.length > 0 ? (
          <DataTable
            columns={columns}
            rows={entrepreneurs.rows}
            rowKey={(entrepreneur) => entrepreneur.entrepreneurUserId}
            rowProps={(entrepreneur) => ({
              onDoubleClick: () => setViewId(entrepreneur.entrepreneurUserId),
            })}
            emptyMessage="No supported entrepreneurs match this view."
            tableClassName="min-w-[1120px]"
          />
        ) : (
          <TableEmptyState
            title="No supported entrepreneurs found"
            description="Try changing the search or programme filter."
          />
        )}
        <TablePagination
          page={entrepreneurs.page}
          pageSize={pageSize}
          totalItems={entrepreneurs.totalItems}
          pageSizeOptions={[10, 25, 50]}
          onPageChange={entrepreneurs.setPage}
          onPageSizeChange={setPageSize}
        />
      </Card>

      <TrainerLearnerImpactModal
        entrepreneurId={viewId}
        onClose={() => setViewId(null)}
      />
    </>
  );
}

function ProgrammePreview({ entrepreneur }: { entrepreneur: EntrepreneurRecord }) {
  const programmes = entrepreneur.programmeAccess.assignedProgrammes;
  if (programmes.length === 0) {
    return (
      <div className="min-w-[230px] text-sm text-ink-muted">
        Learning activity inferred from trainer-owned content
      </div>
    );
  }
  return (
    <div className="flex min-w-[230px] max-w-[340px] flex-wrap gap-1.5">
      {programmes.map((programme) => (
        <Badge key={programme.id} tone="brand">{programme.name}</Badge>
      ))}
      {entrepreneur.programmeAccess.assignedProgrammeCount > programmes.length ? (
        <Badge tone="neutral">
          +{entrepreneur.programmeAccess.assignedProgrammeCount - programmes.length} more
        </Badge>
      ) : null}
    </div>
  );
}

function CoachingSignal({ progress, tracked }: { progress: number; tracked: number }) {
  if (tracked === 0) return <Badge tone="neutral">Not started</Badge>;
  if (progress < 50) return <Badge tone="amber">Needs coaching</Badge>;
  if (progress >= 100) return <Badge tone="green">Completed</Badge>;
  return <Badge tone="blue">On track</Badge>;
}

function TrainerLearnerImpactModal({
  entrepreneurId,
  onClose,
}: {
  entrepreneurId: string | null;
  onClose: () => void;
}) {
  const detail = useEntrepreneurDetailQuery(entrepreneurId);
  const programmes = useProgrammeAccessQuery(entrepreneurId, { take: 10 }, Boolean(entrepreneurId));

  return (
    <Modal
      open={Boolean(entrepreneurId)}
      onOpenChange={(open) => !open && onClose()}
      title="Learner impact"
      width="xl"
    >
      {detail.isLoading && !detail.data ? (
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : detail.isError || !detail.data ? (
        <div className="rounded-xl border border-danger/20 bg-danger-light p-4 text-sm text-danger-dark">
          Learner details could not be loaded.
          <Button type="button" size="sm" variant="outline" className="mt-3" onClick={() => void detail.refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-4 rounded-xl border border-line bg-surface-subtle p-4 sm:flex-row sm:items-center">
            <Avatar initials={initials(detail.data)} size={48} />
            <div className="min-w-0 flex-1">
              <h3 className="text-xl font-semibold text-ink">{detail.data.businessName}</h3>
              <p className="mt-1 text-sm text-ink-muted">
                {detail.data.representativeName + " · " + detail.data.email}
              </p>
            </div>
            <div className="w-full sm:w-[220px]">
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-ink-muted">Average progress</span>
                <span className="font-medium text-ink">{detail.data.learnerProgress.average}%</span>
              </div>
              <ProgressBar value={detail.data.learnerProgress.average} width="100%" className="h-2" />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <ImpactCard icon={GraduationCap} label="Tracked programmes" value={detail.data.learnerProgress.trackedProgrammes} />
            <ImpactCard icon={Target} label="Stage" value={detail.data.stage?.name ?? "Not set"} />
            <ImpactCard icon={Star} label="Sector" value={detail.data.sector?.name ?? "Not set"} />
          </div>

          <div className="rounded-xl border border-line bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-ink">Programme progress</div>
                <div className="mt-1 text-sm text-ink-muted">Programmes visible through your content ownership.</div>
              </div>
              <Eye className="h-5 w-5 text-bid" />
            </div>
            <div className="mt-4 space-y-2">
              {programmes.rows.map((programme) => (
                <div key={programme.id} className="rounded-xl border border-line bg-surface-subtle p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-ink">{programme.name}</span>
                    <Badge tone={programme.progress?.status === "completed" ? "green" : programme.progress?.status === "in_progress" ? "amber" : "neutral"}>
                      {programme.progress?.percent ?? 0}%
                    </Badge>
                  </div>
                  <ProgressBar value={programme.progress?.percent ?? 0} width="100%" className="mt-2 h-2" />
                </div>
              ))}
              {programmes.isLoading ? <Skeleton className="h-20 w-full" /> : null}
              {!programmes.isLoading && programmes.rows.length === 0 ? (
                <div className="rounded-xl border border-dashed border-line-strong p-6 text-center text-sm text-ink-muted">
                  No assigned programme records are available in this trainer scope.
                </div>
              ) : null}
              {programmes.hasNextPage ? (
                <Button type="button" variant="outline" className="w-full" isLoading={programmes.isFetchingNextPage} loadingLabel="Loading more..." onClick={() => void programmes.fetchNextPage()}>
                  Load more programmes
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

function ImpactCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <div className="flex items-center gap-2 text-sm text-ink-muted">
        <Icon className="h-4 w-4 text-bid" />
        {label}
      </div>
      <div className="mt-2 text-xl font-semibold text-ink">{value}</div>
    </div>
  );
}

function TrainerEntrepreneursSkeleton() {
  return (
    <>
      <PageHeader title="My Entrepreneurs" description="Learners connected to your training content." />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-28 w-full" />)}
      </div>
      <div className="mt-4">
        <TableSkeleton columns={6} rows={8} />
      </div>
    </>
  );
}

function initials(entrepreneur: EntrepreneurRecord) {
  return (
    (entrepreneur.firstName[0] ?? "") +
    (entrepreneur.lastName[0] ?? entrepreneur.businessName[0] ?? "")
  ).toUpperCase();
}
