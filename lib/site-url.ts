/**
 * Site URL helpers shared by env validation and the root layout (no
 * server-only import, and no other env vars needed, so the build can use it).
 */

/** "my-app.vercel.app" -> "https://my-app.vercel.app"; blank -> undefined. */
export function normalizeSiteUrl(value: string | null | undefined) {
  const trimmed = value?.trim().replace(/\/+$/, "");
  if (!trimmed) return undefined;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/** Vercel's production domain when deployed there, otherwise local dev. */
export function defaultSiteUrl() {
  return normalizeSiteUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL) ?? "http://localhost:3000";
}

/** A URL that is always safe to construct (falls back instead of throwing). */
export function siteUrlOrDefault(value: string | null | undefined) {
  const normalized = normalizeSiteUrl(value);
  try {
    if (normalized) return new URL(normalized);
  } catch {
    // Malformed value: fall through to the default.
  }
  return new URL(defaultSiteUrl());
}
