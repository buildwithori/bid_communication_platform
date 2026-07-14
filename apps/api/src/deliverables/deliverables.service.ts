import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DeliverableInstanceStatus, DeliverableReviewDecision, Prisma, User, UserRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { DeliverableInstanceQueryDto } from './dto/deliverable-instance-query.dto';
import { DeliverableReviewQueryDto } from './dto/deliverable-review-query.dto';
import { ReviewDeliverableDto } from './dto/review-deliverable.dto';
import { UpdateDeliverableDueDateDto } from './dto/update-deliverable-due-date.dto';

const DEFAULT_TAKE = 20;

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
      id: true,
      email: true,
      firstName: true,
      lastName: true,
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
  dueUpdatedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
  submissions: {
    orderBy: { submittedAt: 'desc' as const },
    include: {
      submittedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      fileAsset: { select: { id: true, originalFilename: true, mimeType: true, sizeBytes: true, storageKey: true, status: true } },
      reviews: {
        orderBy: { createdAt: 'desc' as const },
        include: {
          reviewer: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
        },
      },
    },
  },
} satisfies Prisma.DeliverableInstanceInclude;

type DeliverableInstanceWithInclude = Prisma.DeliverableInstanceGetPayload<{ include: typeof deliverableInstanceInclude }>;

@Injectable()
export class DeliverablesService {
  constructor(private readonly prisma: PrismaService) {}

  async listInstances(user: User, query: DeliverableInstanceQueryDto) {
    const take = query.take ?? DEFAULT_TAKE;
    const rows = await this.prisma.deliverableInstance.findMany({
      where: this.buildInstanceWhere(user, query),
      orderBy: [{ dueDate: 'asc' }, { id: 'desc' }],
      take: take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: deliverableInstanceInclude,
    });

    const nextCursor = rows.length > take ? rows[take]?.id ?? null : null;
    return { items: rows.slice(0, take).map((instance) => this.mapInstance(instance)), nextCursor };
  }

