"use client";

import { useSearchParams } from "next/navigation";
import { ContentLibrarySkeleton } from "@/components/admin/content/ContentLibrarySkeleton";
import { contentLibraryTabFromQuery } from "@/lib/content-library-tabs";

export default function Loading() {
  const searchParams = useSearchParams();
  return (
    <ContentLibrarySkeleton
      activeType={contentLibraryTabFromQuery(searchParams.get("tab"))}
    />
  );
}
