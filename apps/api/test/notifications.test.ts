import assert from "node:assert/strict";
import test from "node:test";
import {
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationEntityType,
  NotificationSeverity,
  NotificationType,
  UserRole,
} from "@prisma/client";
import { BadRequestException } from "@nestjs/common";
import { NotificationsService } from "../src/notifications/notifications.service";
import { NotificationDeliveryService } from "../src/notifications/notification-delivery.service";

const user = {
  id: "recipient-1",
  email: "member@bid.test",
  firstName: "BID",
  lastName: "Member",
  role: UserRole.entrepreneur,
};

test("notification creation honors company channel defaults and persists delivery state", async () => {
  let createdData: any;
  const prisma = {
    notificationPreference: { findMany: async () => [] },
    companySettings: {
      findUnique: async () => ({
        inAppNotificationsEnabledByDefault: true,
        emailNotificationsEnabledByDefault: false,
      }),
    },
    $transaction: async (operations: Promise<unknown>[]) =>
      Promise.all(operations),
    notification: {
      create: async ({ data }: { data: unknown }) => {
        createdData = data;
        return data;
      },
    },
  };
  const service = new NotificationsService(prisma as never);

  await service.createNotification({
    recipientUserId: user.id,
    type: NotificationType.system,
    title: "  Platform notice  ",
    body: "  Something changed.  ",
    entityType: NotificationEntityType.programme,
    entityId: "programme-1",
    actionUrl: "/entrepreneur/training?programmeId=programme-1",
    channels: [
      NotificationChannel.in_app,
      NotificationChannel.email,
      NotificationChannel.email,
    ],
  });

  assert.equal(createdData.title, "Platform notice");
  assert.equal(createdData.body, "Something changed.");
  assert.equal(createdData.deliveries.create.length, 2);
  assert.deepEqual(
    createdData.deliveries.create.map((item: any) => [
      item.channel,
      item.status,
    ]),
    [
      [NotificationChannel.in_app, NotificationDeliveryStatus.sent],
      [NotificationChannel.email, NotificationDeliveryStatus.skipped],
    ],
  );
});

test("notification action URLs cannot escape the BID Hub application", async () => {
  const prisma = {
    notificationPreference: { findMany: async () => [] },
    companySettings: { findUnique: async () => null },
    $transaction: async (operations: Promise<unknown>[]) =>
      Promise.all(operations),
    notification: {
      create: async () => {
        throw new Error("should not create");
      },
    },
  };
  const service = new NotificationsService(prisma as never);

  await assert.rejects(
    service.createNotification({
      recipientUserId: user.id,
      type: NotificationType.system,
      title: "Unsafe",
      body: "Unsafe action.",
      actionUrl: "https://example.com/steal-session",
    }),
    BadRequestException,
  );
});

