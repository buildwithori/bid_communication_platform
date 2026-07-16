import type { LearnerProgressQuery } from "./types";

export const learningKeys = {
  all: ["learning"] as const,
  catalogueSummary: () => [...learningKeys.all, "catalogue-summary"] as const,
  progress: () => [...learningKeys.all, "progress"] as const,
  progressLookup: (query: LearnerProgressQuery) =>
    [...learningKeys.progress(), query] as const,
};
