const { PrismaClient } = require("@prisma/client");
const argon2 = require("argon2");
const { sectors, seedCore } = require("./seed-core");

const prisma = new PrismaClient();

const DEV_PASSWORD = "Password123!";

const users = {
  admin: {
    email: "admin@bid.org",
    firstName: "Ama",
    lastName: "Darko",
    phone: "+233 20 000 0001",
  },
  trainer: {
    email: "trainer@bid.org",
    firstName: "Kofi",
    lastName: "Mensah",
    phone: "+233 20 000 0002",
    roleLabel: "trainer",
    specialismKeys: ["fintech"],
  },
  entrepreneur: {
    email: "entrepreneur@bid.org",
    firstName: "Amara",
    lastName: "Osei",
    phone: "+233 20 000 0003",
    businessId: "seed-business-paybridge",
    businessName: "PayBridge Africa Ltd",
    country: "Ghana",
    sectorKey: "fintech",
    stageKey: "growth",
  },
};

async function hashPassword(password) {
  return argon2.hash(password, { type: argon2.argon2id });
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
      status: "active",
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
      status: "active",
      emailVerifiedAt: new Date(),
      invitedById,
    },
  });
}

async function seedTrainer(adminUserId) {
  const trainer = await upsertUser("trainer", users.trainer, adminUserId);

  await prisma.trainerCapability.upsert({
    where: { userId: trainer.id },
    update: {
      roleLabel: users.trainer.roleLabel,
      accessLevel: "full",
      accessExpiresOn: null,
      status: "active",
    },
    create: {
      userId: trainer.id,
      roleLabel: users.trainer.roleLabel,
      accessLevel: "full",
      status: "active",
    },
  });

  for (const sectorKey of users.trainer.specialismKeys) {
    const sector = await prisma.sector.findUnique({
      where: { key: sectorKey },
    });
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
  const entrepreneur = await upsertUser("entrepreneur", users.entrepreneur);
  const sector = await prisma.sector.findUnique({
    where: { key: users.entrepreneur.sectorKey },
  });
  const stage = await prisma.businessStage.findUnique({
    where: { key: users.entrepreneur.stageKey },
  });

  await prisma.business.upsert({
    where: { id: users.entrepreneur.businessId },
    update: {
      name: users.entrepreneur.businessName,
      country: users.entrepreneur.country,
      sectorId: sector?.id ?? null,
      stageId: stage?.id ?? null,
      source: "self_registered",
      status: "active",
      onboardingCompletedAt: new Date(),
    },
    create: {
      id: users.entrepreneur.businessId,
      name: users.entrepreneur.businessName,
      country: users.entrepreneur.country,
      sectorId: sector?.id ?? null,
      stageId: stage?.id ?? null,
      source: "self_registered",
      status: "active",
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
      relationship: "representative",
      isPrimary: true,
    },
    create: {
      userId: entrepreneur.id,
      businessId: users.entrepreneur.businessId,
      relationship: "representative",
      isPrimary: true,
    },
  });

  return entrepreneur;
}

async function main() {
  await seedCore(prisma);

  const admin = await upsertUser("admin", users.admin);
  await seedTrainer(admin.id);
  await seedEntrepreneur();
}

main()
  .then(async () => {
    console.log(
      "Seed complete: admin, trainer, entrepreneur, company settings, and lookup data are ready.",
    );
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
