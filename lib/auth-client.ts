import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";

/** Same-origin client: the auth API lives at /api/auth on this deployment. */
export const authClient = createAuthClient({
  plugins: [emailOTPClient()],
});
