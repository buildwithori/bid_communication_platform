import assert from "node:assert/strict";
import test from "node:test";
import { ConflictException } from "@nestjs/common";
import {
  NotificationChannel,
  NotificationEntityType,
  NotificationSeverity,
  NotificationType,
  SessionNoteVisibility,
  SessionSource,
  SessionStatus,
  SessionTargetType,
  UserRole,
} from "@prisma/client";
import { SessionsService } from "../src/sessions/sessions.service";

const trainer = {
  id: "trainer-1",
  email: "trainer@bid.org",
  firstName: "Tola",
  lastName: "Trainer",
  role: UserRole.trainer,
  timezone: "Africa/Lagos",
};

function fixture(overrides: Record<string, unknown> = {}) {
  const startAt = new Date("2030-01-07T10:00:00.000Z");
  const endAt = new Date("2030-01-07T11:00:00.000Z");
  return {
    id: "session-1",
    entrepreneurUserId: "entrepreneur-1",
    programmeId: null,
    ownerUserId: null,
    targetType: SessionTargetType.open_team,
    targetUserId: null,
    createdById: "entrepreneur-1",
    type: "mentor_checkin",
    durationMinutes: 60,
    typeDefinition: {
      key: "mentor_checkin",
      name: "1:1 mentor check-in",
      durationMinutes: 60,
      active: true,
    },
    topic: "Pricing review",
    notes: "Prepare pricing questions",
    source: SessionSource.entrepreneur_request,
    status: SessionStatus.requested,
    startAt,
    endAt,
    timezone: "UTC",
    meetingProvider: "google_meet",
    meetingUrl: null,
    calendarEventId: null,
    declinedReason: null,
    cancelledReason: null,
    completedAt: null,
    createdAt: new Date("2030-01-01T00:00:00.000Z"),
    updatedAt: new Date("2030-01-01T00:00:00.000Z"),
    entrepreneur: {
      id: "entrepreneur-1",
      email: "entrepreneur@bid.org",
      firstName: "Eni",
      lastName: "Founder",
      timezone: "Africa/Accra",
      businessMemberships: [
        {
          business: {
            id: "business-1",
            name: "Build Co",
            country: "Ghana",
          },
        },
      ],
    },
    programme: null,
    owner: null,
    target: null,
    createdBy: {
      id: "entrepreneur-1",
      email: "entrepreneur@bid.org",
      firstName: "Eni",
      lastName: "Founder",
      role: UserRole.entrepreneur,
      timezone: "Africa/Accra",
    },
    reschedules: [],
    notesHistory: [],
    ...overrides,
  };
}

function dependencies(session: ReturnType<typeof fixture>) {
  const state = {
    availabilityChecks: 0,
    deletedEvents: [] as string[],
    updatedEvents: [] as Array<{ startAt: Date }>,
  };
  const prisma = {
    session: { findFirst: async () => session },
  };
  const notifications = { createNotification: async () => undefined };
  const calendar = {
    createSessionEvent: async () => ({
      eventId: "google-event-1",
      meetingUrl: "https://meet.google.com/real-link",
    }),
    deleteSessionEvent: async (_ownerId: string, eventId: string) => {
      state.deletedEvents.push(eventId);
    },
    updateSessionEvent: async (input: { startAt: Date }) => {
      state.updatedEvents.push(input);
    },
  };
  const availability = {
    assertUserAvailable: async () => {
      state.availabilityChecks += 1;
    },
    assertBookableTime: async () => undefined,
    resolveTimezone: async (preferred?: string | null) =>
      preferred ?? "Africa/Kigali",
  };
  return {
    state,
    prisma,
    notifications,
    calendar,
    availability,
  };
}

test("a lost open-request acceptance race removes the extra Google event", async () => {
  const session = fixture();
  const deps = dependencies(session);
  const audit = {
    capture: async () => {
      throw new Error("status changed");
    },
  };
  const service = new SessionsService(
    deps.prisma as never,
    deps.notifications as never,
    deps.calendar as never,
    deps.availability as never,
    audit as never,
  );

  await assert.rejects(
    service.acceptSession(trainer as never, session.id),
    ConflictException,
  );
  assert.equal(deps.state.availabilityChecks, 1);
  assert.deepEqual(deps.state.deletedEvents, ["google-event-1"]);
});

