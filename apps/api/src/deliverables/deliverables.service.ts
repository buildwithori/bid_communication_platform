import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  DeliverableInstanceStatus,
  DeliverableReviewDecision,
  FileAssetUsage,
  NotificationChannel,
  NotificationEntityType,
  NotificationSeverity,
  NotificationType,
  Prisma,
  User,
  UserRole,
  UserStatus,
} from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import {
  cursorArgs,
  pageSize,
  toCursorPage,
} from "../common/pagination/cursor-pagination.dto";
import { PrismaService } from "../database/prisma.service";
import { FilesService } from "../files/files.service";
import { NotificationsService } from "../notifications/notifications.service";
import { DeliverableGroupQueryDto } from "./dto/deliverable-group-query.dto";
import { DeliverableHistoryQueryDto } from "./dto/deliverable-history-query.dto";
import { DeliverableInstanceQueryDto } from "./dto/deliverable-instance-query.dto";
import { DeliverableReviewQueryDto } from "./dto/deliverable-review-query.dto";
import { ReviewDeliverableDto } from "./dto/review-deliverable.dto";
import { SubmitDeliverableDto } from "./dto/submit-deliverable.dto";
import { UpdateDeliverableDueDateDto } from "./dto/update-deliverable-due-date.dto";
import { RecurringDeliverableService } from "./recurring-deliverable.service";

const DEFAULT_TAKE = 20;
const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
} as const;
const reviewInclude = {
  reviewer: { select: { ...userSelect, role: true } },
} satisfies Prisma.DeliverableReviewInclude;
const submissionInclude = {
  submittedBy: { select: userSelect },
  fileAsset: {
    select: {
      id: true,
      originalFilename: true,
      mimeType: true,
      sizeBytes: true,
      status: true,
    },
  },
  reviews: {
    orderBy: [{ createdAt: "desc" as const }, { id: "desc" as const }],
    take: 1,
    include: reviewInclude,
  },
  _count: { select: { reviews: true } },
} satisfies Prisma.DeliverableSubmissionInclude;
const deliverableInstanceInclude = {
  rule: {
    select: {
      id: true,
      name: true,
      dueType: true,
      dueDate: true,
      recurringCadence: true,
      requiredForScope: true,
      dueAfterModule: { select: { id: true, title: true } },
      requiredStage: { select: { id: true, name: true, key: true } },
    },
  },
  programme: { select: { id: true, name: true, accessType: true } },
  entrepreneur: {
    select: {
      ...userSelect,
      businessMemberships: {
        where: { isPrimary: true },
        take: 1,
        select: {
          business: {
            select: {
              id: true,
              name: true,
              country: true,
              sector: { select: { id: true, name: true, key: true } },
              stage: { select: { id: true, name: true, key: true } },
            },
          },
        },
      },
    },
  },
  dueUpdatedBy: { select: userSelect },
  submissions: {
    orderBy: [{ submittedAt: "desc" as const }, { id: "desc" as const }],
    take: 1,
    include: submissionInclude,
  },
  _count: { select: { submissions: true } },
} satisfies Prisma.DeliverableInstanceInclude;

const feedbackInclude = {
  reviewer: { select: { ...userSelect, role: true } },
  submission: {
    select: {
      id: true,
      submittedAt: true,
      fileAsset: {
        select: {
          id: true,
          originalFilename: true,
          mimeType: true,
          sizeBytes: true,
          status: true,
        },
      },
    },
  },
} satisfies Prisma.DeliverableReviewInclude;

type DeliverableInstanceRow = Prisma.DeliverableInstanceGetPayload<{
  include: typeof deliverableInstanceInclude;
}>;
type SubmissionRow = Prisma.DeliverableSubmissionGetPayload<{
  include: typeof submissionInclude;
}>;
type FeedbackRow = Prisma.DeliverableReviewGetPayload<{
  include: typeof feedbackInclude;
}>;

