const { PrismaClient } = require('@prisma/client');
const { randomBytes, scrypt: scryptCallback } = require('crypto');
const { promisify } = require('util');

const prisma = new PrismaClient();
const scrypt = promisify(scryptCallback);

const DEV_PASSWORD = 'Password123!';

const users = {
  admin: {
    email: 'admin@bid.org',
    firstName: 'Ama',
    lastName: 'Darko',
    phone: '+233 20 000 0001',
  },
  trainer: {
    email: 'trainer@bid.org',
    firstName: 'Kofi',
    lastName: 'Mensah',
    phone: '+233 20 000 0002',
    roleLabel: 'trainer',
    specialismKeys: ['fintech'],
  },
  entrepreneur: {
    email: 'entrepreneur@bid.org',
    firstName: 'Amara',
    lastName: 'Osei',
    phone: '+233 20 000 0003',
    businessId: 'seed-business-paybridge',
    businessName: 'PayBridge Africa Ltd',
    country: 'Ghana',
    sectorKey: 'fintech',
    stageKey: 'growth',
  },
};

const sectors = [
  ['Fintech', 'fintech'],
  ['Agritech', 'agritech'],
  ['Healthtech', 'healthtech'],
  ['Edtech', 'edtech'],
  ['Logistics', 'logistics'],
  ['Construction', 'construction'],
  ['Renewable Energy', 'renewable-energy'],
];

const stages = [
  ['Idea', 'idea', 'Early concept stage, pre-revenue, validating problem and solution fit.'],
  ['Growth', 'growth', 'Business has validated revenue and is actively scaling operations.'],
  ['Scale', 'scale', 'Established business expanding into new markets, products, or team size.'],
];

const goalTypes = [
  ['Fundraising target', 'fundraising-target', 'Capital raise target tracked against linked fundraising rounds.', true],
  ['Programme completion', 'programme-completion', 'Completion target for an assigned programme.', false],
  ['Milestone', 'milestone', 'Programme-specific business milestone tracked by BID and the entrepreneur.', false],
];

const toolAreas = [
  ['Fundraising', 'fundraising'],
  ['Finance', 'finance'],
  ['Operations', 'operations'],
  ['Pitching', 'pitching'],
  ['Legal', 'legal'],
  ['Market research', 'market-research'],
];

async function hashPassword(password) {
  const salt = randomBytes(16).toString('base64url');
  const derived = await scrypt(password, salt, 64);
  return `scrypt:${salt}:${derived.toString('base64url')}`;
}

async function upsertUser(role, seed, invitedById = null) {
  const passwordHash = await hashPassword(DEV_PASSWORD);

  return prisma.user.upsert({
    where: { email: seed.email },
    update: {
      firstName: seed.firstName,
      lastName: seed.lastName,
      phone: seed.phone,
      passwordHash,
      role,
      status: 'active',
      emailVerifiedAt: new Date(),
      invitedById,
    },
    create: {
      email: seed.email,
      passwordHash,
      firstName: seed.firstName,
      lastName: seed.lastName,
      phone: seed.phone,
      role,
      status: 'active',
      emailVerifiedAt: new Date(),
      invitedById,
    },
  });
}

async function seedCompanySettings() {
  await prisma.companySettings.upsert({
    where: { singletonKey: 'default' },
    update: {
      periodicUpdateOverdueAfterDays: 30,
      moduleCompletionDeliverableDueDays: 7,
      defaultCurrency: 'USD',
      defaultTimezone: 'Africa/Accra',
      defaultSessionProvider: 'google_meet',
      inAppNotificationsEnabledByDefault: true,
      emailNotificationsEnabledByDefault: true,
      reminderNotificationsEnabledByDefault: true,
      weeklyDigestEnabledByDefault: false,
    },
    create: {
      singletonKey: 'default',
      periodicUpdateOverdueAfterDays: 30,
      moduleCompletionDeliverableDueDays: 7,
      defaultCurrency: 'USD',
      defaultTimezone: 'Africa/Accra',
      defaultSessionProvider: 'google_meet',
      inAppNotificationsEnabledByDefault: true,
      emailNotificationsEnabledByDefault: true,
      reminderNotificationsEnabledByDefault: true,
      weeklyDigestEnabledByDefault: false,
    },
  });
}

