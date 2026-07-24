type IntlWithTimezones = typeof Intl & {
  supportedValuesOf?: (key: "timeZone") => string[];
};

export const PLATFORM_DEFAULT_TIMEZONE = "Africa/Kigali";

const fallbackTimezones = [
  PLATFORM_DEFAULT_TIMEZONE,
  "UTC",
  "Africa/Accra",
  "Africa/Lagos",
  "Africa/Johannesburg",
  "Europe/London",
  "America/New_York",
  "Asia/Dubai",
];

export function detectTimezone() {
  return (
    Intl.DateTimeFormat().resolvedOptions().timeZone ||
    PLATFORM_DEFAULT_TIMEZONE
  );
}

export function todayInTimezone(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function addDaysToDateValue(value: string, days: number) {
  const date = new Date(`${value}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function getTimezoneOptions() {
  const supportedValuesOf = (Intl as IntlWithTimezones).supportedValuesOf;
  const supportedTimezones = supportedValuesOf
    ? supportedValuesOf.call(Intl, "timeZone")
    : fallbackTimezones;
  const timezones = Array.from(
    new Set([PLATFORM_DEFAULT_TIMEZONE, "UTC", ...supportedTimezones]),
  );

  return timezones.map((timezone) => ({
    value: timezone,
    label: timezone.replaceAll("_", " "),
  }));
}
