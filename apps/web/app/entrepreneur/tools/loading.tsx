"use client";

import { useSearchParams } from "next/navigation";
import { EntrepreneurToolsPageSkeleton } from "@/components/entrepreneur/tools/EntrepreneurToolsSkeletons";
import { entrepreneurToolsTabFromQuery } from "@/lib/entrepreneur-tools-tabs";

export default function LoadingEntrepreneurTools() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("requestId")
    ? "requests"
    : entrepreneurToolsTabFromQuery(searchParams.get("tab"));

  return <EntrepreneurToolsPageSkeleton tab={tab} />;
}
