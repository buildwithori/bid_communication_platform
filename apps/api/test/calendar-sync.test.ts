import assert from "node:assert/strict";
import test from "node:test";
import {
  CalendarAttendeeResponseStatus,
  CalendarProvisioningStatus,
  NotificationType,
  SessionStatus,
  UserRole,
} from "@prisma/client";
import { createHash } from "node:crypto";
import { CalendarSyncService } from "../src/calendar/calendar-sync.service";

function sessionFixture() {
  return {
    id: "session-1",
    topic: "Pricing review",
    calendarEventId: "google-event-1",
    calendarEventEtag: '"old"',
    calendarResponseStatus: CalendarAttendeeResponseStatus.needs_action,
    ownerUserId: "trainer-1",
    entrepreneurUserId: "entrepreneur-1",
    entrepreneur: {
      id: "entrepreneur-1",
      email: "founder@example.com",
      firstName: "Ada",
      lastName: "Founder",
    },
    owner: {
      id: "trainer-1",
      firstName: "Tola",
      lastName: "Trainer",
      role: UserRole.trainer,
    },
  };
}

function service() {
  const state = {
    sessionUpdates: [] as Array<Record<string, unknown>>,
    externalDeletions: [] as Array<Record<string, unknown>>,
    auditEvents: [] as Array<Record<string, unknown>>,
    notifications: [] as Array<Record<string, unknown>>,
  };
  const tx = {
    session: {
      updateMany: async (args: Record<string, unknown>) => {
        state.sessionUpdates.push(args);
        return { count: 1 };
      },
    },
    externalResourceDeletion: {
      createMany: async (args: { data: Array<Record<string, unknown>> }) => {
        state.externalDeletions.push(...args.data);
        return { count: args.data.length };
      },
    },
  };
  const prisma = {
    $transaction: async (operation: (client: typeof tx) => Promise<unknown>) =>
      operation(tx),
    session: tx.session,
  };
  const audit = {
    enqueue: async (event: Record<string, unknown>) => {
      state.auditEvents.push(event);
    },
  };
  const notifications = {
    createNotification: async (notification: Record<string, unknown>) => {
      state.notifications.push(notification);
    },
    createNotifications: async (entries: Array<Record<string, unknown>>) => {
      state.notifications.push(...entries);
      return entries;
    },
  };
  const integration = {
    trackWebhook: async (
      _details: unknown,
      operation: () => Promise<unknown>,
    ) => operation(),
  };
  const sync = new CalendarSyncService(
    prisma as never,
    {} as never,
    {} as never,
    audit as never,
    notifications as never,
    integration as never,
  );
  return { sync, state };
}

test("a declined Google RSVP cancels the BID session and queues event cleanup", async () => {
  const { sync, state } = service();
  const changed = await (
    sync as unknown as {
      applyCalendarState: (
        session: ReturnType<typeof sessionFixture>,
        event: {
          eventEtag: string;
          eventStatus: string;
          responseStatus: CalendarAttendeeResponseStatus;
          responseUpdatedAt: Date;
        },
      ) => Promise<boolean>;
    }
  ).applyCalendarState(sessionFixture(), {
    eventEtag: '"new"',
    eventStatus: "confirmed",
    responseStatus: CalendarAttendeeResponseStatus.declined,
    responseUpdatedAt: new Date("2030-01-01T00:00:00.000Z"),
  });

  assert.equal(changed, true);
  assert.equal(
    (state.sessionUpdates[0]?.data as { status: SessionStatus }).status,
    SessionStatus.cancelled,
  );
  assert.equal(state.externalDeletions[0]?.externalId, "google-event-1");
  assert.equal(
    state.auditEvents[0]?.action,
    "session.cancelled_by_calendar_response",
  );
  assert.equal(state.notifications.length, 2);
  assert.ok(
    state.notifications.every(
      (entry) => entry.type === NotificationType.session_cancelled,
    ),
  );
});

