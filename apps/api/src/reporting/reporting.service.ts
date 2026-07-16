import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  BusinessStatus,
  NotificationChannel,
  NotificationEntityType,
  NotificationSeverity,
  NotificationType,
  Prisma,
  ProgrammeAccessType,
  User,
  UserRole,
  UserStatus,
} from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import {
  OverdueUpdatesQueryDto,
  ReportPriority,
  ReportingOverviewQueryDto,
  SendReportingReminderDto,
} from "./dto/reporting-query.dto";
import {
  cursorArgs,
  pageSize,
  toCursorPage,
} from "../common/pagination/cursor-pagination.dto";

const DAY_MS = 86_400_000;
const NO_PROGRAMME = "none";

type ReportPeriod = {
  from: Date;
  to: Date;
};

@Injectable()
export class ReportingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async overview(query: ReportingOverviewQueryDto) {
    const period = this.resolvePeriod(query);
    const programme = await this.resolveProgramme(query.programmeId);
    const updateWhere: Prisma.PeriodicUpdateWhereInput = {
      periodEnd: { gte: period.from },
      periodStart: { lte: period.to },
      ...(programme ? { programmeId: programme.id } : {}),
    };
    const settings = await this.prisma.companySettings.findUnique({
      where: { singletonKey: "default" },
      select: {
        defaultCurrency: true,
        periodicUpdateOverdueAfterDays: true,
      },
    });
    const currency = settings?.defaultCurrency ?? "USD";
    const fundingWhere: Prisma.FundraisingRoundWhereInput = {
      date: { gte: period.from, lte: period.to },
      currency,
      ...(programme ? { programmeId: programme.id } : {}),
    };
    const membershipWhere = this.eligibleMembershipWhere(programme);
    const overdueWhere = await this.buildOverdueWhere({
      programmeId: programme?.id,
    });

    const [
      jobs,
      funds,
      jobGroups,
      fundGroups,
      eligibleEntrepreneurs,
      submittedEntrepreneurs,
      entrepreneursWithFunds,
      progress,
      overdueEntrepreneurs,
    ] = await Promise.all([
      this.prisma.periodicUpdate.aggregate({
        where: updateWhere,
        _sum: { jobsCreated: true, jobsWomen: true, jobsMen: true },
      }),
      this.prisma.fundraisingRound.aggregate({
        where: fundingWhere,
        _sum: { amountCents: true },
      }),
      this.prisma.periodicUpdate.groupBy({
        by: ["programmeId"],
        where: updateWhere,
        _sum: { jobsCreated: true },
      }),
      this.prisma.fundraisingRound.groupBy({
        by: ["programmeId"],
        where: fundingWhere,
        _sum: { amountCents: true },
      }),
      this.prisma.businessMembership.count({ where: membershipWhere }),
      this.countDistinctUpdates(period, programme?.id),
      this.countDistinctFundraisers(period, currency, programme?.id),
      this.prisma.learnerProgrammeProgress.aggregate({
        where: programme ? { programmeId: programme.id } : undefined,
        _avg: { progressPercent: true },
      }),
      this.prisma.businessMembership.count({ where: overdueWhere }),
    ]);

    const programmeIds = Array.from(
      new Set(
        [...jobGroups, ...fundGroups]
          .map((row) => row.programmeId)
          .filter((id): id is string => Boolean(id)),
      ),
    );
    const programmeNames = new Map(
      (
        await this.prisma.programme.findMany({
          where: { id: { in: programmeIds } },
          select: { id: true, name: true },
        })
      ).map((item) => [item.id, item.name]),
    );

    const jobsBreakdown = this.buildBreakdown(
      jobGroups.map((row) => ({
        programmeId: row.programmeId,
        value: row._sum.jobsCreated ?? 0,
      })),
      programmeNames,
      programme,
    );
    const fundsBreakdown = this.buildBreakdown(
      fundGroups.map((row) => ({
        programmeId: row.programmeId,
        value: row._sum.amountCents ?? 0,
      })),
      programmeNames,
      programme,
    );

