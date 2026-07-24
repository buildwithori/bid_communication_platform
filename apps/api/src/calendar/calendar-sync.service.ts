import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import {
  CalendarAttendeeResponseStatus,
  CalendarConnectionStatus,
  CalendarProvider,
  ExternalResourceProvider,
  NotificationChannel,
  NotificationEntityType,
  NotificationSeverity,
  NotificationType,
  SessionStatus,
  UserRole,
} from "@prisma/client";
import { timingSafeEqual } from "node:crypto";
import { AuditService } from "../audit/audit.service";
import { IntegrationLoggerService } from "../common/observability/integration-logger.service";
import { PrismaService } from "../database/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import {
  CalendarConnectionSyncJob,
  CalendarSyncQueueService,
} from "./calendar-sync-queue.service";
import { CalendarService } from "./calendar.service";

const CONNECTION_BATCH = 25;
const SESSION_BATCH = 50;

@Injectable()
export class CalendarSyncService {
  private readonly logger = new Logger(CalendarSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly calendar: CalendarService,
    private readonly queue: CalendarSyncQueueService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly integration: IntegrationLoggerService,
  ) {}

  receiveNotification(headers: {
    channelId?: string;
    channelToken?: string;
    resourceId?: string;
    resourceState?: string;
    messageNumber?: string;
  }) {
    return this.integration.trackWebhook(
      {
        provider: "google_calendar",
        operation: "events.changed",
        method: "POST",
      },
      async () => {
        if (
          !headers.channelId ||
          !headers.channelToken ||
          !headers.resourceId
        ) {
          throw new UnauthorizedException(
            "Google Calendar notification headers are incomplete.",
          );
        }
        const connection = await this.prisma.calendarConnection.findUnique({
          where: { watchChannelId: headers.channelId },
          select: {
            id: true,
            watchResourceId: true,
            watchTokenHash: true,
          },
        });

        if (
          !connection ||
          !connection.watchTokenHash ||
          !this.secureEqual(
            connection.watchTokenHash,
            this.calendar.channelTokenHash(headers.channelToken),
          )
        ) {
          throw new UnauthorizedException(
            "Google Calendar notification channel is invalid.",
          );
        }

        // Google can deliver the initial sync message while the watch request is
        // still in flight. At that point the authenticated channel and token are
        // stored, but the response resource id is not available yet.
        if (headers.resourceState === "sync" && !connection.watchResourceId) {
          return;
        }
        if (connection.watchResourceId !== headers.resourceId) {
          throw new UnauthorizedException(
            "Google Calendar notification channel is invalid.",
          );
        }
        if (headers.resourceState === "sync") return;

        await this.queue.enqueueConnection(
          {
            connectionId: connection.id,
            source: "webhook",
          },
          `google-calendar-${headers.channelId}-${headers.messageNumber ?? Date.now()}`,
        );
      },
    );
  }

