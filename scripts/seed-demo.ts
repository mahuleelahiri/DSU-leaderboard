/**
 * Seeds a realistic demo club (members, two seasons, a few hundred awards and
 * pending join requests) for presentations and local development.
 *
 *   npm run db:seed -- [ownerEmail]
 */
import { eq, sql } from "drizzle-orm";
import { generateAccessCode } from "../lib/access-code";
import { db, pool, schema } from "./db";

const FIRST = ["Aarav", "Meera", "Kabir", "Riya", "Vihaan", "Ananya", "Arjun", "Ishita", "Reyansh", "Diya", "Advait", "Saanvi", "Rohan", "Tara", "Kiaan", "Myra", "Dev", "Nisha", "Aditya", "Zara", "Yash", "Pari", "Sahil", "Kavya"];
const LAST = ["Sharma", "Iyer", "Das", "Kapoor", "Nair", "Reddy", "Bose", "Mehta", "Gupta", "Rao", "Sen", "Pillai"];
const DOMAINS = ["Photography", "Videography", "Graphic Design", "UI/UX", "Illustration & Animation"];
const REASONS = ["Attended weekly meetup", "Hosted a workshop", "Event photography", "Poster for fest", "Won design challenge", "Mentored juniors", "Submitted project", "Volunteered at orientation", "Late submission", "Missed deadline"];

let seed = 42;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const pick = <T,>(items: T[]) => items[Math.floor(rand() * items.length)];

async function main() {
  const ownerEmail = process.argv[2]?.trim().toLowerCase();
  const code = generateAccessCode();

  await db.transaction(async (tx) => {
    const [club] = await tx
      .insert(schema.clubs)
      .values({ name: "Design Society (Demo)", description: "The creative club of the campus — photography, film, design and illustration.", accessCode: code })
      .returning();

    const domains = await tx.insert(schema.domains).values(DOMAINS.map((name) => ({ clubId: club.id, name }))).returning();

    const now = Date.now();
    const day = 86_400_000;
    const [past, current] = await tx
      .insert(schema.seasons)
      .values([
        { clubId: club.id, name: "Spring 2026", startDate: new Date(now - 300 * day), endDate: new Date(now - 120 * day), isCurrent: false },
        { clubId: club.id, name: "Autumn 2026", startDate: new Date(now - 100 * day), endDate: new Date(now + 80 * day), isCurrent: true },
      ])
      .returning();

    const names = new Set<string>();
    while (names.size < 28) names.add(`${pick(FIRST)} ${pick(LAST)}`);
    const members = await tx
      .insert(schema.members)
      .values([...names].map((name, i) => ({ clubId: club.id, domainId: domains[i % domains.length].id, name, joinedDate: new Date(now - (120 + i * 3) * day) })))
      .returning();

    let ownerId: string | null = null;
    if (ownerEmail) {
      const [existing] = await tx.select().from(schema.user).where(eq(sql`lower(${schema.user.email})`, ownerEmail));
      const user = existing ?? (await tx.insert(schema.user).values({ email: ownerEmail, name: ownerEmail.split("@")[0] }).returning())[0];
      ownerId = user.id;
      await tx.insert(schema.admins).values({ clubId: club.id, userId: user.id, email: ownerEmail, name: user.name, role: "owner" });
    }

    const entries: (typeof schema.markEntries.$inferInsert)[] = [];
    for (const member of members) {
      const activity = 0.3 + rand();
      for (const season of [past, current]) {
        const span = season.endDate.getTime() > now ? now - season.startDate.getTime() : season.endDate.getTime() - season.startDate.getTime();
        const count = Math.floor(activity * 9);
        for (let i = 0; i < count; i += 1) {
          const reason = pick(REASONS);
          const negative = reason.startsWith("Late") || reason.startsWith("Missed");
          entries.push({
            clubId: club.id,
            memberId: member.id,
            seasonId: season.id,
            marks: negative ? -5 : pick([5, 10, 10, 15, 20, 25]),
            reason,
            givenBy: ownerId,
            givenByName: "Demo Admin",
            createdAt: new Date(season.startDate.getTime() + rand() * span),
          });
        }
      }
    }
    await tx.insert(schema.markEntries).values(entries);

    await tx.insert(schema.joinRequests).values([
      { clubId: club.id, domainId: domains[0].id, name: "Neel Joshi", note: "1st year, love street photography" },
      { clubId: club.id, domainId: domains[3].id, name: "Aisha Khan", note: "Did a Figma course last summer" },
    ]);

    console.log(`✓ Seeded "${club.name}" with ${members.length} members and ${entries.length} awards.`);
    console.log(`  Public board: /c/${code}`);
    if (ownerEmail) console.log(`  Owner: ${ownerEmail}`);
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