async function seedLookups() {
  for (const [name, key] of sectors) {
    await prisma.sector.upsert({
      where: { key },
      update: { name, active: true },
      create: { name, key, active: true },
    });
  }

  for (const [name, key, definition] of stages) {
    await prisma.businessStage.upsert({
      where: { key },
      update: { name, definition, active: true },
      create: { name, key, definition, active: true },
    });
  }

  for (const [name, key, description, requiresTargetAmount] of goalTypes) {
    await prisma.programmeGoalType.upsert({
      where: { key },
      update: { name, description, requiresTargetAmount, active: true },
      create: { name, key, description, requiresTargetAmount, active: true },
    });
  }

  for (const [name, key] of toolAreas) {
    await prisma.toolArea.upsert({
      where: { key },
      update: { name, active: true },
      create: { name, key, active: true },
    });
  }
}

async function seedTrainer(adminUserId) {
  const trainer = await upsertUser('trainer', users.trainer, adminUserId);

  await prisma.trainerCapability.upsert({
    where: { userId: trainer.id },
    update: {
      roleLabel: users.trainer.roleLabel,
      accessLevel: 'full',
      accessExpiresOn: null,
      status: 'active',
    },
    create: {
      userId: trainer.id,
      roleLabel: users.trainer.roleLabel,
      accessLevel: 'full',
      status: 'active',
    },
  });

  for (const sectorKey of users.trainer.specialismKeys) {
    const sector = await prisma.sector.findUnique({ where: { key: sectorKey } });
    if (!sector) continue;

    await prisma.trainerSpecialism.upsert({
      where: { userId_sectorId: { userId: trainer.id, sectorId: sector.id } },
      update: {},
      create: { userId: trainer.id, sectorId: sector.id },
    });
  }

  return trainer;
}

async function seedEntrepreneur() {
  const entrepreneur = await upsertUser('entrepreneur', users.entrepreneur);
  const sector = await prisma.sector.findUnique({ where: { key: users.entrepreneur.sectorKey } });
  const stage = await prisma.businessStage.findUnique({ where: { key: users.entrepreneur.stageKey } });

  await prisma.business.upsert({
    where: { id: users.entrepreneur.businessId },
    update: {
      name: users.entrepreneur.businessName,
      country: users.entrepreneur.country,
      sectorId: sector?.id ?? null,
      stageId: stage?.id ?? null,
      source: 'self_registered',
      status: 'active',
      onboardingCompletedAt: new Date(),
    },
    create: {
      id: users.entrepreneur.businessId,
      name: users.entrepreneur.businessName,
      country: users.entrepreneur.country,
      sectorId: sector?.id ?? null,
      stageId: stage?.id ?? null,
      source: 'self_registered',
      status: 'active',
      onboardingCompletedAt: new Date(),
    },
  });

  await prisma.businessMembership.upsert({
    where: {
      userId_businessId: {
        userId: entrepreneur.id,
        businessId: users.entrepreneur.businessId,
      },
    },
    update: {
      relationship: 'representative',
      isPrimary: true,
    },
    create: {
      userId: entrepreneur.id,
      businessId: users.entrepreneur.businessId,
      relationship: 'representative',
      isPrimary: true,
    },
  });

  return entrepreneur;
}

async function main() {
  await seedCompanySettings();
  await seedLookups();

  const admin = await upsertUser('admin', users.admin);
  await seedTrainer(admin.id);
  await seedEntrepreneur();
}

main()
  .then(async () => {
    console.log('Seed complete: admin, trainer, entrepreneur, company settings, and lookup data are ready.');
    console.log(`Admin: ${users.admin.email} / ${DEV_PASSWORD}`);
    console.log(`Trainer: ${users.trainer.email} / ${DEV_PASSWORD}`);
    console.log(`Entrepreneur: ${users.entrepreneur.email} / ${DEV_PASSWORD}`);
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
