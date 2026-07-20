import { Injectable } from "@nestjs/common";
import {
  DeliverableInstanceStatus,
  NotificationChannel,
  NotificationEntityType,
  NotificationSeverity,
  NotificationType,
  SessionStatus,
  UserRole,
  UserStatus,
} from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import {
  type CreateNotificationInput,
  NotificationsService,
} from "./notifications.service";

const PAGE_SIZE = 100;
const REMINDER_WINDOW_MS = 24 * 60 * 60_000;
const DIGEST_LOOKAHEAD_MS = 7 * 24 * 60 * 60_000;

type AutomationDefaults = {
  reminderEnabled: boolean;
  weeklyDigestEnabled: boolean;
  timezone: string;
};

@Injectable()
export class NotificationAutomationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async process(now = new Date()) {
    const defaults = await this.defaults();
    const [sessionReminders, deliverableReminders, weeklyDigests] =
      await Promise.all([
        this.createSessionReminders(now, defaults),
        this.createDeliverableReminders(now, defaults),
        this.createWeeklyDigests(now, defaults),
      ]);
    return { sessionReminders, deliverableReminders, weeklyDigests };
  }

  private async createSessionReminders(
    now: Date,
    defaults: AutomationDefaults,
  ) {
    let cursor: string | undefined;
    let created = 0;
    do {
      const sessions = await this.prisma.session.findMany({
        where: {
          status: SessionStatus.confirmed,
          startAt: {
            gt: now,
            lte: new Date(now.getTime() + REMINDER_WINDOW_MS),
          },
        },
        orderBy: { id: "asc" },
        take: PAGE_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: {
          id: true,
          topic: true,
          startAt: true,
          entrepreneur: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
              timezone: true,
              status: true,
            },
          },
          owner: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
              timezone: true,
              status: true,
            },
          },
        },
      });
      if (!sessions.length) break;
      cursor = sessions.at(-1)!.id;
      const recipients = sessions.flatMap((session) =>
        [session.entrepreneur, session.owner].filter(
          (user): user is NonNullable<typeof user> =>
            user !== null && user.status === UserStatus.active,
        ),
      );
      const enabled = await this.enabledUsers(
        recipients.map((user) => user.id),
        "reminderEnabled",
        defaults.reminderEnabled,
      );
      const inputs = sessions.flatMap((session) =>
        [session.entrepreneur, session.owner]
          .filter((user): user is NonNullable<typeof user> => Boolean(user))
          .filter((user) => enabled.has(user.id))
          .map((user) => {
            const counterpart =
              user.id === session.entrepreneur.id
                ? session.owner
                : session.entrepreneur;
            return {
              recipientUserId: user.id,
              type: NotificationType.session_reminder,
              title: "Upcoming session: " + session.topic,
              body:
                "Your session with " +
                this.userName(counterpart) +
                " starts " +
                this.formatDateTime(
                  session.startAt,
                  user.timezone ?? defaults.timezone,
                ) +
                ". Open it for the topic and joining details.",
              severity: NotificationSeverity.info,
              entityType: NotificationEntityType.session,
              entityId: session.id,
              actionUrl: this.sessionUrl(user.role, session.id),
              dedupeKey: "session-reminder:" + session.id + ":" + user.id,
              channels: [NotificationChannel.in_app, NotificationChannel.email],
            };
          }),
      );
      created += await this.createMissing(inputs);
    } while (true);
    return created;
  }

  private async createDeliverableReminders(
    now: Date,
    defaults: AutomationDefaults,
  ) {
    let cursor: string | undefined;
    let created = 0;
    do {
      const deliverables = await this.prisma.deliverableInstance.findMany({
        where: {
          entrepreneur: { status: UserStatus.active },
          status: {
            in: [
              DeliverableInstanceStatus.not_submitted,
              DeliverableInstanceStatus.changes_required,
            ],
          },
          dueDate: {
            gt: now,
            lte: new Date(now.getTime() + REMINDER_WINDOW_MS),
          },
        },
        orderBy: { id: "asc" },
        take: PAGE_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: {
          id: true,
          programmeId: true,
          dueDate: true,
          status: true,
          rule: { select: { name: true } },
          programme: { select: { name: true } },
          entrepreneur: { select: { id: true, timezone: true } },
        },
      });
      if (!deliverables.length) break;
      cursor = deliverables.at(-1)!.id;
      const enabled = await this.enabledUsers(
        deliverables.map((item) => item.entrepreneur.id),
        "reminderEnabled",
        defaults.reminderEnabled,
      );
      const inputs = deliverables
        .filter((item) => enabled.has(item.entrepreneur.id))
        .map((item) => ({
          recipientUserId: item.entrepreneur.id,
          type: NotificationType.deliverable_due_reminder,
          title: "Deliverable due soon: " + item.rule.name,
          body:
            "“" +
            item.rule.name +
            "” for " +
            item.programme.name +
            " is due " +
            this.formatDateTime(
              item.dueDate,
              item.entrepreneur.timezone ?? defaults.timezone,
            ) +
            (item.status === DeliverableInstanceStatus.changes_required
              ? ". Changes are still required before you resubmit."
              : ". Open the requirement and submit your work before the deadline."),
          severity: NotificationSeverity.warning,
          entityType: NotificationEntityType.deliverable_instance,
          entityId: item.id,
          actionUrl: `/entrepreneur/deliverables/${encodeURIComponent(item.programmeId)}?deliverableId=${encodeURIComponent(item.id)}`,
          dedupeKey: `deliverable-reminder:${item.id}:${item.entrepreneur.id}`,
          channels: [NotificationChannel.in_app, NotificationChannel.email],
        }));
      created += await this.createMissing(inputs);
    } while (true);
    return created;
  }

  private async createWeeklyDigests(now: Date, defaults: AutomationDefaults) {
    let cursor: string | undefined;
    let created = 0;
    do {
      const users = await this.prisma.user.findMany({
        where: { status: UserStatus.active },
        orderBy: { id: "asc" },
        take: PAGE_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: { id: true, role: true, timezone: true },
      });
      if (!users.length) break;
      cursor = users.at(-1)!.id;
      const mondayUsers = users.filter((user) =>
        this.isDigestWindow(now, user.timezone ?? defaults.timezone),
      );
      const enabled = await this.enabledUsers(
        mondayUsers.map((user) => user.id),
        "weeklyDigestEnabled",
        defaults.weeklyDigestEnabled,
      );
      const eligible = mondayUsers.filter((user) => enabled.has(user.id));
      if (eligible.length) {
        const summaries = await this.digestSummaries(
          eligible.map((user) => user.id),
          now,
        );
        const inputs = eligible.map((user) => {
          const summary = summaries.get(user.id) ?? {
            unread: 0,
            sessions: 0,
            deliverables: 0,
          };
          const timezone = user.timezone ?? defaults.timezone;
          return {
            recipientUserId: user.id,
            type: NotificationType.weekly_digest,
            title: "Your weekly BID Hub summary",
            body: this.weeklyDigestBody(user.role, summary),
            severity: NotificationSeverity.info,
            actionUrl: this.dashboardUrl(user.role),
            dedupeKey: `weekly-digest:${user.id}:${this.localDate(now, timezone)}`,
            channels: [NotificationChannel.email],
          };
        });
        created += await this.createMissing(inputs);
      }
    } while (true);
    return created;
  }

  private async createMissing(inputs: CreateNotificationInput[]) {
    if (!inputs.length) return 0;
    const keys = inputs
      .map((input) => input.dedupeKey)
      .filter((key): key is string => Boolean(key));
    const existing = keys.length
      ? await this.prisma.notification.findMany({
          where: { dedupeKey: { in: keys } },
          select: { dedupeKey: true },
        })
      : [];
    const existingKeys = new Set(existing.map((item) => item.dedupeKey));
    const missing = inputs.filter(
      (input) => !input.dedupeKey || !existingKeys.has(input.dedupeKey),
    );
    if (missing.length) await this.notifications.createNotifications(missing);
    return missing.length;
  }

  private async enabledUsers(
    userIds: string[],
    field: "reminderEnabled" | "weeklyDigestEnabled",
    companyDefault: boolean,
  ) {
    const uniqueIds = [...new Set(userIds)];
    if (!uniqueIds.length) return new Set<string>();
    const preferences =
      await this.prisma.notificationAutomationPreference.findMany({
        where: { userId: { in: uniqueIds } },
        select: {
          userId: true,
          reminderEnabled: true,
          weeklyDigestEnabled: true,
        },
      });
    const byUser = new Map(preferences.map((item) => [item.userId, item]));
    return new Set(
      uniqueIds.filter(
        (userId) => byUser.get(userId)?.[field] ?? companyDefault,
      ),
    );
  }

  private async digestSummaries(userIds: string[], now: Date) {
    const end = new Date(now.getTime() + DIGEST_LOOKAHEAD_MS);
    const [unread, entrepreneurSessions, ownedSessions, deliverables] =
      await Promise.all([
        this.prisma.notification.groupBy({
          by: ["recipientUserId"],
          where: {
            recipientUserId: { in: userIds },
            readAt: null,
            deliveries: {
              some: {
                channel: NotificationChannel.in_app,
                status: "sent",
              },
            },
          },
          _count: { _all: true },
        }),
        this.prisma.session.groupBy({
          by: ["entrepreneurUserId"],
          where: {
            entrepreneurUserId: { in: userIds },
            status: SessionStatus.confirmed,
            startAt: { gt: now, lte: end },
          },
          _count: { _all: true },
        }),
        this.prisma.session.groupBy({
          by: ["ownerUserId"],
          where: {
            ownerUserId: { in: userIds },
            status: SessionStatus.confirmed,
            startAt: { gt: now, lte: end },
          },
          _count: { _all: true },
        }),
        this.prisma.deliverableInstance.groupBy({
          by: ["entrepreneurUserId"],
          where: {
            entrepreneurUserId: { in: userIds },
            status: {
              in: [
                DeliverableInstanceStatus.not_submitted,
                DeliverableInstanceStatus.changes_required,
              ],
            },
            dueDate: { gt: now, lte: end },
          },
          _count: { _all: true },
        }),
      ]);
    const result = new Map(
      userIds.map((id) => [id, { unread: 0, sessions: 0, deliverables: 0 }]),
    );
    unread.forEach(
      (row) => (result.get(row.recipientUserId)!.unread = row._count._all),
    );
    entrepreneurSessions.forEach(
      (row) =>
        (result.get(row.entrepreneurUserId)!.sessions += row._count._all),
    );
    ownedSessions.forEach((row) => {
      if (row.ownerUserId)
        result.get(row.ownerUserId)!.sessions += row._count._all;
    });
    deliverables.forEach(
      (row) =>
        (result.get(row.entrepreneurUserId)!.deliverables = row._count._all),
    );
    return result;
  }

  private async defaults(): Promise<AutomationDefaults> {
    const settings = await this.prisma.companySettings.findUnique({
      where: { singletonKey: "default" },
      select: {
        reminderNotificationsEnabledByDefault: true,
        weeklyDigestEnabledByDefault: true,
        defaultTimezone: true,
      },
    });
    return {
      reminderEnabled: settings?.reminderNotificationsEnabledByDefault ?? true,
      weeklyDigestEnabled: settings?.weeklyDigestEnabledByDefault ?? false,
      timezone: settings?.defaultTimezone ?? "Africa/Kigali",
    };
  }

  private isDigestWindow(date: Date, timezone: string) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
      hour: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    const weekday = parts.find((part) => part.type === "weekday")?.value;
    const hour = Number(parts.find((part) => part.type === "hour")?.value);
    return weekday === "Mon" && hour >= 8;
  }

  private localDate(date: Date, timezone: string) {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }

  private formatDateTime(date: Date, timezone: string) {
    return new Intl.DateTimeFormat("en", {
      timeZone: timezone,
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(date);
  }

  private weeklyDigestBody(
    role: UserRole,
    summary: { unread: number; sessions: number; deliverables: number },
  ) {
    const activity =
      this.countLabel(summary.unread, "unread update") +
      " and " +
      this.countLabel(summary.sessions, "upcoming session");
    if (role !== UserRole.entrepreneur) {
      return activity + " in the next 7 days.";
    }
    return (
      activity +
      ", with " +
      this.countLabel(summary.deliverables, "deliverable") +
      " due in the next 7 days."
    );
  }

  private countLabel(count: number, noun: string) {
    return count + " " + noun + (count === 1 ? "" : "s");
  }

  private userName(
    user: {
      email: string;
      firstName: string | null;
      lastName: string | null;
    } | null,
  ) {
    if (!user) return "your BID team member";
    return (
      [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email
    );
  }

  private sessionUrl(role: UserRole, sessionId: string) {
    const root =
      role === UserRole.entrepreneur
        ? "/entrepreneur/schedule"
        : role === UserRole.trainer
          ? "/trainer/sessions"
          : "/admin/sessions";
    return `${root}?sessionId=${encodeURIComponent(sessionId)}`;
  }

  private dashboardUrl(role: UserRole) {
    if (role === UserRole.entrepreneur) return "/entrepreneur/dashboard";
    if (role === UserRole.trainer) return "/trainer/dashboard";
    return "/admin/dashboard";
  }
}
