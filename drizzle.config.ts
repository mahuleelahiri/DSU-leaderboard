import type { Config } from "drizzle-kit";

// drizzle-kit doesn't read .env.local itself. Without this, `npm run db:migrate`
// silently fell back to localhost instead of your DATABASE_URL. Variables that
// are already set (CI, Vercel, an explicit DATABASE_URL=...) take precedence.
try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local (CI / production): rely on the real environment.
}

export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/postgres",
  },
  casing: "snake_case",
} satisfies Config;
