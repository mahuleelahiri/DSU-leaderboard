/**
 * Sets (or resets) an existing user's sign-in password and signs them out
 * everywhere:
 *
 *   npm run admin:password -- you@college.edu 'new-password'
 */
import { eq, sql } from "drizzle-orm";
import { db, pool, schema } from "./db";
import { assertValidPassword, setPassword } from "./passwords";

async function main() {
  const [rawEmail, password] = process.argv.slice(2);
  const email = rawEmail?.trim().toLowerCase();
  if (!email || !password) {
    console.error("Usage: npm run admin:password -- <email> <password>");
    process.exit(1);
  }
  assertValidPassword(password);

  const [user] = await db.select({ id: schema.user.id }).from(schema.user).where(eq(sql`lower(${schema.user.email})`, email));
  if (!user) {
    console.error(`No account for ${email}. Create it with: npm run admin:create -- ${email}`);
    process.exit(1);
  }
  await setPassword(user.id, password);
  await db.insert(schema.auditLogs).values({ action: "account.password_set", summary: `Password set for ${email} from CLI`, actorEmail: "cli", targetType: "user", targetId: user.id });
  console.log(`✓ Password set for ${email}. They can sign in at /sign-in.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
