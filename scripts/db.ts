/** Standalone DB client for CLI scripts (lib/db.ts is server-only). */
import { Pool } from "@neondatabase/serverless";
import { drizzle as drizzleNeon, type NeonDatabase } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../lib/db/schema";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Run with --env-file=.env.local");
  process.exit(1);
}

const isNeon = /\.neon\.tech\b/i.test(url);
const neonPool = isNeon ? new Pool({ connectionString: url }) : null;
const pgClient = isNeon ? null : postgres(url, { max: 2, prepare: false });

export const db: NeonDatabase<typeof schema> = neonPool
  ? drizzleNeon(neonPool, { schema, casing: "snake_case" })
  : (drizzlePostgres(pgClient!, { schema, casing: "snake_case" }) as unknown as NeonDatabase<typeof schema>);

export const pool = { end: () => (neonPool ? neonPool.end() : pgClient!.end()) };
export { schema };
