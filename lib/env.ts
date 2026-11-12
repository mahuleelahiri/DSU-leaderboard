import "server-only";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  /** Max connections per server instance (keep low on serverless). */
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
  // Enforced strictly in production; relaxed locally so a dev .env still boots.
  BETTER_AUTH_SECRET: z
    .string()
    .min(process.env.NODE_ENV === "production" ? 32 : 1, "BETTER_AUTH_SECRET must be at least 32 characters (openssl rand -base64 32)"),
  BETTER_AUTH_URL: z.url().default("http://localhost:3000"),
  NEXT_PUBLIC_APP_URL: z.url().optional(),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().default("Clubhouse <no-reply@localhost>"),
});

export type Env = z.infer<typeof schema>;

let cached: { key: string; env: Env } | null = null;

/**
 * Validates environment variables lazily, on first use at runtime, so that
 * `next build` can run in CI without production secrets while a misconfigured
 * deployment still fails loudly with a readable message.
 */
export function env(): Env {
  // Re-validate when values change: `next dev` reloads .env.local in place.
  const key = schema.keyof().options.map((k) => process.env[k] ?? "").join("\u0000");
  if (cached?.key === key) return cached.env;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `  • ${issue.path.join(".")}: ${issue.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}\nSee .env.example for the expected variables.`);
  }
  cached = { key, env: parsed.data };
  return parsed.data;
}

export function appUrl() {
  const e = env();
  return (e.NEXT_PUBLIC_APP_URL ?? e.BETTER_AUTH_URL).replace(/\/$/, "");
}

export const isProduction = process.env.NODE_ENV === "production";
