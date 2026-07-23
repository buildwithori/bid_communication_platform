import type { LookupQuery } from "./types";

export const settingsKeys = {
  all: ["settings"] as const,
  company: () => [...settingsKeys.all, "company"] as const,
  sectors: () => [...settingsKeys.all, "sectors"] as const,
  sectorList: (query?: LookupQuery) =>
    [...settingsKeys.sectors(), "list", query ?? {}] as const,
  businessStages: () => [...settingsKeys.all, "business-stages"] as const,
  businessStageList: (query?: LookupQuery) =>
    [...settingsKeys.businessStages(), "list", query ?? {}] as const,
  programmeGoalTypes: () =>
    [...settingsKeys.all, "programme-goal-types"] as const,
  programmeGoalTypeList: (query?: LookupQuery) =>
    [...settingsKeys.programmeGoalTypes(), "list", query ?? {}] as const,
  toolAreas: () => [...settingsKeys.all, "tool-areas"] as const,
  toolAreaList: (query?: LookupQuery) =>
    [...settingsKeys.toolAreas(), "list", query ?? {}] as const,
  sessionTypes: () => [...settingsKeys.all, "session-types"] as const,
  sessionTypeList: (query?: LookupQuery) =>
    [...settingsKeys.sessionTypes(), "list", query ?? {}] as const,
};
