import {
  Prisma,
  TrainerAccessLevel,
  TrainerCapability,
  TrainerCapabilityStatus,
  UserRole,
  UserStatus,
} from "@prisma/client";

type TrainerAccessCapability = Pick<
  TrainerCapability,
  "accessLevel" | "accessExpiresOn" | "status"
>;

export function activeTrainerCapabilityWhere(
  now = new Date(),
): Prisma.TrainerCapabilityWhereInput {
  return {
    status: TrainerCapabilityStatus.active,
    OR: [
      { accessLevel: TrainerAccessLevel.full },
      {
        accessLevel: TrainerAccessLevel.guest,
        accessExpiresOn: { gt: now },
      },
    ],
  };
}

export function activeTrainerUserWhere(
  now = new Date(),
): Prisma.UserWhereInput {
  return {
    role: UserRole.trainer,
    status: UserStatus.active,
    trainerCapability: { is: activeTrainerCapabilityWhere(now) },
  };
}

export function activeBidTeamMemberWhere(
  now = new Date(),
): Prisma.UserWhereInput {
  return {
    OR: [
      { role: UserRole.admin, status: UserStatus.active },
      activeTrainerUserWhere(now),
    ],
  };
}

export function trainerCapabilityAllowsAccess(
  capability: TrainerAccessCapability | null | undefined,
  now = new Date(),
) {
  if (!capability || capability.status !== TrainerCapabilityStatus.active) {
    return false;
  }
  if (capability.accessLevel === TrainerAccessLevel.full) return true;
  return Boolean(
    capability.accessLevel === TrainerAccessLevel.guest &&
      capability.accessExpiresOn &&
      capability.accessExpiresOn > now,
  );
}
