"use client";

import { useDebouncedValue } from '@/lib/search';
import * as React from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { ReportingPageSkeleton } from "@/components/reporting/ReportingPageSkeleton";
import { Badge } from "@/components/shared/Badge";
import { BarChartRow } from "@/components/shared/BarChartRow";
import { Button } from "@/components/shared/Button";
import { Card, CardHeader, TableSkeleton } from "@/components/shared/Card";
import { DatePicker } from "@/components/shared/DatePicker";
import {
  DataTable,
  RowActions,
  TableFilterAutocomplete,
  TableFilterInput,
  TablePagination,
  TableToolbar,
  type Column,
} from "@/components/shared/DataTable";
import {
  FormAutocomplete,
  FormSelect,
} from "@/components/shared/FormField";
import { MessageModal } from "@/components/shared/MessageModal";
import { MetricGrid } from "@/components/shared/MetricGrid";
import { Notice, PageHeader } from "@/components/shared/PageHeader";
import { ProgrammeAccessList } from "@/components/shared/ProgrammeAccessList";
import { StatCard } from "@/components/shared/StatCard";
import { useLazyProgrammesLookup } from "@/lib/api/programmes";
import {
  useCreateReportExportMutation,
  useOverdueUpdatesPage,
  useReportExportDownloadMutation,
  useReportExportQuery,
  useReportingOverviewQuery,
  useSendReportingReminderMutation,
  type OverdueUpdate,
  type ReportExportFormat,
  type ReportPriority,
  type ReportingBreakdown,
} from "@/lib/api/reporting";

const ALL = "all";
const NO_PROGRAMME = "none";

