import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationEntityType,
  NotificationSeverity,
  NotificationType,
  Prisma,
  User,
} from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import { NotificationQueryDto } from "./dto/notification-query.dto";
import { UpdateNotificationPreferenceDto } from "./dto/update-notification-preference.dto";
import { UpdateNotificationAutomationPreferenceDto } from "./dto/update-notification-automation-preference.dto";
import {
  isNotificationPreferenceGroupName,
  notificationPreferenceGroupsForRole,
} from "./notification-preference-groups";

const DEFAULT_TAKE = 20;

type PreferenceMode = "inherit" | "enabled" | "disabled" | "mixed";

const notificationInclude = {
  actor: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
    },
  },
  deliveries: {
    select: { channel: true, status: true, sentAt: true, failedAt: true },
  },
} satisfies Prisma.NotificationInclude;

type NotificationWithInclude = Prisma.NotificationGetPayload<{
  include: typeof notificationInclude;
}>;

export type CreateNotificationInput = {
  recipientUserId: string;
  actorUserId?: string | null;
  type: NotificationType;
  title: string;
  body: string;
  severity?: NotificationSeverity;
  entityType?: NotificationEntityType | null;
  entityId?: string | null;
  actionUrl?: string | null;
  dedupeKey?: string | null;
  channels?: NotificationChannel[];
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listNotifications(user: User, query: NotificationQueryDto) {
    const take = query.take ?? DEFAULT_TAKE;
    const where: Prisma.NotificationWhereInput = {
      recipientUserId: user.id,
      deliveries: {
        some: {
          channel: NotificationChannel.in_app,
          status: NotificationDeliveryStatus.sent,
        },
      },
      ...(query.type ? { type: query.type } : {}),
      ...(query.unreadOnly === "true" ? { readAt: null } : {}),
    };

    const rows = await this.prisma.notification.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: notificationInclude,
    });

    const nextCursor = rows.length > take ? (rows[take - 1]?.id ?? null) : null;
    return {
      items: rows
        .slice(0, take)
        .map((notification) => this.mapNotification(notification)),
      nextCursor,
    };
  }

  async getSummary(user: User) {
    const visibleInApp = {
      recipientUserId: user.id,
      deliveries: {
        some: {
          channel: NotificationChannel.in_app,
          status: NotificationDeliveryStatus.sent,
        },
      },
    } satisfies Prisma.NotificationWhereInput;

    const [unreadCount, totalCount] = await this.prisma.$transaction([
      this.prisma.notification.count({
        where: { ...visibleInApp, readAt: null },
      }),
      this.prisma.notification.count({ where: visibleInApp }),
    ]);

    return { unreadCount, totalCount };
  }

  async markRead(user: User, id: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        id,
        recipientUserId: user.id,
        readAt: null,
        deliveries: {
          some: {
            channel: NotificationChannel.in_app,
            status: NotificationDeliveryStatus.sent,
          },
        },
      },
      data: { readAt: new Date() },
    });

    if (result.count === 0) {
      const exists = await this.prisma.notification.findFirst({
        where: {
          id,
          recipientUserId: user.id,
          deliveries: {
            some: {
              channel: NotificationChannel.in_app,
              status: NotificationDeliveryStatus.sent,
            },
          },
        },
        select: { id: true },
      });
      if (!exists) throw new NotFoundException("Notification was not found.");
    }

    return this.getNotificationForUser(user.id, id);
  }

  async markAllRead(user: User) {
    const result = await this.prisma.notification.updateMany({
      where: {
        recipientUserId: user.id,
        readAt: null,
        deliveries: {
          some: {
            channel: NotificationChannel.in_app,
            status: NotificationDeliveryStatus.sent,
          },
        },
      },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }

  async listPreferences(user: User) {
    const defaults = await this.channelDefaults();
    const preferences = await this.prisma.notificationPreference.findMany({
      where: { userId: user.id },
      orderBy: { type: "asc" },
    });
    const byType = new Map(
      preferences.map((preference) => [preference.type, preference]),
    );

    return Object.values(NotificationType).map((type) => {
      const preference = byType.get(type);
      return {
        type,
        inAppOverride: preference?.inAppEnabled ?? null,
        emailOverride: preference?.emailEnabled ?? null,
        inAppEnabled: preference?.inAppEnabled ?? defaults.inAppEnabled,
        emailEnabled: preference?.emailEnabled ?? defaults.emailEnabled,
        createdAt: preference?.createdAt.toISOString() ?? null,
        updatedAt: preference?.updatedAt.toISOString() ?? null,
      };
    });
  }

  async updatePreference(
    user: User,
    type: NotificationType,
    dto: UpdateNotificationPreferenceDto,
  ) {
    if (!Object.values(NotificationType).includes(type)) {
      throw new BadRequestException("Choose a valid notification type.");
    }
    if (dto.inAppEnabled === undefined && dto.emailEnabled === undefined) {
      throw new BadRequestException(
        "Choose at least one notification channel.",
      );
    }

    const defaults = await this.channelDefaults();
    const updated = await this.prisma.notificationPreference.upsert({
      where: { userId_type: { userId: user.id, type } },
      create: {
        userId: user.id,
        type,
        inAppEnabled: dto.inAppEnabled,
        emailEnabled: dto.emailEnabled,
      },
      update: {
        ...(dto.inAppEnabled === undefined
          ? {}
          : { inAppEnabled: dto.inAppEnabled }),
        ...(dto.emailEnabled === undefined
          ? {}
          : { emailEnabled: dto.emailEnabled }),
      },
    });

    return {
      type: updated.type,
      inAppOverride: updated.inAppEnabled,
      emailOverride: updated.emailEnabled,
      inAppEnabled: updated.inAppEnabled ?? defaults.inAppEnabled,
      emailEnabled: updated.emailEnabled ?? defaults.emailEnabled,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async listPreferenceGroups(user: User) {
    const [preferences, defaults] = await Promise.all([
      this.listPreferences(user),
      this.channelDefaults(),
    ]);
    const byType = new Map(
      preferences.map((preference) => [preference.type, preference]),
    );

    return notificationPreferenceGroupsForRole(user.role).map(
      ({ group, types }) => {
        const entries = types.map((type) => byType.get(type)!);
        return {
          group,
          types,
          inAppMode: this.preferenceMode(
            entries.map((entry) => entry.inAppOverride),
          ),
          emailMode: this.preferenceMode(
            entries.map((entry) => entry.emailOverride),
          ),
          inAppEnabled: this.groupedChannelState(
            entries.map((entry) => entry.inAppEnabled),
          ),
          emailEnabled: this.groupedChannelState(
            entries.map((entry) => entry.emailEnabled),
          ),
          defaults,
        };
      },
    );
  }

  async updatePreferenceGroup(
    user: User,
    group: string,
    dto: UpdateNotificationPreferenceDto,
  ) {
    if (!isNotificationPreferenceGroupName(group)) {
      throw new BadRequestException(
        "Choose a valid notification preference group.",
      );
    }
    if (dto.inAppEnabled === undefined && dto.emailEnabled === undefined) {
      throw new BadRequestException(
        "Choose at least one notification channel.",
      );
    }

    const definition = notificationPreferenceGroupsForRole(user.role).find(
      (item) => item.group === group,
    );
    if (!definition) {
      throw new BadRequestException(
        "This notification preference group is not available for your role.",
      );
    }

    await this.prisma.$transaction(
      definition.types.map((type) =>
        this.prisma.notificationPreference.upsert({
          where: { userId_type: { userId: user.id, type } },
          create: {
            userId: user.id,
            type,
            inAppEnabled: dto.inAppEnabled,
            emailEnabled: dto.emailEnabled,
          },
          update: {
            ...(dto.inAppEnabled === undefined
              ? {}
              : { inAppEnabled: dto.inAppEnabled }),
            ...(dto.emailEnabled === undefined
              ? {}
              : { emailEnabled: dto.emailEnabled }),
          },
        }),
      ),
    );

    const groups = await this.listPreferenceGroups(user);
    return groups.find((item) => item.group === group)!;
  }

  private preferenceMode(values: Array<boolean | null>): PreferenceMode {
    if (values.every((value) => value === null)) return "inherit";
    if (values.every((value) => value === true)) return "enabled";
    if (values.every((value) => value === false)) return "disabled";
    return "mixed";
  }

  private groupedChannelState(values: boolean[]) {
    if (values.every(Boolean)) return true;
    if (values.every((value) => !value)) return false;
    return null;
  }

  async getAutomationPreference(user: User) {
    const [preference, defaults] = await Promise.all([
      this.prisma.notificationAutomationPreference.findUnique({
        where: { userId: user.id },
      }),
      this.automationDefaults(),
    ]);
    return {
      reminderOverride: preference?.reminderEnabled ?? null,
      reminderEnabled: preference?.reminderEnabled ?? defaults.reminderEnabled,
      weeklyDigestOverride: preference?.weeklyDigestEnabled ?? null,
      weeklyDigestEnabled:
        preference?.weeklyDigestEnabled ?? defaults.weeklyDigestEnabled,
      defaults,
    };
  }

  async updateAutomationPreference(
    user: User,
    dto: UpdateNotificationAutomationPreferenceDto,
  ) {
    if (
      dto.reminderEnabled === undefined &&
      dto.weeklyDigestEnabled === undefined
    ) {
      throw new BadRequestException("Choose at least one automation setting.");
    }
    await this.prisma.notificationAutomationPreference.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        reminderEnabled: dto.reminderEnabled,
        weeklyDigestEnabled: dto.weeklyDigestEnabled,
      },
      update: {
        ...(dto.reminderEnabled === undefined
          ? {}
          : { reminderEnabled: dto.reminderEnabled }),
        ...(dto.weeklyDigestEnabled === undefined
          ? {}
          : { weeklyDigestEnabled: dto.weeklyDigestEnabled }),
      },
    });
    return this.getAutomationPreference(user);
  }

  async createNotification(input: CreateNotificationInput) {
    const [notification] = await this.createNotifications([input]);
    return notification;
  }

  async createNotifications(inputs: CreateNotificationInput[]) {
    if (inputs.length === 0) return [];

    const normalized = inputs.map((input) => {
      if (!input.title.trim() || !input.body.trim()) {
        throw new BadRequestException(
          "Notification title and body are required.",
        );
      }
      return {
        ...input,
        title: input.title.trim(),
        body: input.body.trim(),
        actionUrl: this.normalizeActionUrl(input.actionUrl),
        channels: [
          ...new Set(
            input.channels?.length
              ? input.channels
              : [NotificationChannel.in_app],
          ),
        ],
      };
    });

    const [preferences, defaults] = await Promise.all([
      this.prisma.notificationPreference.findMany({
        where: {
          OR: normalized.map((input) => ({
            userId: input.recipientUserId,
            type: input.type,
          })),
        },
      }),
      this.channelDefaults(),
    ]);
    const preferencesByRecipientAndType = new Map(
      preferences.map((preference) => [
        preference.userId + ":" + preference.type,
        preference,
      ]),
    );
    const sentAt = new Date();

    return this.prisma.$transaction(
      normalized.map((input) => {
        const preference =
          preferencesByRecipientAndType.get(
            input.recipientUserId + ":" + input.type,
          ) ?? null;
        const createArgs = {
          data: {
            recipientUserId: input.recipientUserId,
            actorUserId: input.actorUserId ?? null,
            type: input.type,
            title: input.title,
            body: input.body,
            severity: input.severity ?? NotificationSeverity.info,
            entityType: input.entityType ?? null,
            entityId: input.entityId ?? null,
            actionUrl: input.actionUrl,
            dedupeKey: input.dedupeKey ?? null,
            deliveries: {
              create: input.channels.map((channel) => ({
                channel,
                status: this.deliveryStatusFor(channel, preference, defaults),
                sentAt:
                  channel === NotificationChannel.in_app &&
                  (preference?.inAppEnabled ?? defaults.inAppEnabled)
                    ? sentAt
                    : null,
              })),
            },
          },
          include: notificationInclude,
        };
        if (input.dedupeKey) {
          return this.prisma.notification.upsert({
            where: { dedupeKey: input.dedupeKey },
            update: {},
            create: createArgs.data,
            include: notificationInclude,
          });
        }
        return this.prisma.notification.create(createArgs);
      }),
    );
  }

  private normalizeActionUrl(value?: string | null) {
    if (!value) return null;
    if (!value.startsWith("/") || value.startsWith("//")) {
      throw new BadRequestException(
        "Notification action URLs must be internal application paths.",
      );
    }
    return value;
  }

  private async channelDefaults() {
    const settings = await this.prisma.companySettings.findUnique({
      where: { singletonKey: "default" },
      select: {
        inAppNotificationsEnabledByDefault: true,
        emailNotificationsEnabledByDefault: true,
      },
    });
    return {
      inAppEnabled: settings?.inAppNotificationsEnabledByDefault ?? true,
      emailEnabled: settings?.emailNotificationsEnabledByDefault ?? true,
    };
  }

  private async automationDefaults() {
    const settings = await this.prisma.companySettings.findUnique({
      where: { singletonKey: "default" },
      select: {
        reminderNotificationsEnabledByDefault: true,
        weeklyDigestEnabledByDefault: true,
      },
    });
    return {
      reminderEnabled: settings?.reminderNotificationsEnabledByDefault ?? true,
      weeklyDigestEnabled: settings?.weeklyDigestEnabledByDefault ?? false,
    };
  }

  private deliveryStatusFor(
    channel: NotificationChannel,
    preferences: {
      inAppEnabled: boolean | null;
      emailEnabled: boolean | null;
    } | null,
    defaults: { inAppEnabled: boolean; emailEnabled: boolean },
  ) {
    if (channel === NotificationChannel.in_app) {
      return (preferences?.inAppEnabled ?? defaults.inAppEnabled) === false
        ? NotificationDeliveryStatus.skipped
        : NotificationDeliveryStatus.sent;
    }
    return (preferences?.emailEnabled ?? defaults.emailEnabled) === false
      ? NotificationDeliveryStatus.skipped
      : NotificationDeliveryStatus.pending;
  }

  private async getNotificationForUser(userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id,
        recipientUserId: userId,
        deliveries: {
          some: {
            channel: NotificationChannel.in_app,
            status: NotificationDeliveryStatus.sent,
          },
        },
      },
      include: notificationInclude,
    });
    if (!notification)
      throw new NotFoundException("Notification was not found.");
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

  private mapUser(user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    role: User["role"];
  }) {
    return {
      id: user.id,
      name:
        [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email,
      email: user.email,
      role: user.role,
    };
  }
}
