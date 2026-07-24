import assert from "node:assert/strict";
import test from "node:test";
import {
  InvitationStatus,
  TrainerCapabilityStatus,
  UserRole,
  UserStatus,
} from "@prisma/client";
import { AdminsService } from "../src/admins/admins.service";
import { AuthService } from "../src/auth/auth.service";
import { EntrepreneurManagementService } from "../src/entrepreneurs/entrepreneur-management.service";
import { TrainerManagementService } from "../src/trainers/trainer-management.service";

const invitationBase = {
  id: "invitation-1",
  email: "member@bid.test",
  status: InvitationStatus.pending,
  expiresAt: new Date("2099-01-01T00:00:00.000Z"),
};

function pendingUser(role: UserRole) {
  return {
    id: `${role}-1`,
    email: `${role}@bid.test`,
    firstName: "BID",
    lastName: role === UserRole.entrepreneur ? "Founder" : "Member",
    role,
    status: UserStatus.pending,
  };
}

function auditWith(transactionClient: Record<string, unknown>) {
  return {
    capture: async (
      _details: unknown,
      operation: (tx: Record<string, unknown>) => Promise<unknown>,
    ) => operation(transactionClient),
  };
}

test("accepting an entrepreneur invitation queues the entrepreneur welcome", async () => {
  const entrepreneur = pendingUser(UserRole.entrepreneur);
  const sent: Array<{ to: string; name: string }> = [];
  const tx = {
    user: {
      update: async () => ({ ...entrepreneur, status: UserStatus.active }),
    },
    invitation: {
      update: async () => ({}),
      updateMany: async () => ({ count: 0 }),
    },
  };
  const service = new EntrepreneurManagementService(
    {
      invitation: {
        findUnique: async () => ({
          ...invitationBase,
          email: entrepreneur.email,
          role: UserRole.entrepreneur,
        }),
      },
      user: { findUnique: async () => entrepreneur },
    } as never,
    auditWith(tx) as never,
    {
      sendWelcome: async (to: string, name: string) => {
        sent.push({ to, name });
      },
    } as never,
    {
      getEntrepreneur: async () => ({ id: entrepreneur.id }),
    } as never,
    {} as never,
  );

  await service.acceptInvitation({
    token: "entrepreneur-token",
    password: "Password123!",
  });

  assert.deepEqual(sent, [
    { to: entrepreneur.email, name: "BID Founder" },
  ]);
});

test("accepting a trainer invitation queues the trainer welcome", async () => {
  const trainer = pendingUser(UserRole.trainer);
  const sent: Array<{ to: string; name: string }> = [];
  const tx = {
    user: {
      update: async () => ({ ...trainer, status: UserStatus.active }),
    },
    trainerCapability: {
      update: async () => ({ status: TrainerCapabilityStatus.active }),
    },
    invitation: {
      update: async () => ({}),
      updateMany: async () => ({ count: 0 }),
    },
  };
  const service = new TrainerManagementService(
    {
      invitation: {
        findUnique: async () => ({
          ...invitationBase,
          email: trainer.email,
          role: UserRole.trainer,
        }),
      },
      user: { findUnique: async () => trainer },
    } as never,
    auditWith(tx) as never,
    {
      sendWelcome: async (to: string, name: string) => {
        sent.push({ to, name });
      },
    } as never,
    { getTrainer: async () => ({ id: trainer.id }) } as never,
  );

  await service.acceptInvitation({
    token: "trainer-token",
    password: "Password123!",
  });

  assert.deepEqual(sent, [{ to: trainer.email, name: "BID Member" }]);
});

