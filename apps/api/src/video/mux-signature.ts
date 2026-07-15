import { createHmac, timingSafeEqual } from "crypto";

const DEFAULT_TOLERANCE_SECONDS = 5 * 60;

export function verifyMuxWebhookSignature(
  rawBody: Buffer,
  signatureHeader: string | undefined,
  secret: string,
  nowMs = Date.now(),
  toleranceSeconds = DEFAULT_TOLERANCE_SECONDS,
) {
  if (!signatureHeader) return false;

  const components = signatureHeader.split(",").reduce<Record<string, string[]>>(
    (result, component) => {
      const [key, value] = component.trim().split("=", 2);
      if (key && value) (result[key] ??= []).push(value);
      return result;
    },
    {},
  );
  const timestamp = Number(components.t?.[0]);
  const signatures = components.v1 ?? [];
  if (!Number.isFinite(timestamp) || signatures.length === 0) return false;
  if (Math.abs(Math.floor(nowMs / 1000) - timestamp) > toleranceSeconds) return false;

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.`)
    .update(rawBody)
    .digest("hex");

  return signatures.some((signature) => {
    const actualBuffer = Buffer.from(signature, "utf8");
    const expectedBuffer = Buffer.from(expected, "utf8");
    return (
      actualBuffer.length === expectedBuffer.length &&
      timingSafeEqual(actualBuffer, expectedBuffer)
    );
  });
}
