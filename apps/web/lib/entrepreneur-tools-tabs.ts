export type EntrepreneurToolsTab =
  | "all"
  | "pdf"
  | "excel"
  | "online"
  | "requests";

export function entrepreneurToolsTabFromQuery(
  value: string | null,
): EntrepreneurToolsTab {
  if (
    value === "pdf" ||
    value === "excel" ||
    value === "online" ||
    value === "requests"
  ) {
    return value;
  }

  // Keep old shared links useful if an earlier build used the API type name.
  return value === "embed" ? "online" : "all";
}
