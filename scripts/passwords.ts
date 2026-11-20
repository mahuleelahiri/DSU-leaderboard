/** Password helpers shared by the CLI scripts (lib/credentials.ts is server-only). */
import { randomInt } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { db, schema } from "./db";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
export const generatePassword = (length = 14) => Array.from({ length }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");

export function assertValidPassword(password: string) {
  if (password.length < 8 || password.length > 128) {
    console.error("Passwords must be 8–128 characters.");
    process.exit(1);
  }
}

/** Creates or replaces the user's email + password credential, and signs out their sessions. */
export async function setPassword(userId: string, password: string) {
  const hash = await hashPassword(password);
  const credential = and(eq(schema.account.userId, userId), eq(schema.account.providerId, "credential"));
  const [existing] = await db.select({ id: schema.account.id }).from(schema.account).where(credential);
  if (existing) await db.update(schema.account).set({ password: hash, updatedAt: new Date() }).where(eq(schema.account.id, existing.id));
  else await db.insert(schema.account).values({ userId, accountId: userId, providerId: "credential", password: hash });
  await db.delete(schema.session).where(eq(schema.session.userId, userId));
}
