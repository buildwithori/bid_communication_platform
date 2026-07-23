import { Injectable, NotFoundException } from "@nestjs/common";
import {
  BusinessSource,
  BusinessStatus,
  DeliverableInstanceStatus,
  Prisma,
  ProgrammeAccessType,
  SessionStatus,
  User,
  UserRole,
} from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import { AdminDashboardRecentQueryDto } from "./dto/admin-dashboard-query.dto";

const ADMIN_CHART_LIMIT = 8;
const DASHBOARD_PREVIEW_LIMIT = 4;
const RECENT_DEFAULT_TAKE = 5;

@Injectable()
export class DashboardsService {
  constructor(private readonly prisma: PrismaService) {}

  async adminDashboard() {
    const now = new Date();
    const settings = await this.prisma.companySettings.findUnique({
      where: { singletonKey: "default" },
      select: { defaultCurrency: true },
    });
    const currency = settings?.defaultCurrency ?? "USD";
    const activeProgrammeWhere: Prisma.ProgrammeWhereInput = {
      publishedAt: { not: null },
      archivedAt: null,
      startDate: { lte: now },
      endDate: { gte: now },
    };
    const entrepreneurScope: Prisma.UserWhereInput = {
      role: UserRole.entrepreneur,
      businessMemberships: { some: { isPrimary: true } },
    };
    const activeEntrepreneurScope: Prisma.UserWhereInput = {
      ...entrepreneurScope,
      status: "active",
      businessMemberships: {
        some: { isPrimary: true, business: { status: BusinessStatus.active } },
      },
    };

    const [
      totalEntrepreneurs,
      activeBusinessCount,
      activeProgrammeCount,
      withoutProgramme,
      funds,
      progress,
      programmes,
      sectors,
      stages,
      pendingDeliverables,
      pendingToolRequests,
      recentWithoutProgramme,
      fundsTrendRows,
      topFundraiserGroups,
    ] = await Promise.all([
      this.prisma.user.count({ where: entrepreneurScope }),
      this.prisma.business.count({ where: { status: BusinessStatus.active } }),
      this.prisma.programme.count({ where: activeProgrammeWhere }),
      this.prisma.user.count({
        where: {
          ...activeEntrepreneurScope,
          entrepreneurProgrammeGrants: { none: { revokedAt: null } },
        },
      }),
      this.prisma.fundraisingRound.aggregate({
        where: { currency },
        _sum: { amountCents: true },
      }),
      this.prisma.learnerProgrammeProgress.aggregate({
        where: { entrepreneur: activeEntrepreneurScope },
        _avg: { progressPercent: true },
        _count: { _all: true },
      }),
      this.prisma.programme.findMany({
        where: activeProgrammeWhere,
        orderBy: [{ startDate: "desc" }, { id: "desc" }],
        take: ADMIN_CHART_LIMIT,
        select: { id: true, name: true, maxEntrepreneurs: true, accessType: true },
      }),
      this.prisma.business.groupBy({
        by: ["sectorId"],
        where: { status: BusinessStatus.active, sectorId: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { sectorId: "desc" } },
      }),
      this.prisma.business.groupBy({
        by: ["stageId"],
        where: { status: BusinessStatus.active, stageId: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { stageId: "desc" } },
      }),
      this.prisma.deliverableInstance.count({
        where: { status: DeliverableInstanceStatus.submitted },
      }),
      this.prisma.toolRequest.count({ where: { status: "under_review" } }),
      this.prisma.user.count({
        where: {
          ...activeEntrepreneurScope,
          businessMemberships: {
            some: {
              isPrimary: true,
              business: {
                status: BusinessStatus.active,
                source: BusinessSource.self_registered,
              },
            },
          },
          entrepreneurProgrammeGrants: { none: { revokedAt: null } },
        },
      }),
      this.prisma.$queryRaw<Array<{ month: Date; amount: bigint }>>(Prisma.sql`
        SELECT date_trunc('month', "date") AS month,
               COALESCE(SUM("amount_cents"), 0)::bigint AS amount
        FROM "fundraising_rounds"
        WHERE "currency" = ${currency}
          AND "date" >= date_trunc('month', CURRENT_DATE) - INTERVAL '5 months'
        GROUP BY 1
        ORDER BY 1
      `),
      this.prisma.fundraisingRound.groupBy({
        by: ["entrepreneurUserId"],
        where: { currency },
        _sum: { amountCents: true },
        orderBy: { _sum: { amountCents: "desc" } },
        take: DASHBOARD_PREVIEW_LIMIT,
      }),
    ]);

    const programmeIds = programmes.map((programme) => programme.id);
    const [activeGrantGroups, revokedGrantGroups, programmeProgressGroups] =
      programmeIds.length
        ? await Promise.all([
            this.prisma.programmeAccessGrant.groupBy({
              by: ["programmeId"],
              where: { programmeId: { in: programmeIds }, revokedAt: null },
              _count: { _all: true },
            }),
            this.prisma.programmeAccessGrant.groupBy({
              by: ["programmeId"],
              where: { programmeId: { in: programmeIds }, revokedAt: { not: null } },
              _count: { _all: true },
            }),
            this.prisma.learnerProgrammeProgress.groupBy({
              by: ["programmeId"],
              where: { programmeId: { in: programmeIds } },
              _avg: { progressPercent: true },
              _count: { _all: true },
            }),
          ])
        : [[], [], []];

    const sectorIds = sectors.flatMap((row) => (row.sectorId ? [row.sectorId] : []));
    const stageIds = stages.flatMap((row) => (row.stageId ? [row.stageId] : []));
    const fundraiserIds = topFundraiserGroups.map((row) => row.entrepreneurUserId);
    const [sectorRecords, stageRecords, fundraiserRecords] = await Promise.all([
      this.prisma.sector.findMany({
        where: { id: { in: sectorIds } },
        select: { id: true, name: true },
      }),
      this.prisma.businessStage.findMany({
        where: { id: { in: stageIds } },
        select: { id: true, name: true },
      }),
      this.prisma.user.findMany({
        where: { id: { in: fundraiserIds } },
        select: {
          id: true,
          businessMemberships: {
            where: { isPrimary: true },
            take: 1,
            select: {
              business: {
                select: { name: true, sector: { select: { name: true } } },
              },
            },
          },
        },
      }),
    ]);

    const activeGrants = this.countMap(activeGrantGroups, "programmeId");
    const revokedGrants = this.countMap(revokedGrantGroups, "programmeId");
    const progressByProgramme = new Map(
      programmeProgressGroups.map((row) => [row.programmeId, row]),
    );
    const sectorNames = new Map(sectorRecords.map((row) => [row.id, row.name]));
    const stageNames = new Map(stageRecords.map((row) => [row.id, row.name]));
    const fundraiserById = new Map(fundraiserRecords.map((row) => [row.id, row]));
    return {
      generatedAt: now.toISOString(),
      currency,
      metrics: {
        totalEntrepreneurs,
        activeBusinesses: activeBusinessCount,
        activeProgrammes: activeProgrammeCount,
        fundsMobilisedCents: funds._sum.amountCents ?? 0,
        averageTrainingProgress: Math.round(progress._avg.progressPercent ?? 0),
        trackedProgrammeProgress: progress._count._all,
        withoutProgramme,
      },
      programmeHealthPreview: programmes.map((programme) => {
        const tracked = progressByProgramme.get(programme.id);
        const active =
          programme.accessType === ProgrammeAccessType.free
            ? tracked?._count._all ?? 0
            : activeGrants.get(programme.id) ?? 0;
        const left = revokedGrants.get(programme.id) ?? 0;
        const retention = Math.round((active / Math.max(active + left, 1)) * 100);
        return {
          id: programme.id,
          name: programme.name,
          active,
          left,
          openSeats: Math.max(programme.maxEntrepreneurs - active, 0),
          capacity: programme.maxEntrepreneurs,
          completion: Math.round(tracked?._avg.progressPercent ?? 0),
          retention,
        };
      }),
      sectorBreakdown: sectors.map((row) => ({
        id: row.sectorId as string,
        name: sectorNames.get(row.sectorId as string) ?? "Unknown sector",
        value: row._count._all,
      })),
      stageBreakdown: stages.map((row) => ({
        id: row.stageId as string,
        name: stageNames.get(row.stageId as string) ?? "Unknown stage",
        value: row._count._all,
        percent: Math.round((row._count._all / Math.max(activeBusinessCount, 1)) * 100),
      })),
      fundsTrend: this.monthSeries(fundsTrendRows),
      topFundraisers: topFundraiserGroups.flatMap((group) => {
        const entrepreneur = fundraiserById.get(group.entrepreneurUserId);
        const business = entrepreneur?.businessMemberships[0]?.business;
        return business
          ? [{
              entrepreneurUserId: group.entrepreneurUserId,
              businessName: business.name,
              sectorName: business.sector?.name ?? "Sector not set",
              amountCents: group._sum.amountCents ?? 0,
            }]
          : [];
      }),
      pendingActions: {
        deliverablesAwaitingReview: pendingDeliverables,
        selfRegisteredWithoutProgramme: recentWithoutProgramme,
        toolRequestsUnderReview: pendingToolRequests,
      },
    };
  }

