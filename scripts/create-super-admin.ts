/**
 * Bootstraps a platform admin. Sign-up is invite-only, so the very first
 * admin must be created from the command line:
 *
 *   npm run admin:create -- you@college.edu "Your Name" [password]
 *
 * Without a password, a random one is generated and printed (existing
 * passwords are kept).
 */
import { and, eq, sql } from "drizzle-orm";
import { db, pool, schema } from "./db";
import { assertValidPassword, generatePassword, setPassword } from "./passwords";

async function main() {
  const [rawEmail, name, givenPassword] = process.argv.slice(2);
  const email = rawEmail?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error('Usage: npm run admin:create -- <email> ["Display Name"] [password]');
    process.exit(1);
  }
  if (givenPassword) assertValidPassword(givenPassword);

  const [existing] = await db.select().from(schema.user).where(eq(sql`lower(${schema.user.email})`, email));
  const user =
    existing ??
    (await db.insert(schema.user).values({ email, name: name?.trim() || email.split("@")[0], emailVerified: false }).returning())[0];

  await db.insert(schema.superAdmins).values({ userId: user.id }).onConflictDoNothing();
  await db.insert(schema.auditLogs).values({ action: "platform.admin_bootstrap", summary: `Bootstrapped platform admin ${email} from CLI`, actorEmail: "cli" });

  const [credential] = await db
    .select({ id: schema.account.id })
    .from(schema.account)
    .where(and(eq(schema.account.userId, user.id), eq(schema.account.providerId, "credential")));

  console.log(`✓ ${email} is a platform admin.`);
  if (givenPassword || !credential) {
    const password = givenPassword || generatePassword();
    await setPassword(user.id, password);
    console.log(givenPassword ? "  Password set." : `  Generated password: ${password}`);
  } else {
    console.log("  Kept their existing password (pass one as the 3rd argument to replace it).");
  }
  console.log("  Sign in at /sign-in with this email and password.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
