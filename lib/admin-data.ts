import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { and, asc, desc, eq, gte, ilike, or, sql, type SQL } from "drizzle-orm";
import { accessTag, clubTag, PLATFORM_TAG, viewerTag } from "@/lib/cache-tags";
import { db } from "@/lib/db";
import {
  admins,
  auditLogs,
  clubs,
  domains,
  joinRequests,
  markEntries,
  members,
  seasons,
  superAdmins,
  user,
} from "@/lib/db/schema";

/*
 * Every function here assumes the caller has already authorised access to
 * `clubId` through lib/dal.ts. Nothing in this module checks permissions.
 *
 * Reads are cached ('use cache') and tagged per club, so repeat page views
 * cost no database round trips. Every server action that changes club data
 * calls updateTag() for the same tags (see app/_actions), so admins always
 * see their own changes immediately.
 */

export const PAGE_SIZE = 25;

/** A season id, the club's current season, or no season. */
export type SeasonRef = string | "current" | null;

/** Resolves a SeasonRef inside SQL so callers never need a separate lookup query. */
function seasonIdSql(clubId: string, ref: SeasonRef): SQL | null {
  if (ref === "current") return sql`(select ${seasons.id} from ${seasons} where ${seasons.clubId} = ${clubId} and ${seasons.isCurrent})`;
  return ref ? sql`${ref}::uuid` : null;
}

/** Drops the window-function `total` column from a paginated row. */
function withoutTotal<T extends { total: number }>(row: T): Omit<T, "total"> {
  const copy: Partial<T> = { ...row };
  delete copy.total;
  return copy as Omit<T, "total">;
}

function cacheClub(clubId: string) {
  cacheTag(clubTag(clubId));
  cacheLife("minutes");
}

export async function getCurrentSeason(clubId: string) {
  "use cache";
  cacheClub(clubId);
  const [season] = await db
    .select()
    .from(seasons)
    .where(and(eq(seasons.clubId, clubId), eq(seasons.isCurrent, true)))
    .limit(1);
  return season ?? null;
}

export async function listDomains(clubId: string) {
  "use cache";
  cacheClub(clubId);
  return db
    .select({
      id: domains.id,
      name: domains.name,
      createdAt: domains.createdAt,
      memberCount: sql<number>`(select count(*)::int from ${members} where ${members.domainId} = ${domains.id} and ${members.active})`,
      totalMembers: sql<number>`(select count(*)::int from ${members} where ${members.domainId} = ${domains.id})`,
      pendingRequests: sql<number>`(select count(*)::int from ${joinRequests} where ${joinRequests.domainId} = ${domains.id} and ${joinRequests.status} = 'pending')`,
    })
    .from(domains)
    .where(eq(domains.clubId, clubId))
    .orderBy(asc(domains.name));
}

export async function listSeasons(clubId: string) {
  "use cache";
  cacheClub(clubId);
  return db
    .select({
      id: seasons.id,
      name: seasons.name,
      startDate: seasons.startDate,
      endDate: seasons.endDate,
      isCurrent: seasons.isCurrent,
      entryCount: sql<number>`(select count(*)::int from ${markEntries} where ${markEntries.seasonId} = ${seasons.id})`,
      totalMarks: sql<number>`(select coalesce(sum(${markEntries.marks}), 0)::int from ${markEntries} where ${markEntries.seasonId} = ${seasons.id})`,
    })
    .from(seasons)
    .where(eq(seasons.clubId, clubId))
    .orderBy(desc(seasons.isCurrent), desc(seasons.startDate));
}

/** Members with their total for the given season (all members, active or not). */
export async function listMembersWithMarks(clubId: string, season: SeasonRef) {
  "use cache";
  cacheClub(clubId);
  const seasonId = seasonIdSql(clubId, season);
  const join = seasonId ? and(eq(markEntries.memberId, members.id), sql`${markEntries.seasonId} = ${seasonId}`) : sql`false`;
  return db
    .select({
      id: members.id,
      name: members.name,
      photoUrl: members.photoUrl,
      active: members.active,
      domainId: members.domainId,
      domainName: domains.name,
      joinedDate: members.joinedDate,
      marks: sql<number>`coalesce(sum(${markEntries.marks}), 0)::int`,
      entries: sql<number>`count(${markEntries.id})::int`,
      lifetimeEntries: sql<number>`(select count(*)::int from ${markEntries} me where me.member_id = ${members.id})`,
    })
    .from(members)
    .innerJoin(domains, eq(domains.id, members.domainId))
    .leftJoin(markEntries, join)
    .where(eq(members.clubId, clubId))
    .groupBy(members.id, domains.name)
    .orderBy(asc(members.name));
}