function initialDate(month: number, day: number) {
  const year = new Date().getFullYear();
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatMoneyShort(cents: number, currency: string) {
  const amount = cents / 100;
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function priorityMeta(priority: ReportPriority) {
  if (priority === "critical")
    return { label: "Critical", tone: "red" as const };
  if (priority === "late")
    return { label: "31–90 days late", tone: "amber" as const };
  return { label: "Newly overdue", tone: "blue" as const };
}

export default function AdminReportingPage() {
  const [selectedProgramme, setSelectedProgramme] = React.useState(ALL);
  const [dateFrom, setDateFrom] = React.useState(() => initialDate(1, 1));
  const [dateTo, setDateTo] = React.useState(() => initialDate(12, 31));
  const [appliedDateFrom, setAppliedDateFrom] = React.useState(() =>
    initialDate(1, 1),
  );
  const [appliedDateTo, setAppliedDateTo] = React.useState(() =>
    initialDate(12, 31),
  );
  const [programmeSearch, setProgrammeSearch] = React.useState("");
  const [overdueProgrammeSearch, setOverdueProgrammeSearch] =
    React.useState("");
  const [overdueQuery, setOverdueQuery] = React.useState("");
  const debouncedOverdueQuery = useDebouncedValue(overdueQuery.trim());
  const [overdueProgramme, setOverdueProgramme] = React.useState(ALL);
  const [overduePriority, setOverduePriority] = React.useState(ALL);
  const [pageSize, setPageSize] = React.useState(10);
  const [messageTarget, setMessageTarget] =
    React.useState<OverdueUpdate | null>(null);
  const [exportFormat, setExportFormat] =
    React.useState<ReportExportFormat>("xlsx");
  const [exportId, setExportId] = React.useState<string | null>(null);
  const invalidDates = !dateFrom || !dateTo || dateFrom > dateTo;

  const reportQuery = {
    programmeId: selectedProgramme === ALL ? undefined : selectedProgramme,
    dateFrom: appliedDateFrom,
    dateTo: appliedDateTo,
  };
  const report = useReportingOverviewQuery(reportQuery);
  const programmes = useLazyProgrammesLookup({
    enabled: true,
    search: programmeSearch || undefined,
    take: 20,
  });
  const overdueProgrammes = useLazyProgrammesLookup({
    enabled: true,
    search: overdueProgrammeSearch || undefined,
    take: 20,
  });
  const effectiveOverdueProgramme =
    selectedProgramme !== ALL ? selectedProgramme : overdueProgramme;
  const overdue = useOverdueUpdatesPage({
    search: debouncedOverdueQuery || undefined,
    programmeId:
      effectiveOverdueProgramme === ALL ? undefined : effectiveOverdueProgramme,
    priority:
      overduePriority === ALL ? undefined : (overduePriority as ReportPriority),
    take: pageSize,
  });
  const resetOverduePagination = overdue.resetPagination;
  React.useEffect(() => {
    resetOverduePagination();
  }, [
    debouncedOverdueQuery,
    effectiveOverdueProgramme,
    overduePriority,
    pageSize,
    resetOverduePagination,
  ]);

  const createExport = useCreateReportExportMutation({
    onSuccess: (created) => {
      setExportId(created.id);
      toast.success(
        "Report export started. You can keep working while it is prepared.",
      );
    },
    onError: (error) => toast.error(error.message),
  });
  const exportResult = useReportExportQuery(exportId);
  const downloadExport = useReportExportDownloadMutation({
    onSuccess: ({ download }) => window.location.assign(download.url),
    onError: (error) => toast.error(error.message),
  });
  const sendReminder = useSendReportingReminderMutation({
    onSuccess: () => {
      toast.success("Periodic update reminder sent.");
      setMessageTarget(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const programmeOptions = React.useMemo(() => {
    const options = [
      { value: ALL, label: "All programmes" },
      ...programmes.rows.map((programme) => ({
        value: programme.id,
        label: programme.name,
      })),
    ];
    const scope = report.data?.scope;
    if (
      scope?.programmeId &&
      !options.some((option) => option.value === scope.programmeId)
    ) {
      options.push({ value: scope.programmeId, label: scope.programmeName });
    }
    return options;
  }, [programmes.rows, report.data?.scope]);
  const overdueProgrammeOptions = React.useMemo(
    () => [
      { value: ALL, label: "All programme access" },
      { value: NO_PROGRAMME, label: "No programme" },
      ...overdueProgrammes.rows.map((programme) => ({
        value: programme.id,
        label: programme.name,
      })),
    ],
    [overdueProgrammes.rows],
  );

  const columns: Column<OverdueUpdate>[] = [
    {
      key: "action",
      header: "Action",
      className: "w-[84px]",
      cell: (row) => (
        <RowActions
          actions={[
            { label: "Send reminder", onSelect: () => setMessageTarget(row) },
          ]}
        />
      ),
    },
    {
      key: "entrepreneur",
      header: "Entrepreneur",
      cell: (row) => (
        <div>
          <div className="font-medium text-ink">{row.businessName}</div>
          <div className="text-sm text-ink-muted">{row.representativeName}</div>
        </div>
      ),
    },
    {
      key: "programmes",
      header: "Programme access",
      cell: (row) => (
        <ProgrammeAccessList
          programmes={row.programmes}
          maxVisible={2}
          modalTitle={`${row.businessName} programme access`}
          className="min-w-[220px] max-w-[320px]"
        />
      ),
    },
    {
      key: "lastReport",
      header: "Last report",
      cell: (row) => (
        <div>
          <div className="font-medium text-ink">
            {row.lastReport
              ? `${formatDate(row.lastReport.periodStart)} – ${formatDate(row.lastReport.periodEnd)}`
              : "No report submitted"}
          </div>
          <div className="text-sm text-ink-muted">
            {row.lastReport
              ? `Submitted ${formatDate(row.lastReport.submittedAt)}`
              : `Joined ${formatDate(row.joinedAt)}`}
          </div>
        </div>
      ),
    },
    {
      key: "priority",
      header: "Follow-up status",
      cell: (row) => {
        const meta = priorityMeta(row.priority);
        return (
          <div className="min-w-[170px]">
            <Badge tone={meta.tone}>{meta.label}</Badge>
            <div className="mt-2 text-sm text-ink-muted">
              {row.daysOverdue} days past follow-up window
            </div>
          </div>
        );
      },
    },
  ];

  if (report.isLoading || (overdue.isLoading && !overdue.data)) {
    return <ReportingPageSkeleton />;
  }
  if (report.isError || !report.data) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Reporting & analytics"
          description="Programme performance, jobs created and funds mobilised"
        />
        <Notice className="border border-danger/20 bg-danger/5 text-danger">
          Reporting could not be loaded. {report.error?.message}
        </Notice>
        <Button onClick={() => report.refetch()} isLoading={report.isFetching}>
          Try again
        </Button>
      </div>
    );
  }

  const data = report.data;
  const currentExport = exportResult.data;

  return (
    <>
      <PageHeader
        title="Reporting & analytics"
        description="Programme performance, jobs created and funds mobilised"
        actions={
          <div className="grid w-full gap-2 sm:grid-cols-[190px_150px_auto] lg:w-auto">
            <FormSelect
              value={exportFormat}
              onValueChange={(value) =>
                setExportFormat(value as ReportExportFormat)
              }
              options={[
                { value: "xlsx", label: "Excel workbook" },
                { value: "csv", label: "CSV file" },
              ]}
            />
            <Button
              onClick={() =>
                createExport.mutate({ ...reportQuery, format: exportFormat })
              }
              isLoading={createExport.isPending}
              loadingLabel="Starting…"
              disabled={invalidDates}
              className="flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              Export report
            </Button>
          </div>
        }
      />

      <Card className="mb-4">
        <CardHeader
          title="Report scope"
          description="Choose the programme and reporting period applied to every metric and export."
        />
        <div className="grid gap-3 md:grid-cols-[minmax(240px,1fr)_180px_180px]">
          <FormAutocomplete
            value={selectedProgramme}
            onValueChange={(value) => {
              setSelectedProgramme(value);
              setOverdueProgramme(ALL);
              overdue.resetPagination();
            }}
            options={programmeOptions}
            placeholder="All programmes"
            searchPlaceholder="Search programmes..."
            onSearchChange={setProgrammeSearch}
            isLoading={programmes.isLoading || programmes.isFetchingNextPage}
            hasMore={Boolean(programmes.hasNextPage)}
            onLoadMore={() => programmes.fetchNextPage()}
          />
          <DatePicker
            ariaLabel="Report start date"
            value={dateFrom}
            onChange={(next) => {
              setDateFrom(next);
              if (next && dateTo && next <= dateTo) {
                setAppliedDateFrom(next);
                setAppliedDateTo(dateTo);
              }
            }}
          />
          <DatePicker
            ariaLabel="Report end date"
            value={dateTo}
            onChange={(next) => {
              setDateTo(next);
              if (dateFrom && next && dateFrom <= next) {
                setAppliedDateFrom(dateFrom);
                setAppliedDateTo(next);
              }
            }}
          />
        </div>
        {invalidDates ? (
          <p className="mt-2 text-sm text-danger">
            Select a valid start and end date. Metrics remain on the last valid
            range until this is corrected.
          </p>
        ) : null}
      </Card>

      <Notice>
        <strong>How this data is collected:</strong> {data.sources.jobs}{" "}
        {data.sources.funds} Records without programme attribution remain
        company-wide and are never forced into a programme result.
      </Notice>

      {currentExport ? (
        <Notice
          className={
            currentExport.status === "failed"
              ? "border border-danger/20 bg-danger/5 text-danger"
              : "border border-info/20 bg-info/5 text-info-dark"
          }
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>
              {currentExport.status === "ready"
                ? `Your ${currentExport.format.toUpperCase()} export is ready.`
                : currentExport.status === "failed"
                  ? (currentExport.failureReason ?? "The report export failed.")
                  : "Your report is being prepared."}
            </span>
            {currentExport.status === "ready" ? (
              <Button
                size="sm"
                variant="info"
                isLoading={downloadExport.isPending}
                onClick={() => downloadExport.mutate(currentExport.id)}
              >
                Download export
              </Button>
            ) : null}
          </div>
        </Notice>
      ) : null}

      <MetricGrid>
        <StatCard
          label="Jobs created (period)"
          value={data.metrics.jobsCreated}
          subline={`${data.metrics.jobsWomen} women · ${data.metrics.jobsMen} men`}
          dotColor="bid"
        />
        <StatCard
          label="Funds mobilised (period)"
          value={formatMoneyShort(
            data.metrics.fundsMobilisedCents,
            data.settings.currency,
          )}
          subline={`${data.metrics.entrepreneursWithFunds} entrepreneurs · ${data.settings.currency}`}
          dotColor="info"
        />
        <StatCard
          label="Update submission rate"
          value={`${data.metrics.updateSubmissionRate}%`}
          subline={`${data.metrics.submittedEntrepreneurs} of ${data.metrics.totalEntrepreneurs} entrepreneurs`}
          dotColor="warning"
        />
        <StatCard
          label="Training completion rate"
          value={`${data.metrics.trainingCompletionRate}%`}
          subline={`${data.metrics.overdueEntrepreneurs} need reporting follow-up`}
        />
      </MetricGrid>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Jobs created by programme"
            description={data.sources.jobs}
          />
          {data.jobsByProgramme.length ? (
            data.jobsByProgramme.map((row: ReportingBreakdown) => (
              <BarChartRow
                key={row.programmeId ?? "unattributed"}
                label={row.programmeName}
                value={String(row.value)}
                percent={row.percent}
                accent={row.programmeId ? "info" : "neutral"}
              />
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-line px-3 py-8 text-center text-sm text-ink-muted">
              No job impact updates fall in this reporting period.
            </div>
          )}
        </Card>
        <Card>
          <CardHeader
            title="Funds mobilised by programme"
            description={data.sources.funds}
          />
          {data.fundsByProgramme.length ? (
            data.fundsByProgramme.map((row: ReportingBreakdown) => (
              <BarChartRow
                key={row.programmeId ?? "unattributed"}
                label={row.programmeName}
                value={formatMoneyShort(row.value, data.settings.currency)}
                percent={row.percent}
                accent={row.programmeId ? "success" : "neutral"}
              />
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-line px-3 py-8 text-center text-sm text-ink-muted">
              No {data.settings.currency} fundraising rounds fall in this
              reporting period.
            </div>
          )}
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader
          title="Entrepreneurs with overdue updates"
          description={`Follow up after ${data.settings.periodicUpdateOverdueAfterDays} days without a submitted periodic update. If none exists, counting starts from the entrepreneur's join date.`}
        />
        <TableToolbar>
          <div>
            <div className="text-sm font-medium text-ink">
              Reporting follow-up queue
            </div>
            <div className="mt-0.5 text-sm text-ink-muted">
              {data.sources.overdue}
            </div>
          </div>
          <div className="grid w-full gap-2 lg:w-auto lg:grid-cols-[300px_250px_210px]">
            <TableFilterInput
              icon
              placeholder="Search overdue updates..."
              value={overdueQuery}
              onChange={(event) => setOverdueQuery(event.target.value)}
            />
            <TableFilterAutocomplete
              value={effectiveOverdueProgramme}
              onValueChange={(value) => {
                setOverdueProgramme(value);
                overdue.resetPagination();
              }}
              options={
                selectedProgramme !== ALL
                  ? programmeOptions.filter(
                      (option) => option.value === selectedProgramme,
                    )
                  : overdueProgrammeOptions
              }
              disabled={selectedProgramme !== ALL}
              onSearchChange={setOverdueProgrammeSearch}
              isLoading={
                overdueProgrammes.isLoading ||
                overdueProgrammes.isFetchingNextPage
              }
              hasMore={Boolean(overdueProgrammes.hasNextPage)}
              onLoadMore={() => overdueProgrammes.fetchNextPage()}
              placeholder="All programme access"
            />
            <TableFilterAutocomplete
              value={overduePriority}
              onValueChange={(value) => {
                setOverduePriority(value);
                overdue.resetPagination();
              }}
              options={[
                { value: ALL, label: "All follow-up priority" },
                { value: "newly_overdue", label: "Newly overdue" },
                { value: "late", label: "31–90 days late" },
                { value: "critical", label: "More than 90 days late" },
              ]}
              placeholder="All follow-up priority"
            />
          </div>
        </TableToolbar>
        {overdue.isError ? (
          <Notice className="border border-danger/20 bg-danger/5 text-danger">
            The follow-up queue could not be loaded. {overdue.error.message}
          </Notice>
        ) : overdue.isPlaceholderData ? (
          <TableSkeleton rows={Math.min(pageSize, 6)} columns={6} />
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={overdue.rows}
              rowKey={(row) => row.id}
              emptyMessage="No overdue updates match this report scope."
            />
            <TablePagination
              page={overdue.page}
              pageSize={pageSize}
              totalItems={overdue.totalItems}
              onPageChange={overdue.setPage}
              onPageSizeChange={(next) => setPageSize(next)}
            />
          </>
        )}
      </Card>

      <MessageModal
        open={Boolean(messageTarget)}
        onOpenChange={(open) => !open && setMessageTarget(null)}
        showPriority={false}
        onSubmit={async ({ subject, message, channel }) => {
          if (!messageTarget) return;
          await sendReminder.mutateAsync({
            entrepreneurUserId: messageTarget.entrepreneurUserId,
            subject,
            message,
            channel: channel === "in-app" ? "in_app" : "email",
          });
        }}
        recipientName={messageTarget?.representativeName ?? "Entrepreneur"}
        recipientDetail={
          messageTarget
            ? `${messageTarget.businessName} · ${messageTarget.daysWithoutReport} days without report`
            : undefined
        }
        defaultSubject={
          messageTarget
            ? `Periodic update reminder for ${messageTarget.businessName}`
            : ""
        }
        defaultMessage={
          messageTarget
            ? `Hi ${messageTarget.representativeName}, please submit your latest periodic update so BID can keep your programme reporting current.`
            : ""
        }
      />
    </>
  );
}
