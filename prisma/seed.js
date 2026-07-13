const { PrismaClient } = require('@prisma/client');
const { randomBytes, scrypt: scryptCallback } = require('crypto');
const { promisify } = require('util');

const prisma = new PrismaClient();
const scrypt = promisify(scryptCallback);
const DEV_ADMIN_EMAIL = 'admin@bid.org';
const DEV_ADMIN_PASSWORD = 'Password123!';

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

async function main() {
  await prisma.user.upsert({
    where: { email: DEV_ADMIN_EMAIL },
    update: {
      role: 'admin',
      status: 'active',
      emailVerifiedAt: new Date(),
    },
    create: {
      email: DEV_ADMIN_EMAIL,
      firstName: 'Ama',
      lastName: 'Darko',
      passwordHash: await hashPassword(DEV_ADMIN_PASSWORD),
      role: 'admin',
      status: 'active',
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.companySettings.upsert({
    where: { singletonKey: 'default' },
    update: {},
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

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
