import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  WEB_ORIGIN: z.string().url().default("http://localhost:3000"),
  APP_WEB_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1).optional(),
  REDIS_URL: z.string().min(1).optional(),
  AUDIT_PROCESS_INTERVAL_MS: z.coerce.number().int().min(1_000).default(5_000),
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
  MUX_TOKEN_ID: z.string().optional().transform((value) => value || undefined),
  MUX_TOKEN_SECRET: z.string().optional().transform((value) => value || undefined),
  MUX_WEBHOOK_SECRET: z.string().optional().transform((value) => value || undefined),
  MUX_SIGNING_KEY_ID: z.string().optional().transform((value) => value || undefined),
  MUX_SIGNING_PRIVATE_KEY: z
    .string()
    .optional()
    .transform((value) => value || undefined),
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
