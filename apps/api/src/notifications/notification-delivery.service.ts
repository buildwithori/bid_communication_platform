import { Injectable } from "@nestjs/common";
import {
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationType,
  Prisma,
} from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import { DeliverableNotificationEmail } from "../deliverables/emails/deliverable-notification-email";
import { EmailService } from "../email/email.service";
import { SessionNotificationEmail } from "../sessions/emails/session-notification-email";
import { ToolRequestNotificationEmail } from "../tools/emails/tool-request-notification-email";
import { AutomationEmail } from "./emails/automation-email";
import { NotificationEmail } from "./emails/notification-email";

const BATCH_SIZE = 25;
const MAX_ATTEMPTS = 5;

const deliveryInclude = {
  notification: {
    include: {
      recipient: {
        select: {
          email: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      },
    },
  },
} satisfies Prisma.NotificationDeliveryInclude;

type ClaimedDelivery = Prisma.NotificationDeliveryGetPayload<{
  include: typeof deliveryInclude;
}>;

@Injectable()
export class NotificationDeliveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async processPending() {
    const now = new Date();
    await this.prisma.notificationDelivery.updateMany({
      where: {
        status: NotificationDeliveryStatus.processing,
        updatedAt: { lt: new Date(now.getTime() - 5 * 60_000) },
      },
      data: {
        status: NotificationDeliveryStatus.failed,
        failedAt: now,
        failureReason: "Delivery worker stopped before completion.",
        nextAttemptAt: now,
      },
    });
    const candidates = await this.prisma.notificationDelivery.findMany({
      where: {
        channel: NotificationChannel.email,
        status: {
          in: [
            NotificationDeliveryStatus.pending,
            NotificationDeliveryStatus.failed,
          ],
        },
        attemptCount: { lt: MAX_ATTEMPTS },
        OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: BATCH_SIZE,
      select: { id: true, status: true },
    });

    let processed = 0;
    for (const candidate of candidates) {
      const claimed = await this.claim(candidate.id, candidate.status);
      if (!claimed) continue;
      await this.deliverEmail(claimed);
      processed += 1;
    }

    return { processed, hasMore: candidates.length === BATCH_SIZE };
  }

  private async claim(
    id: string,
    currentStatus: NotificationDeliveryStatus,
  ): Promise<ClaimedDelivery | null> {
    const result = await this.prisma.notificationDelivery.updateMany({
      where: { id, status: currentStatus },
      data: {
        status: NotificationDeliveryStatus.processing,
        attemptCount: { increment: 1 },
        failureReason: null,
        failedAt: null,
        nextAttemptAt: null,
      },
    });
    if (result.count === 0) return null;

    return this.prisma.notificationDelivery.findUnique({
      where: { id },
      include: deliveryInclude,
    });
  }

  private async deliverEmail(delivery: ClaimedDelivery) {
    const notification = delivery.notification;
    const recipient = notification.recipient;
    const recipientName =
      [recipient.firstName, recipient.lastName].filter(Boolean).join(" ") ||
      recipient.email;
    const relativeAction = notification.actionUrl?.startsWith("/")
      ? notification.actionUrl
      : "";
    const actionUrl = this.email.appUrl(relativeAction);

    try {
      await this.email.send({
        to: recipient.email,
        subject: "BID Hub: " + notification.title,
        template: this.templateFor(notification.type, {
          recipientName,
          recipientRole: recipient.role,
          type: notification.type,
          title: notification.title,
          body: notification.body,
          actionUrl,
          logoUrl: this.email.logoUrl(),
        }),
      });
      await this.prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: NotificationDeliveryStatus.sent,
          sentAt: new Date(),
          failedAt: null,
          failureReason: null,
          nextAttemptAt: null,
        },
      });
    } catch (error: unknown) {
      const exhausted = delivery.attemptCount >= MAX_ATTEMPTS;
      const delayMinutes = Math.min(2 ** delivery.attemptCount, 60);
      await this.prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: NotificationDeliveryStatus.failed,
          failedAt: new Date(),
          failureReason: this.failureMessage(error),
          nextAttemptAt: exhausted
            ? null
            : new Date(Date.now() + delayMinutes * 60_000),
        },
      });
    }
  }

  private templateFor(
    type: NotificationType,
    props: {
      recipientName: string;
      recipientRole: ClaimedDelivery["notification"]["recipient"]["role"];
      type: NotificationType;
      title: string;
      body: string;
      actionUrl: string;
      logoUrl: string;
    },
  ) {
    if (
      type === NotificationType.session_request ||
      type === NotificationType.session_confirmed ||
      type === NotificationType.session_rescheduled ||
      type === NotificationType.session_declined ||
      type === NotificationType.session_cancelled ||
      type === NotificationType.session_completed ||
      type === NotificationType.session_reminder
    ) {
      return SessionNotificationEmail(props);
    }
    if (
      type === NotificationType.deliverable_review ||
      type === NotificationType.deliverable_changes_requested ||
      type === NotificationType.deliverable_due_reminder
    ) {
      return DeliverableNotificationEmail(props);
    }
    if (type === NotificationType.tool_request_updated) {
      return ToolRequestNotificationEmail(props);
    }
    if (type === NotificationType.weekly_digest) {
      return AutomationEmail(props);
    }
    return NotificationEmail(props);
  }

  private failureMessage(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return message.slice(0, 500);
  }
}
