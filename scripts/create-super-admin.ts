/**
 * Bootstraps a platform admin. Sign-up is invite-only, so the very first
 * admin must be created from the command line:
 *
 *   npm run admin:create -- you@college.edu "Your Name"
 */
import { eq, sql } from "drizzle-orm";
import { db, pool, schema } from "./db";

async function main() {
  const [rawEmail, name] = process.argv.slice(2);
  const email = rawEmail?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error('Usage: npm run admin:create -- <email> ["Display Name"]');
    process.exit(1);
  }

  const [existing] = await db.select().from(schema.user).where(eq(sql`lower(${schema.user.email})`, email));
  const user =
    existing ??
    (await db.insert(schema.user).values({ email, name: name?.trim() || email.split("@")[0], emailVerified: false }).returning())[0];

  await db.insert(schema.superAdmins).values({ userId: user.id }).onConflictDoNothing();
  await db.insert(schema.auditLogs).values({ action: "platform.admin_bootstrap", summary: `Bootstrapped platform admin ${email} from CLI`, actorEmail: "cli" });

  console.log(`✓ ${email} is a platform admin. Sign in at /sign-in with a one-time code.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