test("notification list and read mutations are recipient and visible-channel scoped", async () => {
  let listWhere: any;
  let readWhere: any;
  const prisma = {
    notification: {
      findMany: async ({ where }: any) => {
        listWhere = where;
        return [];
      },
      updateMany: async ({ where }: any) => {
        readWhere = where;
        return { count: 1 };
      },
      findFirst: async () => ({
        id: "notification-1",
        type: NotificationType.system,
        title: "Notice",
        body: "Body",
        severity: NotificationSeverity.info,
        entityType: null,
        entityId: null,
        actionUrl: null,
        readAt: new Date(),
        actor: null,
        deliveries: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    },
  };
  const service = new NotificationsService(prisma as never);

  await service.listNotifications(user as never, { take: 20 });
  await service.markRead(user as never, "notification-1");

  assert.equal(listWhere.recipientUserId, user.id);
  assert.equal(
    listWhere.deliveries.some.status,
    NotificationDeliveryStatus.sent,
  );
  assert.equal(readWhere.recipientUserId, user.id);
  assert.equal(readWhere.deliveries.some.channel, NotificationChannel.in_app);
});

test("grouped notification preferences are role-scoped and preserve mixed channel state", async () => {
  const prisma = {
    notificationPreference: {
      findMany: async () => [
        {
          type: NotificationType.session_confirmed,
          inAppEnabled: false,
          emailEnabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    },
    companySettings: {
      findUnique: async () => ({
        inAppNotificationsEnabledByDefault: true,
        emailNotificationsEnabledByDefault: true,
      }),
    },
  };
  const service = new NotificationsService(prisma as never);

  const groups = await service.listPreferenceGroups(user as never);

  assert.deepEqual(
    groups.map((group) => group.group),
    ["sessions", "deliverables", "tools", "product"],
  );
  assert.equal(groups[0]?.inAppEnabled, null);
  assert.equal(groups[0]?.emailEnabled, true);
  assert.equal(
    groups.some((group) => group.group === "coaching"),
    false,
  );
});

test("group updates atomically upsert only notification types relevant to the user role", async () => {
  const upserts: any[] = [];
  const prisma = {
    notificationPreference: {
      upsert: (args: any) => {
        upserts.push(args);
        return Promise.resolve(args.create);
      },
      findMany: async () =>
        upserts.map((item) => ({
          ...item.create,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
    },
    companySettings: {
      findUnique: async () => ({
        inAppNotificationsEnabledByDefault: true,
        emailNotificationsEnabledByDefault: true,
      }),
    },
    $transaction: async (operations: Promise<unknown>[]) =>
      Promise.all(operations),
  };
  const service = new NotificationsService(prisma as never);

  const result = await service.updatePreferenceGroup(
    user as never,
    "sessions",
    { emailEnabled: false },
  );

  assert.equal(upserts.length, 5);
  assert.equal(
    upserts.some(
      (item) => item.create.type === NotificationType.session_request,
    ),
    false,
  );
  assert.equal(
    upserts.every((item) => item.update.emailEnabled === false),
    true,
  );
  assert.equal(
    upserts.every((item) => !("inAppEnabled" in item.update)),
    true,
  );
  assert.equal(result.group, "sessions");
  assert.equal(result.inAppEnabled, true);
  assert.equal(result.emailEnabled, false);
});

test("email worker claims a pending delivery and persists successful delivery", async () => {
  const updates: any[] = [];
  let updateManyCalls = 0;
  const delivery = {
    id: "delivery-1",
    notificationId: "notification-1",
    channel: NotificationChannel.email,
    status: NotificationDeliveryStatus.processing,
    attemptCount: 1,
    nextAttemptAt: null,
    sentAt: null,
    failedAt: null,
    failureReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    notification: {
      id: "notification-1",
      title: "Session confirmed",
      body: "Your session is ready.",
      actionUrl: "/entrepreneur/schedule?sessionId=session-1",
      recipient: user,
    },
  };
  const prisma = {
    notificationDelivery: {
      updateMany: async () => {
        updateManyCalls += 1;
        return { count: updateManyCalls === 1 ? 0 : 1 };
      },
      findMany: async () => [
        { id: delivery.id, status: NotificationDeliveryStatus.pending },
      ],
      findUnique: async () => delivery,
      update: async ({ data }: any) => {
        updates.push(data);
        return { ...delivery, ...data };
      },
    },
  };
  const sent: any[] = [];
  const email = {
    appUrl: (path = "") => `https://hub.bid.org${path}`,
    logoUrl: () => "https://hub.bid.org/bid-logo.png",
    send: async (message: any) => {
      sent.push(message);
      return { id: "mail-1" };
    },
  };
  const config = { getOrThrow: () => 5_000 };
  const worker = new NotificationDeliveryService(
    prisma as never,
    email as never,
  );

  const result = await worker.processPending();

  assert.equal(result.processed, 1);
  assert.equal(sent.length, 1);
  assert.equal(updates.at(-1).status, NotificationDeliveryStatus.sent);
  assert.ok(updates.at(-1).sentAt instanceof Date);
});
