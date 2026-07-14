import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationEntityType,
  NotificationSeverity,
  NotificationType,
  Prisma,
  User,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { UpdateNotificationPreferenceDto } from './dto/update-notification-preference.dto';

const DEFAULT_TAKE = 20;

const notificationInclude = {
  actor: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
  deliveries: { select: { channel: true, status: true, sentAt: true, failedAt: true } },
} satisfies Prisma.NotificationInclude;

type NotificationWithInclude = Prisma.NotificationGetPayload<{ include: typeof notificationInclude }>;

type CreateNotificationInput = {
  recipientUserId: string;
  actorUserId?: string | null;
  type: NotificationType;
  title: string;
  body: string;
  severity?: NotificationSeverity;
  entityType?: NotificationEntityType | null;
  entityId?: string | null;
  actionUrl?: string | null;
  channels?: NotificationChannel[];
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listNotifications(user: User, query: NotificationQueryDto) {
    const take = query.take ?? DEFAULT_TAKE;
    const where: Prisma.NotificationWhereInput = {
      recipientUserId: user.id,
      ...(query.type ? { type: query.type } : {}),
      ...(query.unreadOnly === 'true' ? { readAt: null } : {}),
    };

    const rows = await this.prisma.notification.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: notificationInclude,
    });

    const nextCursor = rows.length > take ? rows[take]?.id ?? null : null;
    return { items: rows.slice(0, take).map((notification) => this.mapNotification(notification)), nextCursor };
  }

  async markRead(user: User, id: string) {
    const result = await this.prisma.notification.updateMany({
      where: { id, recipientUserId: user.id, readAt: null },
      data: { readAt: new Date() },
    });

    if (result.count === 0) {
      const exists = await this.prisma.notification.findFirst({ where: { id, recipientUserId: user.id }, select: { id: true } });
      if (!exists) throw new NotFoundException('Notification was not found.');
    }

    return this.getNotificationForUser(user.id, id);
  }

  async markAllRead(user: User) {
    const result = await this.prisma.notification.updateMany({
      where: { recipientUserId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }

  async listPreferences(user: User) {
    const preferences = await this.prisma.notificationPreference.findMany({
      where: { userId: user.id },
      orderBy: { type: 'asc' },
    });
    const byType = new Map(preferences.map((preference) => [preference.type, preference]));

    return Object.values(NotificationType).map((type) => {
      const preference = byType.get(type);
      return {
        type,
        inAppEnabled: preference?.inAppEnabled ?? true,
        emailEnabled: preference?.emailEnabled ?? true,
        createdAt: preference?.createdAt.toISOString() ?? null,
        updatedAt: preference?.updatedAt.toISOString() ?? null,
      };
    });
  }

  async updatePreference(user: User, type: NotificationType, dto: UpdateNotificationPreferenceDto) {
    if (!Object.values(NotificationType).includes(type)) {
      throw new BadRequestException('Choose a valid notification type.');
    }

    const existing = await this.prisma.notificationPreference.findUnique({
      where: { userId_type: { userId: user.id, type } },
    });

    const updated = await this.prisma.notificationPreference.upsert({
      where: { userId_type: { userId: user.id, type } },
      create: {
        userId: user.id,
        type,
        inAppEnabled: dto.inAppEnabled ?? true,
        emailEnabled: dto.emailEnabled ?? true,
      },
      update: {
        inAppEnabled: dto.inAppEnabled ?? existing?.inAppEnabled ?? true,
        emailEnabled: dto.emailEnabled ?? existing?.emailEnabled ?? true,
      },
    });

    return {
      type: updated.type,
      inAppEnabled: updated.inAppEnabled,
      emailEnabled: updated.emailEnabled,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async createNotification(input: CreateNotificationInput) {
    const channels = input.channels?.length ? input.channels : [NotificationChannel.in_app];
    const preferences = await this.prisma.notificationPreference.findUnique({
      where: { userId_type: { userId: input.recipientUserId, type: input.type } },
    });

    return this.prisma.notification.create({
      data: {
        recipientUserId: input.recipientUserId,
        actorUserId: input.actorUserId ?? null,
        type: input.type,
        title: input.title.trim(),
        body: input.body.trim(),
        severity: input.severity ?? NotificationSeverity.info,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        actionUrl: input.actionUrl ?? null,
        deliveries: {
          create: channels.map((channel) => ({
            channel,
            status: this.deliveryStatusFor(channel, preferences),
            sentAt: channel === NotificationChannel.in_app && (preferences?.inAppEnabled ?? true) ? new Date() : null,
          })),
        },
      },
      include: notificationInclude,
    });
  }

  private deliveryStatusFor(
    channel: NotificationChannel,
    preferences: { inAppEnabled: boolean; emailEnabled: boolean } | null,
  ) {
    if (channel === NotificationChannel.in_app) {
      return preferences?.inAppEnabled === false ? NotificationDeliveryStatus.skipped : NotificationDeliveryStatus.sent;
    }
    return preferences?.emailEnabled === false ? NotificationDeliveryStatus.skipped : NotificationDeliveryStatus.pending;
  }

  private async getNotificationForUser(userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, recipientUserId: userId },
      include: notificationInclude,
    });
    if (!notification) throw new NotFoundException('Notification was not found.');
    return this.mapNotification(notification);
  }

  private mapNotification(notification: NotificationWithInclude) {
    return {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      severity: notification.severity,
      entityType: notification.entityType,
      entityId: notification.entityId,
      actionUrl: notification.actionUrl,
      readAt: notification.readAt?.toISOString() ?? null,
      actor: notification.actor ? this.mapUser(notification.actor) : null,
      deliveries: notification.deliveries.map((delivery) => ({
        channel: delivery.channel,
        status: delivery.status,
        sentAt: delivery.sentAt?.toISOString() ?? null,
        failedAt: delivery.failedAt?.toISOString() ?? null,
      })),
      createdAt: notification.createdAt.toISOString(),
      updatedAt: notification.updatedAt.toISOString(),
    };
  }

  private mapUser(user: { id: string; firstName: string | null; lastName: string | null; email: string; role: User['role'] }) {
    return {
      id: user.id,
      name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
      email: user.email,
      role: user.role,
    };
  }
}
