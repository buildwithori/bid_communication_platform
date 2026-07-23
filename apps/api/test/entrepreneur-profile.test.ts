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

test('entrepreneur directory separates invited and active records', () => {
  const service = new EntrepreneursService({} as never, {} as never);
  const buildMembershipWhere = (
    service as unknown as {
      buildMembershipWhere: (
        user: { id: string; role: UserRole },
        query: { status: 'invited' | 'active' },
      ) => { AND: unknown[] };
    }
  ).buildMembershipWhere.bind(service);
  const admin = { id: 'admin-1', role: UserRole.admin };

  const invited = buildMembershipWhere(admin, { status: 'invited' });
  const active = buildMembershipWhere(admin, { status: 'active' });

  assert.deepEqual(invited.AND[1], { user: { status: 'pending' } });
  assert.deepEqual(active.AND[1], {
    business: { status: 'active' },
    user: { status: 'active' },
  });
});

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

  const filters = where as {
    entrepreneurUserId: string;
    AND: Array<{
      milestoneAchieved: boolean;
      OR: Array<{
        programme?: {
          is: {
            archivedAt: null;
            publishedAt: { not: null };
            startDate: { lte: Date };
          };
        };
      }>;
    }>;
  };
  assert.equal(filters.entrepreneurUserId, entrepreneurUser.id);
  assert.equal(filters.AND[0]?.milestoneAchieved, false);
  assert.deepEqual(filters.AND[0]?.OR[0], { programmeId: null });
  assert.equal(filters.AND[0]?.OR[1]?.programme?.is.archivedAt, null);
  assert.deepEqual(filters.AND[0]?.OR[1]?.programme?.is.publishedAt, {
    not: null,
  });
  assert.ok(filters.AND[0]?.OR[1]?.programme?.is.startDate.lte instanceof Date);
});

test('selectable programme access lookup excludes scheduled programmes in the database', async () => {
  let where: unknown;
  const prisma = {
    programmeAccessGrant: {
      findMany: async (args: { where: unknown }) => {
        where = args.where;
        return [];
      },
      count: async () => 0,
    },
    learnerProgrammeProgress: { findMany: async () => [] },
    $transaction: async (operations: Promise<unknown>[]) =>
      Promise.all(operations),
  };
  const service = new EntrepreneursService(prisma as never, {} as never);

  await service.listProgrammeAccess(
    entrepreneurUser as never,
    entrepreneurUser.id,
    { selectableOnly: true },
  );

  const accessWhere = where as {
    AND: Array<{
      programme?: {
        archivedAt: null;
        publishedAt: { not: null };
        startDate: { lte: Date };
      };
    }>;
  };
  const programmeFilter = accessWhere.AND.find((item) => item.programme);
  assert.equal(programmeFilter?.programme?.archivedAt, null);
  assert.deepEqual(programmeFilter?.programme?.publishedAt, { not: null });
  assert.ok(programmeFilter?.programme?.startDate.lte instanceof Date);
});

test('programme-linked entrepreneur records reject scheduled programme IDs', async () => {
  let where: unknown;
  const service = new EntrepreneursService(
    {
      programme: {
        findFirst: async (args: { where: unknown }) => {
          where = args.where;
          return null;
        },
      },
    } as never,
    {} as never,
  );
  const assertProgrammeAccess = (
    service as unknown as {
      assertProgrammeAccess: (
        entrepreneurUserId: string,
        programmeId: string,
      ) => Promise<void>;
    }
  ).assertProgrammeAccess.bind(service);

  await assert.rejects(
    assertProgrammeAccess(entrepreneurUser.id, 'scheduled-programme'),
    (error: unknown) =>
      error instanceof BadRequestException &&
      error.message ===
        'Select a started programme available to this entrepreneur.',
  );

  const programmeWhere = where as {
    archivedAt: null;
    publishedAt: { not: null };
    startDate: { lte: Date };
  };
  assert.equal(programmeWhere.archivedAt, null);
  assert.deepEqual(programmeWhere.publishedAt, { not: null });
  assert.ok(programmeWhere.startDate.lte instanceof Date);
});
