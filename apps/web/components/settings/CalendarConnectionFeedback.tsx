"use client";

import * as React from "react";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

const errorMessages: Record<string, string> = {
  "in-use":
    "This Google Calendar is already connected to another BID Hub account. Disconnect it there before connecting it here.",
  expired: "The Google Calendar connection request expired. Please try again.",
  failed: "Google Calendar could not be connected. Please try again.",
};

export function CalendarConnectionFeedback() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const connectionStatus = searchParams.get("calendar");
  const connectionError = searchParams.get("calendarError");

  React.useEffect(() => {
    if (!connectionStatus && !connectionError) return;

    if (connectionStatus === "connected") {
      toast.success("Google Calendar connected");
    } else if (connectionError) {
      toast.error(
        errorMessages[connectionError] ??
          "Google Calendar could not be connected. Please try again.",
      );
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete("calendar");
    params.delete("calendarError");
    const query = params.toString();
    router.replace((query ? `${pathname}?${query}` : pathname) as Route, {
      scroll: false,
    });
  }, [
    connectionError,
    connectionStatus,
    pathname,
    router,
    searchParams,
  ]);

  return null;
}
