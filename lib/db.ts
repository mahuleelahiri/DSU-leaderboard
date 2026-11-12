import "server-only";
import { drizzle as drizzleNeon, type NeonDatabase } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import { Pool } from "@neondatabase/serverless";
import postgres from "postgres";
import * as schema from "@/lib/db/schema";
import { env } from "@/lib/env";

/**
 * Both drivers expose the same Drizzle query-builder API; we type against the
 * Neon flavour and normalise the one place they differ (raw `execute` results)
 * in `rowsOf` below.
 */
type Database = NeonDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { __clubhouseDb?: { key: string; db: Database } };

/**
 * Neon URLs use Neon's serverless driver (WebSocket pooling, ideal on
 * Vercel/edge). Any other Postgres (Docker, RDS, Supabase, CI) uses postgres.js.
 */
/** Set DB_QUERY_LOG=1 to print every query (useful for counting round trips per page). */
const queryLogger =
  process.env.DB_QUERY_LOG === "1"
    ? { logQuery: (query: string) => console.log(`[db] ${new Date().toISOString().slice(11, 23)} ${query.replace(/\s+/g, " ").slice(0, 140)}`) }
    : undefined;

function createDb(): Database {
  const { DATABASE_URL: url, DATABASE_POOL_MAX: max } = env();
  const options = { schema, casing: "snake_case" as const, logger: queryLogger };
  if (/\.neon\.tech\b/i.test(url)) {
    // Opening a connection to Neon costs several round trips (~2.5 s from
    // far-away regions), so keep idle connections around instead of the
    // default 10 s.
    return drizzleNeon(new Pool({ connectionString: url, max, idleTimeoutMillis: 5 * 60_000 }), options);
  }
  const client = postgres(url, { max, prepare: false });
  return drizzlePostgres(client, options) as unknown as Database;
}

/**
 * The connection is created on first use (not at import) so builds don't
 * require a database, and cached on globalThis so dev hot reloads don't leak
 * connections.
 */
function currentDb(): Database {
  // Keyed by connection settings so editing DATABASE_URL in .env.local takes
  // effect without restarting `next dev` (production config never changes).
  const { DATABASE_URL, DATABASE_POOL_MAX } = env();
  const key = `${DATABASE_URL}|${DATABASE_POOL_MAX}`;
  if (globalForDb.__clubhouseDb?.key !== key) globalForDb.__clubhouseDb = { key, db: createDb() };
  return globalForDb.__clubhouseDb.db;
}

export const db: Database = new Proxy({} as Database, {
  get(_target, property, receiver) {
    const instance = currentDb();
    const value = Reflect.get(instance, property, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

/**
 * Opens `count` pooled connections ahead of the first request. Parallel
 * queries each need their own connection, so warming several matters.
 */
export async function warmConnections(count: number) {
  const { sql } = await import("drizzle-orm");
  await Promise.all(Array.from({ length: count }, () => db.execute(sql`select 1`)));
}

/** Rows from `db.execute()` regardless of driver (`{ rows }` vs an array). */
export function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  return ((result as { rows?: T[] })?.rows ?? []) as T[];
}

/** Postgres unique_violation. */
export function isUniqueViolation(error: unknown, constraint?: string) {
  const err = findPgError(error);
  return err?.code === "23505" && (!constraint || (err.constraint ?? err.constraint_name) === constraint);
}

/**
 * Row still referenced elsewhere: foreign_key_violation (23503), or
 * restrict_violation (23001) for `ON DELETE RESTRICT` constraints.
 */
export function isForeignKeyViolation(error: unknown) {
  const code = findPgError(error)?.code;
  return code === "23503" || code === "23001";
}

type PgError = { code?: string; constraint?: string; constraint_name?: string };
function findPgError(error: unknown): PgError | null {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current && typeof current === "object"; depth += 1) {
    const candidate = current as PgError & { cause?: unknown };
    if (typeof candidate.code === "string" && /^[0-9A-Z]{5}$/.test(candidate.code)) return candidate;
    current = candidate.cause;
  }
  return null;
}
