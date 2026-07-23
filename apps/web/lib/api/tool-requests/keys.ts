import type { ToolRequestQuery } from "./types";

export const toolRequestKeys = {
  all: ["tool-requests"] as const,
  lists: () => [...toolRequestKeys.all, "list"] as const,
  list: (query?: ToolRequestQuery) =>
    [...toolRequestKeys.lists(), query ?? {}] as const,
  summary: () => [...toolRequestKeys.all, "summary"] as const,
  details: () => [...toolRequestKeys.all, "detail"] as const,
  detail: (id: string) => [...toolRequestKeys.details(), id] as const,
};
