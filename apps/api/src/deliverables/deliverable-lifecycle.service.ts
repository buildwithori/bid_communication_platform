import { Injectable } from '@nestjs/common';
import {
  DeliverableDueType,
  DeliverableInstanceStatus,
  DeliverableRequiredScope,
  Prisma,
  ProgrammeAccessType,
} from '@prisma/client';

@Injectable()
export class DeliverableLifecycleService {
  async syncFixedDateInstancesForEntrepreneur(
    tx: Prisma.TransactionClient,
    entrepreneurUserId: string,
  ) {
    const memberships = await tx.businessMembership.findMany({
      where: { userId: entrepreneurUserId, isPrimary: true },
      select: { business: { select: { stageId: true } } },
    });
    const stageIds = memberships.flatMap(({ business }) =>
      business.stageId ? [business.stageId] : [],
    );
    const rules = await tx.programmeDeliverableRule.findMany({
      where: {
        active: true,
        dueType: DeliverableDueType.fixed_date,
        dueDate: { not: null },
        programme: {
          OR: [
            { accessType: ProgrammeAccessType.free },
            {
              accessGrants: {
                some: { entrepreneurUserId, revokedAt: null },
              },
            },
          ],
        },
        OR: [
          { requiredForScope: DeliverableRequiredScope.all },
          ...(stageIds.length
            ? [
                {
                  requiredForScope: DeliverableRequiredScope.stage,
                  requiredStageId: { in: stageIds },
                },
              ]
            : []),
        ],
      },
      select: { id: true, programmeId: true, dueDate: true },
    });

    if (!rules.length) return { created: 0 };
    const result = await tx.deliverableInstance.createMany({
      data: rules.map((rule) => ({
        ruleId: rule.id,
        entrepreneurUserId,
        programmeId: rule.programmeId,
        dueDate: rule.dueDate as Date,
        status:
          (rule.dueDate as Date).getTime() < Date.now()
            ? DeliverableInstanceStatus.overdue
            : DeliverableInstanceStatus.not_submitted,
      })),
      skipDuplicates: true,
    });
    return { created: result.count };
  }
}
