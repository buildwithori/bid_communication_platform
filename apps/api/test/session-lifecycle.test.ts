import assert from "node:assert/strict";
import test from "node:test";
import { ConflictException } from "@nestjs/common";
import {
  SessionNoteVisibility,
  SessionSource,
  SessionStatus,
  SessionTargetType,
  SessionType,
  UserRole,
} from "@prisma/client";
import { SessionsService } from "../src/sessions/sessions.service";

const trainer = {
  id: "trainer-1",
  email: "trainer@bid.org",
  firstName: "Tola",
  lastName: "Trainer",
  role: UserRole.trainer,
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
    type: SessionType.mentor_checkin,
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