@Injectable()
export class DeliverablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
    private readonly audit: AuditService,
    private readonly recurring: RecurringDeliverableService,
    private readonly notifications: NotificationsService,
  ) {}

  async listGroups(user: User, query: DeliverableGroupQueryDto) {
    await this.recurring.ensureCurrent();
    const take = pageSize(query);
    const search = query.search?.trim();
    const groupStatusFilter: Prisma.DeliverableInstanceWhereInput =
      query.view === "needs_action"
        ? {
            status: {
              in: [
                DeliverableInstanceStatus.not_submitted,
                DeliverableInstanceStatus.overdue,
                DeliverableInstanceStatus.changes_required,
              ],
            },
          }
        : query.view === "under_review"
          ? { status: DeliverableInstanceStatus.submitted }
          : {};
    const where: Prisma.ProgrammeWhereInput = {
      deliverableInstances: {
        some: { entrepreneurUserId: user.id, ...groupStatusFilter },
      },
      ...(query.view === "approved"
        ? {
            deliverableInstances: {
              some: { entrepreneurUserId: user.id },
              none: {
                entrepreneurUserId: user.id,
                status: { not: DeliverableInstanceStatus.approved },
              },
            },
          }
        : {}),
      ...(query.programmeId ? { id: query.programmeId } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              {
                deliverableRules: {
                  some: { name: { contains: search, mode: "insensitive" } },
                },
              },
            ],
          }
        : {}),
    };
    const [programmes, totalItems, overallStatusGroups, unreadFeedbackTotal] =
      await Promise.all([
        this.prisma.programme.findMany({
          where,
          orderBy: [{ name: "asc" }, { id: "asc" }],
          take: take + 1,
          ...cursorArgs(query.cursor),
          select: { id: true, name: true, accessType: true },
        }),
        this.prisma.programme.count({ where }),
        this.prisma.deliverableInstance.groupBy({
          by: ["status"],
          where: { entrepreneurUserId: user.id },
          _count: { _all: true },
        }),
        this.prisma.deliverableInstance.count({
          where: {
            entrepreneurUserId: user.id,
            submissions: { some: { reviews: { some: { readAt: null } } } },
          },
        }),
      ]);
    const page = programmes.slice(0, take);
    const programmeIds = page.map((programme) => programme.id);
    const instanceWhere: Prisma.DeliverableInstanceWhereInput = {
      entrepreneurUserId: user.id,
      programmeId: { in: programmeIds },
    };
    const [statusGroups, dueGroups, unreadGroups] = programmeIds.length
      ? await Promise.all([
          this.prisma.deliverableInstance.groupBy({
            by: ["programmeId", "status"],
            where: instanceWhere,
            _count: { _all: true },
          }),
          this.prisma.deliverableInstance.groupBy({
            by: ["programmeId"],
            where: {
              ...instanceWhere,
              status: {
                in: [
                  DeliverableInstanceStatus.not_submitted,
                  DeliverableInstanceStatus.overdue,
                  DeliverableInstanceStatus.changes_required,
                ],
              },
            },
            _min: { dueDate: true },
          }),
          this.prisma.deliverableInstance.groupBy({
            by: ["programmeId"],
            where: {
              ...instanceWhere,
              submissions: { some: { reviews: { some: { readAt: null } } } },
            },
            _count: { _all: true },
          }),
        ])
      : [[], [], []];

    return {
      items: page.map((programme) => {
        const counts = this.statusSummary(
          statusGroups
            .filter((group) => group.programmeId === programme.id)
            .map((group) => ({ status: group.status, _count: group._count })),
        );
        return {
          ...programme,
          counts,
          total: Object.values(counts).reduce((sum, count) => sum + count, 0),
          needsAction:
            counts.not_submitted + counts.overdue + counts.changes_required,
          unreadFeedback:
            unreadGroups.find((group) => group.programmeId === programme.id)
              ?._count._all ?? 0,
          nextDueDate:
            dueGroups
              .find((group) => group.programmeId === programme.id)
              ?._min.dueDate?.toISOString() ?? null,
        };
      }),
      nextCursor:
        programmes.length > take ? (page[page.length - 1]?.id ?? null) : null,
      totalItems,
      summary: this.statusSummary(overallStatusGroups),
      unreadFeedbackTotal,
    };
  }

  async listInstances(user: User, query: DeliverableInstanceQueryDto) {
    await this.recurring.ensureCurrent();
    const take = query.take ?? DEFAULT_TAKE;
    const where = this.buildInstanceWhere(user, query);
    const summaryWhere = this.buildInstanceWhere(user, query, true);
    const [rows, totalItems, statusGroups] = await Promise.all([
      this.prisma.deliverableInstance.findMany({
        where,
        orderBy: [{ dueDate: "asc" }, { id: "desc" }],
        take: take + 1,
        ...cursorArgs(query.cursor),
        include: deliverableInstanceInclude,
      }),
      this.prisma.deliverableInstance.count({ where }),
      this.prisma.deliverableInstance.groupBy({
        by: ["status"],
        where: summaryWhere,
        _count: { _all: true },
      }),
    ]);
    const pageIds = rows.slice(0, take).map((row) => row.id);
    const unreadRows = pageIds.length
      ? await this.prisma.deliverableInstance.findMany({
          where: {
            id: { in: pageIds },
            submissions: { some: { reviews: { some: { readAt: null } } } },
          },
          select: { id: true },
        })
      : [];
    const unreadIds = new Set(unreadRows.map((row) => row.id));
    return {
      ...toCursorPage(rows, take, (row) => row.id),
      items: rows
        .slice(0, take)
        .map((row) => this.mapInstance(row, unreadIds.has(row.id))),
      totalItems,
      summary: this.statusSummary(statusGroups),
    };
  }

  async listReviewQueue(user: User, query: DeliverableReviewQueryDto) {
    await this.recurring.ensureCurrent();
    if (user.role !== UserRole.admin && user.role !== UserRole.trainer) {
      throw new ForbiddenException("You cannot review deliverables.");
    }
    const take = query.take ?? DEFAULT_TAKE;
    const overdueWhere: Prisma.DeliverableInstanceWhereInput = query.overdue
      ? {
          dueDate: { lt: new Date() },
          status: { not: DeliverableInstanceStatus.approved },
        }
      : {};
    const where = {
      ...this.buildInstanceWhere(user, query),
      submissions: { some: {} },
      ...overdueWhere,
    };
    const summaryWhere = {
      ...this.buildInstanceWhere(user, query, true),
      submissions: { some: {} },
    };
    const [rows, totalItems, statusGroups, overdueReviewCount] =
      await Promise.all([
        this.prisma.deliverableInstance.findMany({
          where,
          orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
          take: take + 1,
          ...cursorArgs(query.cursor),
          include: deliverableInstanceInclude,
        }),
        this.prisma.deliverableInstance.count({ where }),
        this.prisma.deliverableInstance.groupBy({
          by: ["status"],
          where: summaryWhere,
          _count: { _all: true },
        }),
        this.prisma.deliverableInstance.count({
          where: {
            ...summaryWhere,
            dueDate: { lt: new Date() },
            status: { not: DeliverableInstanceStatus.approved },
          },
        }),
      ]);
    return {
      ...toCursorPage(rows, take, (row) => row.id),
      items: rows.slice(0, take).map((row) => this.mapReviewQueueItem(row)),
      totalItems,
      summary: this.statusSummary(statusGroups),
      overdueReviewCount,
    };
  }

  async listSubmissions(
    user: User,
    instanceId: string,
    query: DeliverableHistoryQueryDto,
  ) {
    await this.ensureCanReadInstance(user, instanceId);
    const take = pageSize(query);
    const where = { instanceId };
    const [rows, totalItems] = await Promise.all([
      this.prisma.deliverableSubmission.findMany({
        where,
        orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
        take: take + 1,
        ...cursorArgs(query.cursor),
        include: submissionInclude,
      }),
      this.prisma.deliverableSubmission.count({ where }),
    ]);
    return {
      ...toCursorPage(rows, take, (row) => row.id),
      items: rows.slice(0, take).map((row) => this.mapSubmission(row)),
      totalItems,
    };
  }

  async listFeedback(
    user: User,
    instanceId: string,
    query: DeliverableHistoryQueryDto,
  ) {
    await this.ensureCanReadInstance(user, instanceId);
    const take = pageSize(query);
    const where = { submission: { instanceId } };
    const [rows, totalItems] = await Promise.all([
      this.prisma.deliverableReview.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: take + 1,
        ...cursorArgs(query.cursor),
        include: feedbackInclude,
      }),
      this.prisma.deliverableReview.count({ where }),
    ]);
    return {
      ...toCursorPage(rows, take, (row) => row.id),
      items: rows.slice(0, take).map((row) => this.mapFeedback(row)),
      totalItems,
    };
  }

  async getInstance(user: User, instanceId: string) {
    const instance = await this.prisma.deliverableInstance.findFirst({
      where: { id: instanceId, ...this.readScopeWhere(user) },
      include: deliverableInstanceInclude,
    });
    if (!instance)
      throw new NotFoundException(
        "Deliverable was not found in your access scope.",
      );
    const hasUnreadFeedback =
      user.role === UserRole.entrepreneur
        ? (await this.prisma.deliverableReview.count({
            where: { readAt: null, submission: { instanceId } },
          })) > 0
        : false;
    const latestSubmission = instance.submissions[0];
    return {
      ...this.mapInstance(instance, hasUnreadFeedback),
      submittedAt: latestSubmission?.submittedAt.toISOString() ?? null,
      waitingDays: latestSubmission
        ? this.daysSince(latestSubmission.submittedAt)
        : null,
    };
  }

  async submitDeliverable(
    user: User,
    instanceId: string,
    dto: SubmitDeliverableDto,
  ) {
    if (user.role !== UserRole.entrepreneur) {
      throw new ForbiddenException(
        "Only entrepreneurs can submit deliverables.",
      );
    }
    const instance = await this.prisma.deliverableInstance.findFirst({
      where: { id: instanceId, entrepreneurUserId: user.id },
      select: { id: true, status: true },
    });
    if (!instance)
      throw new NotFoundException(
        "Deliverable was not found for this entrepreneur.",
      );
    if (instance.status === DeliverableInstanceStatus.approved) {
      throw new BadRequestException(
        "Approved deliverables cannot be resubmitted.",
      );
    }
    if (instance.status === DeliverableInstanceStatus.submitted) {
      throw new BadRequestException(
        "This deliverable is already waiting for review.",
      );
    }

    const file = await this.attachUploadedFile(user, dto.fileAssetId);
    const submitted = await this.prisma.$transaction(async (tx) => {
      await tx.deliverableSubmission.create({
        data: {
          instanceId,
          submittedById: user.id,
          fileAssetId: file.id,
          note: dto.note?.trim() || null,
        },
      });
      return tx.deliverableInstance.update({
        where: { id: instanceId },
        data: { status: DeliverableInstanceStatus.submitted },
        include: deliverableInstanceInclude,
      });
    });
    await this.notifyReviewersOfSubmission(user, submitted);
    return this.mapInstance(submitted, false);
  }

  async reviewSubmission(
    user: User,
    submissionId: string,
    dto: ReviewDeliverableDto,
  ) {
    if (user.role !== UserRole.admin && user.role !== UserRole.trainer) {
      throw new ForbiddenException("You cannot review deliverables.");
    }
    const submission = await this.prisma.deliverableSubmission.findUnique({
      where: { id: submissionId },
      select: {
        id: true,
        instanceId: true,
        reviews: { select: { id: true }, take: 1 },
      },
    });
    if (!submission)
      throw new NotFoundException("Deliverable submission was not found.");
    await this.ensureCanActOnInstance(user, submission.instanceId);

    const latest = await this.prisma.deliverableSubmission.findFirst({
      where: { instanceId: submission.instanceId },
      orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
      select: { id: true },
    });
    if (latest?.id !== submission.id)
      throw new BadRequestException(
        "Only the latest submission can be reviewed.",
      );
    if (submission.reviews.length > 0)
      throw new BadRequestException(
        "This submission has already been reviewed.",
      );
    if (
      dto.decision === DeliverableReviewDecision.changes_required &&
      !dto.feedback?.trim()
    ) {
      throw new BadRequestException(
        "Feedback is required when requesting changes.",
      );
    }

    const reviewed = await this.prisma.$transaction(async (tx) => {
      const created = await tx.deliverableReview.create({
        data: {
          submissionId,
          reviewerId: user.id,
          reviewerRole: user.role,
          decision: dto.decision,
          feedback: dto.feedback?.trim() || "Approved.",
        },
        include: reviewInclude,
      });
      await tx.deliverableInstance.update({
        where: { id: submission.instanceId },
        data: {
          status:
            dto.decision === DeliverableReviewDecision.approved
              ? DeliverableInstanceStatus.approved
              : DeliverableInstanceStatus.changes_required,
        },
      });
      return this.mapReview(created);
    });
    const instance = await this.prisma.deliverableInstance.findUnique({
      where: { id: submission.instanceId },
      include: deliverableInstanceInclude,
    });
    if (instance)
      await this.notifyEntrepreneurOfReview(user, instance, dto.decision);
    return reviewed;
  }

  async markReviewRead(user: User, reviewId: string) {
    if (user.role !== UserRole.entrepreneur) {
      throw new ForbiddenException(
        "Only entrepreneurs can mark deliverable feedback as read.",
      );
    }
    const readAt = new Date();
    const result = await this.prisma.deliverableReview.updateMany({
      where: {
        id: reviewId,
        submission: { instance: { entrepreneurUserId: user.id } },
      },
      data: { readAt },
    });
    if (result.count === 0)
      throw new NotFoundException(
        "Feedback was not found for this entrepreneur.",
      );
    return { id: reviewId, readAt: readAt.toISOString() };
  }

  async updateDueDate(
    user: User,
    instanceId: string,
    dto: UpdateDeliverableDueDateDto,
  ) {
    if (user.role !== UserRole.admin && user.role !== UserRole.trainer) {
      throw new ForbiddenException("You cannot update deliverable due dates.");
    }
    await this.ensureCanActOnInstance(user, instanceId);
    const existing = await this.prisma.deliverableInstance.findUnique({
      where: { id: instanceId },
      select: { id: true, dueDate: true, status: true },
    });
    if (!existing) throw new NotFoundException("Deliverable was not found.");
    const dueDate = new Date(dto.dueDate);

    const updated = await this.audit.capture(
      {
        action: "deliverable.due_date.updated",
        entityType: "deliverable_instance",
        entityId: (result) => result.id,
        summary: "Deliverable due date updated",
        payload: {
          previousDueDate: existing.dueDate.toISOString(),
          dueDate: dueDate.toISOString(),
          reason: dto.reason?.trim() || null,
        },
      },
      (tx) =>
        tx.deliverableInstance.update({
          where: { id: instanceId },
          data: {
            dueDate,
            dueUpdatedAt: new Date(),
            dueUpdatedById: user.id,
            dueUpdateReason: dto.reason?.trim() || null,
            ...(existing.status === DeliverableInstanceStatus.not_submitted ||
            existing.status === DeliverableInstanceStatus.overdue
              ? {
                  status:
                    dueDate.getTime() < Date.now()
                      ? DeliverableInstanceStatus.overdue
                      : DeliverableInstanceStatus.not_submitted,
                }
              : {}),
          },
          include: deliverableInstanceInclude,
        }),
    );
    return this.mapInstance(updated, false);
  }

  private async attachUploadedFile(user: User, fileAssetId: string) {
    const existingSubmission =
      await this.prisma.deliverableSubmission.findFirst({
        where: { fileAssetId },
        select: { id: true },
      });
    if (existingSubmission)
      throw new BadRequestException(
        "This uploaded file has already been submitted.",
      );
    return this.filesService.markReadyForUser(
      user,
      fileAssetId,
      FileAssetUsage.deliverable_submission,
    );
  }

  private async ensureCanReadInstance(user: User, instanceId: string) {
    const count = await this.prisma.deliverableInstance.count({
      where: { id: instanceId, ...this.readScopeWhere(user) },
    });
    if (count === 0)
      throw new NotFoundException(
        "Deliverable was not found in your access scope.",
      );
  }

  private async ensureCanActOnInstance(user: User, instanceId: string) {
    const count = await this.prisma.deliverableInstance.count({
      where: { id: instanceId, ...this.reviewScopeWhere(user) },
    });
    if (count === 0)
      throw new NotFoundException(
        "Deliverable was not found in your review scope.",
      );
  }

  private reviewScopeWhere(user: User): Prisma.DeliverableInstanceWhereInput {
    if (user.role === UserRole.admin) return {};
    if (user.role === UserRole.trainer) return this.readScopeWhere(user);
    return { id: "__none__" };
  }

  private buildInstanceWhere(
    user: User,
    query: DeliverableInstanceQueryDto | DeliverableReviewQueryDto,
    ignoreStatus = false,
  ): Prisma.DeliverableInstanceWhereInput {
    const filters: Prisma.DeliverableInstanceWhereInput[] = [];
    const scope = this.readScopeWhere(user);
    if (Object.keys(scope).length > 0) filters.push(scope);
    if (query.search?.trim()) {
      const search = query.search.trim();
      filters.push({
        OR: [
          { rule: { name: { contains: search, mode: "insensitive" } } },
          { programme: { name: { contains: search, mode: "insensitive" } } },
          {
            entrepreneur: { email: { contains: search, mode: "insensitive" } },
          },
          {
            entrepreneur: {
              firstName: { contains: search, mode: "insensitive" },
            },
          },
          {
            entrepreneur: {
              lastName: { contains: search, mode: "insensitive" },
            },
          },
          {
            entrepreneur: {
              businessMemberships: {
                some: {
                  business: { name: { contains: search, mode: "insensitive" } },
                },
              },
            },
          },
          {
            submissions: {
              some: {
                fileAsset: {
                  originalFilename: { contains: search, mode: "insensitive" },
                },
              },
            },
          },
        ],
      });
    }
    if (!ignoreStatus && query.status) filters.push({ status: query.status });
    if (query.programmeId) filters.push({ programmeId: query.programmeId });
    return filters.length ? { AND: filters } : {};
  }

  private readScopeWhere(user: User): Prisma.DeliverableInstanceWhereInput {
    if (user.role === UserRole.admin) return {};
    if (user.role === UserRole.entrepreneur)
      return { entrepreneurUserId: user.id };
    if (user.role === UserRole.trainer) {
      return {
        programme: {
          modules: {
            some: {
              module: {
                contentItems: { some: { contentItem: { trainerId: user.id } } },
              },
            },
          },
        },
      };
    }
    return { id: "__none__" };
  }

  private async notifyReviewersOfSubmission(
    actor: User,
    instance: DeliverableInstanceRow,
  ) {
    const reviewers = await this.prisma.user.findMany({
      where: {
        status: UserStatus.active,
        OR: [
          { role: UserRole.admin },
          {
            role: UserRole.trainer,
            ownedContentItems: {
              some: {
                modules: {
                  some: {
                    module: {
                      programmes: {
                        some: { programmeId: instance.programmeId },
                      },
                    },
                  },
                },
              },
            },
          },
        ],
      },
      select: { id: true, role: true },
    });
    const business =
      instance.entrepreneur.businessMemberships[0]?.business.name ??
      instance.entrepreneur.email;

    await this.notifications.createNotifications(
      reviewers.map((reviewer) => ({
        recipientUserId: reviewer.id,
        actorUserId: actor.id,
        type: NotificationType.deliverable_review,
        title: "Deliverable ready for review",
        body: `${business} submitted ${instance.rule.name}.`,
        severity: NotificationSeverity.info,
        entityType: NotificationEntityType.deliverable_instance,
        entityId: instance.id,
        actionUrl:
          reviewer.role === UserRole.admin
            ? `/admin/deliverable-reviews?deliverableId=${instance.id}`
            : `/trainer/deliverable-reviews?deliverableId=${instance.id}`,
        channels: [NotificationChannel.in_app, NotificationChannel.email],
      })),
    );
  }

  private async notifyEntrepreneurOfReview(
    actor: User,
    instance: DeliverableInstanceRow,
    decision: DeliverableReviewDecision,
  ) {
    const changesRequired =
      decision === DeliverableReviewDecision.changes_required;
    await this.notifications.createNotification({
      recipientUserId: instance.entrepreneurUserId,
      actorUserId: actor.id,
      type: changesRequired
        ? NotificationType.deliverable_changes_requested
        : NotificationType.deliverable_review,
      title: changesRequired
        ? "Changes requested on your deliverable"
        : "Deliverable approved",
      body: changesRequired
        ? `Review the feedback for ${instance.rule.name} and submit an updated file.`
        : `${instance.rule.name} was approved.`,
      severity: changesRequired
        ? NotificationSeverity.warning
        : NotificationSeverity.success,
      entityType: NotificationEntityType.deliverable_instance,
      entityId: instance.id,
      actionUrl: `/entrepreneur/deliverables/${instance.programmeId}?deliverableId=${instance.id}`,
      channels: [NotificationChannel.in_app, NotificationChannel.email],
    });
  }

  private statusSummary(
    groups: Array<{
      status: DeliverableInstanceStatus;
      _count: { _all: number };
    }>,
  ) {
    const counts = Object.fromEntries(
      Object.values(DeliverableInstanceStatus).map((status) => [status, 0]),
    ) as Record<DeliverableInstanceStatus, number>;
    for (const group of groups) counts[group.status] = group._count._all;
    return counts;
  }

  private mapReviewQueueItem(instance: DeliverableInstanceRow) {
    const latestSubmission = instance.submissions[0];
    return {
      ...this.mapInstance(instance, false),
      submittedAt: latestSubmission?.submittedAt.toISOString() ?? null,
      waitingDays: latestSubmission
        ? this.daysSince(latestSubmission.submittedAt)
        : null,
    };
  }

  private mapInstance(
    instance: DeliverableInstanceRow,
    hasUnreadFeedback: boolean,
  ) {
    const business =
      instance.entrepreneur.businessMemberships[0]?.business ?? null;
    const latestSubmission = instance.submissions[0];
    const latestReview = latestSubmission?.reviews[0];
    return {
      id: instance.id,
      ruleId: instance.ruleId,
      programmeId: instance.programmeId,
      entrepreneurUserId: instance.entrepreneurUserId,
      deliverable: instance.rule.name,
      status: instance.status,
      dueDate: instance.dueDate.toISOString(),
      periodStart: instance.periodStart?.toISOString() ?? null,
      periodEnd: instance.periodEnd?.toISOString() ?? null,
      dueSource: instance.dueUpdatedAt ? "manual_override" : "programme_rule",
      dueUpdatedAt: instance.dueUpdatedAt?.toISOString() ?? null,
      dueUpdatedBy: instance.dueUpdatedBy
        ? this.mapUser(instance.dueUpdatedBy)
        : null,
      dueUpdateReason: instance.dueUpdateReason,
      rule: {
        id: instance.rule.id,
        name: instance.rule.name,
        dueType: instance.rule.dueType,
        dueDate: instance.rule.dueDate?.toISOString() ?? null,
        dueAfterModule: instance.rule.dueAfterModule,
        recurringCadence: instance.rule.recurringCadence,
        requiredForScope: instance.rule.requiredForScope,
        requiredStage: instance.rule.requiredStage,
      },
      programme: instance.programme,
      entrepreneur: {
        userId: instance.entrepreneur.id,
        name: this.userName(instance.entrepreneur),
        email: instance.entrepreneur.email,
        businessId: business?.id ?? null,
        businessName: business?.name ?? this.userName(instance.entrepreneur),
        country: business?.country ?? null,
        sector: business?.sector ?? null,
        stage: business?.stage ?? null,
      },
      latestSubmission: latestSubmission
        ? this.mapSubmission(latestSubmission)
        : null,
      latestReview: latestReview ? this.mapReview(latestReview) : null,
      submissionCount: instance._count.submissions,
      hasUnreadFeedback,
      createdAt: instance.createdAt.toISOString(),
      updatedAt: instance.updatedAt.toISOString(),
    };
  }

  private mapSubmission(submission: SubmissionRow) {
    return {
      id: submission.id,
      note: submission.note,
      submittedAt: submission.submittedAt.toISOString(),
      submittedBy: this.mapUser(submission.submittedBy),
      reviewCount: submission._count.reviews,
      latestReview: submission.reviews[0]
        ? this.mapReview(submission.reviews[0])
        : null,
      file: {
        id: submission.fileAsset.id,
        originalFilename: submission.fileAsset.originalFilename,
        mimeType: submission.fileAsset.mimeType,
        sizeBytes: submission.fileAsset.sizeBytes.toString(),
        status: submission.fileAsset.status,
      },
    };
  }

  private mapReview(
    review: Prisma.DeliverableReviewGetPayload<{
      include: typeof reviewInclude;
    }>,
  ) {
    return {
      id: review.id,
      submissionId: review.submissionId,
      decision: review.decision,
      feedback: review.feedback,
      reviewerRole: review.reviewerRole,
      reviewer: this.mapUser(review.reviewer),
      readAt: review.readAt?.toISOString() ?? null,
      createdAt: review.createdAt.toISOString(),
    };
  }

  private mapFeedback(review: FeedbackRow) {
    return {
      ...this.mapReview(review),
      submission: {
        id: review.submission.id,
        submittedAt: review.submission.submittedAt.toISOString(),
        file: {
          id: review.submission.fileAsset.id,
          originalFilename: review.submission.fileAsset.originalFilename,
          mimeType: review.submission.fileAsset.mimeType,
          sizeBytes: review.submission.fileAsset.sizeBytes.toString(),
          status: review.submission.fileAsset.status,
        },
      },
    };
  }

  private mapUser(user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  }) {
    return { id: user.id, name: this.userName(user), email: user.email };
  }

  private userName(user: {
    firstName: string | null;
    lastName: string | null;
    email: string;
  }) {
    return (
      [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email
    );
  }

  private daysSince(date: Date) {
    return Math.max(Math.floor((Date.now() - date.getTime()) / 86_400_000), 0);
  }
}
