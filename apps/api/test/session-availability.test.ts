import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException } from "@nestjs/common";
import { SessionAvailabilityService } from "../src/sessions/session-availability.service";

const policy = {
  sessionWorkingDays: [1, 2, 3, 4, 5],
  sessionWorkdayStartMinutes: 540,
  sessionWorkdayEndMinutes: 1020,
  sessionSlotIntervalMinutes: 30,
};

function service(options?: {
  candidates?: string[];
  localSessions?: Array<{
    ownerUserId: string;
    startAt: Date;
    endAt: Date;
  }>;
  busy?: Record<string, Array<{ startAt: Date; endAt: Date }>>;
  defaultTimezone?: string;
}) {
  const candidates = options?.candidates ?? ["trainer-1"];
  const prisma = {
    companySettings: {
      upsert: async () => ({
        ...policy,
        defaultTimezone: options?.defaultTimezone ?? "UTC",
      }),
    },
    sessionTypeDefinition: {
      findUnique: async () => ({
        key: "mentor_checkin",
        name: "1:1 mentor check-in",
        durationMinutes: 60,
      }),
    },
    user: {
      findMany: async () => candidates.map((id) => ({ id })),
    },
    session: {
      findMany: async () => options?.localSessions ?? [],
      count: async () => (options?.localSessions?.length ? 1 : 0),
    },
  };
  const calendar = {
    getBusyIntervals: async (userId: string) => options?.busy?.[userId] ?? [],
    isAvailable: async (userId: string, startAt: Date, endAt: Date) =>
      !(options?.busy?.[userId] ?? []).some(
        (entry) => entry.startAt < endAt && entry.endAt > startAt,
      ),
  };
  return new SessionAvailabilityService(prisma as never, calendar as never);
}

test("open-team slots remain available when at least one connected member is free", async () => {
  const result = await service({
    candidates: ["busy", "free"],
    busy: {
      busy: [
        {
          startAt: new Date("2030-01-07T09:00:00.000Z"),
          endAt: new Date("2030-01-07T17:00:00.000Z"),
        },
      ],
    },
  }).getAvailability({
    dateFrom: "2030-01-07",
    dateTo: "2030-01-07",
    timezone: "UTC",
    sessionType: "mentor_checkin",
  });

  assert.equal(result.slots.length, 15);
  assert.ok(result.slots.every((slot) => slot.availableTeamMemberCount === 1));
});

test("specific-trainer slots are scoped to only that trainer calendar", async () => {
  const result = await service({
    candidates: ["trainer-1"],
    busy: {
      "trainer-1": [
        {
          startAt: new Date("2030-01-07T10:00:00.000Z"),
          endAt: new Date("2030-01-07T11:00:00.000Z"),
        },
      ],
    },
  }).getAvailability({
    dateFrom: "2030-01-07",
    dateTo: "2030-01-07",
    timezone: "UTC",
    targetUserId: "trainer-1",
    sessionType: "mentor_checkin",
  });

  assert.equal(
    result.slots.some((slot) => slot.startAt === "2030-01-07T10:00:00.000Z"),
    false,
  );
  assert.ok(result.slots.every((slot) => slot.targetUserId === "trainer-1"));
});

test("availability applies company hours in the company timezone and presents the requested local date", async () => {
  const result = await service({
    defaultTimezone: "Africa/Lagos",
  }).getAvailability({
    dateFrom: "2030-01-07",
    dateTo: "2030-01-07",
    timezone: "America/New_York",
    sessionType: "mentor_checkin",
  });

  assert.equal(result.slots[0]?.startAt, "2030-01-07T08:00:00.000Z");
  assert.equal(result.timezone, "America/New_York");
});

test("booking policy validates absolute time against the company timezone", async () => {
  await service({ defaultTimezone: "Africa/Lagos" }).assertBookableTime(
    new Date("2030-01-07T08:00:00.000Z"),
    new Date("2030-01-07T09:00:00.000Z"),
    "America/New_York",
  );
});

test("booking policy rejects times outside configured company hours", async () => {
  await assert.rejects(
    service().assertBookableTime(
      new Date("2030-01-07T08:30:00.000Z"),
      new Date("2030-01-07T09:30:00.000Z"),
      "UTC",
    ),
    BadRequestException,
  );
});

test("acceptance availability rejects an overlapping local confirmed session", async () => {
  const startAt = new Date("2030-01-07T10:00:00.000Z");
  const endAt = new Date("2030-01-07T11:00:00.000Z");
  await assert.rejects(
    service({
      localSessions: [{ ownerUserId: "trainer-1", startAt, endAt }],
    }).assertUserAvailable("trainer-1", startAt, endAt),
    /already has a session/,
  );
});
