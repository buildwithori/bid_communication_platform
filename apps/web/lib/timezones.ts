type IntlWithTimezones = typeof Intl & {
  supportedValuesOf?: (key: "timeZone") => string[];
};

const fallbackTimezones = [
  "UTC",
  "Africa/Accra",
  "Africa/Lagos",
  "Africa/Johannesburg",
  "Europe/London",
  "America/New_York",
  "Asia/Dubai",
];

export function detectTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
}

export function getTimezoneOptions() {
  const supportedValuesOf = (Intl as IntlWithTimezones).supportedValuesOf;
  const values = supportedValuesOf
    ? supportedValuesOf.call(Intl, "timeZone")
    : fallbackTimezones;
  const timezones = values.includes("UTC") ? values : ["UTC", ...values];

  return timezones.map((timezone) => ({
    value: timezone,
    label: timezone.replaceAll("_", " "),
  }));
}
