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

function reconciliationVideo() {
  return {
    id: "video-1",
    contentItemId: "content-1",
    muxAssetId: null,
    muxUploadId: "upload-1",
    playbackId: null,
    duration: null,
    status: AssetStatus.pending,
    playbackPolicy: null,
    uploadedById: "admin-1",
    readyAt: null,
    failureReason: null,
    lastReconciledAt: null,
    reconciliationFailures: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function reconciliationPrisma(video = reconciliationVideo()) {
  const videoUpdates: Array<Record<string, unknown>> = [];
  const contentUpdates: Array<Record<string, unknown>> = [];
  const transaction = {
    videoAsset: {
      updateMany: async (args: { data: Record<string, unknown> }) => {
        videoUpdates.push(args.data);
        return { count: 1 };
      },
    },
    contentItem: {
      update: async (args: { data: Record<string, unknown> }) => {
        contentUpdates.push(args.data);
        return { id: "content-1" };
      },
    },
  };
  return {
    prisma: {
      videoAsset: {
        findMany: async () => [video],
        updateMany: transaction.videoAsset.updateMany,
      },
      $transaction: async (operation: (tx: typeof transaction) => unknown) =>
        operation(transaction),
    },
    videoUpdates,
    contentUpdates,
  };
}

const reconciliationConfig = {
  get: (_key: string, fallback: number) => fallback,
};

test("video reconciliation recovers a ready Mux asset when webhooks were missed", async () => {
  const state = reconciliationPrisma();
  const mux = {
    getDirectUpload: async () => ({
      status: "asset_created",
      asset_id: "mux-asset-1",
    }),
    getAsset: async () => ({
      status: "ready",
      duration: 121.2,
      playback_ids: [{ id: "signed-playback-1", policy: "signed" }],
    }),
  };
  const service = new VideoService(
    state.prisma as never,
    reconciliationConfig as never,
    mux as never,
    {} as never,
    {} as never,
  );

  const result = await service.reconcileStaleAssets();

  assert.deepEqual(result, {
    checked: 1,
    ready: 1,
    failed: 0,
    processing: 0,
  });
  assert.ok(
    state.videoUpdates.some(
      (update) =>
        update.status === AssetStatus.ready &&
        update.playbackId === "signed-playback-1" &&
        update.duration === 122,
    ),
  );
  assert.deepEqual(state.contentUpdates, [{ status: "ready" }]);
});

test("video reconciliation marks timed-out uploads as failed", async () => {
  const state = reconciliationPrisma();
  const mux = {
    getDirectUpload: async () => ({
      status: "timed_out",
      error: { message: "Upload timed out at Mux." },
    }),
  };
  const service = new VideoService(
    state.prisma as never,
    reconciliationConfig as never,
    mux as never,
    {} as never,
    {} as never,
  );

  const result = await service.reconcileStaleAssets();

  assert.equal(result.failed, 1);
  assert.ok(
    state.videoUpdates.some(
      (update) =>
        update.status === AssetStatus.failed &&
        update.failureReason ===
          "The video upload expired before it completed. Delete it and upload the file again.",
    ),
  );
  assert.deepEqual(state.contentUpdates, [{ status: "failed" }]);
});

test("Mux upload error webhooks move video and content to failed", () => {
  const service = new VideoService(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
  const update = (
    service as unknown as {
      webhookUpdate: (event: unknown) => {
        video: { status: AssetStatus; failureReason: string };
        contentStatus: string;
      };
    }
  ).webhookUpdate({
    id: "event-1",
    type: "video.upload.errored",
    data: { id: "upload-1" },
  });

  assert.equal(update.video.status, AssetStatus.failed);
  assert.equal(
    update.video.failureReason,
    "The uploaded file could not be processed as a video.",
  );
  assert.equal(update.contentStatus, "failed");
});
