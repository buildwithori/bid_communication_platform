import type { ContentItemQuery } from "./types";

export const contentKeys = {
  all: ["content"] as const,
  lists: () => [...contentKeys.all, "list"] as const,
  list: (query: ContentItemQuery) =>
    [...contentKeys.lists(), query] as const,
  modules: () => [...contentKeys.all, "module"] as const,
  module: (moduleId: string) =>
    [...contentKeys.modules(), moduleId] as const,
  moduleList: (moduleId: string, query: ContentItemQuery) =>
    [...contentKeys.module(moduleId), query] as const,
  rating: (contentItemId: string) =>
    [...contentKeys.all, "rating", contentItemId] as const,
};
