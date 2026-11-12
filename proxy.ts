import { NextResponse, type NextRequest } from "next/server";
import { getCookieCache, getSessionCookie } from "better-auth/cookies";
import { getAuth } from "@/lib/auth";

function toSignIn(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/sign-in";
  url.search = `?next=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`;
  return NextResponse.redirect(url);
}

/**
 * Auth gate for admin pages, plus session cookie-cache refresh.
 *
 * Better Auth keeps a signed 5-minute copy of the session in a cookie so pages
 * can skip the database. Server Components can't set cookies, so without this
 * the copy is never renewed and every page load after the first five minutes
 * pays two extra database round trips. When the copy is missing or expired we
 * fetch the session once here and hand the refreshed cookie to both the page
 * render and the browser.
 *
 * This is still only a fast path: pages and server actions re-check the
 * session and role on the server (lib/dal.ts).
 */
export async function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) return toSignIn(request);

  const cached = await getCookieCache(request, {
    secret: process.env.BETTER_AUTH_SECRET,
    isSecure: process.env.NODE_ENV === "production",
  }).catch(() => null);
  if (cached) return NextResponse.next();

  const { headers: authHeaders, response: session } = await getAuth().api.getSession({ headers: request.headers, returnHeaders: true });
  if (!session) return toSignIn(request);

  const refreshed = authHeaders.getSetCookie();
  if (refreshed.length === 0) return NextResponse.next();

  const cookies = new Map(request.cookies.getAll().map((c) => [c.name, c.value]));
  for (const header of refreshed) {
    const [pair] = header.split(";");
    const separator = pair.indexOf("=");
    cookies.set(pair.slice(0, separator).trim(), pair.slice(separator + 1));
  }
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("cookie", [...cookies].map(([name, value]) => `${name}=${value}`).join("; "));

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  for (const header of refreshed) response.headers.append("set-cookie", header);
  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