test("accepted and tentative responses stay separate from booking status", async () => {
  const { sync, state } = service();
  const changed = await (
    sync as unknown as {
      applyCalendarState: (
        session: ReturnType<typeof sessionFixture>,
        event: {
          eventEtag: string;
          eventStatus: string;
          responseStatus: CalendarAttendeeResponseStatus;
          responseUpdatedAt: Date;
        },
      ) => Promise<boolean>;
    }
  ).applyCalendarState(sessionFixture(), {
    eventEtag: '"accepted"',
    eventStatus: "confirmed",
    responseStatus: CalendarAttendeeResponseStatus.accepted,
    responseUpdatedAt: new Date("2030-01-01T00:00:00.000Z"),
  });

  assert.equal(changed, true);
  const data = state.sessionUpdates[0]?.data as {
    status?: SessionStatus;
    calendarResponseStatus: CalendarAttendeeResponseStatus;
  };
  assert.equal(data.status, undefined);
  assert.equal(
    data.calendarResponseStatus,
    CalendarAttendeeResponseStatus.accepted,
  );
  assert.equal(state.externalDeletions.length, 0);
  assert.equal(state.notifications.length, 1);
});

test("the authenticated initial watch notification is safe during registration", async () => {
  const token = "google-channel-token";
  let enqueued = false;
  const sync = new CalendarSyncService(
    {
      calendarConnection: {
        findUnique: async () => ({
          id: "connection-1",
          watchResourceId: null,
          watchTokenHash: createHash("sha256").update(token).digest("hex"),
        }),
      },
    } as never,
    {
      channelTokenHash: (value: string) =>
        createHash("sha256").update(value).digest("hex"),
    } as never,
    {
      enqueueConnection: async () => {
        enqueued = true;
      },
    } as never,
    {} as never,
    {} as never,
    {
      trackWebhook: async (
        _details: unknown,
        operation: () => Promise<unknown>,
      ) => operation(),
    } as never,
  );

  await sync.receiveNotification({
    channelId: "channel-1",
    channelToken: token,
    resourceId: "resource-arrives-in-watch-response",
    resourceState: "sync",
    messageNumber: "1",
  });

  assert.equal(enqueued, false);
});

test("calendar provisioning creates the organizer event asynchronously and records readiness", async () => {
  const updates: Array<Record<string, unknown>> = [];
  let created = 0;
  const sync = new CalendarSyncService(
    {
      session: {
        updateMany: async (args: Record<string, unknown>) => {
          updates.push(args);
          return { count: 1 };
        },
        findUnique: async () => ({
          id: "session-1",
          ownerUserId: "trainer-1",
          entrepreneurUserId: "entrepreneur-1",
          topic: "Pricing review",
          notes: null,
          startAt: new Date("2030-01-07T10:00:00.000Z"),
          endAt: new Date("2030-01-07T11:00:00.000Z"),
          timezone: "Africa/Kigali",
          entrepreneur: { email: "founder@non-google.example" },
        }),
      },
    } as never,
    {
      createSessionEvent: async () => {
        created += 1;
        return {
          eventId: "google-event-1",
          eventEtag: '"etag"',
          meetingUrl: "https://meet.google.com/example",
          responseStatus: CalendarAttendeeResponseStatus.needs_action,
          responseUpdatedAt: new Date("2030-01-01T00:00:00.000Z"),
        };
      },
    } as never,
    {} as never,
    { enqueue: async () => undefined } as never,
    {} as never,
    {} as never,
  );

  const result = await sync.provisionSessionCalendar("session-1");

  assert.deepEqual(result, { provisioned: true });
  assert.equal(created, 1);
  assert.equal(
    (updates[0]?.data as { calendarProvisioningStatus: string })
      .calendarProvisioningStatus,
    CalendarProvisioningStatus.processing,
  );
  assert.equal(
    (updates[1]?.data as { calendarProvisioningStatus: string })
      .calendarProvisioningStatus,
    CalendarProvisioningStatus.ready,
  );
  assert.equal(
    (updates[1]?.data as { calendarEventId: string }).calendarEventId,
    "google-event-1",
  );
});
