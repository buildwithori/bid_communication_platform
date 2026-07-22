import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ExternalResourceProvider, NotificationEntityType, Prisma, User, UserRole } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../database/prisma.service";
import { DeleteResourceDto } from "./dto/delete-resource.dto";

type Transaction = Prisma.TransactionClient;
type ExternalDeletion = { provider: ExternalResourceProvider; externalId: string | null | undefined; ownerUserId?: string | null };
export type ResourceDeletionResult = { id: string; name: string; deleted: true; externalCleanupQueued: number; reusableAssetsPreserved?: boolean };

@Injectable()
export class ResourceDeletionService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async deleteContentItem(user: User, contentItemId: string, dto: DeleteResourceDto): Promise<ResourceDeletionResult> {
    this.assertAdmin(user);
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.contentItem.findUnique({
        where: { id: contentItemId },
        include: {
          videoAsset: true,
          fileAssets: { select: { id: true, storageKey: true } },
          modules: { select: { moduleId: true, module: { select: { programmes: { select: { programmeId: true } } } } } },
        },
      });
      if (!item) throw new NotFoundException("Content item not found.");
      this.assertConfirmation(item.title, dto.confirmation);
      const moduleIds = [...new Set(item.modules.map((link) => link.moduleId))];
      const programmeIds = [...new Set(item.modules.flatMap((link) => link.module.programmes.map((entry) => entry.programmeId)))];
      const externalCleanupQueued = await this.queueExternal(tx, [
        { provider: ExternalResourceProvider.mux_asset, externalId: item.videoAsset?.muxAssetId },
        { provider: ExternalResourceProvider.mux_upload, externalId: item.videoAsset?.muxAssetId ? null : item.videoAsset?.muxUploadId },
        ...item.fileAssets.map((file) => ({ provider: ExternalResourceProvider.object_storage, externalId: file.storageKey })),
      ]);
      await this.deleteNotifications(tx, NotificationEntityType.content_item, [item.id]);
      await tx.contentRating.deleteMany({ where: { contentItemId: item.id } });
      await tx.learnerContentProgress.deleteMany({ where: { contentItemId: item.id } });
      await tx.moduleContentItem.deleteMany({ where: { contentItemId: item.id } });
      if (moduleIds.length) await tx.learnerModuleProgress.deleteMany({ where: { moduleId: { in: moduleIds } } });
      if (programmeIds.length) await tx.learnerProgrammeProgress.deleteMany({ where: { programmeId: { in: programmeIds } } });
      if (item.videoAsset) {
        await tx.videoWebhookEvent.deleteMany({ where: { videoAssetId: item.videoAsset.id } });
        await tx.videoAsset.delete({ where: { id: item.videoAsset.id } });
      }
      await tx.contentToolLink.deleteMany({ where: { contentItemId: item.id } });
      if (item.fileAssets.length) await tx.fileAsset.deleteMany({ where: { id: { in: item.fileAssets.map((file) => file.id) } } });
      await tx.contentItem.delete({ where: { id: item.id } });
      for (const moduleId of moduleIds) await this.reindexModuleContent(tx, moduleId);
      await this.audit.enqueue({
        action: "content.deleted", entityType: "content_item", entityId: item.id,
        summary: `Deleted content: ${item.title}`,
        payload: { title: item.title, type: item.type, affectedModules: moduleIds.length, externalCleanupQueued },
      }, tx);
      return { id: item.id, name: item.title, deleted: true, externalCleanupQueued };
    });
  }

  async deleteProgrammeModule(user: User, programmeId: string, moduleId: string, dto: DeleteResourceDto): Promise<ResourceDeletionResult> {
    this.assertAdmin(user);
    return this.prisma.$transaction(async (tx) => {
      const link = await tx.programmeModule.findUnique({
        where: { programmeId_moduleId: { programmeId, moduleId } },
        include: { programme: { select: { id: true, name: true } }, module: { select: { id: true, title: true } } },
      });
      if (!link) throw new NotFoundException("Programme module not found.");
      this.assertConfirmation(link.module.title, dto.confirmation);
      const rules = await tx.programmeDeliverableRule.findMany({ where: { programmeId, dueAfterModuleId: moduleId }, select: { id: true } });
      const deletion = await this.deleteDeliverableTree(tx, rules.map((rule) => rule.id));
      if (rules.length) await tx.programmeDeliverableRule.deleteMany({ where: { id: { in: rules.map((rule) => rule.id) } } });
      await tx.contentRating.deleteMany({ where: { programmeId, moduleId } });
      await tx.learnerContentProgress.deleteMany({ where: { programmeId, moduleId } });
      await tx.learnerModuleProgress.deleteMany({ where: { programmeId, moduleId } });
      await tx.learnerProgrammeProgress.deleteMany({ where: { programmeId } });
      await tx.programmeModule.delete({ where: { id: link.id } });
      await this.reindexProgrammeModules(tx, programmeId);
      const [programmeLinks, dependentRules] = await Promise.all([
        tx.programmeModule.count({ where: { moduleId } }),
        tx.programmeDeliverableRule.count({ where: { dueAfterModuleId: moduleId } }),
      ]);
      const moduleDeleted = programmeLinks === 0 && dependentRules === 0;
      if (moduleDeleted) {
        await tx.learnerContentProgress.deleteMany({ where: { moduleId } });
        await tx.learnerModuleProgress.deleteMany({ where: { moduleId } });
        await tx.moduleContentItem.deleteMany({ where: { moduleId } });
        await tx.learningModule.delete({ where: { id: moduleId } });
      }
      await this.audit.enqueue({
        action: "programme_module.deleted", entityType: "programme_module", entityId: moduleId,
        summary: `Removed module ${link.module.title} from ${link.programme.name}`,
        payload: { programmeId, moduleDeleted, removedDeliverableRules: rules.length, externalCleanupQueued: deletion.externalCleanupQueued },
      }, tx);
      return { id: moduleId, name: link.module.title, deleted: true, externalCleanupQueued: deletion.externalCleanupQueued, reusableAssetsPreserved: true };
    });
  }

  async deleteProgramme(user: User, programmeId: string, dto: DeleteResourceDto): Promise<ResourceDeletionResult> {
    this.assertAdmin(user);
    return this.prisma.$transaction(async (tx) => {
      const programme = await tx.programme.findUnique({ where: { id: programmeId }, select: { id: true, name: true } });
      if (!programme) throw new NotFoundException("Programme not found.");
      this.assertConfirmation(programme.name, dto.confirmation);
      const [goals, rules, sessions, exports] = await Promise.all([
        tx.programmeGoal.findMany({ where: { programmeId }, select: { id: true } }),
        tx.programmeDeliverableRule.findMany({ where: { programmeId }, select: { id: true } }),
        tx.session.findMany({ where: { programmeId }, select: { id: true, calendarEventId: true, ownerUserId: true } }),
        tx.reportExport.findMany({ where: { programmeId }, select: { id: true, fileAsset: { select: { id: true, storageKey: true } } } }),
      ]);
      const deliverables = await this.deleteDeliverableTree(tx, rules.map((rule) => rule.id));
      const ownExternalCleanup = await this.queueExternal(tx, [
        ...sessions.map((session) => ({ provider: ExternalResourceProvider.google_calendar_event, externalId: session.calendarEventId, ownerUserId: session.ownerUserId })),
        ...exports.map((entry) => ({ provider: ExternalResourceProvider.object_storage, externalId: entry.fileAsset?.storageKey })),
      ]);
      await this.deleteNotifications(tx, NotificationEntityType.session, sessions.map((session) => session.id));
      await this.deleteNotifications(tx, NotificationEntityType.programme, [programmeId]);
      if (sessions.length) {
        const sessionIds = sessions.map((session) => session.id);
        await tx.sessionNote.deleteMany({ where: { sessionId: { in: sessionIds } } });
        await tx.sessionRequestDecline.deleteMany({ where: { sessionId: { in: sessionIds } } });
        await tx.sessionReschedule.deleteMany({ where: { sessionId: { in: sessionIds } } });
        await tx.session.deleteMany({ where: { id: { in: sessionIds } } });
      }
      if (exports.length) {
        await tx.reportExport.deleteMany({ where: { id: { in: exports.map((entry) => entry.id) } } });
        const fileIds = exports.flatMap((entry) => entry.fileAsset ? [entry.fileAsset.id] : []);
        if (fileIds.length) await tx.fileAsset.deleteMany({ where: { id: { in: fileIds } } });
      }
      const goalIds = goals.map((goal) => goal.id);
      await tx.fundraisingRound.deleteMany({ where: { OR: [{ programmeId }, ...(goalIds.length ? [{ programmeGoalId: { in: goalIds } }] : [])] } });
      await tx.programmeGoal.deleteMany({ where: { programmeId } });
      await tx.periodicUpdate.deleteMany({ where: { programmeId } });
      await tx.programmeAccessGrant.deleteMany({ where: { programmeId } });
      await tx.learnerContentProgress.deleteMany({ where: { programmeId } });
      await tx.learnerModuleProgress.deleteMany({ where: { programmeId } });
      await tx.learnerProgrammeProgress.deleteMany({ where: { programmeId } });
      await tx.toolProgrammeAccess.deleteMany({ where: { programmeId } });
      await tx.programmeModule.deleteMany({ where: { programmeId } });
      await tx.programmeDeliverableRule.deleteMany({ where: { programmeId } });
      await tx.programme.delete({ where: { id: programmeId } });
      const externalCleanupQueued = deliverables.externalCleanupQueued + ownExternalCleanup;
      await this.audit.enqueue({
        action: "programmes.deleted", entityType: "programme", entityId: programmeId,
        summary: `Permanently deleted programme: ${programme.name}`,
        payload: { name: programme.name, removedSessions: sessions.length, removedDeliverableRules: rules.length, externalCleanupQueued, reusableLibraryContentPreserved: true },
      }, tx);
      return { id: programmeId, name: programme.name, deleted: true, externalCleanupQueued, reusableAssetsPreserved: true };
    });
  }

  async deleteProgrammeDeliverableRule(
    user: User,
    programmeId: string,
    ruleId: string,
    dto: DeleteResourceDto,
  ): Promise<ResourceDeletionResult> {
    this.assertAdmin(user);
    return this.prisma.$transaction(async (tx) => {
      const rule = await tx.programmeDeliverableRule.findFirst({
        where: { id: ruleId, programmeId },
        select: { id: true, name: true },
      });
      if (!rule) {
        throw new NotFoundException("Programme deliverable was not found.");
      }
      this.assertConfirmation(rule.name, dto.confirmation);

      const deletion = await this.deleteDeliverableTree(tx, [rule.id]);
      await tx.programmeDeliverableRule.delete({ where: { id: rule.id } });
      await this.audit.enqueue(
        {
          action: "programme_deliverable_rules.deleted",
          entityType: "programme_deliverable_rule",
          entityId: rule.id,
          summary: `Deleted deliverable rule: ${rule.name}`,
          payload: {
            programmeId,
            name: rule.name,
            externalCleanupQueued: deletion.externalCleanupQueued,
          },
        },
        tx,
      );

      return {
        id: rule.id,
        name: rule.name,
        deleted: true,
        externalCleanupQueued: deletion.externalCleanupQueued,
      };
    });
  }

  private async deleteDeliverableTree(tx: Transaction, ruleIds: string[]) {
    if (!ruleIds.length) return { externalCleanupQueued: 0 };
    const instances = await tx.deliverableInstance.findMany({ where: { ruleId: { in: ruleIds } }, select: { id: true } });
    const instanceIds = instances.map((instance) => instance.id);
    if (!instanceIds.length) return { externalCleanupQueued: 0 };
    const submissions = await tx.deliverableSubmission.findMany({
      where: { instanceId: { in: instanceIds } },
      select: { id: true, fileAsset: { select: { id: true, storageKey: true } } },
    });
    const submissionIds = submissions.map((submission) => submission.id);
    const externalCleanupQueued = await this.queueExternal(tx, submissions.map((submission) => ({ provider: ExternalResourceProvider.object_storage, externalId: submission.fileAsset.storageKey })));
    await this.deleteNotifications(tx, NotificationEntityType.deliverable_instance, instanceIds);
    if (submissionIds.length) {
      await tx.deliverableReview.deleteMany({ where: { submissionId: { in: submissionIds } } });
      await tx.deliverableSubmission.deleteMany({ where: { id: { in: submissionIds } } });
    }
    await tx.deliverableInstance.deleteMany({ where: { id: { in: instanceIds } } });
    const fileIds = submissions.map((submission) => submission.fileAsset.id);
    if (fileIds.length) await tx.fileAsset.deleteMany({ where: { id: { in: fileIds } } });
    return { externalCleanupQueued };
  }

  private async deleteNotifications(tx: Transaction, entityType: NotificationEntityType, entityIds: string[]) {
    for (let offset = 0; offset < entityIds.length; offset += 500) {
      const ids = entityIds.slice(offset, offset + 500);
      const notifications = await tx.notification.findMany({ where: { entityType, entityId: { in: ids } }, select: { id: true } });
      if (!notifications.length) continue;
      const notificationIds = notifications.map((entry) => entry.id);
      await tx.notificationDelivery.deleteMany({ where: { notificationId: { in: notificationIds } } });
      await tx.notification.deleteMany({ where: { id: { in: notificationIds } } });
    }
  }

  private async queueExternal(tx: Transaction, resources: ExternalDeletion[]) {
    const unique = new Map<string, ExternalDeletion>();
    for (const resource of resources) if (resource.externalId) unique.set(`${resource.provider}:${resource.externalId}`, resource);
    if (!unique.size) return 0;
    await tx.externalResourceDeletion.createMany({
      data: [...unique.values()].map((resource) => ({ provider: resource.provider, externalId: resource.externalId as string, ownerUserId: resource.ownerUserId ?? null })),
      skipDuplicates: true,
    });
    return unique.size;
  }

  private async reindexModuleContent(tx: Transaction, moduleId: string) {
    await tx.moduleContentItem.updateMany({ where: { moduleId }, data: { position: { increment: 100000 } } });
    const links = await tx.moduleContentItem.findMany({ where: { moduleId }, select: { id: true }, orderBy: [{ position: "asc" }, { id: "asc" }] });
    for (const [index, link] of links.entries()) await tx.moduleContentItem.update({ where: { id: link.id }, data: { position: index + 1 } });
  }

  private async reindexProgrammeModules(tx: Transaction, programmeId: string) {
    await tx.programmeModule.updateMany({ where: { programmeId }, data: { position: { increment: 100000 } } });
    const links = await tx.programmeModule.findMany({ where: { programmeId }, select: { id: true }, orderBy: [{ position: "asc" }, { id: "asc" }] });
    for (const [index, link] of links.entries()) await tx.programmeModule.update({ where: { id: link.id }, data: { position: index + 1 } });
  }

  private assertConfirmation(expected: string, confirmation: string) {
    if (confirmation.trim() !== expected) throw new BadRequestException("The confirmation text does not match the resource name.");
  }

  private assertAdmin(user: User) {
    if (user.role !== UserRole.admin) throw new ForbiddenException("Only administrators can delete resources.");
  }
}