  async enqueueScheduledReconciliation(cursor?: string) {
    const connections = await this.prisma.calendarConnection.findMany({
      where: {
        provider: CalendarProvider.google,
        status: CalendarConnectionStatus.connected,
      },
      select: { id: true },
      orderBy: { id: "asc" },
      take: CONNECTION_BATCH + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const page = connections.slice(0, CONNECTION_BATCH);
    await Promise.all(
      page.map((connection) =>
        this.queue.enqueueConnection({
          connectionId: connection.id,
          source: "reconciliation",
        }),
      ),
    );
    return {
      enqueued: page.length,
      nextCursor:
        connections.length > CONNECTION_BATCH
          ? (page.at(-1)?.id ?? null)
          : null,
    };
  }

  async maintainWatchChannels() {
    if (!this.calendar.pushNotificationsAvailable()) {
      return { checked: 0, renewed: 0, nextCursor: null };
    }
    const refreshBefore = new Date(Date.now() + 24 * 60 * 60_000);
    const connections = await this.prisma.calendarConnection.findMany({
      where: {
        provider: CalendarProvider.google,
        status: CalendarConnectionStatus.connected,
        OR: [
          { watchExpiresAt: null },
          { watchExpiresAt: { lte: refreshBefore } },
        ],
      },
      select: { id: true },
      orderBy: { id: "asc" },
      take: CONNECTION_BATCH,
    });
    let renewed = 0;
    for (const connection of connections) {
      try {
        if (await this.calendar.ensureWatchChannel(connection.id)) renewed += 1;
      } catch (error) {
        this.logger.warn(
          JSON.stringify({
            event: "calendar.watch.renewal_failed",
            connectionId: connection.id,
            error: error instanceof Error ? error.name : "UnknownError",
          }),
        );
      }
    }
    return {
      checked: connections.length,
      renewed,
      nextCursor: null,
    };
  }

  async reconcileConnection(job: CalendarConnectionSyncJob) {
    const connection = await this.prisma.calendarConnection.findUnique({
      where: { id: job.connectionId },
    });
    if (
      !connection ||
      connection.status !== CalendarConnectionStatus.connected
    ) {
      return { processed: 0, changed: 0, nextCursor: null };
    }

    const sessions = await this.prisma.session.findMany({
      where: {
        ownerUserId: connection.userId,
        status: SessionStatus.confirmed,
        calendarEventId: { not: null },
      },
      include: {
        entrepreneur: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
      orderBy: { id: "asc" },
      take: SESSION_BATCH + 1,
      ...(job.cursor ? { cursor: { id: job.cursor }, skip: 1 } : {}),
    });
    const page = sessions.slice(0, SESSION_BATCH);
    let changed = 0;
    for (const session of page) {
      const event = await this.calendar.getSessionEvent(
        connection,
        session.calendarEventId!,
        session.entrepreneur.email,
      );
      if (await this.applyCalendarState(session, event)) {
        changed += 1;
      }
    }

    return {
      processed: page.length,
      changed,
      nextCursor:
        sessions.length > SESSION_BATCH ? (page.at(-1)?.id ?? null) : null,
    };
  }

  private async applyCalendarState(
    session: {
      id: string;
      topic: string;
      calendarEventId: string | null;
      calendarEventEtag: string | null;
      calendarResponseStatus: CalendarAttendeeResponseStatus | null;
      ownerUserId: string | null;
      entrepreneurUserId: string;
      entrepreneur: {
        id: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
      };
      owner: {
        id: string;
        firstName: string | null;
        lastName: string | null;
        role: UserRole;
      } | null;
    },
    event: {
      eventEtag: string | null;
      eventStatus: string;
      responseStatus: CalendarAttendeeResponseStatus;
      responseUpdatedAt: Date;
    } | null,
  ) {
    const responseStatus =
      event?.responseStatus ?? CalendarAttendeeResponseStatus.declined;
    const eventUnavailable = !event || event.eventStatus === "cancelled";
    if (
      !eventUnavailable &&
      event.eventEtag &&
      event.eventEtag === session.calendarEventEtag &&
      responseStatus === session.calendarResponseStatus
    ) {
      await this.prisma.session.updateMany({
        where: { id: session.id, status: SessionStatus.confirmed },
        data: { calendarLastSyncedAt: new Date() },
      });
      return false;
    }

    if (
      eventUnavailable ||
      responseStatus === CalendarAttendeeResponseStatus.declined
    ) {
      return this.cancelDeclinedSession(
        session,
        eventUnavailable
          ? "The calendar event was removed."
          : "The entrepreneur declined the calendar invitation.",
        responseStatus,
        event?.eventEtag ?? null,
        event?.responseUpdatedAt ?? new Date(),
      );
    }

    const changed =
      responseStatus !== session.calendarResponseStatus ||
      event?.eventEtag !== session.calendarEventEtag;
    await this.prisma.$transaction(async (tx) => {
      await tx.session.updateMany({
        where: { id: session.id, status: SessionStatus.confirmed },
        data: {
          calendarResponseStatus: responseStatus,
          calendarResponseUpdatedAt: event?.responseUpdatedAt ?? new Date(),
          calendarLastSyncedAt: new Date(),
          calendarEventEtag: event?.eventEtag ?? null,
        },
      });
      if (changed) {
        await this.audit.enqueue(
          {
            eventKey: `session.calendar_response:${session.id}:${event?.eventEtag ?? responseStatus}`,
            actorUserId: session.entrepreneurUserId,
            action: "session.calendar_response.updated",
            entityType: "session",
            entityId: session.id,
            summary: `Calendar response changed to ${responseStatus}`,
            payload: { responseStatus },
          },
          tx,
        );
      }
    });

    if (
      changed &&
      session.owner &&
      responseStatus !== CalendarAttendeeResponseStatus.needs_action
    ) {
      const label =
        responseStatus === CalendarAttendeeResponseStatus.accepted
          ? "accepted"
          : "marked tentative";
      await this.notifications.createNotification({
        recipientUserId: session.owner.id,
        actorUserId: session.entrepreneurUserId,
        type: NotificationType.session_confirmed,
        title: `Calendar response: ${session.topic}`,
        body: `${this.userName(session.entrepreneur)} ${label} the calendar invitation.`,
        severity: NotificationSeverity.info,
        entityType: NotificationEntityType.session,
        entityId: session.id,
        actionUrl: this.sessionUrl(session.owner.role, session.id),
        dedupeKey: `calendar-response:${session.id}:${event?.eventEtag ?? responseStatus}`,
        channels: [NotificationChannel.in_app],
      });
    }
    return changed;
  }

  private async cancelDeclinedSession(
    session: {
      id: string;
      topic: string;
      calendarEventId: string | null;
      ownerUserId: string | null;
      entrepreneurUserId: string;
      entrepreneur: {
        firstName: string | null;
        lastName: string | null;
      };
      owner: {
        id: string;
        firstName: string | null;
        lastName: string | null;
        role: UserRole;
      } | null;
    },
    reason: string,
    responseStatus: CalendarAttendeeResponseStatus,
    eventEtag: string | null,
    responseUpdatedAt: Date,
  ) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.session.updateMany({
        where: { id: session.id, status: SessionStatus.confirmed },
        data: {
          status: SessionStatus.cancelled,
          cancelledReason: reason,
          calendarResponseStatus: responseStatus,
          calendarResponseUpdatedAt: responseUpdatedAt,
          calendarLastSyncedAt: new Date(),
          calendarEventEtag: eventEtag,
        },
      });
      if (!result.count) return false;
      if (session.calendarEventId && session.ownerUserId) {
        await tx.externalResourceDeletion.createMany({
          data: [
            {
              provider: ExternalResourceProvider.google_calendar_event,
              externalId: session.calendarEventId,
              ownerUserId: session.ownerUserId,
            },
          ],
          skipDuplicates: true,
        });
      }
      await this.audit.enqueue(
        {
          eventKey: `session.calendar_declined:${session.id}:${eventEtag ?? responseUpdatedAt.toISOString()}`,
          actorUserId: session.entrepreneurUserId,
          action: "session.cancelled_by_calendar_response",
          entityType: "session",
          entityId: session.id,
          summary: `Cancelled session after calendar decline: ${session.topic}`,
          payload: { responseStatus, reason },
        },
        tx,
      );
      return true;
    });
    if (!updated) return false;

    const recipients = [
      ...(session.owner
        ? [
            {
              recipientUserId: session.owner.id,
              actionUrl: this.sessionUrl(session.owner.role, session.id),
              body: `${this.userName(session.entrepreneur)} declined the calendar invitation. The session has been cancelled.`,
            },
          ]
        : []),
      {
        recipientUserId: session.entrepreneurUserId,
        actionUrl: this.sessionUrl(UserRole.entrepreneur, session.id),
        body: `Your calendar response cancelled this session. You can book another time when ready.`,
      },
    ];
    await this.notifications.createNotifications(
      recipients.map((recipient) => ({
        ...recipient,
        actorUserId: session.entrepreneurUserId,
        type: NotificationType.session_cancelled,
        title: `Session cancelled: ${session.topic}`,
        severity: NotificationSeverity.warning,
        entityType: NotificationEntityType.session,
        entityId: session.id,
        dedupeKey: `calendar-declined:${session.id}:${recipient.recipientUserId}`,
        channels: [NotificationChannel.in_app, NotificationChannel.email],
      })),
    );
    return true;
  }

  private secureEqual(expected: string, actual: string) {
    const left = Buffer.from(expected);
    const right = Buffer.from(actual);
    return left.length === right.length && timingSafeEqual(left, right);
  }

  private userName(user: {
    firstName: string | null;
    lastName: string | null;
  }) {
    return (
      [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      "The entrepreneur"
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
}
