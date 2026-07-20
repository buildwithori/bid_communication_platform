import assert from 'node:assert/strict';
import test from 'node:test';
import { UserRole } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import { EntrepreneurManagementService } from '../src/entrepreneurs/entrepreneur-management.service';
import { EntrepreneursService } from '../src/entrepreneurs/entrepreneurs.service';

test('self-profile updates persist entrepreneur and business identity fields', async () => {
  const userUpdates: unknown[] = [];
  const businessUpdates: unknown[] = [];
  const entrepreneur = {
    id: 'entrepreneur-1',
    email: 'owner@example.com',
    firstName: 'Old',
    lastName: 'Name',
    role: UserRole.entrepreneur,
    businessMemberships: [{ business: { id: 'business-1' } }],
  };
  const transaction = {
    user: {
      update: async (args: unknown) => {
        userUpdates.push(args);
        return entrepreneur;
      },
    },
    business: {
      update: async (args: unknown) => {
        businessUpdates.push(args);
        return { id: 'business-1' };
      },
    },
  };
  const prisma = {
    user: { findFirst: async () => entrepreneur },
    sector: { count: async () => 1 },
    businessStage: { count: async () => 1 },
  };
  const audit = {
    capture: async (_metadata: unknown, operation: (tx: unknown) => unknown) =>
      operation(transaction),
  };
  const entrepreneurs = {
    getEntrepreneur: async () => ({ id: entrepreneur.id }),
  };
  const deliverableLifecycle = {
    syncInstancesForEntrepreneur: async () => undefined,
  };
  const service = new EntrepreneurManagementService(
    prisma as never,
    audit as never,
    {} as never,
    entrepreneurs as never,
    deliverableLifecycle as never,
  );

  await service.updateMyProfile(entrepreneur as never, {
    businessName: 'Flowsoft',
    firstName: 'David',
    lastName: 'Atebisun',
    phone: '+2347025918463',
    country: 'Ghana',
    timezone: 'Africa/Lagos',
  });

  assert.deepEqual(userUpdates, [
    {
      where: { id: entrepreneur.id },
      data: {
        firstName: 'David',
        lastName: 'Atebisun',
        phone: '+2347025918463',
        timezone: 'Africa/Lagos',
      },
    },
  ]);
  assert.deepEqual(businessUpdates, [
    {
      where: { id: 'business-1' },
      data: {
        name: 'Flowsoft',
        country: 'Ghana',
        sectorId: null,
        stageId: null,
      },
    },
  ]);
});

const entrepreneurUser = {
  id: 'entrepreneur-1',
  role: UserRole.entrepreneur,
};

const fundingPayload = {
  name: 'Seed round',
  amountCents: 100_000,
  currency: 'USD',
  date: '2026-07-20',
  programmeGoalId: 'goal-1',
};

test('fundraising rounds reject achieved programme goals', async () => {
  const service = new EntrepreneursService({
    programmeGoal: {
      findFirst: async () => ({
        id: 'goal-1',
        programmeId: null,
        milestoneAchieved: true,
        programme: null,
      }),
    },
  } as never, {} as never);

  await assert.rejects(
    service.createFundraisingRound(
      entrepreneurUser as never,
      entrepreneurUser.id,
      fundingPayload,
    ),
    (error: unknown) =>
      error instanceof BadRequestException &&
      error.message ===
        'An achieved goal cannot be linked to a fundraising round.',
  );
});

test('fundraising rounds reject goals belonging to archived programmes', async () => {
  const service = new EntrepreneursService({
    programmeGoal: {
      findFirst: async () => ({
        id: 'goal-1',
        programmeId: 'programme-1',
        milestoneAchieved: false,
        programme: { archivedAt: new Date('2026-07-01') },
      }),
    },
  } as never, {} as never);

  await assert.rejects(
    service.createFundraisingRound(
      entrepreneurUser as never,
      entrepreneurUser.id,
      fundingPayload,
    ),
    (error: unknown) =>
      error instanceof BadRequestException &&
      error.message ===
        'A goal from an archived programme cannot be linked to a fundraising round.',
  );
});

test('linkable goal lookup filters achieved and archived-programme goals in the database', async () => {
  let where: unknown;
  const prisma = {
    programmeGoal: {
      findMany: async (args: { where: unknown }) => {
        where = args.where;
        return [];
      },
      count: async () => 0,
    },
    $transaction: async (operations: Promise<unknown>[]) =>
      Promise.all(operations),
  };
  const service = new EntrepreneursService(prisma as never, {} as never);

  await service.listProgrammeGoals(
    entrepreneurUser as never,
    entrepreneurUser.id,
    { linkableOnly: true },
  );

  assert.deepEqual(where, {
    entrepreneurUserId: entrepreneurUser.id,
    AND: [
      {
        milestoneAchieved: false,
        OR: [
          { programmeId: null },
          { programme: { is: { archivedAt: null } } },
        ],
      },
    ],
  });
});
