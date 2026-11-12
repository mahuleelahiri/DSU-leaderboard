type Level = "debug" | "info" | "warn" | "error";

/**
 * Minimal structured logger. Emits one JSON line per event in production
 * (friendly for Vercel / Datadog / Loki ingestion) and readable output in dev.
 */
function log(level: Level, event: string, data?: Record<string, unknown>) {
  if (level === "debug" && process.env.NODE_ENV === "production") return;
  const payload = { level, event, time: new Date().toISOString(), ...data };
  const line = process.env.NODE_ENV === "production" ? JSON.stringify(payload) : `[${level}] ${event} ${data ? JSON.stringify(data, null, 2) : ""}`;
  (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(line);
}

export const logger = {
  debug: (event: string, data?: Record<string, unknown>) => log("debug", event, data),
  info: (event: string, data?: Record<string, unknown>) => log("info", event, data),
  warn: (event: string, data?: Record<string, unknown>) => log("warn", event, data),
  error: (event: string, data?: Record<string, unknown>) => log("error", event, data),
};
