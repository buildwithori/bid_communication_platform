"use client";

import { useSearchParams } from "next/navigation";
import { ProfilePageSkeleton } from "@/components/entrepreneur/profile/ProfileLoadingSkeletons";
import { entrepreneurProfileTabFromQuery } from "@/lib/entrepreneur-profile-tabs";

export default function LoadingEntrepreneurProfile() {
  const searchParams = useSearchParams();
  const tab = entrepreneurProfileTabFromQuery(searchParams.get("tab"));

  return <ProfilePageSkeleton tab={tab} />;
}
