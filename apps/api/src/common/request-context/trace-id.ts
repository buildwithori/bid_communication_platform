const TRACE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export function normalizeTraceId(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return TRACE_ID_PATTERN.test(normalized) ? normalized : null;
}
