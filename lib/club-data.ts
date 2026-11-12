import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { isValidAccessCode, normalizeAccessCode } from "@/lib/access-code";
import type { MemberHistory, PublicBoard, PublicSeason } from "@/lib/club";
import { db } from "@/lib/db";
import { clubs, domains, markEntries, members, seasons } from "@/lib/db/schema";

export { clubTag as boardTag } from "@/lib/cache-tags";
import { clubTag as boardTag } from "@/lib/cache-tags";

const toSeason = (row: typeof seasons.$inferSelect): PublicSeason => ({
  id: row.id,
  name: row.name,
  isCurrent: row.isCurrent,
  startDate: row.startDate.toISOString(),
  endDate: row.endDate.toISOString(),
});

/**
 * Public leaderboard for a club code. Cached on the server and tagged by club
 * id so every admin mutation can invalidate it instantly via `updateTag`.
 */
export async function getPublicBoard(rawCode: string, requestedSeasonId: string | null): Promise<PublicBoard | null> {
  "use cache";
  cacheLife("minutes");

  const code = normalizeAccessCode(rawCode);
  if (!isValidAccessCode(code)) return null;

  const [club] = await db.select().from(clubs).where(eq(clubs.accessCode, code)).limit(1);
  if (!club) return null;
  cacheTag(boardTag(club.id));

  // Same selection rule as below (requested → current → most recent), resolved
  // in SQL so the member totals don't wait on a separate seasons query.
  const requested = requestedSeasonId && /^[0-9a-f-]{36}$/i.test(requestedSeasonId) ? requestedSeasonId : null;
  const selectedSeasonId = sql`coalesce(
    (select ${seasons.id} from ${seasons} where ${seasons.clubId} = ${club.id} and ${seasons.id} = ${requested}::uuid),
    (select ${seasons.id} from ${seasons} where ${seasons.clubId} = ${club.id} and ${seasons.isCurrent}),
    (select ${seasons.id} from ${seasons} where ${seasons.clubId} = ${club.id} order by ${seasons.startDate} desc limit 1)
  )`;

  const [seasonRows, domainRows, memberRows] = await Promise.all([
    db.select().from(seasons).where(eq(seasons.clubId, club.id)).orderBy(desc(seasons.isCurrent), desc(seasons.startDate)),
    db.select({ id: domains.id, name: domains.name }).from(domains).where(eq(domains.clubId, club.id)).orderBy(asc(domains.name)),
    db
      .select({
        id: members.id,
        name: members.name,
        photoUrl: members.photoUrl,
        domainId: members.domainId,
        marks: sql<number>`coalesce(sum(${markEntries.marks}), 0)::int`,
        recentMarks: sql<number>`coalesce(sum(${markEntries.marks}) filter (where ${markEntries.createdAt} > now() - interval '7 days'), 0)::int`,
        entries: sql<number>`count(${markEntries.id})::int`,
        lastAwardAt: sql<string | null>`max(${markEntries.createdAt})`,
      })
      .from(members)
      .leftJoin(markEntries, and(eq(markEntries.memberId, members.id), sql`${markEntries.seasonId} = ${selectedSeasonId}`))
      .where(and(eq(members.clubId, club.id), eq(members.active, true)))
      .groupBy(members.id),
  ]);

  const allSeasons = seasonRows.map(toSeason);
  const season = allSeasons.find((s) => s.id === requested) ?? allSeasons.find((s) => s.isCurrent) ?? allSeasons[0] ?? null;

  const membersOut = memberRows.map((row) => ({
    ...row,
    lastAwardAt: row.lastAwardAt ? new Date(row.lastAwardAt).toISOString() : null,
  }));

  const scoringThisWeek = membersOut.reduce((sum, m) => sum + (m.recentMarks !== 0 ? 1 : 0), 0);

  return {
    club: {
      id: club.id,
      name: club.name,
      description: club.description,
      accessCode: club.accessCode,
      allowJoinRequests: club.allowJoinRequests,
    },
    seasons: allSeasons,
    season,
    domains: domainRows,
    members: membersOut,
    stats: {
      totalMarks: membersOut.reduce((sum, m) => sum + m.marks, 0),
      activeMembers: membersOut.length,
      scoringThisWeek,
    },
    generatedAt: new Date().toISOString(),
  };
}

/** Public mark history for one member, scoped to the club code. */
export async function getMemberHistory(rawCode: string, memberId: string): Promise<MemberHistory | null> {
  "use cache";
  cacheLife("minutes");

  const code = normalizeAccessCode(rawCode);
  if (!isValidAccessCode(code) || !/^[0-9a-f-]{36}$/i.test(memberId)) return null;

  const [row] = await db
    .select({ member: members, domainName: domains.name, clubId: clubs.id })
    .from(members)
    .innerJoin(clubs, eq(clubs.id, members.clubId))
    .innerJoin(domains, eq(domains.id, members.domainId))
    .where(and(eq(clubs.accessCode, code), eq(members.id, memberId), eq(members.active, true)))
    .limit(1);
  if (!row) return null;
  cacheTag(boardTag(row.clubId));

  const [entries, totals] = await Promise.all([
    db
      .select({
        id: markEntries.id,
        marks: markEntries.marks,
        reason: markEntries.reason,
        createdAt: markEntries.createdAt,
        seasonName: seasons.name,
        givenBy: markEntries.givenByName,
      })
      .from(markEntries)
      .innerJoin(seasons, eq(seasons.id, markEntries.seasonId))
      .where(eq(markEntries.memberId, memberId))
      .orderBy(desc(markEntries.createdAt))
      .limit(100),
    db
      .select({
        seasonId: seasons.id,
        seasonName: seasons.name,
        isCurrent: seasons.isCurrent,
        marks: sql<number>`coalesce(sum(${markEntries.marks}), 0)::int`,
      })
      .from(markEntries)
      .innerJoin(seasons, eq(seasons.id, markEntries.seasonId))
      .where(eq(markEntries.memberId, memberId))
      .groupBy(seasons.id)
      .orderBy(desc(seasons.startDate)),
  ]);

  return {
    member: {
      id: row.member.id,
      name: row.member.name,
      photoUrl: row.member.photoUrl,
      domain: row.domainName,
      joinedDate: row.member.joinedDate.toISOString(),
    },
    seasonTotals: totals,
    entries: entries.map((entry) => ({ ...entry, createdAt: entry.createdAt.toISOString() })),
  };
}

/** Resolves a club code to its id (used by the legacy /c/[code]/admin route). */
export async function findClubIdByCode(rawCode: string) {
  const code = normalizeAccessCode(rawCode);
  if (!isValidAccessCode(code)) return null;
  const [club] = await db.select({ id: clubs.id }).from(clubs).where(eq(clubs.accessCode, code)).limit(1);
  return club?.id ?? null;
}