test("a database reschedule race rolls the existing Google event back", async () => {
  const oldStart = new Date("2030-01-07T10:00:00.000Z");
  const session = fixture({
    ownerUserId: trainer.id,
    owner: trainer,
    status: SessionStatus.confirmed,
    calendarEventId: "google-event-1",
    meetingUrl: "https://meet.google.com/real-link",
    startAt: oldStart,
  });
  const deps = dependencies(session);
  const audit = {
    capture: async () => {
      throw new Error("updated concurrently");
    },
  };
  const service = new SessionsService(
    deps.prisma as never,
    deps.notifications as never,
    deps.calendar as never,
    deps.availability as never,
    audit as never,
  );

  await assert.rejects(
    service.rescheduleSession(trainer as never, session.id, {
      startAt: "2030-01-08T10:00:00.000Z",
      endAt: "2030-01-08T11:00:00.000Z",
      reason: "Entrepreneur requested another day",
    }),
    ConflictException,
  );
  assert.equal(deps.state.updatedEvents.length, 2);
  assert.equal(
    deps.state.updatedEvents[1]?.startAt.toISOString(),
    oldStart.toISOString(),
  );
});

test("leaving an open request keeps its shared status requested", async () => {
  const session = fixture();
  const deps = dependencies(session);
  const audit = {
    capture: async (
      _definition: unknown,
      mutation: (tx: unknown) => Promise<unknown>,
    ) =>
      mutation({
        sessionRequestDecline: {
          upsert: async () => ({ id: "decline-1" }),
        },
      }),
  };
  const service = new SessionsService(
    deps.prisma as never,
    deps.notifications as never,
    deps.calendar as never,
    deps.availability as never,
    audit as never,
  );

  const result = await service.declineSession(trainer as never, session.id, {
    reason: "Calendar is unavailable",
  });
  assert.equal(result.status, SessionStatus.requested);
  assert.equal(result.declinedByCurrentUser, true);
});

test("entrepreneurs receive participant notes but never internal notes", async () => {
  const session = fixture({
    notesHistory: [
      {
        id: "internal",
        note: "Private BID follow-up",
        visibility: SessionNoteVisibility.internal,
        author: trainer,
        createdAt: new Date("2030-01-01T00:00:00.000Z"),
      },
      {
        id: "participant",
        note: "Bring the pricing model",
        visibility: SessionNoteVisibility.participant,
        author: trainer,
        createdAt: new Date("2030-01-01T00:00:00.000Z"),
      },
    ],
  });
  const deps = dependencies(session);
  const service = new SessionsService(
    deps.prisma as never,
    deps.notifications as never,
    deps.calendar as never,
    deps.availability as never,
    {} as never,
  );
  const entrepreneur = {
    id: "entrepreneur-1",
    role: UserRole.entrepreneur,
  };

  const result = await service.getSession(entrepreneur as never, session.id);
  assert.deepEqual(
    result.notesHistory.map((note) => note.id),
    ["participant"],
  );
});

