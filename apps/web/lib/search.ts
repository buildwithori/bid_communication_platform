"use client";

import * as React from "react";

export const SEARCH_DEBOUNCE_MS = 300;

export function useDebouncedValue<T>(
  value: T,
  delay = SEARCH_DEBOUNCE_MS,
) {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const effectiveDelay =
      typeof value === "string" && value.length === 0 ? 0 : delay;
    const timeout = window.setTimeout(
      () => setDebouncedValue(value),
      effectiveDelay,
    );
    return () => window.clearTimeout(timeout);
  }, [delay, value]);

  return debouncedValue;
}
