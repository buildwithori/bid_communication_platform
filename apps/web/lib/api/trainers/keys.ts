import type { TrainerQuery } from "./types";

export const trainerKeys = {
  all: ["trainers"] as const,
  lists: () => [...trainerKeys.all, "list"] as const,
  list: (query?: TrainerQuery) =>
    [...trainerKeys.lists(), query ?? {}] as const,
  details: () => [...trainerKeys.all, "detail"] as const,
  detail: (id: string) => [...trainerKeys.details(), id] as const,
  profile: () => [...trainerKeys.all, "profile"] as const,
};
