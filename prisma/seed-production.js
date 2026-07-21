const { PrismaClient } = require("@prisma/client");
const argon2 = require("argon2");
const { seedCore } = require("./seed-core");

const prisma = new PrismaClient();
const BOOTSTRAP_KEY = "production-bootstrap-v1";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for the first production bootstrap.`);
  }
  return value;
}

function bootstrapAdmin() {
  const email = required("PRODUCTION_ADMIN_EMAIL").toLowerCase();
  const firstName = required("PRODUCTION_ADMIN_FIRST_NAME");
  const lastName = required("PRODUCTION_ADMIN_LAST_NAME");
  const password = required("PRODUCTION_ADMIN_INITIAL_PASSWORD");
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    throw new Error("PRODUCTION_ADMIN_EMAIL must be a valid email address.");
  }
  if (password.length < 16) {
    throw new Error(
      "PRODUCTION_ADMIN_INITIAL_PASSWORD must be at least 16 characters.",
    );
  }
  return {
    email,
    firstName,
    lastName,
    phone: process.env.PRODUCTION_ADMIN_PHONE?.trim() || null,
    password,
  };
}

async function main() {
  if (process.env.NODE_ENV !== "production") {
    throw new Error(
      "The production bootstrap only runs with NODE_ENV=production.",
    );
  }

  const result = await prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${BOOTSTRAP_KEY}))::text AS lock`;
      const completed = await tx.deploymentTaskRun.findUnique({
        where: { key: BOOTSTRAP_KEY },
      });
      if (completed) {
        return { skipped: true, completedAt: completed.completedAt };
      }

      const admin = bootstrapAdmin();
      await seedCore(tx, { updateExisting: false });
      const existingUser = await tx.user.findUnique({
        where: { email: admin.email },
      });
      if (existingUser && existingUser.role !== "admin") {
        throw new Error(
          `${admin.email} already belongs to a non-admin account.`,
        );
      }

      if (!existingUser) {
        const passwordHash = await argon2.hash(admin.password, {
          type: argon2.argon2id,
        });
        await tx.user.create({
          data: {
            email: admin.email,
            passwordHash,
            firstName: admin.firstName,
            lastName: admin.lastName,
            phone: admin.phone,
            timezone: "Africa/Kigali",
            role: "admin",
            status: "active",
            emailVerifiedAt: new Date(),
          },
        });
      }

      const run = await tx.deploymentTaskRun.create({
        data: {
          key: BOOTSTRAP_KEY,
          details: { adminEmail: admin.email },
        },
      });
      return {
        skipped: false,
        completedAt: run.completedAt,
        adminEmail: admin.email,
      };
    },
    { maxWait: 10_000, timeout: 30_000 },
  );

  if (result.skipped) {
    console.log(
      `Production bootstrap already completed at ${result.completedAt.toISOString()}; nothing changed.`,
    );
    return;
  }
  console.log(`Production bootstrap completed for ${result.adminEmail}.`);
  console.log(
    "Remove PRODUCTION_ADMIN_INITIAL_PASSWORD after verifying access.",
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
