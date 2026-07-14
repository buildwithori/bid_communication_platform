import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  WEB_ORIGIN: z.string().url().default('http://localhost:3000'),
  DATABASE_URL: z.string().min(1).optional(),
  REDIS_URL: z.string().min(1).optional(),
  DO_SPACES_BUCKET: z.string().min(1).optional(),
  DO_SPACES_ENDPOINT: z.string().url().optional(),
  DO_SPACES_REGION: z.string().min(1).optional(),
  DO_SPACES_ACCESS_KEY_ID: z.string().min(1).optional(),
  DO_SPACES_SECRET_ACCESS_KEY: z.string().min(1).optional(),
});

export type ApiEnv = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): ApiEnv {
  const parsed = envSchema.safeParse(config);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ');
    throw new Error(`Invalid API environment: ${issues}`);
  }

  return parsed.data;
}
