import type { AdminQuery } from "./types";

export const adminKeys = {
  all: ["admins"] as const,
  lists: () => [...adminKeys.all, "list"] as const,
  list: (query?: AdminQuery) => [...adminKeys.lists(), query ?? {}] as const,
  details: () => [...adminKeys.all, "detail"] as const,
  detail: (id: string) => [...adminKeys.details(), id] as const,
  profile: () => [...adminKeys.all, "profile"] as const,
};
