import type { ToolQuery } from "./types";

export const toolKeys = {
  all: ["tools"] as const,
  lists: () => [...toolKeys.all, "list"] as const,
  list: (query?: ToolQuery) => [...toolKeys.lists(), query ?? {}] as const,
  details: () => [...toolKeys.all, "detail"] as const,
  detail: (id: string) => [...toolKeys.details(), id] as const,
};
