import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { AuditOutboxStatus, UserRole, UserStatus } from "@prisma/client";
import { AuditService } from "../src/audit/audit.service";
import { GoogleAuthService } from "../src/auth/google-auth.service";
import { JobSchedulerService } from "../src/jobs/job-scheduler.service";
import { JOB_NAMES } from "../src/jobs/jobs.constants";
import { TransactionalEmailProcessor } from "../src/jobs/processors/transactional-email.processor";
import { redisConnectionFromUrl } from "../src/jobs/redis-connection";
import { TransactionalEmailQueueService } from "../src/jobs/transactional-email-queue.service";

test("send-capable email transport is registered only in the worker process", () => {
  const source = (path: string) =>
    readFileSync(join(__dirname, "..", "src", path), "utf8");

  assert.doesNotMatch(source("app.module.ts"), /EmailModule/);
  assert.match(source("jobs/worker.module.ts"), /EmailModule/);
  assert.doesNotMatch(source("admins/admins.module.ts"), /EmailModule/);
  assert.doesNotMatch(source("trainers/trainers.module.ts"), /EmailModule/);
  assert.doesNotMatch(
    source("entrepreneurs/entrepreneurs.module.ts"),
    /EmailModule/,
  );
});

test("Redis URLs are parsed for authenticated TLS BullMQ connections", () => {
  const connection: any = redisConnectionFromUrl(
    "rediss://queue-user:queue%20password@redis.example.com:6380/3",
  );

  assert.equal(connection.host, "redis.example.com");
  assert.equal(connection.port, 6380);
  assert.equal(connection.username, "queue-user");
  assert.equal(connection.password, "queue password");
  assert.equal(connection.db, 3);
  assert.deepEqual(connection.tls, {});
  assert.equal(connection.maxRetriesPerRequest, null);
});

test("API bootstrap upserts one scheduler per periodic workflow and kicks each queue", async () => {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const queue = () => ({
    upsertJobScheduler: async (...args: unknown[]) => {
      calls.push({ method: "schedule", args });
      return {};
    },
    add: async (...args: unknown[]) => {
      calls.push({ method: "add", args });
      return {};
    },
  });
  const configValues: Record<string, number> = {
    AUDIT_PROCESS_INTERVAL_MS: 5_000,
    NOTIFICATION_DELIVERY_INTERVAL_MS: 5_000,
    DELIVERABLE_RECURRENCE_INTERVAL_MS: 900_000,
  };
  const scheduler = new JobSchedulerService(
    queue() as never,
    queue() as never,
    queue() as never,
    { getOrThrow: (key: string) => configValues[key] } as never,
  );

  await scheduler.onApplicationBootstrap();

  assert.equal(calls.filter((call) => call.method === "schedule").length, 3);
  assert.equal(calls.filter((call) => call.method === "add").length, 3);
  assert.deepEqual(
    calls
      .filter((call) => call.method === "schedule")
      .map((call) => call.args[0]),
    [
      "audit-outbox-scheduler",
      "notification-delivery-scheduler",
      "recurring-deliverables-scheduler",
    ],
  );
});

test("transactional email producer applies bounded retries and removes successful secret-bearing jobs", async () => {
  let added: { name: string; data: unknown; options: any } | undefined;
  const service = new TransactionalEmailQueueService({
    add: async (name: string, data: unknown, options: unknown) => {
      added = { name, data, options };
      return {};
    },
  } as never);

  await service.enqueue(JOB_NAMES.authPasswordResetEmail, {
    to: "member@bid.test",
    name: "BID Member",
    token: "secret-reset-token",
  });

  assert.equal(added?.name, JOB_NAMES.authPasswordResetEmail);
  assert.equal(added?.options.attempts, 5);
  assert.equal(added?.options.backoff.type, "exponential");
  assert.equal(added?.options.removeOnComplete, true);
  assert.equal(added?.options.removeOnFail.age, 86_400);
});