test("an entrepreneur cancellation notifies the session owner with context", async () => {
  const session = fixture({
    ownerUserId: trainer.id,
    owner: trainer,
    status: SessionStatus.confirmed,
    calendarEventId: "google-event-1",
    meetingUrl: "https://meet.google.com/real-link",
  });
  const deps = dependencies(session);
  let notifications: Array<Record<string, unknown>> = [];
  const notificationService = {
    createNotification: async () => undefined,
    createNotifications: async (items: Array<Record<string, unknown>>) => {
      notifications = items;
    },
  };
  const audit = {
    capture: async (
      _definition: unknown,
      mutation: (tx: unknown) => Promise<unknown>,
    ) =>
      mutation({
        session: {
          update: async () => ({
            ...session,
            status: SessionStatus.cancelled,
            cancelledReason: "The founder is travelling",
          }),
        },
      }),
  };
  const service = new SessionsService(
    deps.prisma as never,
    notificationService as never,
    deps.calendar as never,
    deps.availability as never,
    audit as never,
  );
  const entrepreneur = {
    id: "entrepreneur-1",
    email: "entrepreneur@bid.org",
    firstName: "Eni",
    lastName: "Founder",
    role: UserRole.entrepreneur,
  };

  await service.cancelSession(entrepreneur as never, session.id, {
    reason: "The founder is travelling",
  });

  assert.equal(notifications.length, 1);
  assert.equal(notifications[0]?.recipientUserId, trainer.id);
  assert.match(String(notifications[0]?.title), /Pricing review/);
  assert.match(String(notifications[0]?.body), /founder is travelling/i);
  assert.match(String(notifications[0]?.body), /Africa\/Lagos/);
  assert.match(String(notifications[0]?.body), /11:00/);
});

test("open session requests format the schedule for each team recipient", async () => {
  const session = fixture();
  const deps = dependencies(session);
  const recipients = [
    {
      id: "trainer-lagos",
      role: UserRole.trainer,
      timezone: "Africa/Lagos",
    },
    {
      id: "admin-kigali",
      role: UserRole.admin,
      timezone: "Africa/Kigali",
    },
  ];
  let notifications: Array<Record<string, unknown>> = [];
  const service = new SessionsService(
    {
      ...deps.prisma,
      user: { findMany: async () => recipients },
    } as never,
    {
      createNotifications: async (items: Array<Record<string, unknown>>) => {
        notifications = items;
      },
    } as never,
    deps.calendar as never,
    deps.availability as never,
    {} as never,
  );

  await (service as any).notifyTeamOfSessionRequest(
    session.createdBy,
    session,
  );

  assert.equal(notifications.length, 2);
  assert.match(String(notifications[0]?.body), /11:00/);
  assert.match(String(notifications[0]?.body), /Africa\/Lagos/);
  assert.match(String(notifications[1]?.body), /12:00/);
  assert.match(String(notifications[1]?.body), /Africa\/Kigali/);
});

test("session confirmation copy uses a possessive label without an extra article", () => {
  const session = fixture({ owner: trainer });
  const deps = dependencies(session);
  const service = new SessionsService(
    deps.prisma as never,
    deps.notifications as never,
    deps.calendar as never,
    deps.availability as never,
    {} as never,
  );

  const body = (service as any).sessionConfirmedBody(
    trainer,
    session,
    "Africa/Accra",
  );

  assert.match(body, /confirmed your 1:1 mentor check-in/);
  assert.doesNotMatch(body, /your a mentor/);
});

test("BID team session messages are scoped to the session entrepreneur and requested channel", async () => {
  const session = fixture();
  const deps = dependencies(session);
  let notification: Record<string, unknown> | undefined;
  const service = new SessionsService(
    deps.prisma as never,
    {
      createNotification: async (input: Record<string, unknown>) => {
        notification = input;
        return {
          id: "notification-1",
          deliveries: [
            {
              channel: NotificationChannel.email,
              status: "pending",
            },
          ],
        };
      },
    } as never,
    deps.calendar as never,
    deps.availability as never,
    {} as never,
  );

  const result = await service.sendMessage(trainer as never, session.id, {
    subject: "Updated preparation details",
    message: "Please bring your latest pricing model to this session.",
    channel: "email",
    priority: "needs-response",
  });

  assert.equal(notification?.recipientUserId, session.entrepreneurUserId);
  assert.equal(notification?.actorUserId, trainer.id);
  assert.equal(notification?.type, NotificationType.session_reminder);
  assert.equal(notification?.severity, NotificationSeverity.warning);
  assert.equal(notification?.entityType, NotificationEntityType.session);
  assert.equal(
    notification?.actionUrl,
    `/entrepreneur/schedule?sessionId=${session.id}`,
  );
  assert.deepEqual(notification?.channels, [NotificationChannel.email]);
  assert.equal(result.deliveries[0]?.status, "pending");
});
