import type {
  ContentItemQuery,
  ContentItemSummaryQuery,
  ContentRatingContext,
} from "./types";

export const contentKeys = {
  all: ["content"] as const,
  lists: () => [...contentKeys.all, "list"] as const,
  list: (query: ContentItemQuery) =>
    [...contentKeys.lists(), query] as const,
  summary: (query: ContentItemSummaryQuery) =>
    [...contentKeys.all, "summary", query] as const,
  modules: () => [...contentKeys.all, "module"] as const,
  module: (moduleId: string) =>
    [...contentKeys.modules(), moduleId] as const,
  moduleList: (moduleId: string, query: ContentItemQuery) =>
    [...contentKeys.module(moduleId), query] as const,
  rating: (context: ContentRatingContext) =>
    [
      ...contentKeys.all,
      "rating",
      context.programmeId,
      context.moduleId,
      context.contentItemId,
    ] as const,
};
