import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "crypto";
import {
  CalendarAttendeeResponseStatus,
  CalendarConnectionStatus,
  CalendarProvider,
  NotificationChannel,
  NotificationEntityType,
  NotificationSeverity,
  NotificationType,
  Prisma,
  SessionNoteVisibility,
  SessionSource,
  SessionStatus,
  SessionTargetType,
  User,
  UserRole,
} from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { CalendarService } from "../calendar/calendar.service";
import { PrismaService } from "../database/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import {
  activeBidTeamMemberWhere,
  activeTrainerUserWhere,
} from "../trainers/trainer-access";
import { CreateSessionDto } from "./dto/create-session.dto";
import {
  CompleteSessionDto,
  RescheduleSessionDto,
  SendSessionMessageDto,
  SessionReasonDto,
  AddSessionNoteDto,
} from "./dto/session-action.dto";
import { SessionQueryDto } from "./dto/session-query.dto";
import { SessionAvailabilityService } from "./session-availability.service";

const DEFAULT_TAKE = 20;

type SessionEmailActor = Pick<User, "email" | "firstName" | "lastName">;
type SessionEmailSchedule = Pick<
  SessionWithInclude,
  "startAt" | "endAt" | "timezone"
>;

const sessionInclude = {
  entrepreneur: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      timezone: true,
      businessMemberships: {
        where: { isPrimary: true },
        take: 1,
        select: {
          business: { select: { id: true, name: true, country: true } },
        },
      },
    },
  },
  programme: { select: { id: true, name: true, accessType: true } },
  owner: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      timezone: true,
    },
  },
  target: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      timezone: true,
    },
  },
  createdBy: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      timezone: true,
    },
  },
  typeDefinition: {
    select: {
      key: true,
      name: true,
      durationMinutes: true,
      active: true,
    },
  },
  reschedules: {
    orderBy: { createdAt: "desc" as const },
    take: 20,
    include: {
      requestedBy: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      },
    },
  },
  notesHistory: {
    orderBy: { createdAt: "desc" as const },
    take: 20,
    include: {
      author: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      },
    },
  },
} satisfies Prisma.SessionInclude;

