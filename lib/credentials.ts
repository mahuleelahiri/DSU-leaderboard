import "server-only";
import { randomInt } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import type { Tx } from "@/lib/db";
import { account, user } from "@/lib/db/schema";
import { escapeHtml } from "@/lib/email";

/** No look-alike characters (0/O, 1/l/I), so a password read aloud or retyped survives. */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

export function generatePassword(length = 14) {
  return Array.from({ length }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
}

export type Credentials = { email: string; password: string };

/**
 * Finds or creates the user for an admin invite and makes sure they can sign
 * in with a password. A brand-new password is generated only when the person
 * has none yet; existing passwords are never touched.
 *
 * Returns the temporary password (to email and show once) or null.
 */
export async function provisionAdminUser(tx: Tx, address: string, name: string) {
  const [existing] = await tx.select({ id: user.id }).from(user).where(eq(sql`lower(${user.email})`, address)).limit(1);
  const userId = existing?.id ?? (await tx.insert(user).values({ email: address, name, emailVerified: false }).returning({ id: user.id }))[0].id;

  const [credential] = await tx
    .select({ id: account.id })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "credential")))
    .limit(1);
  if (credential) return { userId, credentials: null };

  const password = generatePassword();
  await tx.insert(account).values({ userId, accountId: userId, providerId: "credential", password: await hashPassword(password) });
  return { userId, credentials: { email: address, password } satisfies Credentials };
}

/** Email paragraph telling a new admin how to sign in. */
export function signInInstructions(credentials: Credentials | null) {
  if (!credentials) return "<p>Sign in with your email address and your existing Clubhouse password.</p>";
  return `<p>Sign in with these details, then change your password under <strong>Account</strong>:</p>
  <p style="margin:16px 0;padding:12px 16px;background:#f4f4f6;border-radius:10px;font-family:ui-monospace,Menlo,monospace;font-size:14px;line-height:1.7">
    Email: ${escapeHtml(credentials.email)}<br/>Password: ${escapeHtml(credentials.password)}
  </p>`;
}
