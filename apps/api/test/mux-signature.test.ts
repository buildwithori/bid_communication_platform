import assert from "node:assert/strict";
import test from "node:test";
import { createHmac } from "crypto";
import { verifyMuxWebhookSignature } from "../src/video/mux-signature";

const secret = "mux-webhook-secret";
const timestamp = 1_720_000_000;
const nowMs = timestamp * 1_000;
const body = Buffer.from('{"type":"video.asset.ready"}');
const signature = createHmac("sha256", secret)
  .update(`${timestamp}.`)
  .update(body)
  .digest("hex");
const header = `t=${timestamp},v1=${signature}`;

test("accepts a current Mux webhook signature", () => {
  assert.equal(verifyMuxWebhookSignature(body, header, secret, nowMs), true);
});

test("rejects tampered webhook bodies and invalid signatures", () => {
  assert.equal(
    verifyMuxWebhookSignature(Buffer.from("{}"), header, secret, nowMs),
    false,
  );
  assert.equal(
    verifyMuxWebhookSignature(body, `t=${timestamp},v1=invalid`, secret, nowMs),
    false,
  );
});

test("rejects webhook signatures outside the replay window", () => {
  assert.equal(
    verifyMuxWebhookSignature(body, header, secret, nowMs + 301_000),
    false,
  );
});
