import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";

/**
 * Same-origin client: the auth API lives at /api/auth on whatever address the
 * page was loaded from. The base URL is given explicitly so the client never
 * reads server env vars like BETTER_AUTH_URL; a malformed value there used to
 * crash the build while prerendering pages that import this module. On the
 * server the client is never called, so the placeholder is never contacted.
 */
export const authClient = createAuthClient({
  baseURL: typeof window === "undefined" ? "http://localhost" : window.location.origin,
  plugins: [emailOTPClient()],
});
