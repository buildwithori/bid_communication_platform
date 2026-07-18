import assert from 'node:assert/strict';
import test from 'node:test';
import { UserRole } from '@prisma/client';
import { EntrepreneurManagementService } from '../src/entrepreneurs/entrepreneur-management.service';

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
