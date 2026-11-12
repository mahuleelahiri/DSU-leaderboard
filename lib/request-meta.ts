import "server-only";
import { headers } from "next/headers";

/** Best-effort client IP from the platform's proxy headers. */
export async function clientIp() {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || h.get("x-real-ip") || "unknown";
}
