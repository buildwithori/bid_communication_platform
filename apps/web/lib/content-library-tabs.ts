import type { ContentItemType } from "@/lib/api/content";

export function contentLibraryTabFromQuery(
  value: string | null,
): ContentItemType {
  return value === "pdf" || value === "excel" || value === "tool"
    ? value
    : "video";
}
