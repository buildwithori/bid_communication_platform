import assert from "node:assert/strict";
import test from "node:test";
import { validateEnv } from "../src/config/env.validation";

const productionEnv = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://bid:secret@postgres:5432/bid_hub",
  REDIS_URL: "redis://redis:6379",
  WEB_ORIGIN: "https://hub.example.com",
  APP_WEB_URL: "https://hub.example.com",
  API_PUBLIC_URL: "https://hub.example.com",
  EMAIL_TRANSPORT: "resend",
  RESEND_API_KEY: "re_test",
  MAIL_FROM: "BID Hub <no-reply@example.com>",
  GOOGLE_CLIENT_ID: "google-client",
  GOOGLE_CLIENT_SECRET: "google-secret",
  CALENDAR_TOKEN_ENCRYPTION_KEY: "a-production-calendar-key-with-32-bytes",
  DO_SPACES_BUCKET: "bid-hub",
  DO_SPACES_ENDPOINT: "https://nyc3.digitaloceanspaces.com",
  DO_SPACES_REGION: "nyc3",
  DO_SPACES_ACCESS_KEY_ID: "spaces-key",
  DO_SPACES_SECRET_ACCESS_KEY: "spaces-secret",
  DO_SPACES_FORCE_PATH_STYLE: "false",
  MUX_TOKEN_ID: "mux-token",
  MUX_TOKEN_SECRET: "mux-secret",
  MUX_WEBHOOK_SECRET: "mux-webhook",
  MUX_SIGNING_KEY_ID: "mux-signing-key",
  MUX_SIGNING_PRIVATE_KEY: "encoded-private-key",
};

test("development accepts local infrastructure values", () => {
  const env = validateEnv({
    NODE_ENV: "development",
    DATABASE_URL: "postgresql://bid:bid@postgres:5432/bid_hub",
    REDIS_URL: "redis://redis:6379",
  });
  assert.equal(env.NODE_ENV, "development");
});

test("production accepts a complete secure configuration", () => {
  const env = validateEnv(productionEnv);
  assert.equal(env.EMAIL_TRANSPORT, "resend");
});

test("production rejects local URLs and missing integration credentials", () => {
  assert.throws(() =>
    validateEnv({
      NODE_ENV: "production",
      DATABASE_URL: productionEnv.DATABASE_URL,
      REDIS_URL: productionEnv.REDIS_URL,
    }), (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      return message.includes("RESEND_API_KEY: is required in production")
        && message.includes("WEB_ORIGIN: must use https in production");
    });
});