export type EntryFilters = { season?: SeasonRef; memberId?: string | null; q?: string | null; page?: number };

function entryConditions(clubId: string, filters: EntryFilters) {
  const conditions: SQL[] = [eq(markEntries.clubId, clubId)];
  const seasonId = seasonIdSql(clubId, filters.season ?? null);
  if (seasonId) conditions.push(sql`${markEntries.seasonId} = ${seasonId}`);
  if (filters.memberId) conditions.push(eq(markEntries.memberId, filters.memberId));
  if (filters.q) {
    const term = `%${filters.q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
    conditions.push(or(ilike(members.name, term), ilike(markEntries.reason, term), ilike(markEntries.givenByName, term))!);
  }
  return and(...conditions);
}

const entryColumns = {
  id: markEntries.id,
  marks: markEntries.marks,
  reason: markEntries.reason,
  createdAt: markEntries.createdAt,
  updatedAt: markEntries.updatedAt,
  givenByName: markEntries.givenByName,
  memberId: members.id,
  memberName: members.name,
  memberPhoto: members.photoUrl,
  domainName: domains.name,
  seasonName: seasons.name,
};

/** One page of entries plus the total, in a single query (window count). */
export async function listEntries(clubId: string, filters: EntryFilters) {
  "use cache";
  cacheClub(clubId);
  const page = Math.max(1, filters.page ?? 1);
  const rows = await db
    .select({ ...entryColumns, total: sql<number>`count(*) over ()::int` })
    .from(markEntries)
    .innerJoin(members, eq(members.id, markEntries.memberId))
    .innerJoin(domains, eq(domains.id, members.domainId))
    .innerJoin(seasons, eq(seasons.id, markEntries.seasonId))
    .where(entryConditions(clubId, filters))
    .orderBy(desc(markEntries.createdAt))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);
  const total = rows[0]?.total ?? 0;
  return { rows: rows.map(withoutTotal), total, page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

/** Every entry for a season in one query (CSV export). */
export async function listAllEntries(clubId: string, seasonId: string) {
  return db
    .select(entryColumns)
    .from(markEntries)
    .innerJoin(members, eq(members.id, markEntries.memberId))
    .innerJoin(domains, eq(domains.id, members.domainId))
    .innerJoin(seasons, eq(seasons.id, markEntries.seasonId))
    .where(and(eq(markEntries.clubId, clubId), eq(markEntries.seasonId, seasonId)))
    .orderBy(desc(markEntries.createdAt));
}

/** All overview queries run in one parallel batch; nothing waits on a season lookup. */
export async function getClubOverview(clubId: string) {
  "use cache";
  cacheClub(clubId);
  const currentSeason = seasonIdSql(clubId, "current")!;
  const seasonFilter = sql`${markEntries.seasonId} = ${currentSeason}`;
  const since = new Date(Date.now() - 29 * 86_400_000);
  since.setHours(0, 0, 0, 0);

  const [[stats], daily, domainTotals, recent, top] = await Promise.all([
    db
      .select({
        season: sql<{ id: string; name: string; start_date: string; end_date: string } | null>`(select row_to_json(s) from (select ${seasons.id}, ${seasons.name}, ${seasons.startDate}, ${seasons.endDate} from ${seasons} where ${seasons.clubId} = ${clubId} and ${seasons.isCurrent}) s)`,
        active: sql<number>`(select count(*)::int from ${members} where ${members.clubId} = ${clubId} and ${members.active})`,
        total: sql<number>`(select count(*)::int from ${members} where ${members.clubId} = ${clubId})`,
        totalMarks: sql<number>`(select coalesce(sum(${markEntries.marks}), 0)::int from ${markEntries} where ${markEntries.clubId} = ${clubId} and ${seasonFilter})`,
        entries: sql<number>`(select count(*)::int from ${markEntries} where ${markEntries.clubId} = ${clubId} and ${seasonFilter})`,
        weekEntries: sql<number>`(select count(*)::int from ${markEntries} where ${markEntries.clubId} = ${clubId} and ${seasonFilter} and ${markEntries.createdAt} > now() - interval '7 days')`,
        pending: sql<number>`(select count(*)::int from ${joinRequests} where ${joinRequests.clubId} = ${clubId} and ${joinRequests.status} = 'pending')`,
      })
      .from(sql`(select 1) as one`),
    db
      .select({
        day: sql<string>`to_char(date_trunc('day', ${markEntries.createdAt}), 'YYYY-MM-DD')`,
        marks: sql<number>`coalesce(sum(${markEntries.marks}) filter (where ${markEntries.marks} > 0), 0)::int`,
        entries: sql<number>`count(*)::int`,
      })
      .from(markEntries)
      .where(and(eq(markEntries.clubId, clubId), gte(markEntries.createdAt, since)))
      .groupBy(sql`1`)
      .orderBy(sql`1`),
    db
      .select({
        id: domains.id,
        name: domains.name,
        marks: sql<number>`coalesce(sum(${markEntries.marks}), 0)::int`,
        members: sql<number>`count(distinct ${members.id})::int`,
      })
      .from(domains)
      .leftJoin(members, and(eq(members.domainId, domains.id), eq(members.active, true)))
      .leftJoin(markEntries, and(eq(markEntries.memberId, members.id), seasonFilter))
      .where(eq(domains.clubId, clubId))
      .groupBy(domains.id)
      .orderBy(desc(sql`3`)),
    db
      .select(entryColumns)
      .from(markEntries)
      .innerJoin(members, eq(members.id, markEntries.memberId))
      .innerJoin(domains, eq(domains.id, members.domainId))
      .innerJoin(seasons, eq(seasons.id, markEntries.seasonId))
      .where(eq(markEntries.clubId, clubId))
      .orderBy(desc(markEntries.createdAt))
      .limit(6),
    db
      .select({
        id: members.id,
        name: members.name,
        photoUrl: members.photoUrl,
        domainName: domains.name,
        marks: sql<number>`coalesce(sum(${markEntries.marks}), 0)::int`,
      })
      .from(members)
      .innerJoin(domains, eq(domains.id, members.domainId))
      .leftJoin(markEntries, and(eq(markEntries.memberId, members.id), seasonFilter))
      .where(and(eq(members.clubId, clubId), eq(members.active, true)))
      .groupBy(members.id, domains.name)
      .orderBy(desc(sql`5`), asc(members.name))
      .limit(5),
  ]);

  // Fill missing days so the chart has a continuous 30-day axis.
  const byDay = new Map(daily.map((d) => [d.day, d]));
  const series = Array.from({ length: 30 }, (_, i) => {
    const date = new Date(since.getTime() + i * 86_400_000);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return { day: key, marks: byDay.get(key)?.marks ?? 0, entries: byDay.get(key)?.entries ?? 0 };
  });

  const season = stats?.season
    ? { id: stats.season.id, name: stats.season.name, startDate: new Date(stats.season.start_date), endDate: new Date(stats.season.end_date) }
    : null;

  return {
    season,
    stats: {
      activeMembers: stats?.active ?? 0,
      totalMembers: stats?.total ?? 0,
      totalMarks: stats?.totalMarks ?? 0,
      entries: stats?.entries ?? 0,
      weekEntries: stats?.weekEntries ?? 0,
      pendingRequests: stats?.pending ?? 0,
    },
    series,
    domainTotals,
    recent,
    top: season ? top : [],
  };
}

export async function listJoinRequests(clubId: string, status: "pending" | "approved" | "rejected") {
  "use cache";
  cacheClub(clubId);
  return db
    .select({
      id: joinRequests.id,
      name: joinRequests.name,
      note: joinRequests.note,
      status: joinRequests.status,
      createdAt: joinRequests.createdAt,
      reviewedAt: joinRequests.reviewedAt,
      domainId: joinRequests.domainId,
      domainName: domains.name,
      reviewer: user.email,
    })
    .from(joinRequests)
    .innerJoin(domains, eq(domains.id, joinRequests.domainId))
    .leftJoin(user, eq(user.id, joinRequests.reviewedBy))
    .where(and(eq(joinRequests.clubId, clubId), eq(joinRequests.status, status)))
    .orderBy(status === "pending" ? asc(joinRequests.createdAt) : desc(joinRequests.reviewedAt))
    .limit(100);
}

export async function countPendingRequests(clubId: string) {
  "use cache";
  cacheClub(clubId);
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(joinRequests)
    .where(and(eq(joinRequests.clubId, clubId), eq(joinRequests.status, "pending")));
  return row?.count ?? 0;
}

export async function listClubAdmins(clubId: string) {
  "use cache";
  cacheClub(clubId);
  cacheTag(accessTag(clubId));
  return db
    .select({
      userId: admins.userId,
      name: admins.name,
      email: admins.email,
      role: admins.role,
      createdAt: admins.createdAt,
      lastSeen: sql<string | null>`(select max(s.updated_at) from session s where s.user_id = ${admins.userId})`,
    })
    .from(admins)
    .where(eq(admins.clubId, clubId))
    .orderBy(desc(admins.role), asc(admins.name));
}

/** One page of the audit log plus the total, in a single query. */
export async function listAuditLogs(clubId: string | null, page = 1) {
  "use cache";
  if (clubId) cacheClub(clubId);
  cacheTag(PLATFORM_TAG);
  cacheLife("minutes");
  const current = Math.max(1, page);
  const rows = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      summary: auditLogs.summary,
      actorEmail: auditLogs.actorEmail,
      createdAt: auditLogs.createdAt,
      clubName: clubs.name,
      clubId: auditLogs.clubId,
      total: sql<number>`count(*) over ()::int`,
    })
    .from(auditLogs)
    .leftJoin(clubs, eq(clubs.id, auditLogs.clubId))
    .where(clubId ? eq(auditLogs.clubId, clubId) : undefined)
    .orderBy(desc(auditLogs.createdAt))
    .limit(PAGE_SIZE)
    .offset((current - 1) * PAGE_SIZE);
  const total = rows[0]?.total ?? 0;
  return { rows: rows.map(withoutTotal), total, page: current, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

/** Clubs the viewer administers (all clubs for super admins). */
export async function listViewerClubs(viewerId: string, isSuperAdmin: boolean) {
  "use cache";
  cacheTag(viewerTag(viewerId), PLATFORM_TAG);
  cacheLife("minutes");
  const base = db
    .select({
      id: clubs.id,
      name: clubs.name,
      description: clubs.description,
      accessCode: clubs.accessCode,
      role: admins.role,
      memberCount: sql<number>`(select count(*)::int from ${members} where ${members.clubId} = ${clubs.id} and ${members.active})`,
      pendingRequests: sql<number>`(select count(*)::int from ${joinRequests} where ${joinRequests.clubId} = ${clubs.id} and ${joinRequests.status} = 'pending')`,
      lastActivity: sql<string | null>`(select max(${markEntries.createdAt}) from ${markEntries} where ${markEntries.clubId} = ${clubs.id})`,
    })
    .from(clubs)
    .leftJoin(admins, and(eq(admins.clubId, clubs.id), eq(admins.userId, viewerId)));
  return (isSuperAdmin ? base : base.where(sql`${admins.userId} is not null`)).orderBy(asc(clubs.name));
}

/* --------------------------------- Platform -------------------------------- */

export async function getPlatformOverview() {
  "use cache";
  cacheTag(PLATFORM_TAG);
  cacheLife("minutes");
  const [[totals], clubRows] = await Promise.all([
    db
      .select({
        clubs: sql<number>`(select count(*)::int from ${clubs})`,
        members: sql<number>`(select count(*)::int from ${members} where ${members.active})`,
        admins: sql<number>`(select count(distinct ${admins.userId})::int from ${admins})`,
        entries: sql<number>`(select count(*)::int from ${markEntries})`,
        weekEntries: sql<number>`(select count(*)::int from ${markEntries} where ${markEntries.createdAt} > now() - interval '7 days')`,
        pending: sql<number>`(select count(*)::int from ${joinRequests} where ${joinRequests.status} = 'pending')`,
      })
      .from(sql`(select 1) as one`),
    db
      .select({
        id: clubs.id,
        name: clubs.name,
        accessCode: clubs.accessCode,
        createdAt: clubs.createdAt,
        memberCount: sql<number>`(select count(*)::int from ${members} where ${members.clubId} = ${clubs.id} and ${members.active})`,
        adminCount: sql<number>`(select count(*)::int from ${admins} where ${admins.clubId} = ${clubs.id})`,
        entryCount: sql<number>`(select count(*)::int from ${markEntries} where ${markEntries.clubId} = ${clubs.id})`,
        lastActivity: sql<string | null>`(select max(${markEntries.createdAt}) from ${markEntries} where ${markEntries.clubId} = ${clubs.id})`,
        owners: sql<string | null>`(select string_agg(${admins.email}, ', ') from ${admins} where ${admins.clubId} = ${clubs.id} and ${admins.role} = 'owner')`,
      })
      .from(clubs)
      .orderBy(asc(clubs.name)),
  ]);
  return { totals, clubs: clubRows };
}

export async function listSuperAdmins() {
  "use cache";
  cacheTag(PLATFORM_TAG);
  cacheLife("minutes");
  return db
    .select({ userId: user.id, email: user.email, name: user.name, createdAt: superAdmins.createdAt })
    .from(superAdmins)
    .innerJoin(user, eq(user.id, superAdmins.userId))
    .orderBy(asc(user.email));
}