test("accepting an admin invitation queues the admin welcome", async () => {
  const admin = pendingUser(UserRole.admin);
  const sent: Array<{ to: string; name: string }> = [];
  const tx = {
    user: {
      update: async () => ({ ...admin, status: UserStatus.active }),
    },
    invitation: {
      update: async () => ({}),
      updateMany: async () => ({ count: 0 }),
    },
  };
  const service = new AdminsService(
    {
      invitation: {
        findUnique: async () => ({
          ...invitationBase,
          email: admin.email,
          role: UserRole.admin,
        }),
      },
      user: { findUnique: async () => admin },
    } as never,
    auditWith(tx) as never,
    {
      sendWelcome: async (to: string, name: string) => {
        sent.push({ to, name });
      },
    } as never,
  );
  (
    service as unknown as {
      mapAdmin: (value: unknown) => unknown;
    }
  ).mapAdmin = (value) => value;

  await service.acceptInvitation({
    token: "admin-token",
    password: "Password123!",
  });

  assert.deepEqual(sent, [{ to: admin.email, name: "BID Member" }]);
});

test("email verification waits for the welcome job to be accepted", async () => {
  const entrepreneur = {
    ...pendingUser(UserRole.entrepreneur),
    emailVerifiedAt: null,
    phone: null,
    timezone: null,
  };
  const enqueueFailure = new Error("Email queue is unavailable");
  const service = new AuthService(
    {
      emailVerificationToken: {
        findUnique: async () => ({
          id: "verification-1",
          userId: entrepreneur.id,
          consumedAt: null,
          expiresAt: new Date("2099-01-01T00:00:00.000Z"),
        }),
      },
      $transaction: async (
        operation: (tx: Record<string, unknown>) => Promise<unknown>,
      ) =>
        operation({
          user: {
            update: async () => ({
              ...entrepreneur,
              status: UserStatus.active,
              emailVerifiedAt: new Date(),
            }),
          },
          emailVerificationToken: { update: async () => ({}) },
        }),
    } as never,
    {
      sendWelcome: async () => {
        throw enqueueFailure;
      },
    } as never,
    {} as never,
  );

  await assert.rejects(
    service.verifyEmail({ token: "verification-token" }),
    enqueueFailure,
  );
});

test("admin invitations persist the supplied phone number", async () => {
  let createdUserData: Record<string, unknown> | undefined;
  const created = {
    ...pendingUser(UserRole.admin),
    email: "new-admin@bid.test",
    firstName: "New",
    lastName: "Admin",
    phone: "+250 700 000 001",
  };
  const service = new AdminsService(
    {
      user: {
        findUnique: async () => null,
      },
    } as never,
    auditWith({
      user: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          createdUserData = data;
          return created;
        },
      },
      invitation: { create: async () => ({}) },
    }) as never,
    { sendInvitation: async () => undefined } as never,
  );
  (service as unknown as { get: (id: string) => Promise<unknown> }).get =
    async () => created;

  await service.invite(pendingUser(UserRole.admin) as never, {
    firstName: "New",
    lastName: "Admin",
    email: created.email,
    phone: "  +250 700 000 001  ",
  });

  assert.equal(createdUserData?.phone, "+250 700 000 001");
});

test("trainer invitations persist the supplied phone number", async () => {
  let createdUserData: Record<string, unknown> | undefined;
  const created = {
    ...pendingUser(UserRole.trainer),
    email: "new-trainer@bid.test",
    firstName: "New",
    lastName: "Trainer",
    phone: "+250 700 000 002",
  };
  const service = new TrainerManagementService(
    {
      user: {
        findUnique: async () => null,
      },
    } as never,
    auditWith({
      user: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          createdUserData = data;
          return created;
        },
      },
      trainerCapability: { create: async () => ({}) },
      trainerSpecialism: { createMany: async () => ({ count: 0 }) },
      invitation: { create: async () => ({}) },
    }) as never,
    { sendInvitation: async () => undefined } as never,
    { getTrainer: async () => created } as never,
  );

  await service.invite(pendingUser(UserRole.admin) as never, {
    firstName: "New",
    lastName: "Trainer",
    email: created.email,
    phone: "  +250 700 000 002  ",
    roleLabel: "trainer",
    accessLevel: "full",
    sectorIds: [],
  });

  assert.equal(createdUserData?.phone, "+250 700 000 002");
});