  async listReviewQueue(user: User, query: DeliverableReviewQueryDto) {
    const take = query.take ?? DEFAULT_TAKE;
    const rows = await this.prisma.deliverableInstance.findMany({
      where: {
        ...this.buildInstanceWhere(user, query),
        submissions: { some: {} },
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: deliverableInstanceInclude,
    });

    const nextCursor = rows.length > take ? rows[take]?.id ?? null : null;
    return { items: rows.slice(0, take).map((instance) => this.mapReviewQueueItem(instance)), nextCursor };
  }


  async reviewSubmission(user: User, submissionId: string, dto: ReviewDeliverableDto) {
    if (user.role !== UserRole.admin && user.role !== UserRole.trainer) {
      throw new ForbiddenException('You cannot review deliverables.');
    }

    const submission = await this.prisma.deliverableSubmission.findUnique({
      where: { id: submissionId },
      include: { instance: { include: { programme: true } } },
    });
    if (!submission) throw new NotFoundException('Deliverable submission was not found.');
    await this.ensureCanActOnInstance(user, submission.instanceId);

    if (dto.decision === DeliverableReviewDecision.changes_required && !dto.feedback?.trim()) {
      throw new BadRequestException('Feedback is required when requesting changes.');
    }

    const review = await this.prisma.$transaction(async (tx) => {
      const created = await tx.deliverableReview.create({
        data: {
          submissionId,
          reviewerId: user.id,
          reviewerRole: user.role,
          decision: dto.decision,
          feedback: dto.feedback?.trim() || (dto.decision === DeliverableReviewDecision.approved ? 'Approved.' : ''),
        },
      });

      await tx.deliverableInstance.update({
        where: { id: submission.instanceId },
        data: {
          status: dto.decision === DeliverableReviewDecision.approved
            ? DeliverableInstanceStatus.approved
            : DeliverableInstanceStatus.changes_required,
        },
      });

      return created;
    });

    return review;
  }

  async updateDueDate(user: User, instanceId: string, dto: UpdateDeliverableDueDateDto) {
    if (user.role !== UserRole.admin && user.role !== UserRole.trainer) {
      throw new ForbiddenException('You cannot update deliverable due dates.');
    }

    await this.ensureCanActOnInstance(user, instanceId);

    const updated = await this.prisma.deliverableInstance.update({
      where: { id: instanceId },
      data: {
        dueDate: new Date(dto.dueDate),
        dueUpdatedAt: new Date(),
        dueUpdatedById: user.id,
        dueUpdateReason: dto.reason?.trim() || null,
      },
      include: deliverableInstanceInclude,
    });

    return this.mapInstance(updated);
  }

  private async ensureCanActOnInstance(user: User, instanceId: string) {
    const count = await this.prisma.deliverableInstance.count({
      where: {
        id: instanceId,
        ...this.reviewScopeWhere(user),
      },
    });

    if (count === 0) {
      throw new NotFoundException('Deliverable was not found in your review scope.');
    }
  }

  private reviewScopeWhere(user: User): Prisma.DeliverableInstanceWhereInput {
    if (user.role === UserRole.admin) return {};
    if (user.role === UserRole.trainer) return this.readScopeWhere(user);
    return { id: '__none__' };
  }

  private buildInstanceWhere(
    user: User,
    query: DeliverableInstanceQueryDto | DeliverableReviewQueryDto,
  ): Prisma.DeliverableInstanceWhereInput {
    const filters: Prisma.DeliverableInstanceWhereInput[] = [];
    const scope = this.readScopeWhere(user);
    if (Object.keys(scope).length > 0) filters.push(scope);

    if (query.search?.trim()) {
      const search = query.search.trim();
      filters.push({
        OR: [
          { rule: { name: { contains: search, mode: 'insensitive' } } },
          { programme: { name: { contains: search, mode: 'insensitive' } } },
          { entrepreneur: { email: { contains: search, mode: 'insensitive' } } },
          { entrepreneur: { firstName: { contains: search, mode: 'insensitive' } } },
          { entrepreneur: { lastName: { contains: search, mode: 'insensitive' } } },
          { entrepreneur: { businessMemberships: { some: { business: { name: { contains: search, mode: 'insensitive' } } } } } },
          { submissions: { some: { fileAsset: { originalFilename: { contains: search, mode: 'insensitive' } } } } },
        ],
      });
    }

    if (query.status) filters.push({ status: query.status });
    if (query.programmeId) filters.push({ programmeId: query.programmeId });

    return filters.length ? { AND: filters } : {};
  }

  private readScopeWhere(user: User): Prisma.DeliverableInstanceWhereInput {
    if (user.role === UserRole.admin) return {};
    if (user.role === UserRole.entrepreneur) return { entrepreneurUserId: user.id };
    if (user.role === UserRole.trainer) {
      return {
        programme: {
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
      };
    }
    return { id: '__none__' };
  }

  private mapReviewQueueItem(instance: DeliverableInstanceWithInclude) {
    const mapped = this.mapInstance(instance);
    const latestSubmission = instance.submissions[0];
    const latestReview = latestSubmission?.reviews[0];
    const waitingDays = latestSubmission ? this.daysSince(latestSubmission.submittedAt) : null;

    return {
      ...mapped,
      submittedAt: latestSubmission?.submittedAt.toISOString() ?? null,
      waitingDays,
      latestReview: latestReview ? this.mapReview(latestReview) : null,
      feedbackReadAt: latestReview?.readAt?.toISOString() ?? null,
    };
  }

  private mapInstance(instance: DeliverableInstanceWithInclude) {
    const business = instance.entrepreneur.businessMemberships[0]?.business ?? null;
    const latestSubmission = instance.submissions[0];
    const latestReview = latestSubmission?.reviews[0];
    const reviewHistory = instance.submissions.flatMap((submission) => submission.reviews.map((review) => this.mapReview(review)));

    return {
      id: instance.id,
      ruleId: instance.ruleId,
      programmeId: instance.programmeId,
      entrepreneurUserId: instance.entrepreneurUserId,
      deliverable: instance.rule.name,
      status: instance.status,
      dueDate: instance.dueDate.toISOString(),
      dueSource: instance.dueUpdatedAt ? 'manual_override' : 'programme_rule',
      dueUpdatedAt: instance.dueUpdatedAt?.toISOString() ?? null,
      dueUpdatedBy: instance.dueUpdatedBy ? this.mapUser(instance.dueUpdatedBy) : null,
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
      latestSubmission: latestSubmission ? this.mapSubmission(latestSubmission) : null,
      latestReview: latestReview ? this.mapReview(latestReview) : null,
      reviewHistory,
      hasUnreadFeedback: reviewHistory.some((review) => review.readAt === null),
      createdAt: instance.createdAt.toISOString(),
      updatedAt: instance.updatedAt.toISOString(),
    };
  }

  private mapSubmission(submission: DeliverableInstanceWithInclude['submissions'][number]) {
    return {
      id: submission.id,
      note: submission.note,
      submittedAt: submission.submittedAt.toISOString(),
      submittedBy: this.mapUser(submission.submittedBy),
      file: {
        id: submission.fileAsset.id,
        originalFilename: submission.fileAsset.originalFilename,
        mimeType: submission.fileAsset.mimeType,
        sizeBytes: submission.fileAsset.sizeBytes.toString(),
        storageKey: submission.fileAsset.storageKey,
        status: submission.fileAsset.status,
      },
    };
  }

  private mapReview(submissionReview: DeliverableInstanceWithInclude['submissions'][number]['reviews'][number]) {
    return {
      id: submissionReview.id,
      submissionId: submissionReview.submissionId,
      decision: submissionReview.decision,
      feedback: submissionReview.feedback,
      reviewerRole: submissionReview.reviewerRole,
      reviewer: this.mapUser(submissionReview.reviewer),
      readAt: submissionReview.readAt?.toISOString() ?? null,
      createdAt: submissionReview.createdAt.toISOString(),
    };
  }

  private mapUser(user: { id: string; firstName: string | null; lastName: string | null; email: string }) {
    return { id: user.id, name: this.userName(user), email: user.email };
  }

  private userName(user: { firstName: string | null; lastName: string | null; email: string }) {
    return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
  }

  private daysSince(date: Date) {
    const ms = Date.now() - date.getTime();
    return Math.max(Math.floor(ms / 86_400_000), 0);
  }
}
