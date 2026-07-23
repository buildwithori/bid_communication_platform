import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CalendarConnectionStatus,
  CalendarProvider,
  InvitationStatus,
  Prisma,
  User,
  UserRole,
  UserStatus,
} from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import {
  addMinutes,
  createPlainToken,
  hashPassword,
  hashToken,
} from "../auth/auth.tokens";
import { PrismaService } from "../database/prisma.service";
import {
  AcceptAdminInvitationDto,
  InviteAdminDto,
  UpdateAdminProfileDto,
  UpdateAdminStatusDto,
} from "./dto/admin-actions.dto";
import { AdminQueryDto } from "./dto/admin-query.dto";
import { AdminsEmailService } from "./admins-email.service";

const DEFAULT_TAKE = 20;
const INVITATION_DURATION_MINUTES = 60 * 24 * 7;

const adminInclude = Prisma.validator<Prisma.UserInclude>()({
  invitedBy: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
  calendarConnections: {
    where: {
      provider: CalendarProvider.google,
      status: CalendarConnectionStatus.connected,
    },
    orderBy: { updatedAt: "desc" },
    take: 1,
  },
});

type AdminRow = Prisma.UserGetPayload<{ include: typeof adminInclude }>;

@Injectable()
export class AdminsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly email: AdminsEmailService,
  ) {}

  async list(query: AdminQueryDto) {
    const take = query.take ?? DEFAULT_TAKE;
    const where = this.buildWhere(query);
    const [
      rows,
      totalItems,
      totalAdmins,
      activeAdmins,
      pendingInvites,
      calendarReady,
    ] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: take + 1,
        ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
        include: adminInclude,
      }),
      this.prisma.user.count({ where }),
      this.prisma.user.count({ where: { role: UserRole.admin } }),
      this.prisma.user.count({
        where: { role: UserRole.admin, status: UserStatus.active },
      }),
      this.prisma.user.count({
        where: { role: UserRole.admin, status: UserStatus.pending },
      }),
      this.prisma.user.count({
        where: {
          role: UserRole.admin,
          calendarConnections: {
            some: {
              provider: CalendarProvider.google,
              status: CalendarConnectionStatus.connected,
            },
          },
        },
      }),
    ]);

    const visibleRows = rows.slice(0, take);
    const invitations = await this.pendingInvitations(
      visibleRows.map((row) => row.email),
    );

    return {
      items: visibleRows.map((row) =>
        this.mapAdmin(row, invitations.get(row.email)),
      ),
      nextCursor:
        rows.length > take
          ? (visibleRows[visibleRows.length - 1]?.id ?? null)
          : null,
      totalItems,
      summary: {
        totalAdmins,
        activeAdmins,
        pendingInvites,
        calendarReady,
      },
    };
  }

  async get(adminId: string) {
    const admin = await this.findAdmin(adminId);
    const invitation = (await this.pendingInvitations([admin.email])).get(
      admin.email,
    );
    return this.mapAdmin(admin, invitation);
  }

  async invite(actor: User, dto: InviteAdminDto) {
    const email = this.normalizeEmail(dto.email);
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestException(
        "An account or pending invitation already exists for this email.",
      );
    }

    const plainToken = createPlainToken();
    const tokenHash = await hashToken(plainToken);
    const expiresAt = addMinutes(new Date(), INVITATION_DURATION_MINUTES);

    const admin = await this.audit.capture(
      {
        action: "admins.invitation.created",
        entityType: "adminUser",
        entityId: (result) => result.id,
        summary: (result) => `Invited admin ${result.name ?? email}`,
        payload: { role: UserRole.admin },
      },
      async (tx) => {
        const created = await tx.user.create({
          data: {
            email,
            firstName: dto.firstName.trim(),
            lastName: dto.lastName.trim(),
            role: UserRole.admin,
            status: UserStatus.pending,
            invitedById: actor.id,
          },
          include: adminInclude,
        });
        await tx.invitation.create({
          data: {
            email,
            role: UserRole.admin,
            tokenHash,
            invitedById: actor.id,
            expiresAt,
          },
        });
        return {
          ...created,
          name: this.displayName(created),
        };
      },
    );

    await this.email.sendInvitation(
      admin.email,
      admin.firstName?.trim() || admin.email,
      this.displayName(actor),
      plainToken,
    );

    return this.get(admin.id);
  }

  async resendInvitation(actor: User, adminId: string) {
    const admin = await this.findAdmin(adminId);
    if (admin.status !== UserStatus.pending) {
      throw new BadRequestException(
        "Only pending admin invitations can be resent.",
      );
    }

    const invitation = await this.prisma.invitation.findFirst({
      where: {
        email: admin.email,
        role: UserRole.admin,
        status: InvitationStatus.pending,
      },
      orderBy: { createdAt: "desc" },
    });
    if (!invitation) {
      throw new NotFoundException("Pending admin invitation was not found.");
    }

    const plainToken = createPlainToken();
    const tokenHash = await hashToken(plainToken);
    const expiresAt = addMinutes(new Date(), INVITATION_DURATION_MINUTES);

    await this.audit.capture(
      {
        action: "admins.invitation.resent",
        entityType: "adminUser",
        entityId: (result) => result.id,
        summary: `Resent admin invitation to ${admin.email}`,
      },
      async (tx) => {
        await tx.invitation.update({
          where: { id: invitation.id },
          data: { tokenHash, expiresAt },
        });
        return { id: admin.id, name: this.displayName(admin) };
      },
    );

    await this.email.sendInvitation(
      admin.email,
      admin.firstName?.trim() || admin.email,
      this.displayName(actor),
      plainToken,
    );

    return { ok: true, expiresAt: expiresAt.toISOString() };
  }

  async acceptInvitation(dto: AcceptAdminInvitationDto) {
    const tokenHash = await hashToken(dto.token);
    const invitation = await this.prisma.invitation.findUnique({
      where: { tokenHash },
    });
    if (
      !invitation ||
      invitation.role !== UserRole.admin ||
      invitation.status !== InvitationStatus.pending ||
      invitation.expiresAt < new Date()
    ) {
      throw new BadRequestException(
        "This admin invitation is invalid or has expired.",
      );
    }

    const admin = await this.prisma.user.findUnique({
      where: { email: invitation.email },
    });
    if (
      !admin ||
      admin.role !== UserRole.admin ||
      admin.status !== UserStatus.pending
    ) {
      throw new BadRequestException(
        "This admin invitation can no longer be accepted.",
      );
    }

    const passwordHash = await hashPassword(dto.password);
    const now = new Date();
    const activated = await this.audit.capture(
      {
        action: "admins.invitation.accepted",
        entityType: "adminUser",
        entityId: (result) => result.id,
        summary: (result) =>
          `${result.name ?? invitation.email} accepted an admin invitation`,
      },
      async (tx) => {
        const user = await tx.user.update({
          where: { id: admin.id },
          data: {
            passwordHash,
            status: UserStatus.active,
            emailVerifiedAt: now,
          },
          include: adminInclude,
        });
        await tx.invitation.update({
          where: { id: invitation.id },
          data: {
            status: InvitationStatus.accepted,
            acceptedAt: now,
          },
        });
        await tx.invitation.updateMany({
          where: {
            email: invitation.email,
            role: UserRole.admin,
            status: InvitationStatus.pending,
            id: { not: invitation.id },
          },
          data: {
            status: InvitationStatus.revoked,
            revokedAt: now,
          },
        });
        return { ...user, name: this.displayName(user) };
      },
    );

    await this.email.sendWelcome(
      activated.email,
      activated.name ?? this.displayName(activated),
    );
    return this.mapAdmin(activated);
  }

  async updateStatus(actor: User, adminId: string, dto: UpdateAdminStatusDto) {
    if (actor.id === adminId && dto.status === UserStatus.inactive) {
      throw new BadRequestException(
        "You cannot disable your own admin account.",
      );
    }

    const admin = await this.findAdmin(adminId);
    if (admin.status === UserStatus.pending) {
      throw new BadRequestException(
        "Pending invitations cannot be activated or disabled manually.",
      );
    }

    const status =
      dto.status === "active" ? UserStatus.active : UserStatus.inactive;
    const updated = await this.audit.capture(
      {
        action: "admins.status.updated",
        entityType: "adminUser",
        entityId: (result) => result.id,
        summary: `Updated admin status to ${status}`,
        payload: { previousStatus: admin.status, nextStatus: status },
      },
      (tx) =>
        tx.user.update({
          where: { id: admin.id },
          data: { status },
          include: adminInclude,
        }),
    );
    return this.mapAdmin(updated);
  }

  async myProfile(userId: string) {
    return this.get(userId);
  }

  async updateMyProfile(userId: string, dto: UpdateAdminProfileDto) {
    const admin = await this.findAdmin(userId);
    const updated = await this.audit.capture(
      {
        action: "admins.profile.updated",
        entityType: "adminUser",
        entityId: (result) => result.id,
        summary: "Updated admin profile",
      },
      (tx) =>
        tx.user.update({
          where: { id: admin.id },
          data: {
            firstName: dto.firstName.trim(),
            lastName: dto.lastName.trim(),
            phone: dto.phone?.trim() || null,
          },
          include: adminInclude,
        }),
    );
    return this.mapAdmin(updated);
  }

  private buildWhere(query: AdminQueryDto): Prisma.UserWhereInput {
    const filters: Prisma.UserWhereInput[] = [{ role: UserRole.admin }];

    if (query.search?.trim()) {
      const search = query.search.trim();
      filters.push({
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      });
    }

    if (query.status === "active") {
      filters.push({ status: UserStatus.active });
    } else if (query.status === "invited") {
      filters.push({ status: UserStatus.pending });
    } else if (query.status === "disabled") {
      filters.push({ status: UserStatus.inactive });
    }

    if (query.calendarStatus === "connected") {
      filters.push({
        calendarConnections: {
          some: {
            provider: CalendarProvider.google,
            status: CalendarConnectionStatus.connected,
          },
        },
      });
    } else if (query.calendarStatus === "not_connected") {
      filters.push({
        calendarConnections: {
          none: {
            provider: CalendarProvider.google,
            status: CalendarConnectionStatus.connected,
          },
        },
      });
    }

    return { AND: filters };
  }

  private findAdmin(id: string) {
    return this.prisma.user
      .findFirst({
        where: { id, role: UserRole.admin },
        include: adminInclude,
      })
      .then((admin) => {
        if (!admin) throw new NotFoundException("Admin was not found.");
        return admin;
      });
  }

  private async pendingInvitations(emails: string[]) {
    const invitations = emails.length
      ? await this.prisma.invitation.findMany({
          where: {
            email: { in: emails },
            role: UserRole.admin,
            status: InvitationStatus.pending,
          },
          orderBy: { createdAt: "desc" },
        })
      : [];

    const byEmail = new Map<string, (typeof invitations)[number]>();
    for (const invitation of invitations) {
      if (!byEmail.has(invitation.email)) {
        byEmail.set(invitation.email, invitation);
      }
    }
    return byEmail;
  }

  private mapAdmin(
    admin: AdminRow,
    invitation?: {
      id: string;
      createdAt: Date;
      expiresAt: Date;
    },
  ) {
    const calendar = admin.calendarConnections[0] ?? null;
    return {
      id: admin.id,
      firstName: admin.firstName,
      lastName: admin.lastName,
      name: this.displayName(admin),
      email: admin.email,
      phone: admin.phone,
      avatarUrl: admin.avatarUrl,
      status: this.directoryStatus(admin.status),
      userStatus: admin.status,
      calendar: {
        connected: Boolean(calendar),
        provider: calendar?.provider ?? CalendarProvider.google,
        accountEmail: calendar?.providerAccountEmail ?? null,
        lastSyncedAt: calendar?.lastSyncedAt?.toISOString() ?? null,
      },
      invitedBy: admin.invitedBy
        ? {
            id: admin.invitedBy.id,
            name: this.displayName(admin.invitedBy),
          }
        : null,
      invitation: invitation
        ? {
            id: invitation.id,
            sentAt: invitation.createdAt.toISOString(),
            expiresAt: invitation.expiresAt.toISOString(),
          }
        : null,
      lastActiveAt: admin.lastLoginAt?.toISOString() ?? null,
      createdAt: admin.createdAt.toISOString(),
      updatedAt: admin.updatedAt.toISOString(),
    };
  }

  private directoryStatus(status: UserStatus) {
    if (status === UserStatus.pending) return "invited";
    if (status === UserStatus.inactive) return "disabled";
    return "active";
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private displayName(user: Pick<User, "firstName" | "lastName" | "email">) {
    return (
      [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
      user.email
    );
  }
}