type SessionWithInclude = Prisma.SessionGetPayload<{
  include: typeof sessionInclude;
}>;

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly calendar: CalendarService,
    private readonly availability: SessionAvailabilityService,
    private readonly audit: AuditService,
  ) {}

  async listSessions(user: User, query: SessionQueryDto) {
    const take = query.take ?? DEFAULT_TAKE;
    const where = this.buildWhere(user, query);
    const rows = await this.prisma.session.findMany({
      where,
      orderBy: [{ startAt: "asc" }, { id: "desc" }],
      take: take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: sessionInclude,
    });

    const visibleRows = rows.slice(0, take);
    const declinedIds =
      user.role === UserRole.entrepreneur
        ? new Set<string>()
        : new Set(
            (
              await this.prisma.sessionRequestDecline.findMany({
                where: {
                  userId: user.id,
                  sessionId: { in: visibleRows.map((session) => session.id) },
                },
                select: { sessionId: true },
              })
            ).map((entry) => entry.sessionId),
          );
    const nextCursor = rows.length > take ? (rows[take]?.id ?? null) : null;
    const totalItems = await this.prisma.session.count({ where });
    return {
      items: visibleRows.map((session) =>
        this.mapSession(session, user.role, declinedIds.has(session.id)),
      ),
      nextCursor,
      totalItems,
    };
  }

  async summary(user: User) {
    const where = this.buildWhere(user, {});
    const [total, grouped] = await Promise.all([
      this.prisma.session.count({ where }),
      this.prisma.session.groupBy({
        by: ["status"],
        where,
        _count: { _all: true },
      }),
    ]);
    return {
      total,
      byStatus: Object.fromEntries(
        grouped.map((item) => [item.status, item._count._all]),
      ),
    };
  }

  async getSession(user: User, id: string) {
    const session = await this.prisma.session.findFirst({
      where: { id, ...this.scopeWhere(user) },
      include: sessionInclude,
    });
    if (!session) throw new NotFoundException("Session was not found.");
    return this.mapSession(session, user.role);
  }

  async createSession(user: User, dto: CreateSessionDto) {
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    this.assertValidTimeRange(startAt, endAt);
    const sessionType = await this.ensureActiveSessionType(dto.type);
    if (
      endAt.getTime() - startAt.getTime() !==
      sessionType.durationMinutes * 60_000
    ) {
      throw new BadRequestException(
        `This session type must be ${sessionType.durationMinutes} minutes.`,
      );
    }
    const timezone = await this.availability.resolveTimezone(user.timezone);
    await this.availability.assertBookableTime(startAt, endAt, timezone);

    const entrepreneurUserId =
      user.role === UserRole.entrepreneur ? user.id : dto.entrepreneurUserId;
    if (!entrepreneurUserId) {
      throw new BadRequestException(
        "Choose the entrepreneur for this session.",
      );
    }
    const entrepreneur = await this.ensureEntrepreneur(entrepreneurUserId);
    if (dto.programmeId) {
      await this.ensureProgrammeReadable(
        user,
        dto.programmeId,
        entrepreneurUserId,
      );
    }

    const isEntrepreneurRequest = user.role === UserRole.entrepreneur;
    const targetUserId = isEntrepreneurRequest
      ? (dto.targetUserId ?? null)
      : null;
    const targetType = targetUserId
      ? SessionTargetType.specific_user
      : SessionTargetType.open_team;
    if (
      isEntrepreneurRequest &&
      dto.targetType === SessionTargetType.specific_user &&
      !targetUserId
    ) {
      throw new BadRequestException("Choose the specific BID team member.");
    }
    if (targetUserId) {
      await this.ensureTrainerTarget(targetUserId);
      await this.availability.assertUserAvailable(targetUserId, startAt, endAt);
    } else if (isEntrepreneurRequest) {
      await this.availability.assertAnyTeamMemberAvailable(startAt, endAt);
    }

    const ownerUserId = isEntrepreneurRequest
      ? null
      : (dto.ownerUserId ?? user.id);
    if (ownerUserId) {
      await this.ensureOwner(ownerUserId);
      await this.availability.assertUserAvailable(ownerUserId, startAt, endAt);
    }

    const source = isEntrepreneurRequest
      ? SessionSource.entrepreneur_request
      : SessionSource.team_created;
    const status = ownerUserId
      ? SessionStatus.confirmed
      : SessionStatus.requested;
    const id = randomUUID();
    let calendarEvent: Awaited<
      ReturnType<CalendarService["createSessionEvent"]>
    > | null = null;

    if (ownerUserId) {
      calendarEvent = await this.calendar.createSessionEvent({
        ownerUserId,
        entrepreneurEmail: entrepreneur.email,
        topic: dto.topic.trim(),
        notes: dto.notes?.trim() || null,
        startAt,
        endAt,
        timezone,
        requestId: id,
      });
    }

    let created: SessionWithInclude;
    try {
      created = await this.audit.capture(
        {
          action: "session.created",
          entityType: "session",
          entityId: (result) => result.id,
          summary: "Created session " + dto.topic.trim(),
          payload: { source, status, targetType },
        },
        (tx) =>
          tx.session.create({
            data: {
              id,
              entrepreneurUserId,
              programmeId: dto.programmeId || null,
              ownerUserId,
              targetType,
              targetUserId,
              createdById: user.id,
              type: dto.type,
              durationMinutes: sessionType.durationMinutes,
              topic: dto.topic.trim(),
              notes: dto.notes?.trim() || null,
              source,
              status,
              startAt,
              endAt,
              timezone,
              meetingProvider: dto.meetingProvider ?? "google_meet",
              meetingUrl: calendarEvent?.meetingUrl ?? null,
              calendarEventId: calendarEvent?.eventId ?? null,
              calendarEventEtag: calendarEvent?.eventEtag ?? null,
              calendarResponseStatus: calendarEvent?.responseStatus ?? null,
              calendarResponseUpdatedAt:
                calendarEvent?.responseUpdatedAt ?? null,
              calendarLastSyncedAt: calendarEvent ? new Date() : null,
            },
            include: sessionInclude,
          }),
      );
    } catch (error) {
      if (calendarEvent && ownerUserId) {
        await this.calendar
          .deleteSessionEvent(ownerUserId, calendarEvent.eventId)
          .catch(() => undefined);
      }
      throw error;
    }

    if (created.status === SessionStatus.requested) {
      await this.notifyTeamOfSessionRequest(user, created);
    } else {
      await this.notifyEntrepreneur(
        user,
        created,
        NotificationType.session_confirmed,
        "Session booked: " + created.topic,
        (timezone) =>
          this.sessionConfirmedBody(created.owner ?? user, created, timezone),
        NotificationSeverity.success,
      );
      await this.notifyTeamParticipant(
        user,
        created,
        NotificationType.session_confirmed,
        "Session booked: " + created.topic,
        (timezone) => this.sessionBookedForTeamBody(created, timezone),
        NotificationSeverity.success,
      );
    }

    return this.mapSession(created, user.role);
  }

  async acceptSession(user: User, id: string) {
    this.assertTeamMember(user);
    const session = await this.getOwnedOrOpenSession(user, id);
    if (session.status !== SessionStatus.requested) {
      throw new BadRequestException("Only requested sessions can be accepted.");
    }
    if (
      session.targetType === SessionTargetType.specific_user &&
      session.targetUserId !== user.id
    ) {
      throw new ForbiddenException(
        "This request is assigned to another BID team member.",
      );
    }

    await this.availability.assertUserAvailable(
      user.id,
      session.startAt,
      session.endAt,
      session.id,
    );
    const calendarEvent = await this.calendar.createSessionEvent({
      ownerUserId: user.id,
      entrepreneurEmail: session.entrepreneur.email,
      topic: session.topic,
      notes: session.notes,
      startAt: session.startAt,
      endAt: session.endAt,
      timezone: session.timezone,
      requestId: session.id,
    });

    let updated: SessionWithInclude;
    try {
      updated = await this.audit.capture(
        {
          action: "session.accepted",
          entityType: "session",
          entityId: (result) => result.id,
          summary: "Accepted session " + session.topic,
          payload: { ownerUserId: user.id },
        },
        (tx) =>
          tx.session.update({
            where: {
              id,
              status: SessionStatus.requested,
              ownerUserId: null,
            },
            data: {
              ownerUserId: user.id,
              status: SessionStatus.confirmed,
              meetingProvider: "google_meet",
              meetingUrl: calendarEvent.meetingUrl,
              calendarEventId: calendarEvent.eventId,
              calendarEventEtag: calendarEvent.eventEtag,
              calendarResponseStatus: calendarEvent.responseStatus,
              calendarResponseUpdatedAt: calendarEvent.responseUpdatedAt,
              calendarLastSyncedAt: new Date(),
            },
            include: sessionInclude,
          }),
      );
    } catch {
      await this.calendar
        .deleteSessionEvent(user.id, calendarEvent.eventId)
        .catch(() => undefined);
      throw new ConflictException(
        "This session request was already handled. Refresh the list.",
      );
    }

    await this.notifyEntrepreneur(
      user,
      updated,
      NotificationType.session_confirmed,
      "Session confirmed: " + updated.topic,
      (timezone) => this.sessionConfirmedBody(user, updated, timezone),
      NotificationSeverity.success,
    );

    return this.mapSession(updated, user.role);
  }

  async declineSession(user: User, id: string, dto: SessionReasonDto) {
    this.assertTeamMember(user);
    const session = await this.getOwnedOrOpenSession(user, id);
    if (session.status !== SessionStatus.requested) {
      throw new BadRequestException("Only requested sessions can be declined.");
    }

    if (session.targetType === SessionTargetType.open_team) {
      await this.audit.capture(
        {
          action: "session.request.opted_out",
          entityType: "session",
          entityId: () => session.id,
          summary: "Opted out of open session request " + session.topic,
          payload: { userId: user.id },
        },
        (tx) =>
          tx.sessionRequestDecline.upsert({
            where: {
              sessionId_userId: { sessionId: id, userId: user.id },
            },
            create: {
              sessionId: id,
              userId: user.id,
              reason: dto.reason.trim(),
            },
            update: { reason: dto.reason.trim() },
          }),
      );
      return {
        ...this.mapSession(session, user.role),
        declinedByCurrentUser: true,
      };
    }

    if (session.targetUserId !== user.id) {
      throw new ForbiddenException(
        "This request is assigned to another BID team member.",
      );
    }
    const updated = await this.audit.capture(
      {
        action: "session.declined",
        entityType: "session",
        entityId: (result) => result.id,
        summary: "Declined session " + session.topic,
        payload: { reason: dto.reason.trim() },
      },
      (tx) =>
        tx.session.update({
          where: { id, status: SessionStatus.requested },
          data: {
            status: SessionStatus.declined,
            declinedReason: dto.reason.trim(),
          },
          include: sessionInclude,
        }),
    );

    await this.notifyEntrepreneur(
      user,
      updated,
      NotificationType.session_declined,
      "Session request declined: " + updated.topic,
      (timezone) => this.sessionDeclinedBody(user, updated, timezone),
      NotificationSeverity.warning,
    );
    return this.mapSession(updated, user.role);
  }

  async cancelSession(user: User, id: string, dto: SessionReasonDto) {
    const session = await this.getSessionEntity(user, id);
    if (
      session.status !== SessionStatus.requested &&
      session.status !== SessionStatus.confirmed
    ) {
      throw new BadRequestException("This session cannot be cancelled.");
    }
    if (user.role === UserRole.trainer && session.ownerUserId !== user.id) {
      throw new ForbiddenException("You can only cancel sessions you own.");
    }

    if (session.calendarEventId && session.ownerUserId) {
      await this.calendar.deleteSessionEvent(
        session.ownerUserId,
        session.calendarEventId,
      );
    }
    const updated = await this.audit.capture(
      {
        action: "session.cancelled",
        entityType: "session",
        entityId: (result) => result.id,
        summary: "Cancelled session " + session.topic,
        payload: { reason: dto.reason.trim() },
      },
      (tx) =>
        tx.session.update({
          where: { id },
          data: {
            status: SessionStatus.cancelled,
            cancelledReason: dto.reason.trim(),
          },
          include: sessionInclude,
        }),
    );
    await this.notifyEntrepreneur(
      user,
      updated,
      NotificationType.session_cancelled,
      "Session cancelled: " + updated.topic,
      (timezone) => this.sessionCancelledBody(user, updated, timezone),
      NotificationSeverity.warning,
    );
    await this.notifyTeamParticipant(
      user,
      updated,
      NotificationType.session_cancelled,
      "Session cancelled: " + updated.topic,
      (timezone) => this.sessionCancelledBody(user, updated, timezone),
      NotificationSeverity.warning,
    );
    return this.mapSession(updated, user.role);
  }

  async rescheduleSession(user: User, id: string, dto: RescheduleSessionDto) {
    const session = await this.getSessionEntity(user, id);
    if (session.status !== SessionStatus.confirmed) {
      throw new BadRequestException(
        "Only confirmed sessions can be rescheduled.",
      );
    }
    if (user.role === UserRole.entrepreneur) {
      throw new ForbiddenException("Ask BID to reschedule this session.");
    }
    if (user.role === UserRole.trainer && session.ownerUserId !== user.id) {
      throw new ForbiddenException("You can only reschedule sessions you own.");
    }
    if (!session.ownerUserId) {
      throw new BadRequestException(
        "This confirmed session is missing its Calendar owner.",
      );
    }

    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    this.assertValidTimeRange(startAt, endAt);
    if (
      endAt.getTime() - startAt.getTime() !==
      session.typeDefinition.durationMinutes * 60_000
    ) {
      throw new BadRequestException(
        `This session type must be ${session.typeDefinition.durationMinutes} minutes.`,
      );
    }
    const timezone = await this.availability.resolveTimezone(user.timezone);
    await this.availability.assertBookableTime(startAt, endAt, timezone);
    await this.availability.assertUserAvailable(
      session.ownerUserId,
      startAt,
      endAt,
      session.id,
    );

    const replacementEvent = session.calendarEventId
      ? null
      : await this.calendar.createSessionEvent({
          ownerUserId: session.ownerUserId,
          entrepreneurEmail: session.entrepreneur.email,
          topic: session.topic,
          notes: session.notes,
          startAt,
          endAt,
          timezone,
          requestId: session.id + "-legacy-reschedule",
        });
    if (session.calendarEventId) {
      await this.calendar.updateSessionEvent({
        ownerUserId: session.ownerUserId,
        eventId: session.calendarEventId,
        topic: session.topic,
        notes: session.notes,
        startAt,
        endAt,
        timezone,
      });
    }

    let updated: SessionWithInclude;
    try {
      updated = await this.audit.capture(
        {
          action: "session.rescheduled",
          entityType: "session",
          entityId: (result) => result.id,
          summary: "Rescheduled session " + session.topic,
          payload: {
            previousStartAt: session.startAt.toISOString(),
            previousEndAt: session.endAt.toISOString(),
            startAt: startAt.toISOString(),
            endAt: endAt.toISOString(),
            reason: dto.reason?.trim() || null,
          },
        },
        async (tx) => {
          await tx.sessionReschedule.create({
            data: {
              sessionId: id,
              requestedById: user.id,
              previousStartAt: session.startAt,
              previousEndAt: session.endAt,
              newStartAt: startAt,
              newEndAt: endAt,
              reason: dto.reason?.trim() || null,
            },
          });
          return tx.session.update({
            where: {
              id,
              status: SessionStatus.confirmed,
              updatedAt: session.updatedAt,
            },
            data: {
              startAt,
              endAt,
              timezone,
              durationMinutes: session.typeDefinition.durationMinutes,
              ...(replacementEvent
                ? {
                    calendarEventId: replacementEvent.eventId,
                    meetingUrl: replacementEvent.meetingUrl,
                    calendarEventEtag: replacementEvent.eventEtag,
                  }
                : {}),
              calendarResponseStatus:
                CalendarAttendeeResponseStatus.needs_action,
              calendarResponseUpdatedAt: new Date(),
              calendarLastSyncedAt: null,
            },
            include: sessionInclude,
          });
        },
      );
    } catch (error) {
      if (replacementEvent) {
        await this.calendar
          .deleteSessionEvent(session.ownerUserId, replacementEvent.eventId)
          .catch(() => undefined);
      } else if (session.calendarEventId) {
        await this.calendar
          .updateSessionEvent({
            ownerUserId: session.ownerUserId,
            eventId: session.calendarEventId,
            topic: session.topic,
            notes: session.notes,
            startAt: session.startAt,
            endAt: session.endAt,
            timezone: session.timezone,
          })
          .catch(() => undefined);
      }
      throw new ConflictException(
        "The session changed while it was being rescheduled. Refresh and try again.",
      );
    }

    await this.notifyEntrepreneur(
      user,
      updated,
      NotificationType.session_rescheduled,
      "Session rescheduled: " + updated.topic,
      (timezone) =>
        this.sessionRescheduledBody(
          user,
          session,
          updated,
          timezone,
          dto.reason,
        ),
      NotificationSeverity.info,
    );
    await this.notifyTeamParticipant(
      user,
      updated,
      NotificationType.session_rescheduled,
      "Session rescheduled: " + updated.topic,
      (timezone) =>
        this.sessionRescheduledBody(
          user,
          session,
          updated,
          timezone,
          dto.reason,
        ),
      NotificationSeverity.info,
    );
    return this.mapSession(updated, user.role);
  }

  async completeSession(user: User, id: string, dto: CompleteSessionDto) {
    this.assertTeamMember(user);
    const session = await this.getSessionEntity(user, id);
    if (session.status !== SessionStatus.confirmed) {
      throw new BadRequestException(
        "Only confirmed sessions can be marked completed.",
      );
    }
    if (session.endAt > new Date()) {
      throw new BadRequestException(
        "A session can only be completed after its scheduled end time.",
      );
    }
    if (user.role === UserRole.trainer && session.ownerUserId !== user.id) {
      throw new ForbiddenException("You can only complete sessions you own.");
    }

    const updated = await this.audit.capture(
      {
        action: "session.completed",
        entityType: "session",
        entityId: (result) => result.id,
        summary: "Completed session " + session.topic,
      },
      async (tx) => {
        if (dto.note?.trim()) {
          await tx.sessionNote.create({
            data: {
              sessionId: id,
              authorId: user.id,
              note: dto.note.trim(),
              visibility: SessionNoteVisibility.internal,
            },
          });
        }
        return tx.session.update({
          where: { id, status: SessionStatus.confirmed },
          data: {
            status: SessionStatus.completed,
            completedAt: new Date(),
          },
          include: sessionInclude,
        });
      },
    );

    await this.notifyEntrepreneur(
      user,
      updated,
      NotificationType.session_completed,
      "Session completed: " + updated.topic,
      (timezone) => this.sessionCompletedBody(user, updated, timezone),
      NotificationSeverity.success,
    );
    return this.mapSession(updated, user.role);
  }

  async addNote(user: User, id: string, dto: AddSessionNoteDto) {
    const session = await this.getSessionEntity(user, id);
    if (
      session.status !== SessionStatus.confirmed &&
      session.status !== SessionStatus.completed
    ) {
      throw new BadRequestException(
        "Session notes can only be added after a session is accepted.",
      );
    }
    if (user.role === UserRole.trainer && session.ownerUserId !== user.id) {
      throw new ForbiddenException(
        "You can only add notes to sessions you own.",
      );
    }
    if (
      user.role === UserRole.entrepreneur &&
      dto.visibility !== SessionNoteVisibility.participant
    ) {
      throw new ForbiddenException(
        "Entrepreneurs can only add participant-visible notes.",
      );
    }

    await this.audit.capture(
      {
        action: "session.note.added",
        entityType: "session",
        entityId: () => id,
        summary: "Added a session note",
        payload: {
          visibility:
            dto.visibility ??
            (user.role === UserRole.entrepreneur
              ? SessionNoteVisibility.participant
              : SessionNoteVisibility.internal),
        },
      },
      (tx) =>
        tx.sessionNote.create({
          data: {
            sessionId: id,
            authorId: user.id,
            note: dto.note.trim(),
            visibility:
              dto.visibility ??
              (user.role === UserRole.entrepreneur
                ? SessionNoteVisibility.participant
                : SessionNoteVisibility.internal),
          },
        }),
    );
    return this.getSession(user, id);
  }

  async sendMessage(user: User, id: string, dto: SendSessionMessageDto) {
    if (user.role !== UserRole.admin && user.role !== UserRole.trainer) {
      throw new ForbiddenException(
        "Only BID team members can send session messages.",
      );
    }
    const session = await this.getSessionEntity(user, id);
    const severity =
      dto.priority === "urgent"
        ? NotificationSeverity.critical
        : dto.priority === "needs-response"
          ? NotificationSeverity.warning
          : NotificationSeverity.info;

    return this.notifications.createNotification({
      recipientUserId: session.entrepreneurUserId,
      actorUserId: user.id,
      type: NotificationType.session_reminder,
      title: dto.subject,
      body: dto.message,
      severity,
      entityType: NotificationEntityType.session,
      entityId: session.id,
      actionUrl: `/entrepreneur/schedule?sessionId=${session.id}`,
      channels: [
        dto.channel === "in_app"
          ? NotificationChannel.in_app
          : NotificationChannel.email,
      ],
    });
  }

  private buildWhere(
    user: User,
    query: SessionQueryDto,
  ): Prisma.SessionWhereInput {
    const filters: Prisma.SessionWhereInput[] = [this.scopeWhere(user)];
    if (query.search?.trim()) {
      const search = query.search.trim();
      filters.push({
        OR: [
          { topic: { contains: search, mode: "insensitive" } },
          { notes: { contains: search, mode: "insensitive" } },
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
          { owner: { email: { contains: search, mode: "insensitive" } } },
          { owner: { firstName: { contains: search, mode: "insensitive" } } },
          { owner: { lastName: { contains: search, mode: "insensitive" } } },
          { programme: { name: { contains: search, mode: "insensitive" } } },
        ],
      });
    }
    if (query.status) filters.push({ status: query.status });
    if (query.type) filters.push({ type: query.type });
    if (query.source) filters.push({ source: query.source });
    if (query.ownerId) filters.push({ ownerUserId: query.ownerId });
    if (query.programmeId) filters.push({ programmeId: query.programmeId });
    if (query.dateFrom || query.dateTo) {
      filters.push({
        startAt: {
          ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
          ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
        },
      });
    }
    return { AND: filters };
  }

  private scopeWhere(user: User): Prisma.SessionWhereInput {
    if (user.role === UserRole.admin) return {};
    if (user.role === UserRole.entrepreneur) {
      return { entrepreneurUserId: user.id };
    }
    if (user.role === UserRole.trainer) {
      return {
        OR: [
          { ownerUserId: user.id },
          {
            status: SessionStatus.requested,
            OR: [
              {
                targetType: SessionTargetType.specific_user,
                targetUserId: user.id,
              },
              {
                targetType: SessionTargetType.open_team,
                requestDeclines: { none: { userId: user.id } },
              },
            ],
          },
        ],
      };
    }
    return { id: "__none__" };
  }

  private async getSessionEntity(user: User, id: string) {
    const session = await this.prisma.session.findFirst({
      where: { id, ...this.scopeWhere(user) },
      include: {
        entrepreneur: { select: { email: true } },
        typeDefinition: {
          select: { durationMinutes: true },
        },
      },
    });
    if (!session) throw new NotFoundException("Session was not found.");
    return session;
  }

  private async getOwnedOrOpenSession(user: User, id: string) {
    const session = await this.prisma.session.findFirst({
      where: {
        id,
        OR: [
          { ownerUserId: user.id },
          {
            status: SessionStatus.requested,
            OR: [
              {
                targetType: SessionTargetType.specific_user,
                targetUserId: user.id,
              },
              {
                targetType: SessionTargetType.open_team,
                requestDeclines: { none: { userId: user.id } },
              },
            ],
          },
        ],
      },
      include: sessionInclude,
    });
    if (!session) {
      throw new NotFoundException(
        "Session was not found in your session scope.",
      );
    }
    return session;
  }

  private async ensureEntrepreneur(userId: string) {
    const entrepreneur = await this.prisma.user.findFirst({
      where: {
        id: userId,
        role: UserRole.entrepreneur,
        status: "active",
      },
      select: { id: true, email: true },
    });
    if (!entrepreneur) {
      throw new BadRequestException("Choose a valid entrepreneur.");
    }
    return entrepreneur;
  }

  private async ensureTrainerTarget(userId: string) {
    const trainer = await this.prisma.user.findFirst({
      where: {
        id: userId,
        AND: [activeTrainerUserWhere()],
      },
      select: { id: true },
    });
    if (!trainer) {
      throw new BadRequestException("Choose a valid active trainer.");
    }
  }

  private async ensureOwner(userId: string) {
    const owner = await this.prisma.user.findFirst({
      where: { id: userId, AND: [activeBidTeamMemberWhere()] },
      select: { id: true },
    });
    if (!owner)
      throw new BadRequestException("Choose a valid BID team member.");
  }

  private async ensureActiveSessionType(key: string) {
    const sessionType = await this.prisma.sessionTypeDefinition.findFirst({
      where: { key, active: true },
      select: { key: true, durationMinutes: true },
    });
    if (!sessionType) {
      throw new BadRequestException("Choose a valid active session type.");
    }
    return sessionType;
  }

  private async ensureProgrammeReadable(
    user: User,
    programmeId: string,
    entrepreneurUserId: string,
  ) {
    if (user.role === UserRole.admin || user.role === UserRole.trainer) {
      const programme = await this.prisma.programme.findUnique({
        where: { id: programmeId },
        select: { id: true },
      });
      if (!programme)
        throw new BadRequestException("Choose a valid programme.");
      return;
    }

    const count = await this.prisma.programme.count({
      where: {
        id: programmeId,
        OR: [
          { accessType: "free" },
          { accessGrants: { some: { entrepreneurUserId, revokedAt: null } } },
        ],
      },
    });
    if (count === 0)
      throw new BadRequestException("Choose a programme you can access.");
  }

  private assertTeamMember(user: User) {
    if (user.role !== UserRole.admin && user.role !== UserRole.trainer) {
      throw new ForbiddenException("Only BID team members can do this.");
    }
  }

  private assertValidTimeRange(startAt: Date, endAt: Date) {
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      throw new BadRequestException("Choose a valid session date and time.");
    }
    if (endAt.getTime() <= startAt.getTime()) {
      throw new BadRequestException(
        "Session end time must be after the start time.",
      );
    }
  }

  private generateMeetingUrl(topic: string, startAt: Date) {
    const slug =
      `${topic}-${startAt.toISOString()}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 32) || "bid-session";
    return `https://meet.google.com/${slug}`;
  }

  private async notifyTeamOfSessionRequest(
    actor: User,
    session: SessionWithInclude,
  ) {
    const recipients = await this.prisma.user.findMany({
      where: {
        AND: [activeBidTeamMemberWhere()],
      },
      select: { id: true, role: true, timezone: true },
    });
    const fallbackTimezone = await this.availability.resolveTimezone();

    await this.notifications.createNotifications(
      recipients.map((recipient) => ({
        recipientUserId: recipient.id,
        actorUserId: actor.id,
        type: NotificationType.session_request,
        title: "Session request: " + session.topic,
        body: this.sessionRequestBody(
          session,
          recipient.timezone ?? fallbackTimezone,
        ),
        severity: NotificationSeverity.info,
        entityType: NotificationEntityType.session,
        entityId: session.id,
        actionUrl:
          recipient.role === UserRole.admin
            ? `/admin/sessions?sessionId=${session.id}`
            : `/trainer/sessions?sessionId=${session.id}`,
        channels: [NotificationChannel.in_app, NotificationChannel.email],
      })),
    );
  }

  private async notifyEntrepreneur(
    actor: User,
    session: SessionWithInclude,
    type: NotificationType,
    title: string,
    bodyForTimezone: (timezone: string) => string,
    severity: NotificationSeverity,
  ) {
    if (actor.id === session.entrepreneurUserId) return;
    const timezone = await this.availability.resolveTimezone(
      session.entrepreneur.timezone,
    );

    await this.notifications.createNotification({
      recipientUserId: session.entrepreneurUserId,
      actorUserId: actor.id,
      type,
      title,
      body: bodyForTimezone(timezone),
      severity,
      entityType: NotificationEntityType.session,
      entityId: session.id,
      actionUrl: `/entrepreneur/schedule?sessionId=${session.id}`,
      channels: [NotificationChannel.in_app, NotificationChannel.email],
    });
  }

  private async notifyTeamParticipant(
    actor: User,
    session: SessionWithInclude,
    type: NotificationType,
    title: string,
    bodyForTimezone: (timezone: string) => string,
    severity: NotificationSeverity,
  ) {
    const includedRecipient = session.owner ?? session.target;
    const recipients = includedRecipient
      ? [
          {
            id: includedRecipient.id,
            role: includedRecipient.role,
            timezone: includedRecipient.timezone,
          },
        ]
      : await this.prisma.user.findMany({
          where: {
            AND: [activeBidTeamMemberWhere()],
          },
          select: { id: true, role: true, timezone: true },
        });
    const fallbackTimezone = await this.availability.resolveTimezone();

    await this.notifications.createNotifications(
      recipients
        .filter((recipient) => recipient.id !== actor.id)
        .map((recipient) => ({
          recipientUserId: recipient.id,
          actorUserId: actor.id,
          type,
          title,
          body: bodyForTimezone(recipient.timezone ?? fallbackTimezone),
          severity,
          entityType: NotificationEntityType.session,
          entityId: session.id,
          actionUrl:
            recipient.role === UserRole.admin
              ? `/admin/sessions?sessionId=${session.id}`
              : `/trainer/sessions?sessionId=${session.id}`,
          channels: [NotificationChannel.in_app, NotificationChannel.email],
        })),
    );
  }

  private sessionEntrepreneurName(session: SessionWithInclude) {
    const business = session.entrepreneur.businessMemberships[0]?.business;
    return business?.name ?? this.userName(session.entrepreneur);
  }

  private sessionRequestBody(session: SessionWithInclude, timezone: string) {
    return (
      this.sessionEntrepreneurName(session) +
      " requested " +
      this.sessionTypeWithArticle(session) +
      " for “" +
      session.topic +
      "” on " +
      this.sessionSchedule(session, timezone) +
      (session.programme ? ". Programme: " + session.programme.name : "") +
      ". Review the request details before responding."
    );
  }

  private sessionBookedForTeamBody(
    session: SessionWithInclude,
    timezone: string,
  ) {
    return (
      this.sessionEntrepreneurName(session) +
      " booked " +
      this.sessionTypeWithArticle(session) +
      " for “" +
      session.topic +
      "”. It is scheduled for " +
      this.sessionSchedule(session, timezone) +
      ". Open the session to review the participant and joining details."
    );
  }

  private sessionConfirmedBody(
    actor: SessionEmailActor,
    session: SessionWithInclude,
    timezone: string,
  ) {
    return (
      this.userName(actor) +
      " confirmed your " +
      this.sessionTypeLabel(session) +
      " for “" +
      session.topic +
      "”. It is scheduled for " +
      this.sessionSchedule(session, timezone) +
      ". Open the session for meeting and calendar details."
    );
  }

  private sessionDeclinedBody(
    actor: SessionEmailActor,
    session: SessionWithInclude,
    timezone: string,
  ) {
    return (
      this.userName(actor) +
      " declined your request for “" +
      session.topic +
      "”, requested for " +
      this.sessionSchedule(session, timezone) +
      ". Reason: " +
      (session.declinedReason ?? "No reason was provided") +
      ". You can review the request and book another suitable time."
    );
  }

  private sessionCancelledBody(
    actor: SessionEmailActor,
    session: SessionWithInclude,
    timezone: string,
  ) {
    return (
      this.userName(actor) +
      " cancelled “" +
      session.topic +
      "”, scheduled for " +
      this.sessionSchedule(session, timezone) +
      ". Reason: " +
      (session.cancelledReason ?? "No reason was provided") +
      "."
    );
  }

  private sessionRescheduledBody(
    actor: SessionEmailActor,
    previous: SessionEmailSchedule,
    updated: SessionWithInclude,
    timezone: string,
    reason?: string,
  ) {
    return (
      this.userName(actor) +
      " moved “" +
      updated.topic +
      "” from " +
      this.sessionSchedule(previous, timezone) +
      " to " +
      this.sessionSchedule(updated, timezone) +
      (reason?.trim() ? ". Reason: " + reason.trim() : "") +
      ". Your connected calendar invitation has been updated."
    );
  }

  private sessionCompletedBody(
    actor: SessionEmailActor,
    session: SessionWithInclude,
    timezone: string,
  ) {
    return (
      "Your session “" +
      session.topic +
      "” with " +
      this.userName(session.owner ?? actor) +
      ", scheduled for " +
      this.sessionSchedule(session, timezone) +
      ", has been marked complete."
    );
  }

  private sessionSchedule(session: SessionEmailSchedule, timezone: string) {
    const start = new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: timezone,
    }).format(session.startAt);
    const end = new Intl.DateTimeFormat("en-GB", {
      timeStyle: "short",
      timeZone: timezone,
    }).format(session.endAt);
    return start + "–" + end + " (" + timezone + ")";
  }

  private sessionTypeLabel(session: SessionWithInclude) {
    return session.typeDefinition.name;
  }

  private sessionTypeWithArticle(session: SessionWithInclude) {
    return "the " + this.sessionTypeLabel(session);
  }

  private mapSession(
    session: SessionWithInclude,
    viewerRole: UserRole,
    declinedByCurrentUser = false,
  ) {
    const business =
      session.entrepreneur.businessMemberships[0]?.business ?? null;
    return {
      id: session.id,
      entrepreneurUserId: session.entrepreneurUserId,
      entrepreneur: {
        id: session.entrepreneur.id,
        name: this.userName(session.entrepreneur),
        email: session.entrepreneur.email,
        businessId: business?.id ?? null,
        businessName: business?.name ?? this.userName(session.entrepreneur),
        country: business?.country ?? null,
      },
      programme: session.programme,
      ownerUserId: session.ownerUserId,
      owner: session.owner ? this.mapUser(session.owner) : null,
      targetType: session.targetType,
      targetUserId: session.targetUserId,
      target: session.target ? this.mapUser(session.target) : null,
      createdBy: this.mapUser(session.createdBy),
      type: session.type,
      typeName: session.typeDefinition.name,
      durationMinutes: session.durationMinutes,
      topic: session.topic,
      notes: session.notes,
      source: session.source,
      status: session.status,
      startAt: session.startAt.toISOString(),
      endAt: session.endAt.toISOString(),
      timezone: session.timezone,
      meetingProvider: session.meetingProvider,
      meetingUrl:
        session.status === SessionStatus.confirmed ||
        session.status === SessionStatus.completed
          ? session.meetingUrl
          : null,
      calendarResponseStatus: session.calendarResponseStatus,
      calendarResponseUpdatedAt:
        session.calendarResponseUpdatedAt?.toISOString() ?? null,
      calendarLastSyncedAt: session.calendarLastSyncedAt?.toISOString() ?? null,
      declinedReason: session.declinedReason,
      cancelledReason: session.cancelledReason,
      completedAt: session.completedAt?.toISOString() ?? null,
      declinedByCurrentUser,
      reschedules: session.reschedules.map((entry) => ({
        id: entry.id,
        previousStartAt: entry.previousStartAt.toISOString(),
        previousEndAt: entry.previousEndAt.toISOString(),
        newStartAt: entry.newStartAt.toISOString(),
        newEndAt: entry.newEndAt.toISOString(),
        reason: entry.reason,
        requestedBy: this.mapUser(entry.requestedBy),
        createdAt: entry.createdAt.toISOString(),
      })),
      notesHistory: session.notesHistory
        .filter(
          (note) =>
            viewerRole !== UserRole.entrepreneur ||
            note.visibility === SessionNoteVisibility.participant,
        )
        .map((note) => ({
          id: note.id,
          note: note.note,
          visibility: note.visibility,
          author: this.mapUser(note.author),
          createdAt: note.createdAt.toISOString(),
        })),
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    };
  }

  private mapUser(user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    role?: UserRole;
  }) {
    return {
      id: user.id,
      name: this.userName(user),
      email: user.email,
      role: user.role,
    };
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
}
