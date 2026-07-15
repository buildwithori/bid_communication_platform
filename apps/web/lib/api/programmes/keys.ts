import type { ProgrammeQuery } from "./types";

export const programmeKeys = {
  all: ["programmes"] as const,
  lists: () => [...programmeKeys.all, "list"] as const,
  list: (query?: ProgrammeQuery) =>
    [...programmeKeys.lists(), query ?? {}] as const,
  summary: () => [...programmeKeys.all, "summary"] as const,
  details: () => [...programmeKeys.all, "detail"] as const,
  detail: (id: string) => [...programmeKeys.details(), id] as const,
  deliverableRules: (programmeId: string) =>
    [...programmeKeys.detail(programmeId), "deliverable-rules"] as const,
};
