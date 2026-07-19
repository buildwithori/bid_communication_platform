export const entrepreneurProfileTabQueryValues = {
  business: "business-details",
  goals: "programme-goals",
  funding: "fundraising-history",
  updates: "periodic-updates",
  notifications: "notifications",
} as const;

export type EntrepreneurProfileTab =
  keyof typeof entrepreneurProfileTabQueryValues;

const entrepreneurProfileTabByQuery = Object.fromEntries(
  Object.entries(entrepreneurProfileTabQueryValues).map(([tab, value]) => [
    value,
    tab,
  ]),
) as Record<string, EntrepreneurProfileTab>;

export function entrepreneurProfileTabFromQuery(
  value: string | null,
): EntrepreneurProfileTab {
  return (value && entrepreneurProfileTabByQuery[value]) || "business";
}
