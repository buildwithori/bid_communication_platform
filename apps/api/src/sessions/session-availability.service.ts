import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  CalendarConnectionStatus,
  CalendarProvider,
  SessionStatus,
  UserRole,
} from "@prisma/client";
import { CalendarService } from "../calendar/calendar.service";
import { PLATFORM_DEFAULT_TIMEZONE } from "../common/constants/platform.constants";
import { PrismaService } from "../database/prisma.service";
import {
  activeBidTeamMemberWhere,
  activeTrainerUserWhere,
} from "../trainers/trainer-access";
import {
  SessionAvailabilityQueryDto,
  SessionTeamMemberQueryDto,
} from "./dto/session-availability.dto";

const DEFAULT_TAKE = 20;
const MAX_AVAILABILITY_DAYS = 14;

type Interval = { startAt: Date; endAt: Date };

@Injectable()
export class SessionAvailabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calendar: CalendarService,
  ) {}

  async listTeamMembers(query: SessionTeamMemberQueryDto) {
    const take = query.take ?? DEFAULT_TAKE;
    const search = query.search?.trim();
    const rows = await this.prisma.user.findMany({
      where: {
        AND: [
          query.role === UserRole.admin
            ? { role: UserRole.admin, status: "active" }
            : query.role === UserRole.trainer
              ? activeTrainerUserWhere()
              : activeBidTeamMemberWhere(),
        ],
        calendarConnections: {
          some: {
            provider: CalendarProvider.google,
            status: CalendarConnectionStatus.connected,
          },
        },
        ...(search
          ? {
              OR: [
                { firstName: { contains: search, mode: "insensitive" } },
                { lastName: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { id: "asc" },
      take: take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
      },
    });

    return {
      items: rows.slice(0, take).map((member) => ({
        id: member.id,
        name:
          [member.firstName, member.lastName].filter(Boolean).join(" ") ||
          member.email,
        email: member.email,
        role: member.role,
      })),
      nextCursor: rows.length > take ? (rows[take]?.id ?? null) : null,
    };
  }

  async getAvailability(query: SessionAvailabilityQueryDto) {
    this.assertTimezone(query.timezone);
    const dateFrom = this.parseDate(query.dateFrom, "dateFrom");
    const dateTo = this.parseDate(query.dateTo, "dateTo");
    const dayCount =
      Math.floor((dateTo.getTime() - dateFrom.getTime()) / 86_400_000) + 1;
    if (dayCount < 1 || dayCount > MAX_AVAILABILITY_DAYS) {
      throw new BadRequestException(
        "Request between 1 and " +
          MAX_AVAILABILITY_DAYS +
          " calendar days at a time.",
      );
    }

    const policy = await this.prisma.companySettings.upsert({
      where: { singletonKey: "default" },
      update: {},
      create: { singletonKey: "default" },
      select: {
        sessionWorkingDays: true,
        sessionWorkdayStartMinutes: true,
        sessionWorkdayEndMinutes: true,
        sessionSlotIntervalMinutes: true,
        defaultSessionDurationMinutes: true,
        defaultTimezone: true,
      },
    });
    const durationMinutes =
      query.durationMinutes ?? policy.defaultSessionDurationMinutes;
    const candidates = await this.findCandidates(query.targetUserId);
    if (query.targetUserId && candidates.length === 0) {
      throw new BadRequestException(
        "The selected BID team member does not have a connected calendar.",
      );
    }
    if (candidates.length === 0) {
      return {
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
        timezone: query.timezone,
        durationMinutes,
        slots: [],
      };
    }

    const policyDateFrom = new Date(dateFrom.getTime() - 86_400_000);
    const policyDateTo = new Date(dateTo.getTime() + 86_400_000);
    const rangeStart = this.zonedDateTimeToUtc(
      policyDateFrom.getUTCFullYear(),
      policyDateFrom.getUTCMonth() + 1,
      policyDateFrom.getUTCDate(),
      Math.floor(policy.sessionWorkdayStartMinutes / 60),
      policy.sessionWorkdayStartMinutes % 60,
      policy.defaultTimezone,
    );
    const rangeEnd = this.zonedDateTimeToUtc(
      policyDateTo.getUTCFullYear(),
      policyDateTo.getUTCMonth() + 1,
      policyDateTo.getUTCDate(),
      Math.floor(policy.sessionWorkdayEndMinutes / 60),
      policy.sessionWorkdayEndMinutes % 60,
      policy.defaultTimezone,
    );

    const localSessions = await this.prisma.session.findMany({
      where: {
        ownerUserId: { in: candidates.map((candidate) => candidate.id) },
        status: SessionStatus.confirmed,
        startAt: { lt: rangeEnd },
        endAt: { gt: rangeStart },
      },
      select: { ownerUserId: true, startAt: true, endAt: true },
    });
    const localByOwner = new Map<string, Interval[]>();
    for (const session of localSessions) {
      if (!session.ownerUserId) continue;
      const intervals = localByOwner.get(session.ownerUserId) ?? [];
      intervals.push({ startAt: session.startAt, endAt: session.endAt });
      localByOwner.set(session.ownerUserId, intervals);
    }

    const busyByOwner = new Map<string, Interval[]>();
    for (let offset = 0; offset < candidates.length; offset += 5) {
      const batch = candidates.slice(offset, offset + 5);
      const calendars = await Promise.all(
        batch.map(async (candidate) => {
          try {
            const busy = await this.calendar.getBusyIntervals(
              candidate.id,
              rangeStart,
              rangeEnd,
            );
            return { id: candidate.id, busy };
          } catch (error) {
            if (query.targetUserId) throw error;
            return null;
          }
        }),
      );
      for (const calendar of calendars) {
        if (!calendar) continue;
        busyByOwner.set(calendar.id, [
          ...calendar.busy,
          ...(localByOwner.get(calendar.id) ?? []),
        ]);
      }
    }

    const slots: Array<{
      startAt: string;
      endAt: string;
      availableTeamMemberCount: number;
      targetUserId: string | null;
    }> = [];
    const now = new Date();
    for (let day = -1; day <= dayCount; day += 1) {
      const current = new Date(dateFrom.getTime() + day * 86_400_000);
      const weekday = current.getUTCDay();
      if (!policy.sessionWorkingDays.includes(weekday)) continue;

      for (
        let minute = policy.sessionWorkdayStartMinutes;
        minute + durationMinutes <= policy.sessionWorkdayEndMinutes;
        minute += policy.sessionSlotIntervalMinutes
      ) {
        const startAt = this.zonedDateTimeToUtc(
          current.getUTCFullYear(),
          current.getUTCMonth() + 1,
          current.getUTCDate(),
          Math.floor(minute / 60),
          minute % 60,
          policy.defaultTimezone,
        );
        const endAt = new Date(startAt.getTime() + durationMinutes * 60_000);
        const displayDate = this.zonedDateKey(startAt, query.timezone);
        if (displayDate < query.dateFrom || displayDate > query.dateTo)
          continue;
        if (startAt <= now) continue;

        const available = candidates.filter((candidate) => {
          const busy = busyByOwner.get(candidate.id);
          return (
            busy &&
            !busy.some(
              (interval) =>
                interval.startAt < endAt && interval.endAt > startAt,
            )
          );
        });
        if (available.length === 0) continue;

        slots.push({
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
          availableTeamMemberCount: available.length,
          targetUserId: query.targetUserId ?? null,
        });
      }
    }

    return {
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      timezone: query.timezone,
      durationMinutes,
      slots,
    };
  }

  async resolveTimezone(preferred?: string | null) {
    if (preferred?.trim()) {
      const timezone = preferred.trim();
      this.assertTimezone(timezone);
      return timezone;
    }
    const settings = await this.prisma.companySettings.upsert({
      where: { singletonKey: "default" },
      update: {},
      create: { singletonKey: "default" },
      select: { defaultTimezone: true },
    });
    const timezone = settings.defaultTimezone || PLATFORM_DEFAULT_TIMEZONE;
    this.assertTimezone(timezone);
    return timezone;
  }

  async assertBookableTime(startAt: Date, endAt: Date, timezone: string) {
    this.assertTimezone(timezone);
    const policy = await this.prisma.companySettings.upsert({
      where: { singletonKey: "default" },
      update: {},
      create: { singletonKey: "default" },
      select: {
        sessionWorkingDays: true,
        sessionWorkdayStartMinutes: true,
        sessionWorkdayEndMinutes: true,
        sessionSlotIntervalMinutes: true,
        defaultTimezone: true,
      },
    });
    const start = this.zonedParts(startAt, policy.defaultTimezone);
    const end = this.zonedParts(endAt, policy.defaultTimezone);
    const startMinute = start.hour * 60 + start.minute;
    const endMinute = end.hour * 60 + end.minute;
    const sameDay =
      start.year === end.year &&
      start.month === end.month &&
      start.day === end.day;
    if (
      !sameDay ||
      !policy.sessionWorkingDays.includes(start.weekday) ||
      startMinute < policy.sessionWorkdayStartMinutes ||
      endMinute > policy.sessionWorkdayEndMinutes ||
      (startMinute - policy.sessionWorkdayStartMinutes) %
        policy.sessionSlotIntervalMinutes !==
        0
    ) {
      throw new BadRequestException(
        "Choose a session time inside the configured booking hours.",
      );
    }
  }

  async assertUserAvailable(
    userId: string,
    startAt: Date,
    endAt: Date,
    excludeSessionId?: string,
  ) {
    const candidate = await this.findCandidates(userId);
    if (candidate.length === 0) {
      throw new BadRequestException(
        "The selected BID team member does not have a connected calendar.",
      );
    }

    const localConflict = await this.prisma.session.count({
      where: {
        ownerUserId: userId,
        status: SessionStatus.confirmed,
        startAt: { lt: endAt },
        endAt: { gt: startAt },
        ...(excludeSessionId ? { id: { not: excludeSessionId } } : {}),
      },
    });
    if (localConflict > 0) {
      throw new BadRequestException(
        "This BID team member already has a session during that time.",
      );
    }

    const isAvailable = await this.calendar.isAvailable(userId, startAt, endAt);
    if (!isAvailable) {
      throw new BadRequestException(
        "This BID team member is no longer available during that time.",
      );
    }
  }

  async assertAnyTeamMemberAvailable(startAt: Date, endAt: Date) {
    const candidates = await this.findCandidates();
    if (candidates.length === 0) {
      throw new BadRequestException(
        "No BID team member has a connected calendar.",
      );
    }

    for (const candidate of candidates) {
      try {
        await this.assertUserAvailable(candidate.id, startAt, endAt);
        return;
      } catch {
        // Another connected team member may still be available.
      }
    }
    throw new BadRequestException(
      "No BID team member is available during that time.",
    );
  }

  private findCandidates(targetUserId?: string) {
    return this.prisma.user.findMany({
      where: {
        ...(targetUserId ? { id: targetUserId } : {}),
        AND: [activeBidTeamMemberWhere()],
        calendarConnections: {
          some: {
            provider: CalendarProvider.google,
            status: CalendarConnectionStatus.connected,
          },
        },
      },
      select: { id: true },
    });
  }

  private parseDate(value: string, field: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new BadRequestException(field + " must use YYYY-MM-DD.");
    }
    const parsed = new Date(value + "T00:00:00.000Z");
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(field + " is invalid.");
    }
    return parsed;
  }

  private assertTimezone(timezone: string) {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
    } catch {
      throw new BadRequestException("Choose a valid IANA timezone.");
    }
  }

  private zonedDateKey(value: Date, timezone: string) {
    const parts = this.zonedParts(value, timezone);
    return [
      parts.year,
      String(parts.month).padStart(2, "0"),
      String(parts.day).padStart(2, "0"),
    ].join("-");
  }

  private zonedParts(value: Date, timezone: string) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      weekday: "short",
      hourCycle: "h23",
    }).formatToParts(value);
    const values = Object.fromEntries(
      parts.map((part) => [part.type, part.value]),
    );
    const weekdays: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    return {
      year: Number(values.year),
      month: Number(values.month),
      day: Number(values.day),
      hour: Number(values.hour),
      minute: Number(values.minute),
      weekday: weekdays[values.weekday] ?? -1,
    };
  }

  private zonedDateTimeToUtc(
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
    timezone: string,
  ) {
    const expected = Date.UTC(year, month - 1, day, hour, minute);
    let result = expected;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).formatToParts(new Date(result));
      const values = Object.fromEntries(
        parts.map((part) => [part.type, part.value]),
      );
      const represented = Date.UTC(
        Number(values.year),
        Number(values.month) - 1,
        Number(values.day),
        Number(values.hour),
        Number(values.minute),
      );
      result += expected - represented;
    }
    return new Date(result);
  }
}
