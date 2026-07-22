import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
    WEB_ORIGIN: z.string().url().default("http://localhost:3000"),
    APP_WEB_URL: z.string().url().default("http://localhost:3000"),
    DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().url(),
    AUDIT_PROCESS_INTERVAL_MS: z.coerce
      .number()
      .int()
      .min(1_000)
      .default(5_000),
    NOTIFICATION_DELIVERY_INTERVAL_MS: z.coerce
      .number()
      .int()
      .min(1_000)
      .default(5_000),
    NOTIFICATION_AUTOMATION_INTERVAL_MS: z.coerce
      .number()
      .int()
      .min(60_000)
      .default(900_000),
    DELIVERABLE_RECURRENCE_INTERVAL_MS: z.coerce
      .number()
      .int()
      .min(60_000)
      .default(900_000),
    VIDEO_RECONCILIATION_INTERVAL_MS: z.coerce
      .number()
      .int()
      .min(60_000)
      .default(300_000),
    VIDEO_PROCESSING_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .min(3_600_000)
      .default(86_400_000),
    VIDEO_RECONCILIATION_BATCH_SIZE: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .default(25),
    EMAIL_TRANSPORT: z.enum(["smtp", "resend"]).default("smtp"),
    MAIL_FROM: z.string().min(1).default("BID Hub <no-reply@bid.local>"),
    SMTP_HOST: z.string().min(1).default("localhost"),
    SMTP_PORT: z.coerce.number().int().positive().default(1025),
    RESEND_API_KEY: z
      .string()
      .optional()
      .transform((value) => value || undefined),
    GOOGLE_CALENDAR_REDIRECT_URI: z
      .union([z.literal(""), z.string().url()])
      .optional()
      .transform((value) => value || undefined),
    CALENDAR_TOKEN_ENCRYPTION_KEY: z
      .union([z.literal(""), z.string().min(32)])
      .optional()
      .transform((value) => value || undefined),
    GOOGLE_CLIENT_ID: z
      .string()
      .optional()
      .transform((value) => value || undefined),
    GOOGLE_CLIENT_SECRET: z
      .string()
      .optional()
      .transform((value) => value || undefined),
    GOOGLE_REDIRECT_URI: z
      .union([z.literal(""), z.string().url()])
      .optional()
      .transform((value) => value || undefined),
    API_PUBLIC_URL: z.string().url().default("http://localhost:4000"),
    DO_SPACES_BUCKET: z.string().min(1).optional(),
    DO_SPACES_ENDPOINT: z.string().url().optional(),
    DO_SPACES_INTERNAL_ENDPOINT: z.string().url().optional(),
    DO_SPACES_REGION: z.string().min(1).optional(),
    DO_SPACES_ACCESS_KEY_ID: z.string().min(1).optional(),
    DO_SPACES_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    DO_SPACES_FORCE_PATH_STYLE: z
      .union([
        z.boolean(),
        z.enum(["true", "false"]).transform((value) => value === "true"),
      ])
      .default(false),
    MUX_TOKEN_ID: z
      .string()
      .optional()
      .transform((value) => value || undefined),
    MUX_TOKEN_SECRET: z
      .string()
      .optional()
      .transform((value) => value || undefined),
    MUX_WEBHOOK_SECRET: z
      .string()
      .optional()
      .transform((value) => value || undefined),
    MUX_SIGNING_KEY_ID: z
      .string()
      .optional()
      .transform((value) => value || undefined),
    MUX_SIGNING_PRIVATE_KEY: z
      .string()
      .optional()
      .transform((value) => value || undefined),
  })
  .superRefine((env, context) => {
    if (env.NODE_ENV !== "production") return;

    const requiredIntegrations = [
      "RESEND_API_KEY",
      "GOOGLE_CLIENT_ID",
      "GOOGLE_CLIENT_SECRET",
      "CALENDAR_TOKEN_ENCRYPTION_KEY",
      "DO_SPACES_BUCKET",
      "DO_SPACES_ENDPOINT",
      "DO_SPACES_REGION",
      "DO_SPACES_ACCESS_KEY_ID",
      "DO_SPACES_SECRET_ACCESS_KEY",
      "MUX_TOKEN_ID",
      "MUX_TOKEN_SECRET",
      "MUX_WEBHOOK_SECRET",
      "MUX_SIGNING_KEY_ID",
      "MUX_SIGNING_PRIVATE_KEY",
    ] as const;

    for (const key of requiredIntegrations) {
      if (!env[key]?.trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: "is required in production",
        });
      }
    }

    if (env.EMAIL_TRANSPORT !== "resend") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["EMAIL_TRANSPORT"],
        message: "must be resend in production",
      });
    }

    if (env.DO_SPACES_FORCE_PATH_STYLE) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["DO_SPACES_FORCE_PATH_STYLE"],
        message: "must be false for production object storage",
      });
    }

    for (const key of [
      "WEB_ORIGIN",
      "APP_WEB_URL",
      "API_PUBLIC_URL",
    ] as const) {
      if (new URL(env[key]).protocol !== "https:") {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: "must use https in production",
        });
      }
    }

    const webOrigin = new URL(env.APP_WEB_URL).origin;
    if (
      new URL(env.WEB_ORIGIN).origin !== webOrigin ||
      new URL(env.API_PUBLIC_URL).origin !== webOrigin
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["API_PUBLIC_URL"],
        message: "must share the APP_WEB_URL origin for the production proxy",
      });
    }

    const storageEndpoint = env.DO_SPACES_ENDPOINT;
    if (storageEndpoint && new URL(storageEndpoint).protocol !== "https:") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["DO_SPACES_ENDPOINT"],
        message: "must use https in production",
      });
    }

    for (const key of [
      "GOOGLE_REDIRECT_URI",
      "GOOGLE_CALENDAR_REDIRECT_URI",
    ] as const) {
      const redirectUri = env[key];
      if (redirectUri && new URL(redirectUri).protocol !== "https:") {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: "must use https in production",
        });
      }
    }

    if (env.MAIL_FROM.includes("@bid.local")) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["MAIL_FROM"],
        message: "must use a verified production sender domain",
      });
    }
  });

export type ApiEnv = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): ApiEnv {
  const parsed = envSchema.safeParse(config);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join(", ");
    throw new Error(`Invalid API environment: ${issues}`);
  }

  return parsed.data;
}