test("transactional email processor renders env-rooted module templates", async () => {
  const sent: any[] = [];
  const email = {
    appUrl: (path = "") => `https://hub.bid.org${path}`,
    logoUrl: () => "https://hub.bid.org/bid-logo.png",
    send: async (message: unknown) => {
      sent.push(message);
      return { id: "email-1" };
    },
  };
  const processor = new TransactionalEmailProcessor(email as never);

  await processor.process({
    name: JOB_NAMES.authVerificationEmail,
    data: {
      to: "member@bid.test",
      name: "BID Member",
      token: "verification token",
    },
  } as never);

  assert.equal(sent.length, 1);
  assert.equal(sent[0].subject, "Verify your BID Hub email");
  assert.equal(
    sent[0].template.props.url,
    "https://hub.bid.org/auth/verify-email?token=verification%20token&email=member%40bid.test",
  );
  assert.equal(
    sent[0].template.props.logoUrl,
    "https://hub.bid.org/bid-logo.png",
  );
});

test("audit processing recovers stale locks and schedules failed event retries", async () => {
  const event = {
    id: "outbox-1",
    eventKey: "event-1",
    actorUserId: null,
    action: "test.action",
    entityType: "test",
    entityId: "entity-1",
    summary: "Test",
    payload: null,
    status: AuditOutboxStatus.pending,
    attempts: 0,
    lockedAt: null,
    processedAt: null,
    nextAttemptAt: null,
    error: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const outerUpdates: any[] = [];
  const prisma = {
    auditOutbox: {
      updateMany: async (args: unknown) => {
        outerUpdates.push(args);
        return { count: 1 };
      },
      findMany: async () => [event],
    },
    $transaction: async (callback: (tx: any) => Promise<unknown>) =>
      callback({
        auditOutbox: { update: async () => ({}) },
        auditLog: {
          findUnique: async () => null,
          create: async () => {
            throw new Error("temporary database failure");
          },
        },
      }),
  };
  const audit = new AuditService(
    prisma as never,
    { get: () => undefined } as never,
  );

  const result = await audit.processPending();

  assert.deepEqual(result, {
    processed: 0,
    failed: 1,
    total: 1,
    hasMore: false,
  });
  assert.equal(outerUpdates[0].where.status, AuditOutboxStatus.processing);
  const retryUpdate = outerUpdates.at(-1);
  assert.equal(retryUpdate.data.status, AuditOutboxStatus.failed);
  assert.ok(retryUpdate.data.nextAttemptAt instanceof Date);
  assert.match(retryUpdate.data.error, /temporary database failure/);
});

test("Google onboarding queues one welcome email when the workspace becomes ready", async () => {
  const user = {
    id: "entrepreneur-1",
    email: "founder@example.com",
    firstName: "Google",
    lastName: "Founder",
    phone: null,
    role: UserRole.entrepreneur,
    status: UserStatus.active,
    emailVerifiedAt: new Date(),
  };
  let onboardingCompletedAt: Date | null = null;
  const sent: Array<{ to: string; name: string }> = [];

  const membership = () => ({
    id: "membership-1",
    userId: user.id,
    businessId: "business-1",
    isPrimary: true,
    business: {
      id: "business-1",
      onboardingCompletedAt,
    },
  });
  const transactionClient = {
    user: {
      update: async () => user,
    },
    businessMembership: {
      findFirst: async () => membership(),
      create: async () => ({}),
    },
    business: {
      updateMany: async () => {
        if (onboardingCompletedAt) return { count: 0 };
        onboardingCompletedAt = new Date();
        return { count: 1 };
      },
      update: async () => ({}),
      create: async () => ({ id: "business-1" }),
    },
  };
  const prisma = {
    user: {
      findUniqueOrThrow: async () => user,
    },
    businessMembership: {
      findFirst: async () => membership(),
    },
    $transaction: async (callback: (tx: any) => Promise<unknown>) =>
      callback(transactionClient),
  };
  const service = new GoogleAuthService(
    {} as never,
    prisma as never,
    {} as never,
    {
      syncInstancesForEntrepreneur: async () => ({ created: 0 }),
    } as never,
    {
      sendWelcome: async (to: string, name: string) => {
        sent.push({ to, name });
        return {};
      },
    } as never,
    {
      trackOutbound: async (
        _details: unknown,
        operation: () => Promise<unknown>,
      ) => operation(),
    } as never,
  );
  const details = {
    businessName: "Founder Labs",
    representativeName: "David Founder",
    email: user.email,
    country: "Ghana",
    phone: "+233200000000",
  };

  const result = await service.completeOnboarding(user.id, details);
  await service.completeOnboarding(user.id, details);

  assert.equal(result.user.onboardingRequired, false);
  assert.deepEqual(sent, [{ to: user.email, name: "David" }]);
});
