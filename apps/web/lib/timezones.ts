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