    return {
      period: {
        from: period.from.toISOString(),
        to: period.to.toISOString(),
      },
      scope: programme
        ? { programmeId: programme.id, programmeName: programme.name }
        : { programmeId: null, programmeName: "All programmes" },
      sources: {
        jobs: "Periodic updates whose reporting periods overlap the selected date range.",
        funds: `Fundraising rounds dated in the selected range and recorded in ${currency}.`,
        overdue:
          "Latest periodic update submission, or programme join date when no update exists.",
      },
      settings: {
        currency,
        periodicUpdateOverdueAfterDays:
          settings?.periodicUpdateOverdueAfterDays ?? 30,
      },
      metrics: {
        jobsCreated: jobs._sum.jobsCreated ?? 0,
        jobsWomen: jobs._sum.jobsWomen ?? 0,
        jobsMen: jobs._sum.jobsMen ?? 0,
        fundsMobilisedCents: funds._sum.amountCents ?? 0,
        entrepreneursWithFunds,
        updateSubmissionRate: eligibleEntrepreneurs
          ? Math.round((submittedEntrepreneurs / eligibleEntrepreneurs) * 100)
          : 0,
        submittedEntrepreneurs,
        totalEntrepreneurs: eligibleEntrepreneurs,
        trainingCompletionRate: Math.round(progress._avg.progressPercent ?? 0),
        overdueEntrepreneurs,
      },
      jobsByProgramme: jobsBreakdown,
      fundsByProgramme: fundsBreakdown,
    };
  }

  async overdueUpdates(query: OverdueUpdatesQueryDto) {
    const take = pageSize(query, 10);
    const where = await this.buildOverdueWhere(query);
    const [rows, totalItems] = await Promise.all([
      this.prisma.businessMembership.findMany({
        where,
        orderBy: { id: "asc" },
        ...cursorArgs(query.cursor),
        take: take + 1,
        select: {
          id: true,
          joinedAt: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              periodicUpdates: {
                orderBy: { submittedAt: "desc" },
                take: 1,
                select: {
                  submittedAt: true,
                  periodStart: true,
                  periodEnd: true,
                },
              },
              entrepreneurProgrammeGrants: {
                where: { revokedAt: null },
                select: {
                  programme: { select: { id: true, name: true } },
                },
              },
            },
          },
          business: { select: { id: true, name: true } },
        },
      }),
      this.prisma.businessMembership.count({ where }),
    ]);
    const settings = await this.prisma.companySettings.findUnique({
      where: { singletonKey: "default" },
      select: { periodicUpdateOverdueAfterDays: true },
    });
    const overdueAfterDays = settings?.periodicUpdateOverdueAfterDays ?? 30;

    return {
      ...toCursorPage(rows, take, (row) => row.id),
      items: rows.slice(0, take).map((row) => {
        const latest = row.user.periodicUpdates[0] ?? null;
        const baseDate = latest?.submittedAt ?? row.joinedAt;
        const daysWithoutReport = Math.max(
          0,
          Math.floor((Date.now() - baseDate.getTime()) / DAY_MS),
        );
        const daysOverdue = Math.max(0, daysWithoutReport - overdueAfterDays);
        return {
          id: row.id,
          entrepreneurUserId: row.user.id,
          businessId: row.business.id,
          businessName: row.business.name,
          representativeName:
            [row.user.firstName, row.user.lastName].filter(Boolean).join(" ") ||
            row.user.email,
          email: row.user.email,
          programmes: row.user.entrepreneurProgrammeGrants.map(
            (grant) => grant.programme,
          ),
          lastReport: latest
            ? {
                submittedAt: latest.submittedAt.toISOString(),
                periodStart: latest.periodStart.toISOString(),
                periodEnd: latest.periodEnd.toISOString(),
              }
            : null,
          joinedAt: row.joinedAt.toISOString(),
          daysWithoutReport,
          daysOverdue,
          priority: this.priorityForDays(daysOverdue),
        };
      }),
      totalItems,
      overdueAfterDays,
    };
  }

  async sendReminder(
    actor: User,
    entrepreneurUserId: string,
    dto: SendReportingReminderDto,
  ) {
    const overdueWhere = await this.buildOverdueWhere({});
    const membership = await this.prisma.businessMembership.findFirst({
      where: {
        AND: [overdueWhere, { userId: entrepreneurUserId }],
      },
      select: { userId: true },
    });
    if (!membership) {
      throw new BadRequestException(
        "This entrepreneur is no longer in the overdue update queue.",
      );
    }

    return this.notifications.createNotification({
      recipientUserId: entrepreneurUserId,
      actorUserId: actor.id,
      type: NotificationType.system,
      title: dto.subject,
      body: dto.message,
      severity: NotificationSeverity.warning,
      entityType: NotificationEntityType.entrepreneur,
      entityId: entrepreneurUserId,
      actionUrl: "/entrepreneur/profile",
      channels: [NotificationChannel[dto.channel]],
    });
  }

  resolvePeriod(query: ReportingOverviewQueryDto): ReportPeriod {
    const now = new Date();
    const from = query.dateFrom
      ? new Date(query.dateFrom)
      : new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const to =
      query.dateTo && /^\d{4}-\d{2}-\d{2}$/.test(query.dateTo)
        ? new Date(`${query.dateTo}T23:59:59.999Z`)
        : query.dateTo
          ? new Date(query.dateTo)
          : new Date(Date.UTC(now.getUTCFullYear(), 11, 31, 23, 59, 59, 999));
    if (
      Number.isNaN(from.getTime()) ||
      Number.isNaN(to.getTime()) ||
      from > to
    ) {
      throw new BadRequestException("Select a valid reporting date range.");
    }
    if (to.getTime() - from.getTime() > DAY_MS * 3660) {
      throw new BadRequestException(
        "Reporting ranges cannot exceed ten years.",
      );
    }
    return { from, to };
  }

  private async resolveProgramme(programmeId?: string) {
    if (!programmeId) return null;
    const programme = await this.prisma.programme.findUnique({
      where: { id: programmeId },
      select: { id: true, name: true, accessType: true },
    });
    if (!programme) throw new NotFoundException("Programme was not found.");
    return programme;
  }

  private eligibleMembershipWhere(
    programme: {
      id: string;
      accessType: ProgrammeAccessType;
    } | null,
  ): Prisma.BusinessMembershipWhereInput {
    return {
      isPrimary: true,
      business: { status: BusinessStatus.active },
      user: {
        role: UserRole.entrepreneur,
        status: UserStatus.active,
        ...(programme?.accessType === ProgrammeAccessType.assigned
          ? {
              entrepreneurProgrammeGrants: {
                some: { programmeId: programme.id, revokedAt: null },
              },
            }
          : {}),
      },
    };
  }

  private async buildOverdueWhere(
    query: Pick<OverdueUpdatesQueryDto, "search" | "programmeId" | "priority">,
  ): Promise<Prisma.BusinessMembershipWhereInput> {
    const settings = await this.prisma.companySettings.findUnique({
      where: { singletonKey: "default" },
      select: { periodicUpdateOverdueAfterDays: true },
    });
    const overdueAfterDays = settings?.periodicUpdateOverdueAfterDays ?? 30;
    const cutoff = new Date(Date.now() - overdueAfterDays * DAY_MS);
    const baseWhere: Prisma.BusinessMembershipWhereInput =
      this.eligibleMembershipWhere(null);
    const scopedProgramme =
      query.programmeId && query.programmeId !== NO_PROGRAMME
        ? await this.prisma.programme.findUnique({
            where: { id: query.programmeId },
            select: { accessType: true },
          })
        : null;
    if (
      query.programmeId &&
      query.programmeId !== NO_PROGRAMME &&
      !scopedProgramme
    ) {
      throw new NotFoundException("Programme was not found.");
    }
    const programmeFilter =
      query.programmeId === NO_PROGRAMME
        ? { entrepreneurProgrammeGrants: { none: { revokedAt: null } } }
        : query.programmeId &&
            scopedProgramme?.accessType === ProgrammeAccessType.assigned
          ? {
              entrepreneurProgrammeGrants: {
                some: { programmeId: query.programmeId, revokedAt: null },
              },
            }
          : {};
    const search = query.search?.trim();
    const searchWhere: Prisma.BusinessMembershipWhereInput | null = search
      ? {
          OR: [
            { business: { name: { contains: search, mode: "insensitive" } } },
            {
              user: {
                OR: [
                  { firstName: { contains: search, mode: "insensitive" } },
                  { lastName: { contains: search, mode: "insensitive" } },
                  { email: { contains: search, mode: "insensitive" } },
                  {
                    entrepreneurProgrammeGrants: {
                      some: {
                        revokedAt: null,
                        programme: {
                          name: { contains: search, mode: "insensitive" },
                        },
                      },
                    },
                  },
                ],
              },
            },
          ],
        }
      : null;

    return {
      ...baseWhere,
      joinedAt: { lt: cutoff },
      user: {
        ...(baseWhere.user as Prisma.UserWhereInput),
        ...programmeFilter,
        periodicUpdates: { none: { submittedAt: { gte: cutoff } } },
      },
      AND: [
        ...(searchWhere ? [searchWhere] : []),
        ...(query.priority ? [this.priorityWhere(query.priority, cutoff)] : []),
      ],
    };
  }

  private priorityWhere(
    priority: ReportPriority | undefined,
    cutoff: Date,
  ): Prisma.BusinessMembershipWhereInput {
    if (!priority) return {};
    const lower =
      priority === "newly_overdue"
        ? new Date(cutoff.getTime() - 30 * DAY_MS)
        : priority === "late"
          ? new Date(cutoff.getTime() - 90 * DAY_MS)
          : undefined;
    const upper =
      priority === "newly_overdue"
        ? cutoff
        : priority === "late"
          ? new Date(cutoff.getTime() - 30 * DAY_MS)
          : new Date(cutoff.getTime() - 90 * DAY_MS);
    const latestRange = {
      ...(lower ? { gte: lower } : {}),
      lt: upper,
    };
    return {
      OR: [
        {
          user: { periodicUpdates: { none: {} } },
          joinedAt: latestRange,
        },
        {
          user: {
            periodicUpdates: {
              none: { submittedAt: { gte: upper } },
              some: { submittedAt: latestRange },
            },
          },
        },
      ],
    };
  }

  private async countDistinctUpdates(
    period: ReportPeriod,
    programmeId?: string,
  ) {
    const rows = await this.prisma.$queryRaw<
      Array<{ count: bigint }>
    >(Prisma.sql`
      SELECT COUNT(DISTINCT "entrepreneur_user_id")::bigint AS "count"
      FROM "periodic_updates"
      WHERE "period_end" >= ${period.from}
        AND "period_start" <= ${period.to}
        ${programmeId ? Prisma.sql`AND "programme_id" = ${programmeId}` : Prisma.empty}
    `);
    return Number(rows[0]?.count ?? 0);
  }

  private async countDistinctFundraisers(
    period: ReportPeriod,
    currency: string,
    programmeId?: string,
  ) {
    const rows = await this.prisma.$queryRaw<
      Array<{ count: bigint }>
    >(Prisma.sql`
      SELECT COUNT(DISTINCT "entrepreneur_user_id")::bigint AS "count"
      FROM "fundraising_rounds"
      WHERE "date" >= ${period.from}
        AND "date" <= ${period.to}
        AND "currency" = ${currency}
        ${programmeId ? Prisma.sql`AND "programme_id" = ${programmeId}` : Prisma.empty}
    `);
    return Number(rows[0]?.count ?? 0);
  }

  private buildBreakdown(
    rows: Array<{ programmeId: string | null; value: number }>,
    names: Map<string, string>,
    selected: { id: string; name: string } | null,
  ) {
    const mapped = rows.map((row) => ({
      programmeId: row.programmeId,
      programmeName: row.programmeId
        ? (names.get(row.programmeId) ?? "Unknown programme")
        : "Company-wide / unattributed",
      value: row.value,
      percent: 0,
    }));
    if (selected && !mapped.some((row) => row.programmeId === selected.id)) {
      mapped.push({
        programmeId: selected.id,
        programmeName: selected.name,
        value: 0,
        percent: 0,
      });
    }
    const max = Math.max(0, ...mapped.map((row) => row.value));
    return mapped
      .map((row) => ({
        ...row,
        percent: max ? Math.round((row.value / max) * 100) : 0,
      }))
      .sort((left, right) => right.value - left.value);
  }

  private priorityForDays(daysOverdue: number): ReportPriority {
    if (daysOverdue > 90) return "critical";
    if (daysOverdue > 30) return "late";
    return "newly_overdue";
  }
}
