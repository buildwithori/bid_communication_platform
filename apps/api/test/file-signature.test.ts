import assert from "node:assert/strict";
import test from "node:test";
import { matchesFileSignature } from "../src/files/file-signature";

test("accepts supported PDF, Open XML, legacy Office, and CSV signatures", () => {
  assert.equal(
    matchesFileSignature("application/pdf", Buffer.from("%PDF-1.7")),
    true,
  );
  assert.equal(
    matchesFileSignature(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      Uint8Array.from([0x50, 0x4b, 0x03, 0x04]),
    ),
    true,
  );
  assert.equal(
    matchesFileSignature(
      "application/msword",
      Uint8Array.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
    ),
    true,
  );
  assert.equal(
    matchesFileSignature("text/csv", Buffer.from("name,value\n")),
    true,
  );
});

test("rejects spoofed, binary CSV, and unsupported file content", () => {
  assert.equal(
    matchesFileSignature("application/pdf", Buffer.from("not a pdf")),
    false,
  );
  assert.equal(
    matchesFileSignature("text/csv", Uint8Array.from([0x61, 0x00, 0x62])),
    false,
  );
  assert.equal(
    matchesFileSignature(
      "application/octet-stream",
      Uint8Array.from([1, 2, 3]),
    ),
    false,
  );
});
