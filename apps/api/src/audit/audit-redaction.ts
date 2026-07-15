import { Prisma } from "@prisma/client";

const REDACTED = "[REDACTED]";
const SENSITIVE_KEY =
  /(^|_)(authorization|cookie|password|passwordhash|secret|token|accesstoken|refreshtoken|idtoken|signedurl|signature|privatekey)($|_)/i;

function normalizedKey(key: string) {
  return key.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function isSensitiveKey(key: string) {
  const normalized = normalizedKey(key);
  return (
    SENSITIVE_KEY.test(key) ||
    normalized.includes("password") ||
    normalized.includes("token") ||
    normalized.includes("secret") ||
    normalized.includes("signedurl") ||
    normalized === "authorization" ||
    normalized === "cookie"
  );
}

export function redactAuditPayload(
  value: Prisma.InputJsonValue | null,
): Prisma.InputJsonValue | null {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.map((item) =>
      redactAuditPayload(item),
    ) as Prisma.InputJsonArray;
  }

  const redacted: Record<string, Prisma.InputJsonValue | null> = {};
  for (const [key, item] of Object.entries(value)) {
    redacted[key] = isSensitiveKey(key) ? REDACTED : redactAuditPayload(item);
  }
  return redacted as Prisma.InputJsonObject;
}