  async adminRecentEntrepreneurs(query: AdminDashboardRecentQueryDto) {
    const take = query.take ?? RECENT_DEFAULT_TAKE;
    const membershipWhere: Prisma.BusinessMembershipWhereInput = {
      isPrimary: true,
      user: {
        role: UserRole.entrepreneur,
        ...(query.status === "active" ? { status: "active" } : {}),
        ...(query.status === "without_programme"
          ? { entrepreneurProgrammeGrants: { none: { revokedAt: null } } }
          : {}),
      },
      business: {
        ...(query.source ? { source: query.source } : {}),
      },
    };
    if (query.search?.trim()) {
      const search = query.search.trim();
      membershipWhere.AND = [{
        OR: [
          { user: { firstName: { contains: search, mode: "insensitive" } } },
          { user: { lastName: { contains: search, mode: "insensitive" } } },
          { user: { email: { contains: search, mode: "insensitive" } } },
          { business: { name: { contains: search, mode: "insensitive" } } },
          { business: { sector: { name: { contains: search, mode: "insensitive" } } } },
          { business: { stage: { name: { contains: search, mode: "insensitive" } } } },
        ],
      }];
    }
    const [rows, totalItems] = await Promise.all([
      this.prisma.businessMembership.findMany({
        where: membershipWhere,
        orderBy: [{ joinedAt: "desc" }, { id: "desc" }],
        take: take + 1,
        ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
        select: {
          id: true,
          joinedAt: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              status: true,
              _count: {
                select: {
                  entrepreneurProgrammeGrants: { where: { revokedAt: null } },
                },
              },
            },
          },
          business: {
            select: {
              name: true,
              source: true,
              status: true,
              sector: { select: { id: true, name: true } },
              stage: { select: { id: true, name: true } },
            },
          },
        },
      }),
      this.prisma.businessMembership.count({ where: membershipWhere }),
    ]);
    const visibleRows = rows.slice(0, take);
    return {
      items: visibleRows.map((row) => ({
        entrepreneurUserId: row.user.id,
        businessName: row.business.name,
        representativeName:
          [row.user.firstName, row.user.lastName].filter(Boolean).join(" ") ||
          row.user.email,
        email: row.user.email,
        source: row.business.source,
        businessStatus: row.business.status,
        userStatus: row.user.status,
        hasProgramme: row.user._count.entrepreneurProgrammeGrants > 0,
        sector: row.business.sector,
        stage: row.business.stage,
        joinedAt: row.joinedAt.toISOString(),
      })),
      nextCursor:
        rows.length > take ? visibleRows[visibleRows.length - 1]?.id ?? null : null,
      totalItems,
    };
  }

  async trainerDashboard(user: User) {
    const now = new Date();
    const [settings, trainer, programmes, ratingSummary, ownedContentCount] =
      await Promise.all([
        this.prisma.companySettings.findUnique({
          where: { singletonKey: "default" },
          select: { periodicUpdateOverdueAfterDays: true },
        }),
        this.prisma.user.findUnique({
          where: { id: user.id },
          select: { firstName: true, lastName: true, email: true },
        }),
        this.prisma.programme.findMany({
          where: {
            archivedAt: null,
            publishedAt: { not: null },
            modules: {
              some: {
                module: {
                  contentItems: {
                    some: { contentItem: { trainerId: user.id } },
                  },
                },
              },
            },
          },
          orderBy: [{ startDate: "desc" }, { id: "desc" }],
          select: { id: true, name: true, accessType: true },
        }),
        this.prisma.contentRating.aggregate({
          where: { trainerId: user.id },
          _avg: { rating: true },
          _count: { _all: true },
        }),
        this.prisma.contentItem.count({ where: { trainerId: user.id } }),
      ]);
    const programmeIds = programmes.map((programme) => programme.id);
    const assignedIds = programmes
      .filter((programme) => programme.accessType === ProgrammeAccessType.assigned)
      .map((programme) => programme.id);
    const freeIds = programmes
      .filter((programme) => programme.accessType === ProgrammeAccessType.free)
      .map((programme) => programme.id);
    const [assignedLearners, freeLearners] = await Promise.all([
      this.prisma.programmeAccessGrant.findMany({
        where: { programmeId: { in: assignedIds }, revokedAt: null },
        select: { entrepreneurUserId: true },
        distinct: ["entrepreneurUserId"],
      }),
      this.prisma.learnerProgrammeProgress.findMany({
        where: { programmeId: { in: freeIds } },
        select: { entrepreneurUserId: true },
        distinct: ["entrepreneurUserId"],
      }),
    ]);
    const learnerIds = Array.from(
      new Set([
        ...assignedLearners.map((row) => row.entrepreneurUserId),
        ...freeLearners.map((row) => row.entrepreneurUserId),
      ]),
    );
    const [progressGroups, learnerProgress, reviewGroups, upcomingSessionCount, sessions, completionTrend] =
      await Promise.all([
        this.prisma.learnerProgrammeProgress.groupBy({
          by: ["programmeId"],
          where: {
            programmeId: { in: programmeIds },
            entrepreneurUserId: { in: learnerIds },
          },
          _avg: { progressPercent: true },
          _count: { _all: true },
        }),
        this.prisma.user.findMany({
          where: { id: { in: learnerIds } },
          select: {
            id: true,
            businessMemberships: {
              where: { isPrimary: true },
              take: 1,
              select: { joinedAt: true },
            },
            periodicUpdates: {
              orderBy: { submittedAt: "desc" },
              take: 1,
              select: { submittedAt: true },
            },
            programmeProgress: {
              where: { programmeId: { in: programmeIds } },
              select: { progressPercent: true },
            },
          },
        }),
        this.prisma.deliverableInstance.groupBy({
          by: ["status"],
          where: { entrepreneurUserId: { in: learnerIds } },
          _count: { _all: true },
        }),
        this.prisma.session.count({
          where: {
            startAt: { gte: now },
            status: { in: [SessionStatus.requested, SessionStatus.confirmed] },
            OR: [{ ownerUserId: user.id }, { targetUserId: user.id }],
          },
        }),
        this.prisma.session.findMany({
          where: {
            startAt: { gte: now },
            status: { in: [SessionStatus.requested, SessionStatus.confirmed] },
            OR: [{ ownerUserId: user.id }, { targetUserId: user.id }],
          },
          orderBy: [{ startAt: "asc" }, { id: "asc" }],
          take: 3,
          select: {
            id: true,
            type: true,
            typeDefinition: { select: { name: true } },
            topic: true,
            status: true,
            startAt: true,
            endAt: true,
            timezone: true,
            entrepreneur: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                businessMemberships: {
                  where: { isPrimary: true },
                  take: 1,
                  select: { business: { select: { name: true } } },
                },
              },
            },
          },
        }),
        this.prisma.$queryRaw<Array<{ week: Date; completions: bigint }>>(Prisma.sql`
          SELECT weeks.week,
                 COUNT(progress."id")::bigint AS completions
          FROM generate_series(
            date_trunc('week', CURRENT_DATE) - INTERVAL '5 weeks',
            date_trunc('week', CURRENT_DATE),
            INTERVAL '1 week'
          ) AS weeks(week)
          LEFT JOIN "learner_content_progress" progress
            ON progress."completed_at" >= weeks.week
           AND progress."completed_at" < weeks.week + INTERVAL '1 week'
           AND progress."status" = 'completed'::"LearnerProgressStatus"
           AND EXISTS (
             SELECT 1 FROM "content_items" content
             WHERE content."id" = progress."content_item_id"
               AND content."trainer_id" = ${user.id}
           )
          GROUP BY weeks.week
          ORDER BY weeks.week
        `),
      ]);

    const overdueDays = settings?.periodicUpdateOverdueAfterDays ?? 30;
    const attentionCount = learnerProgress.filter((learner) => {
      const values = learner.programmeProgress.map((row) => row.progressPercent);
      const average = values.length
        ? values.reduce((sum, value) => sum + value, 0) / values.length
        : 0;
      const latest =
        learner.periodicUpdates[0]?.submittedAt ??
        learner.businessMemberships[0]?.joinedAt ??
        now;
      const daysSinceUpdate = Math.floor(
        (now.getTime() - latest.getTime()) / 86_400_000,
      );
      return average < 50 || daysSinceUpdate > overdueDays;
    }).length;
    const learnerAverages = learnerProgress.map((learner) => {
      const values = learner.programmeProgress.map((row) => row.progressPercent);
      return values.length
        ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
        : 0;
    });
    const progressBands = [
      { name: "0-25%", min: 0, max: 25 },
      { name: "26-50%", min: 26, max: 50 },
      { name: "51-75%", min: 51, max: 75 },
      { name: "76-100%", min: 76, max: 100 },
    ].map(({ name, min, max }) => ({
      name,
      value: learnerAverages.filter((value) => value >= min && value <= max).length,
    }));
    const reviewCounts = new Map(
      reviewGroups.map((row) => [row.status, row._count._all]),
    );
    const progressByProgramme = new Map(
      progressGroups.map((row) => [row.programmeId, row]),
    );
    const displayName =
      [trainer?.firstName, trainer?.lastName].filter(Boolean).join(" ") ||
      trainer?.email ||
      "Trainer";

    return {
      generatedAt: now.toISOString(),
      trainer: { name: displayName },
      metrics: {
        learnersReached: learnerIds.length,
        learnersNeedingAttention: attentionCount,
        upcomingSessions: upcomingSessionCount,
        pendingReviews: reviewCounts.get(DeliverableInstanceStatus.submitted) ?? 0,
        changesRequested:
          reviewCounts.get(DeliverableInstanceStatus.changes_required) ?? 0,
        contentRating: Number((ratingSummary._avg.rating ?? 0).toFixed(1)),
        ratingCount: ratingSummary._count._all,
        ownedContent: ownedContentCount,
      },
      programmeProgressPreview: programmes.slice(0, ADMIN_CHART_LIMIT).map((programme) => {
        const row = progressByProgramme.get(programme.id);
        return {
          id: programme.id,
          name: programme.name,
          learners: row?._count._all ?? 0,
          averageProgress: Math.round(row?._avg.progressPercent ?? 0),
        };
      }),
      progressBands,
      contentImpactTrend: completionTrend.map((row) => ({
        date: row.week.toISOString(),
        completions: Number(row.completions),
      })),
      reviewWorkload: [
        { status: "pending", value: reviewCounts.get(DeliverableInstanceStatus.submitted) ?? 0 },
        { status: "changes_requested", value: reviewCounts.get(DeliverableInstanceStatus.changes_required) ?? 0 },
        { status: "approved", value: reviewCounts.get(DeliverableInstanceStatus.approved) ?? 0 },
        { status: "overdue", value: reviewCounts.get(DeliverableInstanceStatus.overdue) ?? 0 },
      ],
      upcomingSessions: sessions.map((session) => ({
        id: session.id,
        type: session.type,
        typeName: session.typeDefinition.name,
        topic: session.topic,
        status: session.status,
        startsAt: session.startAt.toISOString(),
        endsAt: session.endAt.toISOString(),
        timezone: session.timezone,
        entrepreneurName:
          session.entrepreneur.businessMemberships[0]?.business.name ??
          ([session.entrepreneur.firstName, session.entrepreneur.lastName]
            .filter(Boolean)
            .join(" ") || session.entrepreneur.email),
      })),
    };
  }

  async entrepreneurDashboard(user: User) {
    const now = new Date();
    const membership = await this.prisma.businessMembership.findFirst({
      where: { userId: user.id, isPrimary: true },
      select: { business: { select: { name: true } } },
    });
    if (!membership) {
      throw new NotFoundException("Entrepreneur business profile was not found.");
    }
    const [
      progress,
      deliverableGroups,
      upcomingSessions,
      activeDeliverables,
      activity,
      completionTrend,
    ] = await Promise.all([
      this.prisma.learnerProgrammeProgress.aggregate({
        where: { entrepreneurUserId: user.id },
        _avg: { progressPercent: true },
        _sum: { completedContentCount: true, totalContentCount: true },
        _count: { _all: true },
      }),
      this.prisma.deliverableInstance.groupBy({
        by: ["status"],
        where: { entrepreneurUserId: user.id },
        _count: { _all: true },
      }),
      this.prisma.session.findMany({
        where: {
          entrepreneurUserId: user.id,
          startAt: { gte: now },
          status: { in: [SessionStatus.requested, SessionStatus.confirmed] },
        },
        orderBy: [{ startAt: "asc" }, { id: "asc" }],
        take: 3,
        select: {
          id: true,
          type: true,
          typeDefinition: { select: { name: true } },
          topic: true,
          status: true,
          startAt: true,
          endAt: true,
          timezone: true,
        },
      }),
      this.prisma.deliverableInstance.findMany({
        where: {
          entrepreneurUserId: user.id,
          status: {
            in: [
              DeliverableInstanceStatus.not_submitted,
              DeliverableInstanceStatus.overdue,
              DeliverableInstanceStatus.submitted,
              DeliverableInstanceStatus.changes_required,
            ],
          },
        },
        orderBy: [{ dueDate: "asc" }, { id: "asc" }],
        take: DASHBOARD_PREVIEW_LIMIT,
        select: {
          id: true,
          dueDate: true,
          status: true,
          rule: { select: { name: true } },
          programme: { select: { id: true, name: true } },
        },
      }),
      this.prisma.notification.findMany({
        where: { recipientUserId: user.id },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 3,
        select: {
          id: true,
          title: true,
          body: true,
          severity: true,
          actionUrl: true,
          readAt: true,
          createdAt: true,
        },
      }),
      this.prisma.$queryRaw<Array<{ week: Date; completed: bigint }>>(Prisma.sql`
        SELECT weeks.week,
               COUNT(progress."id")::bigint AS completed
        FROM generate_series(
          date_trunc('week', CURRENT_DATE) - INTERVAL '5 weeks',
          date_trunc('week', CURRENT_DATE),
          INTERVAL '1 week'
        ) AS weeks(week)
        LEFT JOIN "learner_content_progress" progress
          ON progress."entrepreneur_user_id" = ${user.id}
         AND progress."status" = 'completed'::"LearnerProgressStatus"
         AND progress."completed_at" < weeks.week + INTERVAL '1 week'
        GROUP BY weeks.week
        ORDER BY weeks.week
      `),
    ]);
    const deliverableCounts = new Map(
      deliverableGroups.map((row) => [row.status, row._count._all]),
    );
    const completedDeliverables =
      deliverableCounts.get(DeliverableInstanceStatus.approved) ?? 0;
    const totalDeliverables = deliverableGroups.reduce(
      (sum, row) => sum + row._count._all,
      0,
    );
    const totalContent = progress._sum.totalContentCount ?? 0;

    return {
      generatedAt: now.toISOString(),
      entrepreneur: { businessName: membership.business.name },
      metrics: {
        trainingProgress: Math.round(progress._avg.progressPercent ?? 0),
        trackedProgrammes: progress._count._all,
        completedContent: progress._sum.completedContentCount ?? 0,
        totalContent,
        deliverablesCompleted: completedDeliverables,
        deliverablesTotal: totalDeliverables,
        deliverablesPending:
          (deliverableCounts.get(DeliverableInstanceStatus.not_submitted) ?? 0) +
          (deliverableCounts.get(DeliverableInstanceStatus.overdue) ?? 0),
      },
      progressTrend: completionTrend.map((row) => ({
        date: row.week.toISOString(),
        progress: Math.min(
          100,
          Math.round((Number(row.completed) / Math.max(totalContent, 1)) * 100),
        ),
      })),
      activity: activity.map((notification) => ({
        ...notification,
        createdAt: notification.createdAt.toISOString(),
        readAt: notification.readAt?.toISOString() ?? null,
      })),
      upcomingSessions: upcomingSessions.map((session) => ({
        id: session.id,
        type: session.type,
        typeName: session.typeDefinition.name,
        topic: session.topic,
        status: session.status,
        startsAt: session.startAt.toISOString(),
        endsAt: session.endAt.toISOString(),
        timezone: session.timezone,
      })),
      activeDeliverables: activeDeliverables.map((deliverable) => ({
        id: deliverable.id,
        name: deliverable.rule.name,
        programmeId: deliverable.programme.id,
        programmeName: deliverable.programme.name,
        dueDate: deliverable.dueDate.toISOString(),
        status: deliverable.status,
      })),
    };
  }

  private countMap<T extends { _count: { _all: number } }>(
    rows: T[],
    key: keyof T,
  ) {
    return new Map(rows.map((row) => [String(row[key]), row._count._all]));
  }

  private monthSeries(rows: Array<{ month: Date; amount: bigint }>) {
    const values = new Map(
      rows.map((row) => [
        `${row.month.getUTCFullYear()}-${row.month.getUTCMonth()}`,
        Number(row.amount),
      ]),
    );
    const current = new Date();
    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date(
        Date.UTC(current.getUTCFullYear(), current.getUTCMonth() - 5 + index, 1),
      );
      return {
        month: date.toISOString(),
        amountCents: values.get(`${date.getUTCFullYear()}-${date.getUTCMonth()}`) ?? 0,
      };
    });
  }
}
