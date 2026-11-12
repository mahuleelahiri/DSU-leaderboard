/**
 * Returns `target` only if it is a same-origin relative path; otherwise the
 * fallback. Blocks open redirects such as `//evil.com`, `/\evil.com` and
 * `https://evil.com`.
 */
export function safeRedirect(target: unknown, fallback = "/dashboard") {
  if (typeof target !== "string" || target.length === 0 || target.length > 512) return fallback;
  if (!target.startsWith("/") || target.startsWith("//") || target.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f]/.test(target)) return fallback;
  try {
    const url = new URL(target, "http://localhost");
    if (url.origin !== "http://localhost") return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
