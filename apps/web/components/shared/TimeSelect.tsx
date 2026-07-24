"use client";

import * as React from "react";
import { Clock3 } from "lucide-react";
import { FormSelect } from "@/components/shared/FormField";

type TimeSelectProps = {
  value: number;
  onValueChange: (minutes: number) => void;
  disabled?: boolean;
  intervalMinutes?: number;
};

function formatTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const period = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;
  return `${String(displayHour).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${period}`;
}

export function TimeSelect({
  value,
  onValueChange,
  disabled,
  intervalMinutes = 15,
}: TimeSelectProps) {
  const options = React.useMemo(() => {
    const values = new Set<number>();
    for (let minutes = 0; minutes < 24 * 60; minutes += intervalMinutes) {
      values.add(minutes);
    }
    values.add(value);
    return Array.from(values)
      .sort((left, right) => left - right)
      .map((minutes) => ({
        value: String(minutes),
        label: formatTime(minutes),
      }));
  }, [intervalMinutes, value]);

  return (
    <div className="relative">
      <Clock3
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-ink-faint"
      />
      <FormSelect
        value={String(value)}
        onValueChange={(nextValue) => onValueChange(Number(nextValue))}
        options={options}
        disabled={disabled}
        className="pl-9"
      />
    </div>
  );
}
