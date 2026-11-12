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
        "/email-otp/send-verification-otp": { window: 60, max: 3 },
        "/sign-in/email-otp": { window: 60, max: 5 },
      },
    },
    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: 300,
        allowedAttempts: 3,
        // Admin accounts are provisioned by invites or the bootstrap script and
        // may use any address (college or personal: Gmail, Outlook, iCloud…).
        // Unknown emails never receive a code, which blocks account spam.
        disableSignUp: true,
        // Lets an admin move their account to a personal address; the code is
        // sent to the NEW address to prove they own it.
        changeEmail: { enabled: true },
        async sendVerificationOTP({ email, otp, type }) {
          const changing = type === "change-email";
          await sendEmail({
            to: email,
            subject: changing ? `${otp} confirms your new Clubhouse email` : `${otp} is your Clubhouse sign-in code`,
            heading: changing ? "Confirm your new email" : "Your sign-in code",
            body: otpEmailBody(otp, changing ? "change-email" : "sign-in"),
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
      // OTP emails are sent after the response (prevents timing-based account
      // enumeration). after() keeps serverless functions alive until they finish.
      backgroundTasks: { handler: (task) => after(task) },
      ipAddress: { ipAddressHeaders: ["x-forwarded-for", "x-real-ip"] },
    },
  });
}

type Auth = ReturnType<typeof createAuth>;
const globalForAuth = globalThis as unknown as { __clubhouseAuth?: { key: string; auth: Auth } };

/**
 * Lazily constructed so environment validation happens at runtime, not build
 * time. Rebuilt if auth settings change (e.g. .env.local edited during dev).
 */
export function getAuth(): Auth {
  const e = env();
  const key = [e.BETTER_AUTH_SECRET, e.BETTER_AUTH_URL, e.NEXT_PUBLIC_APP_URL, e.DATABASE_URL].join("\u0000");
  if (globalForAuth.__clubhouseAuth?.key !== key) globalForAuth.__clubhouseAuth = { key, auth: createAuth() };
  return globalForAuth.__clubhouseAuth.auth;
}
