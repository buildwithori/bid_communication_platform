"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function useSessionDetailNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  return React.useCallback(
    (sessionId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("sessionId", sessionId);
      router.push(`${pathname}?${params.toString()}` as never, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );
}
