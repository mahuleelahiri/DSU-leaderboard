import { connection, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

/** Liveness + database readiness probe for uptime monitors and load balancers. */
export async function GET() {
  await connection(); // always evaluate at request time, never at build
  const started = performance.now();
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json(
      { status: "ok", database: "ok", latencyMs: Math.round(performance.now() - started) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    logger.error("health.database_unreachable", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ status: "degraded", database: "unreachable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
