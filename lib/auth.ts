import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { emailOTP } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { after } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { env, isProduction } from "@/lib/env";
import { escapeHtml, otpEmailBody, sendEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

/**
 * Runs after any user update. When the sign-in email changed, keep the copy on
 * club admin records in sync, audit it, and alert the previous address so a
 * hijacked session can't silently take over an account.
 */
async function onUserUpdated(user: { id: string; email: string }, previousEmail: string | undefined) {
  if (!previousEmail || previousEmail.toLowerCase() === user.email.toLowerCase()) return;
  await db.update(schema.admins).set({ email: user.email }).where(eq(schema.admins.userId, user.id));
  await db.insert(schema.auditLogs).values({
    actorId: user.id,
    actorEmail: user.email,
    action: "account.email_change",
    summary: `Changed sign-in email from ${previousEmail} to ${user.email}`,
    targetType: "user",
    targetId: user.id,
  });
  try {
    await sendEmail({
      to: previousEmail,
      subject: "Your Clubhouse sign-in email was changed",
      heading: "Sign-in email changed",
      body: `<p>The Clubhouse account that used <strong>${escapeHtml(previousEmail)}</strong> now signs in with <strong>${escapeHtml(user.email)}</strong>.</p><p>If you didn't make this change, contact your platform admin immediately.</p>`,
    });
  } catch (error) {
    logger.warn("account.email_change_notice_failed", { error: error instanceof Error ? error.message : String(error) });
  }
}

function createAuth() {
  const e = env();
  const origins = [e.BETTER_AUTH_URL, e.NEXT_PUBLIC_APP_URL].filter((value): value is string => Boolean(value));

  return betterAuth({
    appName: "Clubhouse",
    database: drizzleAdapter(db, { provider: "pg", schema }),
    secret: e.BETTER_AUTH_SECRET,
    baseURL: e.BETTER_AUTH_URL,
    trustedOrigins: origins,
    session: {
      expiresIn: 60 * 60 * 24 * 14, // 14 days
      updateAge: 60 * 60 * 24, // refresh expiry daily on activity
      cookieCache: { enabled: true, maxAge: 60 * 5 },
    },
    rateLimit: {
      enabled: isProduction,
      storage: "database",
      window: 60,
      max: 60,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/request-password-reset": { window: 60, max: 3 },
        "/email-otp/request-email-change": { window: 60, max: 3 },
      },
    },
    // Admins sign in with email + password. Accounts are only created by
    // invites or the CLI (each gets a generated password), never by sign-up.
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: 60 * 60,
      async sendResetPassword({ user, url }) {
        await sendEmail({
          to: user.email,
          subject: "Reset your Clubhouse password",
          heading: "Reset your password",
          body: "<p>Someone (hopefully you) asked to reset the password for this Clubhouse account. The link expires in 1 hour.</p><p style=\"color:#6b7280;font-size:13px\">If you didn't ask for this, ignore this email and your password stays the same.</p>",
          cta: { label: "Choose a new password", href: url },
        });
      },
    },
    // One-time codes are kept only to confirm a change of sign-in email (the
    // code goes to the NEW address to prove ownership). Every other email-OTP
    // route, including code-based sign-in, is switched off.
    disabledPaths: [
      "/email-otp/send-verification-otp",
      "/email-otp/check-verification-otp",
      "/email-otp/verify-email",
      "/sign-in/email-otp",
      "/email-otp/request-password-reset",
      "/forget-password/email-otp",
      "/email-otp/reset-password",
    ],
    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: 300,
        allowedAttempts: 3,
        disableSignUp: true,
        changeEmail: { enabled: true },
        async sendVerificationOTP({ email, otp, type }) {
          if (type !== "change-email") return; // other OTP routes are disabled above
          await sendEmail({
            to: email,
            subject: `${otp} confirms your new Clubhouse email`,
            heading: "Confirm your new email",
            body: otpEmailBody(otp),
          });
        },
      }),
      nextCookies(),
    ],
    databaseHooks: {
      user: {
        update: {
          after: async (user, ctx) => {
            const previous = (ctx?.context as { session?: { user?: { email?: string } } } | undefined)?.session?.user?.email;
            await onUserUpdated(user, previous);
          },
        },
      },
    },
    advanced: {
      useSecureCookies: isProduction,
      database: { generateId: "uuid" },
      // Auth emails are sent after the response (prevents timing-based account
      // enumeration). after() keeps serverless functions alive until they finish.
      backgroundTasks: { handler: (task) => after(task) },
      ipAddress: { ipAddressHeaders: ["x-forwarded-for", "x-real-ip"] },
    },
  });
}

type Auth = ReturnType<typeof createAuth>;
const globalForAuth = globalThis as unknown as { __clubhouseAuth?: { key: string; factory: typeof createAuth; auth: Auth } };

/**
 * Lazily constructed so environment validation happens at runtime, not build
 * time. Rebuilt if auth settings change (e.g. .env.local edited during dev) or
 * this file is hot-reloaded (a new `createAuth` means the config changed).
 */
export function getAuth(): Auth {
  const e = env();
  const key = [e.BETTER_AUTH_SECRET, e.BETTER_AUTH_URL, e.NEXT_PUBLIC_APP_URL, e.DATABASE_URL].join("\u0000");
  const cached = globalForAuth.__clubhouseAuth;
  if (cached?.key !== key || cached.factory !== createAuth) globalForAuth.__clubhouseAuth = { key, factory: createAuth, auth: createAuth() };
  return globalForAuth.__clubhouseAuth!.auth;
}
