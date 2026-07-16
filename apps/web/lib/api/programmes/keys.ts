import type { ProgrammeModuleQuery, ProgrammeQuery } from "./types";

export const programmeKeys = {
  all: ["programmes"] as const,
  lists: () => [...programmeKeys.all, "list"] as const,
  list: (query?: ProgrammeQuery) =>
    [...programmeKeys.lists(), query ?? {}] as const,
  summary: () => [...programmeKeys.all, "summary"] as const,
  details: () => [...programmeKeys.all, "detail"] as const,
  detail: (id: string) => [...programmeKeys.details(), id] as const,
  modules: (programmeId: string) =>
    [...programmeKeys.detail(programmeId), "modules"] as const,
  moduleList: (programmeId: string, query?: ProgrammeModuleQuery) =>
    [...programmeKeys.modules(programmeId), query ?? {}] as const,
  moduleDetail: (programmeId: string, moduleId: string) =>
    [...programmeKeys.modules(programmeId), "detail", moduleId] as const,
  reusableModuleLists: (programmeId: string) =>
    [...programmeKeys.detail(programmeId), "reusable-modules"] as const,
  reusableModules: (programmeId: string, query?: ProgrammeModuleQuery) =>
    [...programmeKeys.reusableModuleLists(programmeId), query ?? {}] as const,
  deliverableRules: (programmeId: string) =>
    [...programmeKeys.detail(programmeId), "deliverable-rules"] as const,
};
