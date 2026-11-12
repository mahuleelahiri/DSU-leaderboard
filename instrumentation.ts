/**
 * Runs once when the Next.js server starts. Warms database connections so the
 * first visitor doesn't pay the connection handshake; failures are logged and
 * never block startup.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NEXT_PHASE === "phase-production-build" || !process.env.DATABASE_URL) return;
  const { warmConnections } = await import("@/lib/db");
  const { logger } = await import("@/lib/logger");
  const started = Date.now();
  warmConnections(Math.min(8, Number(process.env.DATABASE_POOL_MAX ?? 10)))
    .then(() => logger.info("db.warmed", { ms: Date.now() - started }))
    .catch((error) => logger.warn("db.warm_failed", { error: error instanceof Error ? error.message : String(error) }));
}
