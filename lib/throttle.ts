import "server-only";
import { sql } from "drizzle-orm";
import { db, rowsOf } from "@/lib/db";

/**
 * Atomic fixed-window rate limiter backed by Postgres, so limits hold across
 * every serverless instance. Returns true when the call is allowed.
 */
export async function throttle(key: string, limit: number, windowSeconds: number) {
  const result = await db.execute(sql`
    insert into throttles (key, count, window_start)
    values (${key}, 1, now())
    on conflict (key) do update set
      count = case when throttles.window_start < now() - make_interval(secs => ${windowSeconds}) then 1 else throttles.count + 1 end,
      window_start = case when throttles.window_start < now() - make_interval(secs => ${windowSeconds}) then now() else throttles.window_start end
    returning count
  `);
  const count = Number(rowsOf<{ count: number }>(result)[0]?.count ?? 0);
  return count <= limit;
}
