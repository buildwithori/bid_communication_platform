import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  NotificationChannel,
  NotificationEntityType,
  NotificationSeverity,
  NotificationType,
  Prisma,
  SessionNoteVisibility,
  SessionSource,
  SessionStatus,
  User,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { CompleteSessionDto, RescheduleSessionDto, SessionReasonDto, AddSessionNoteDto } from './dto/session-action.dto';
import { SessionQueryDto } from './dto/session-query.dto';

const DEFAULT_TAKE = 20;

const sessionInclude = {
  entrepreneur: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      businessMemberships: {
        where: { isPrimary: true },
        take: 1,
        select: { business: { select: { id: true, name: true, country: true } } },
      },
    },
  },
  programme: { select: { id: true, name: true, accessType: true } },
  owner: { select: { id: true, email: true, firstName: true, lastName: true, role: true } },
  createdBy: { select: { id: true, email: true, firstName: true, lastName: true, role: true } },
  notesHistory: {
    orderBy: { createdAt: 'desc' as const },
    take: 20,
    include: { author: { select: { id: true, email: true, firstName: true, lastName: true, role: true } } },
  },
} satisfies Prisma.SessionInclude;

type SessionWithInclude = Prisma.SessionGetPayload<{ include: typeof sessionInclude }>;

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async listSessions(user: User, query: SessionQueryDto) {
    const take = query.take ?? DEFAULT_TAKE;
    const rows = await this.prisma.session.findMany({
      where: this.buildWhere(user, query),
      orderBy: [{ startAt: 'asc' }, { id: 'desc' }],
      take: take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: sessionInclude,
    });

    const nextCursor = rows.length > take ? rows[take - 1]?.id ?? null : null;
    return { items: rows.slice(0, take).map((session) => this.mapSession(session)), nextCursor };
  }

  async getSession(user: User, id: string) {
    const session = await this.prisma.session.findFirst({
      where: { id, ...this.scopeWhere(user) },
      include: sessionInclude,
    });
    if (!session) throw new NotFoundException('Session was not found.');
    return this.mapSession(session);
  }

  async createSession(user: User, dto: CreateSessionDto) {
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    this.assertValidTimeRange(startAt, endAt);

    const entrepreneurUserId = user.role === UserRole.entrepreneur ? user.id : dto.entrepreneurUserId;
    if (!entrepreneurUserId) throw new BadRequestException('Choose the entrepreneur for this session.');
    await this.ensureEntrepreneur(entrepreneurUserId);
    if (dto.programmeId) await this.ensureProgrammeReadable(user, dto.programmeId, entrepreneurUserId);

    const ownerUserId = user.role === UserRole.entrepreneur ? null : dto.ownerUserId ?? user.id;
    if (ownerUserId) await this.ensureOwner(ownerUserId);

    const source = user.role === UserRole.entrepreneur ? SessionSource.entrepreneur_request : SessionSource.team_created;
    const status = ownerUserId ? SessionStatus.confirmed : SessionStatus.requested;

    const created = await this.prisma.session.create({
      data: {
        entrepreneurUserId,
        programmeId: dto.programmeId || null,
        ownerUserId,
        createdById: user.id,
        type: dto.type,
        topic: dto.topic.trim(),
        notes: dto.notes?.trim() || null,
        source,
        status,
        startAt,
        endAt,
        timezone: dto.timezone?.trim() || 'UTC',
        meetingProvider: dto.meetingProvider ?? 'google_meet',
        meetingUrl: status === SessionStatus.confirmed ? this.generateMeetingUrl(dto.topic, startAt) : null,
      },
      include: sessionInclude,
    });

    if (created.status === SessionStatus.requested) {
      await this.notifyTeamOfSessionRequest(user, created);
    } else {
      await this.notifyEntrepreneur(
        user,
        created,
        NotificationType.session_confirmed,
        'Session booked',
        `${this.userName(user)} booked ${created.topic}.`,
        NotificationSeverity.success,
      );
    }

    return this.mapSession(created);
  }

  async acceptSession(user: User, id: string) {
    this.assertTeamMember(user);
    const session = await this.getOwnedOrOpenSession(user, id);
    if (session.status !== SessionStatus.requested) {
      throw new BadRequestException('Only requested sessions can be accepted.');
    }

    const updated = await this.prisma.session.update({
      where: { id },
      data: {
        ownerUserId: user.id,
        status: SessionStatus.confirmed,
        meetingProvider: session.meetingProvider || 'google_meet',
        meetingUrl: session.meetingUrl ?? this.generateMeetingUrl(session.topic, session.startAt),
      },
      include: sessionInclude,
    });

    await this.notifyEntrepreneur(
      user,
      updated,
      NotificationType.session_confirmed,
      'Session confirmed',
      `${this.userName(user)} accepted ${updated.topic}.`,
      NotificationSeverity.success,
    );

    return this.mapSession(updated);
  }

  async declineSession(user: User, id: string, dto: SessionReasonDto) {
    this.assertTeamMember(user);
    const session = await this.getOwnedOrOpenSession(user, id);
    if (session.status !== SessionStatus.requested && session.status !== SessionStatus.confirmed) {
      throw new BadRequestException('This session cannot be declined.');
    }

    const updated = await this.prisma.session.update({
      where: { id },
      data: {
        status: SessionStatus.declined,
        declinedReason: dto.reason.trim(),
        ownerUserId: session.ownerUserId ?? user.id,
      },
      include: sessionInclude,
    });

    await this.notifyEntrepreneur(
      user,
      updated,
      NotificationType.session_declined,
      'Session declined',
      `${this.userName(user)} declined ${updated.topic}.`,
      NotificationSeverity.warning,
    );

    return this.mapSession(updated);
  }

  async cancelSession(user: User, id: string, dto: SessionReasonDto) {
    const session = await this.getSessionEntity(user, id);
    if (session.status !== SessionStatus.requested && session.status !== SessionStatus.confirmed) {
      throw new BadRequestException('This session cannot be cancelled.');
    }
    if (user.role === UserRole.trainer && session.ownerUserId !== user.id) {
      throw new ForbiddenException('You can only cancel sessions you own.');
    }

    const updated = await this.prisma.session.update({
      where: { id },
      data: { status: SessionStatus.cancelled, cancelledReason: dto.reason.trim() },
      include: sessionInclude,
    });
    await this.notifyEntrepreneur(
      user,
      updated,
      NotificationType.session_cancelled,
      'Session cancelled',
      `${this.userName(user)} cancelled ${updated.topic}.`,
      NotificationSeverity.warning,
    );
    return this.mapSession(updated);
  }

  async rescheduleSession(user: User, id: string, dto: RescheduleSessionDto) {
    const session = await this.getSessionEntity(user, id);
    if (session.status !== SessionStatus.confirmed) {
      throw new BadRequestException('Only confirmed sessions can be rescheduled.');
    }
    if (user.role === UserRole.entrepreneur) {
      throw new ForbiddenException('Ask BID to reschedule this session.');
    }
    if (user.role === UserRole.trainer && session.ownerUserId !== user.id) {
      throw new ForbiddenException('You can only reschedule sessions you own.');
    }

    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    this.assertValidTimeRange(startAt, endAt);

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.reason?.trim()) {
        await tx.sessionNote.create({
          data: {
            sessionId: id,
            authorId: user.id,
            note: `Rescheduled: ${dto.reason.trim()}`,
            visibility: SessionNoteVisibility.participant,
          },
        });
      }
      return tx.session.update({ where: { id }, data: { startAt, endAt }, include: sessionInclude });
    });

    await this.notifyEntrepreneur(
      user,
      updated,
      NotificationType.session_rescheduled,
      'Session rescheduled',
      `${this.userName(user)} rescheduled ${updated.topic}.`,
      NotificationSeverity.info,
    );

    return this.mapSession(updated);
  }

  async completeSession(user: User, id: string, dto: CompleteSessionDto) {
    this.assertTeamMember(user);
    const session = await this.getSessionEntity(user, id);
    if (session.status !== SessionStatus.confirmed) {
      throw new BadRequestException('Only confirmed sessions can be marked completed.');
    }
    if (user.role === UserRole.trainer && session.ownerUserId !== user.id) {
      throw new ForbiddenException('You can only complete sessions you own.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.note?.trim()) {
        await tx.sessionNote.create({
          data: { sessionId: id, authorId: user.id, note: dto.note.trim(), visibility: SessionNoteVisibility.internal },
        });
      }
      return tx.session.update({ where: { id }, data: { status: SessionStatus.completed, completedAt: new Date() }, include: sessionInclude });
    });

    await this.notifyEntrepreneur(
      user,
      updated,
      NotificationType.session_completed,
      'Session completed',
      `${this.userName(user)} marked ${updated.topic} as completed.`,
      NotificationSeverity.success,
    );

    return this.mapSession(updated);
  }

  async addNote(user: User, id: string, dto: AddSessionNoteDto) {
    const session = await this.getSessionEntity(user, id);
    if (user.role === UserRole.trainer && session.ownerUserId !== user.id) {
      throw new ForbiddenException('You can only add notes to sessions you own.');
    }
    if (user.role === UserRole.entrepreneur && dto.visibility !== SessionNoteVisibility.participant) {
      throw new ForbiddenException('Entrepreneurs can only add participant-visible notes.');
    }

    await this.prisma.sessionNote.create({
      data: {
        sessionId: id,
        authorId: user.id,
        note: dto.note.trim(),
        visibility: dto.visibility ?? (user.role === UserRole.entrepreneur ? SessionNoteVisibility.participant : SessionNoteVisibility.internal),
      },
    });

    return this.getSession(user, id);
  }

  private buildWhere(user: User, query: SessionQueryDto): Prisma.SessionWhereInput {
    const filters: Prisma.SessionWhereInput[] = [this.scopeWhere(user)];
    if (query.search?.trim()) {
      const search = query.search.trim();
      filters.push({
        OR: [
          { topic: { contains: search, mode: 'insensitive' } },
          { notes: { contains: search, mode: 'insensitive' } },
          { entrepreneur: { email: { contains: search, mode: 'insensitive' } } },
          { entrepreneur: { firstName: { contains: search, mode: 'insensitive' } } },
          { entrepreneur: { lastName: { contains: search, mode: 'insensitive' } } },
          { owner: { email: { contains: search, mode: 'insensitive' } } },
          { owner: { firstName: { contains: search, mode: 'insensitive' } } },
          { owner: { lastName: { contains: search, mode: 'insensitive' } } },
          { programme: { name: { contains: search, mode: 'insensitive' } } },
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
    if (user.role === UserRole.entrepreneur) return { entrepreneurUserId: user.id };
    if (user.role === UserRole.trainer) return { OR: [{ ownerUserId: user.id }, { status: SessionStatus.requested }] };
    return { id: '__none__' };
  }

  private async getSessionEntity(user: User, id: string) {
    const session = await this.prisma.session.findFirst({ where: { id, ...this.scopeWhere(user) } });
    if (!session) throw new NotFoundException('Session was not found.');
    return session;
  }

  private async getOwnedOrOpenSession(user: User, id: string) {
    const session = await this.prisma.session.findFirst({
      where: {
        id,
        OR: [
          { ownerUserId: user.id },
          { status: SessionStatus.requested },
          ...(user.role === UserRole.admin ? [{}] : []),
        ],
      },
    });
    if (!session) throw new NotFoundException('Session was not found in your session scope.');
    return session;
  }

  private async ensureEntrepreneur(userId: string) {
    const entrepreneur = await this.prisma.user.findFirst({ where: { id: userId, role: UserRole.entrepreneur }, select: { id: true } });
    if (!entrepreneur) throw new BadRequestException('Choose a valid entrepreneur.');
  }

  private async ensureOwner(userId: string) {
    const owner = await this.prisma.user.findFirst({ where: { id: userId, role: { in: [UserRole.admin, UserRole.trainer] } }, select: { id: true } });
    if (!owner) throw new BadRequestException('Choose a valid BID team member.');
  }

  private async ensureProgrammeReadable(user: User, programmeId: string, entrepreneurUserId: string) {
    if (user.role === UserRole.admin || user.role === UserRole.trainer) {
      const programme = await this.prisma.programme.findUnique({ where: { id: programmeId }, select: { id: true } });
      if (!programme) throw new BadRequestException('Choose a valid programme.');
      return;
    }

    const count = await this.prisma.programme.count({
      where: {
        id: programmeId,
        OR: [
          { accessType: 'free' },
          { accessGrants: { some: { entrepreneurUserId, revokedAt: null } } },
        ],
      },
    });
    if (count === 0) throw new BadRequestException('Choose a programme you can access.');
  }

  private assertTeamMember(user: User) {
    if (user.role !== UserRole.admin && user.role !== UserRole.trainer) {
      throw new ForbiddenException('Only BID team members can do this.');
    }
  }

  private assertValidTimeRange(startAt: Date, endAt: Date) {
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      throw new BadRequestException('Choose a valid session date and time.');
    }
    if (endAt.getTime() <= startAt.getTime()) {
      throw new BadRequestException('Session end time must be after the start time.');
    }
  }

  private generateMeetingUrl(topic: string, startAt: Date) {
    const slug = `${topic}-${startAt.toISOString()}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32) || 'bid-session';
    return `https://meet.google.com/${slug}`;
  }

  private async notifyTeamOfSessionRequest(actor: User, session: SessionWithInclude) {
    const recipients = await this.prisma.user.findMany({
      where: { role: { in: [UserRole.admin, UserRole.trainer] }, status: 'active' },
      select: { id: true, role: true },
    });

    await Promise.all(
      recipients.map((recipient) =>
        this.notifications.createNotification({
          recipientUserId: recipient.id,
          actorUserId: actor.id,
          type: NotificationType.session_request,
          title: 'New session request',
          body: `${this.sessionEntrepreneurName(session)} requested ${this.sessionTypeLabel(session.type)}.`,
          severity: NotificationSeverity.info,
          entityType: NotificationEntityType.session,
          entityId: session.id,
          actionUrl: recipient.role === UserRole.admin ? '/admin/sessions' : '/trainer/sessions',
          channels: [NotificationChannel.in_app, NotificationChannel.email],
        }),
      ),
    );
  }

  private async notifyEntrepreneur(
    actor: User,
    session: SessionWithInclude,
    type: NotificationType,
    title: string,
    body: string,
    severity: NotificationSeverity,
  ) {
    if (actor.id === session.entrepreneurUserId) return;

    await this.notifications.createNotification({
      recipientUserId: session.entrepreneurUserId,
      actorUserId: actor.id,
      type,
      title,
      body,
      severity,
      entityType: NotificationEntityType.session,
      entityId: session.id,
      actionUrl: '/entrepreneur/schedule',
      channels: [NotificationChannel.in_app, NotificationChannel.email],
    });
  }

  private sessionEntrepreneurName(session: SessionWithInclude) {
    const business = session.entrepreneur.businessMemberships[0]?.business;
    return business?.name ?? this.userName(session.entrepreneur);
  }

  private sessionTypeLabel(type: SessionWithInclude['type']) {
    const labels: Record<SessionWithInclude['type'], string> = {
      mentor_checkin: 'a mentor check-in',
      office_hours: 'an office hours session',
      investor_prep: 'an investor prep session',
    };
    return labels[type];
  }

  private mapSession(session: SessionWithInclude) {
    const business = session.entrepreneur.businessMemberships[0]?.business ?? null;
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
      createdBy: this.mapUser(session.createdBy),
      type: session.type,
      topic: session.topic,
      notes: session.notes,
      source: session.source,
      status: session.status,
      startAt: session.startAt.toISOString(),
      endAt: session.endAt.toISOString(),
      timezone: session.timezone,
      meetingProvider: session.meetingProvider,
      meetingUrl: session.meetingUrl,
      declinedReason: session.declinedReason,
      cancelledReason: session.cancelledReason,
      completedAt: session.completedAt?.toISOString() ?? null,
      notesHistory: session.notesHistory.map((note) => ({
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

  private mapUser(user: { id: string; firstName: string | null; lastName: string | null; email: string; role?: UserRole }) {
    return { id: user.id, name: this.userName(user), email: user.email, role: user.role };
  }

  private userName(user: { firstName: string | null; lastName: string | null; email: string }) {
    return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
  }
}
