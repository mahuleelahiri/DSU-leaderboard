import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cacheLife, cacheTag } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { getAuth } from "@/lib/auth";
import { ACCESS_LIFE, accessTag, clubTag, viewerTag } from "@/lib/cache-tags";
import { db } from "@/lib/db";
import { admins, clubs, superAdmins, type AdminRole } from "@/lib/db/schema";

export class AuthorizationError extends Error {
  constructor(message = "You don't have permission to do that.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/** Narrow, client-safe view of the signed-in user. */
export type Viewer = { id: string; email: string; name: string; isSuperAdmin: boolean };

const UUID = /^[0-9a-f-]{36}$/i;

/**
 * The session comes from Better Auth's signed cookie cache, so this normally
 * costs no database round trip. Headers are read first so nothing
 * session-related is prerendered.
 */
const getSessionUser = cache(async () => {
  const requestHeaders = await headers();
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  return session?.user ?? null;
});

function toViewer(user: { id: string; email: string; name: string }, isSuperAdmin: boolean): Viewer {
  return { id: user.id, email: user.email, name: user.name || user.email.split("@")[0], isSuperAdmin };
}

/*
 * Page reads use cached authorisation lookups (invalidated by tag whenever
 * roles change, and short-lived regardless). Server actions never use them:
 * every mutation re-checks access against the database in one query.
 */

async function cachedSuperAdminFlag(userId: string) {
  "use cache";
  cacheTag(viewerTag(userId));
  cacheLife(ACCESS_LIFE);
  const [row] = await db.select({ userId: superAdmins.userId }).from(superAdmins).where(eq(superAdmins.userId, userId)).limit(1);
  return Boolean(row);
}

async function cachedMembership(clubId: string, userId: string) {
  "use cache";
  cacheTag(clubTag(clubId), accessTag(clubId), viewerTag(userId));
  cacheLife(ACCESS_LIFE);
  const [row] = await db
    .select({ club: clubs, role: admins.role, adminName: admins.name })
    .from(clubs)
    .leftJoin(admins, and(eq(admins.clubId, clubs.id), eq(admins.userId, userId)))
    .where(eq(clubs.id, clubId))
    .limit(1);
  return row ?? null;
}

/** One session lookup per request, de-duplicated with React `cache`. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const user = await getSessionUser();
  if (!user) return null;
  return toViewer(user, await cachedSuperAdminFlag(user.id));
});

/** For pages: redirect to sign-in when signed out. */
export async function requireViewer(next = "/dashboard") {
  const viewer = await getViewer();
  if (!viewer) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  return viewer;
}

export async function requireSuperAdminPage() {
  const viewer = await requireViewer("/admin");
  if (!viewer.isSuperAdmin) redirect("/dashboard?denied=platform");
  return viewer;
}

const ROLE_WEIGHT: Record<AdminRole, number> = { editor: 1, owner: 2 };

export type ClubAccess = {
  viewer: Viewer;
  club: typeof clubs.$inferSelect;
  role: AdminRole;
  /** True when access comes from platform super-admin rights, not club membership. */
  viaPlatform: boolean;
  /** The viewer's display name in this club, when they are a club admin. */
  adminName: string | null;
};

function resolveAccess(
  viewer: Viewer,
  row: { club: typeof clubs.$inferSelect; role: AdminRole | null; adminName: string | null } | null,
): ClubAccess | null {
  if (!row) return null;
  if (row.role) return { viewer, club: row.club, role: row.role, viaPlatform: false, adminName: row.adminName };
  if (viewer.isSuperAdmin) return { viewer, club: row.club, role: "owner", viaPlatform: true, adminName: null };
  return null;
}

/** For pages and read-only routes. */
export const getClubAccess = cache(async (clubId: string): Promise<ClubAccess | null> => {
  const user = await getSessionUser();
  if (!user || !UUID.test(clubId)) return null;
  const [isSuperAdmin, row] = await Promise.all([cachedSuperAdminFlag(user.id), cachedMembership(clubId, user.id)]);
  return resolveAccess(toViewer(user, isSuperAdmin), row);
});

export function hasRole(access: Pick<ClubAccess, "role">, minimum: AdminRole) {
  return ROLE_WEIGHT[access.role] >= ROLE_WEIGHT[minimum];
}

/** For pages: 404-style redirect when the viewer can't manage this club. */
export async function requireClubPage(clubId: string, minimum: AdminRole = "editor") {
  await requireViewer(`/dashboard/${clubId}`);
  const access = await getClubAccess(clubId);
  if (!access) redirect("/dashboard?denied=club");
  if (!hasRole(access, minimum)) redirect(`/dashboard/${clubId}?denied=owner`);
  return access;
}

/** For server actions: fresh from the database, one round trip, throws instead of redirecting. */
export async function assertClubAccess(clubId: string, minimum: AdminRole = "editor") {
  const user = await getSessionUser();
  if (!user) throw new AuthorizationError("Your session has expired. Please sign in again.");
  if (!UUID.test(clubId)) throw new AuthorizationError("You don't manage this club.");
  const [row] = await db
    .select({
      club: clubs,
      role: admins.role,
      adminName: admins.name,
      isSuperAdmin: sql<boolean>`exists (select 1 from ${superAdmins} where ${superAdmins.userId} = ${user.id})`,
    })
    .from(clubs)
    .leftJoin(admins, and(eq(admins.clubId, clubs.id), eq(admins.userId, user.id)))
    .where(eq(clubs.id, clubId))
    .limit(1);
  const access = resolveAccess(toViewer(user, Boolean(row?.isSuperAdmin)), row ?? null);
  if (!access) throw new AuthorizationError("You don't manage this club.");
  if (!hasRole(access, minimum)) throw new AuthorizationError("Only club owners can do that.");
  return access;
}

/** For server actions: fresh platform-admin check. */
export async function assertSuperAdmin() {
  const user = await getSessionUser();
  if (!user) throw new AuthorizationError("Your session has expired. Please sign in again.");
  const [row] = await db.select({ userId: superAdmins.userId }).from(superAdmins).where(eq(superAdmins.userId, user.id)).limit(1);
  if (!row) throw new AuthorizationError("Platform admin access required.");
  return toViewer(user, true);
}

/** Display name used when stamping who awarded marks. */
export function adminDisplayName(access: ClubAccess) {
  return access.adminName || access.viewer.name;
}
