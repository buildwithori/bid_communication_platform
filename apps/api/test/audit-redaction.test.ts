import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "@prisma/client";
import { redactAuditPayload } from "../src/audit/audit-redaction";

test("redacts nested secrets while preserving useful audit metadata", () => {
  const payload = {
    email: "person@example.com",
    password: "Password123!",
    profile: {
      accessToken: "access-token",
      refresh_token: "refresh-token",
      displayName: "A Person",
    },
    files: [
      {
        name: "report.pdf",
        signedUrl: "https://storage.example/private",
      },
    ],
  } satisfies Prisma.InputJsonObject;

  assert.deepEqual(redactAuditPayload(payload), {
    email: "person@example.com",
    password: "[REDACTED]",
    profile: {
      accessToken: "[REDACTED]",
      refresh_token: "[REDACTED]",
      displayName: "A Person",
    },
    files: [
      {
        name: "report.pdf",
        signedUrl: "[REDACTED]",
      },
    ],
  });
});
