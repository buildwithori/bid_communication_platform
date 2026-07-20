import assert from "node:assert/strict";
import test from "node:test";
import { createHmac, generateKeyPairSync } from "crypto";
import { AssetStatus, UserRole } from "@prisma/client";
import { VideoService } from "../src/video/video.service";
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

test("signed video playback includes a separate protected Mux thumbnail token", async () => {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const encodedPrivateKey = Buffer.from(
    privateKey.export({ type: "pkcs8", format: "pem" }),
  ).toString("base64");
  const prisma = {
    videoAsset: {
      findUnique: async () => ({
        id: "video-1",
        contentItemId: "content-1",
        contentItem: { id: "content-1" },
        status: AssetStatus.ready,
        playbackId: "signed-playback-id",
        duration: 120,
      }),
    },
  };
  const config = {
    get: (key: string) =>
      key === "MUX_SIGNING_KEY_ID" ? "signing-key-id" : encodedPrivateKey,
  };
  const service = new VideoService(
    prisma as never,
    config as never,
    {} as never,
    {} as never,
    {} as never,
  );

  const result = await service.getSignedPlayback(
    { id: "admin-1", role: UserRole.admin } as never,
    "video-1",
  );
  const decode = (token: string) =>
    JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString("utf8"),
    ) as {
      aud: string;
      sub: string;
      exp: number;
    };
  const playback = decode(result.token);
  const thumbnail = decode(result.thumbnailToken);

  assert.equal(playback.aud, "v");
  assert.equal(thumbnail.aud, "t");
  assert.equal(playback.sub, "signed-playback-id");
  assert.equal(thumbnail.sub, "signed-playback-id");
  assert.equal(thumbnail.exp, playback.exp);
  assert.notEqual(result.thumbnailToken, result.token);
});
