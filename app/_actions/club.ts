"use server";

import { after } from "next/server";
import { refresh, updateTag } from "next/cache";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { generateAccessCode } from "@/lib/access-code";
import { runAction, UserFacingError } from "@/lib/action";
import { audit } from "@/lib/audit";
import { accessTag, clubTag, PLATFORM_TAG, viewerTag } from "@/lib/cache-tags";
import { db, isUniqueViolation } from "@/lib/db";
import { admins, clubs, domains, joinRequests, markEntries, members, seasons, user } from "@/lib/db/schema";
import { adminDisplayName, assertClubAccess } from "@/lib/dal";
import { escapeHtml, sendEmail } from "@/lib/email";
import { appUrl } from "@/lib/env";
import { logger } from "@/lib/logger";
import { formatSigned, pluralize } from "@/lib/utils";
import {
  addAdminSchema,
  adminRoleSchema,
  awardMarksSchema,
  clubSettingsSchema,
  domainSchema,
  id,
  importMembersSchema,
  label,
  memberSchema,
  parseMemberCsv,
  seasonSchema,
  updateEntrySchema,
  updateMemberSchema,
} from "@/lib/validation";

/** Busts cached club and platform views and refreshes the admin's current view. */
function invalidate(clubId: string) {
  updateTag(clubTag(clubId));
  updateTag(PLATFORM_TAG);
  refresh();
}

const clubRef = z.object({ clubId: id });

/* ---------------------------------- Marks ---------------------------------- */

export async function awardMarks(input: z.input<typeof awardMarksSchema>) {
  return runAction("awardMarks", awardMarksSchema, input, async (data) => {
    const access = await assertClubAccess(data.clubId);
    const memberIds = [...new Set(data.memberIds)];

    const [season] = await db
      .select({ id: seasons.id, name: seasons.name })
      .from(seasons)
      .where(and(eq(seasons.clubId, data.clubId), data.seasonId ? eq(seasons.id, data.seasonId) : eq(seasons.isCurrent, true)))
      .limit(1);
    if (!season) throw new UserFacingError("There's no current season. Create one under Seasons first.");

    const memberRows = await db
      .select({ id: members.id, name: members.name })
      .from(members)
      .where(and(eq(members.clubId, data.clubId), eq(members.active, true), inArray(members.id, memberIds)));
    if (memberRows.length !== memberIds.length) throw new UserFacingError("Some selected members are inactive or no longer exist. Refresh and try again.");

    const giver = adminDisplayName(access);
    await db.transaction(async (tx) => {
      await tx.insert(markEntries).values(
        memberRows.map((member) => ({
          clubId: data.clubId,
          memberId: member.id,
          seasonId: season.id,
          marks: data.marks,
          reason: data.reason,
          givenBy: access.viewer.id,
          givenByName: giver,
        })),
      );
      await audit(
        {
          actor: access.viewer,
          clubId: data.clubId,
          action: "marks.award",
          summary: `Awarded ${formatSigned(data.marks)} to ${memberRows.length === 1 ? memberRows[0].name : pluralize(memberRows.length, "member")}${data.reason ? ` — ${data.reason}` : ""}`,
          metadata: { marks: data.marks, memberIds, seasonId: season.id },
        },
        tx,
      );
    });

    invalidate(data.clubId);
    return { data: { count: memberRows.length }, message: `${formatSigned(data.marks)} awarded to ${pluralize(memberRows.length, "member")} in ${season.name}.` };
  });
}

export async function updateEntry(input: z.input<typeof updateEntrySchema>) {
  return runAction("updateEntry", updateEntrySchema, input, async (data) => {
    const access = await assertClubAccess(data.clubId);
    const [updated] = await db
      .update(markEntries)
      .set({ marks: data.marks, reason: data.reason, updatedAt: new Date() })
      .where(and(eq(markEntries.id, data.entryId), eq(markEntries.clubId, data.clubId)))
      .returning({ id: markEntries.id });
    if (!updated) throw new UserFacingError("That entry no longer exists.");
    await audit({ actor: access.viewer, clubId: data.clubId, action: "marks.update", summary: `Edited an entry to ${formatSigned(data.marks)}`, targetType: "entry", targetId: data.entryId });
    invalidate(data.clubId);
    return { data: undefined, message: "Entry updated." };
  });
}

const entryRef = z.object({ clubId: id, entryId: id });
export async function deleteEntry(input: z.input<typeof entryRef>) {
  return runAction("deleteEntry", entryRef, input, async (data) => {
    const access = await assertClubAccess(data.clubId);
    const [removed] = await db
      .delete(markEntries)
      .where(and(eq(markEntries.id, data.entryId), eq(markEntries.clubId, data.clubId)))
      .returning({ marks: markEntries.marks, memberId: markEntries.memberId });
    if (!removed) throw new UserFacingError("That entry was already removed.");
    await audit({ actor: access.viewer, clubId: data.clubId, action: "marks.delete", summary: `Deleted a ${formatSigned(removed.marks)} entry`, targetType: "entry", targetId: data.entryId, metadata: removed });
    invalidate(data.clubId);
    return { data: undefined, message: "Entry deleted." };
  });
}

/* --------------------------------- Members --------------------------------- */

async function assertDomainInClub(clubId: string, domainId: string) {
  const [domain] = await db.select({ id: domains.id }).from(domains).where(and(eq(domains.id, domainId), eq(domains.clubId, clubId))).limit(1);
  if (!domain) throw new UserFacingError("Pick a domain from this club.");
}

const duplicateMember = { unique: "A member with that name already exists in this club." };

export async function createMember(input: z.input<typeof memberSchema>) {
  return runAction(
    "createMember",
    memberSchema,
    input,
    async (data) => {
      const access = await assertClubAccess(data.clubId);
      await assertDomainInClub(data.clubId, data.domainId);
      const [member] = await db
        .insert(members)
        .values({ clubId: data.clubId, domainId: data.domainId, name: data.name, photoUrl: data.photoUrl })
        .returning({ id: members.id });
      await audit({ actor: access.viewer, clubId: data.clubId, action: "member.create", summary: `Added member ${data.name}`, targetType: "member", targetId: member.id });
      invalidate(data.clubId);
      return { data: { id: member.id }, message: `${data.name} added.` };
    },
    duplicateMember,
  );
}

export async function updateMember(input: z.input<typeof updateMemberSchema>) {
  return runAction(
    "updateMember",
    updateMemberSchema,
    input,
    async (data) => {
      const access = await assertClubAccess(data.clubId);
      await assertDomainInClub(data.clubId, data.domainId);
      const [updated] = await db
        .update(members)
        .set({ name: data.name, domainId: data.domainId, photoUrl: data.photoUrl, active: data.active })
        .where(and(eq(members.id, data.memberId), eq(members.clubId, data.clubId)))
        .returning({ id: members.id });
      if (!updated) throw new UserFacingError("That member no longer exists.");
      await audit({ actor: access.viewer, clubId: data.clubId, action: "member.update", summary: `Updated member ${data.name}${data.active ? "" : " (inactive)"}`, targetType: "member", targetId: data.memberId });
      invalidate(data.clubId);
      return { data: undefined, message: "Member saved." };
    },
    duplicateMember,
  );
}

const memberRef = z.object({ clubId: id, memberId: id });
export async function deleteMember(input: z.input<typeof memberRef>) {
  return runAction("deleteMember", memberRef, input, async (data) => {
    const access = await assertClubAccess(data.clubId, "owner");
    const removed = await db.transaction(async (tx) => {
      const [member] = await tx
        .select({ name: members.name })
        .from(members)
        .where(and(eq(members.id, data.memberId), eq(members.clubId, data.clubId)))
        .for("update");
      if (!member) throw new UserFacingError("That member no longer exists.");
      const deletedEntries = await tx.delete(markEntries).where(eq(markEntries.memberId, data.memberId)).returning({ id: markEntries.id });
      await tx.delete(members).where(eq(members.id, data.memberId));
      await audit(
        { actor: access.viewer, clubId: data.clubId, action: "member.delete", summary: `Permanently deleted ${member.name} and ${pluralize(deletedEntries.length, "entry", "entries")}`, targetType: "member", targetId: data.memberId },
        tx,
      );
      return member.name;
    });
    invalidate(data.clubId);
    return { data: undefined, message: `${removed} deleted permanently.` };
  });
}

export async function importMembers(input: z.input<typeof importMembersSchema>) {
  return runAction("importMembers", importMembersSchema, input, async (data) => {
    const access = await assertClubAccess(data.clubId);
    const { rows, errors } = parseMemberCsv(data.csv);
    if (rows.length > 500) throw new UserFacingError("Import up to 500 members at a time.");

    const clubDomains = await db.select({ id: domains.id, name: domains.name }).from(domains).where(eq(domains.clubId, data.clubId));
    const domainByName = new Map(clubDomains.map((d) => [d.name.toLowerCase(), d.id]));

    const seen = new Set<string>();
    const values: { clubId: string; domainId: string; name: string }[] = [];
    for (const row of rows) {
      const domainId = domainByName.get(row.domain.toLowerCase());
      if (!domainId) {
        errors.push({ line: row.line, message: `Unknown domain “${row.domain}”.` });
        continue;
      }
      const key = row.name.toLowerCase();
      if (seen.has(key)) {
        errors.push({ line: row.line, message: `“${row.name}” appears more than once.` });
        continue;
      }
      seen.add(key);
      values.push({ clubId: data.clubId, domainId, name: row.name });
    }

    let created = 0;
    if (values.length > 0) {
      created = await db.transaction(async (tx) => {
        const inserted = await tx.insert(members).values(values).onConflictDoNothing().returning({ id: members.id });
        if (inserted.length > 0) {
          await audit({ actor: access.viewer, clubId: data.clubId, action: "member.import", summary: `Imported ${pluralize(inserted.length, "member")}` }, tx);
        }
        return inserted.length;
      });
    }
    const skipped = values.length - created;
    if (created > 0) invalidate(data.clubId);
    return {
      data: { created, skipped, errors: errors.sort((a, b) => a.line - b.line) },
      message: `Imported ${pluralize(created, "member")}${skipped ? `, skipped ${skipped} existing` : ""}${errors.length ? `, ${pluralize(errors.length, "line")} need attention` : ""}.`,
    };
  });
}

/* --------------------------------- Domains --------------------------------- */

const duplicateDomain = { unique: "A domain with that name already exists." };

export async function createDomain(input: z.input<typeof domainSchema>) {
  return runAction(
    "createDomain",
    domainSchema,
    input,
    async (data) => {
      const access = await assertClubAccess(data.clubId);
      const [domain] = await db.insert(domains).values({ clubId: data.clubId, name: data.name }).returning({ id: domains.id });
      await audit({ actor: access.viewer, clubId: data.clubId, action: "domain.create", summary: `Created domain ${data.name}`, targetType: "domain", targetId: domain.id });
      invalidate(data.clubId);
      return { data: undefined, message: `${data.name} created.` };
    },
    duplicateDomain,
  );
}

const renameDomainSchema = domainSchema.extend({ domainId: id });
export async function renameDomain(input: z.input<typeof renameDomainSchema>) {
  return runAction(
    "renameDomain",
    renameDomainSchema,
    input,
    async (data) => {
      const access = await assertClubAccess(data.clubId);
      const [row] = await db
        .update(domains)
        .set({ name: data.name })
        .where(and(eq(domains.id, data.domainId), eq(domains.clubId, data.clubId)))
        .returning({ id: domains.id });
      if (!row) throw new UserFacingError("That domain no longer exists.");
      await audit({ actor: access.viewer, clubId: data.clubId, action: "domain.rename", summary: `Renamed a domain to ${data.name}`, targetType: "domain", targetId: data.domainId });
      invalidate(data.clubId);
      return { data: undefined, message: "Domain renamed." };
    },
    duplicateDomain,
  );
}

const domainRef = z.object({ clubId: id, domainId: id });
export async function deleteDomain(input: z.input<typeof domainRef>) {
  return runAction(
    "deleteDomain",
    domainRef,
    input,
    async (data) => {
      const access = await assertClubAccess(data.clubId, "owner");
      const removed = await db.transaction(async (tx) => {
        // Clean up already-reviewed requests; pending ones must be handled first.
        await tx.delete(joinRequests).where(and(eq(joinRequests.domainId, data.domainId), ne(joinRequests.status, "pending")));
        const [row] = await tx
          .delete(domains)
          .where(and(eq(domains.id, data.domainId), eq(domains.clubId, data.clubId)))
          .returning({ name: domains.name });
        if (!row) throw new UserFacingError("That domain no longer exists.");
        await audit({ actor: access.viewer, clubId: data.clubId, action: "domain.delete", summary: `Deleted domain ${row.name}`, targetType: "domain", targetId: data.domainId }, tx);
        return row.name;
      });
      invalidate(data.clubId);
      return { data: undefined, message: `${removed} deleted.` };
    },
    { foreignKey: "Move its members and resolve pending join requests before deleting this domain." },
  );
}

/* --------------------------------- Seasons --------------------------------- */

const dayStart = (value: string) => new Date(`${value}T00:00:00.000Z`);
const dayEnd = (value: string) => new Date(`${value}T23:59:59.999Z`);

export async function createSeason(input: z.input<typeof seasonSchema>) {
  return runAction("createSeason", seasonSchema, input, async (data) => {
    const access = await assertClubAccess(data.clubId, "owner");
    await db.transaction(async (tx) => {
      if (data.makeCurrent) await tx.update(seasons).set({ isCurrent: false }).where(eq(seasons.clubId, data.clubId));
      const [season] = await tx
        .insert(seasons)
        .values({ clubId: data.clubId, name: data.name, startDate: dayStart(data.startDate), endDate: dayEnd(data.endDate), isCurrent: data.makeCurrent })
        .returning({ id: seasons.id });
      await audit({ actor: access.viewer, clubId: data.clubId, action: "season.create", summary: `Created season ${data.name}${data.makeCurrent ? " (current)" : ""}`, targetType: "season", targetId: season.id }, tx);
    });
    invalidate(data.clubId);
    return { data: undefined, message: `${data.name} created.` };
  });
}

const updateSeasonSchema = z
  .object({ clubId: id, seasonId: id, name: label("Season name", 60), startDate: z.iso.date(), endDate: z.iso.date() })
  .refine((v) => v.endDate >= v.startDate, { message: "End date must be on or after the start date." });
export async function updateSeason(input: z.input<typeof updateSeasonSchema>) {
  return runAction("updateSeason", updateSeasonSchema, input, async (data) => {
    const access = await assertClubAccess(data.clubId, "owner");
    const [row] = await db
      .update(seasons)
      .set({ name: data.name, startDate: dayStart(data.startDate), endDate: dayEnd(data.endDate) })
      .where(and(eq(seasons.id, data.seasonId), eq(seasons.clubId, data.clubId)))
      .returning({ id: seasons.id });
    if (!row) throw new UserFacingError("That season no longer exists.");
    await audit({ actor: access.viewer, clubId: data.clubId, action: "season.update", summary: `Updated season ${data.name}`, targetType: "season", targetId: data.seasonId });
    invalidate(data.clubId);
    return { data: undefined, message: "Season saved." };
  });
}

const seasonRef = z.object({ clubId: id, seasonId: id });
export async function setCurrentSeason(input: z.input<typeof seasonRef>) {
  return runAction("setCurrentSeason", seasonRef, input, async (data) => {
    const access = await assertClubAccess(data.clubId, "owner");
    const name = await db.transaction(async (tx) => {
      const [target] = await tx.select({ name: seasons.name }).from(seasons).where(and(eq(seasons.id, data.seasonId), eq(seasons.clubId, data.clubId)));
      if (!target) throw new UserFacingError("That season no longer exists.");
      await tx.update(seasons).set({ isCurrent: false }).where(and(eq(seasons.clubId, data.clubId), eq(seasons.isCurrent, true)));
      await tx.update(seasons).set({ isCurrent: true }).where(eq(seasons.id, data.seasonId));
      await audit({ actor: access.viewer, clubId: data.clubId, action: "season.activate", summary: `Made ${target.name} the current season`, targetType: "season", targetId: data.seasonId }, tx);
      return target.name;
    });
    invalidate(data.clubId);
    return { data: undefined, message: `${name} is now the current season.` };
  });
}

export async function deleteSeason(input: z.input<typeof seasonRef>) {
  return runAction(
    "deleteSeason",
    seasonRef,
    input,
    async (data) => {
      const access = await assertClubAccess(data.clubId, "owner");
      const [row] = await db
        .delete(seasons)
        .where(and(eq(seasons.id, data.seasonId), eq(seasons.clubId, data.clubId)))
        .returning({ name: seasons.name });
      if (!row) throw new UserFacingError("That season no longer exists.");
      await audit({ actor: access.viewer, clubId: data.clubId, action: "season.delete", summary: `Deleted season ${row.name}`, targetType: "season", targetId: data.seasonId });
      invalidate(data.clubId);
      return { data: undefined, message: `${row.name} deleted.` };
    },
    { foreignKey: "This season has mark entries. Delete them first, or keep the season for history." },
  );
}

/* ------------------------------ Join requests ------------------------------ */

const reviewSchema = z.object({ clubId: id, requestId: id, approve: z.boolean(), domainId: id.optional() });
export async function reviewJoinRequest(input: z.input<typeof reviewSchema>) {
  return runAction(
    "reviewJoinRequest",
    reviewSchema,
    input,
    async (data) => {
      const access = await assertClubAccess(data.clubId);
      const result = await db.transaction(async (tx) => {
        const [request] = await tx
          .select()
          .from(joinRequests)
          .where(and(eq(joinRequests.id, data.requestId), eq(joinRequests.clubId, data.clubId)))
          .for("update");
        if (!request) throw new UserFacingError("That request no longer exists.");
        if (request.status !== "pending") throw new UserFacingError(`This request was already ${request.status}.`);

        if (data.approve) {
          const domainId = data.domainId ?? request.domainId;
          const [domain] = await tx.select({ id: domains.id }).from(domains).where(and(eq(domains.id, domainId), eq(domains.clubId, data.clubId)));
          if (!domain) throw new UserFacingError("Pick a domain from this club.");
          await tx.insert(members).values({ clubId: data.clubId, domainId, name: request.name });
        }
        await tx
          .update(joinRequests)
          .set({ status: data.approve ? "approved" : "rejected", reviewedBy: access.viewer.id, reviewedAt: new Date() })
          .where(eq(joinRequests.id, request.id));
        await audit(
          { actor: access.viewer, clubId: data.clubId, action: data.approve ? "request.approve" : "request.reject", summary: `${data.approve ? "Approved" : "Rejected"} join request from ${request.name}`, targetType: "join_request", targetId: request.id },
          tx,
        );
        return request.name;
      });
      invalidate(data.clubId);
      return { data: undefined, message: data.approve ? `${result} is now a member.` : `Request from ${result} rejected.` };
    },
    { unique: "A member with this name already exists. Reject this request or rename the existing member." },
  );
}

/* ------------------------------ Club settings ------------------------------ */

export async function updateClubSettings(input: z.input<typeof clubSettingsSchema>) {
  return runAction("updateClubSettings", clubSettingsSchema, input, async (data) => {
    const access = await assertClubAccess(data.clubId, "owner");
    await db
      .update(clubs)
      .set({ name: data.name, description: data.description, allowJoinRequests: data.allowJoinRequests })
      .where(eq(clubs.id, data.clubId));
    await audit({ actor: access.viewer, clubId: data.clubId, action: "club.update", summary: "Updated club settings", metadata: data });
    invalidate(data.clubId);
    return { data: undefined, message: "Settings saved." };
  });
}

export async function regenerateAccessCode(input: z.input<typeof clubRef>) {
  return runAction("regenerateAccessCode", clubRef, input, async (data) => {
    const access = await assertClubAccess(data.clubId, "owner");
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = generateAccessCode();
      try {
        await db.update(clubs).set({ accessCode: code }).where(eq(clubs.id, data.clubId));
        await audit({ actor: access.viewer, clubId: data.clubId, action: "club.rotate_code", summary: "Rotated the club access code" });
        invalidate(data.clubId);
        return { data: { code }, message: `New access code: ${code}. The old code no longer works.` };
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
      }
    }
    throw new UserFacingError("Couldn't generate a unique code. Please try again.");
  });
}

/* ---------------------------------- Team ----------------------------------- */

/** Team changes alter who can see a club as well as what the club shows. */
function invalidateTeam(clubId: string, userId: string) {
  updateTag(accessTag(clubId));
  updateTag(viewerTag(userId));
  invalidate(clubId);
}

export async function addClubAdmin(input: z.input<typeof addAdminSchema>) {
  return runAction("addClubAdmin", addAdminSchema, input, async (data) => {
    const access = await assertClubAccess(data.clubId, "owner");

    const userId = await db.transaction(async (tx) => {
      const [existing] = await tx.select({ id: user.id }).from(user).where(eq(sql`lower(${user.email})`, data.email)).limit(1);
      const uid =
        existing?.id ??
        (await tx.insert(user).values({ email: data.email, name: data.name, emailVerified: false }).returning({ id: user.id }))[0].id;
      const [already] = await tx.select({ role: admins.role }).from(admins).where(and(eq(admins.clubId, data.clubId), eq(admins.userId, uid)));
      if (already) throw new UserFacingError(`${data.email} is already a ${already.role} of this club.`);
      await tx.insert(admins).values({ clubId: data.clubId, userId: uid, email: data.email, name: data.name, role: data.role });
      await audit({ actor: access.viewer, clubId: data.clubId, action: "admin.add", summary: `Added ${data.email} as ${data.role}`, targetType: "user", targetId: uid }, tx);
      return uid;
    });

    const clubName = access.club.name;
    after(async () => {
      try {
        await sendEmail({
          to: data.email,
          subject: `You've been added to ${clubName} on Clubhouse`,
          heading: `Welcome to ${clubName}`,
          body: `<p>${escapeHtml(access.viewer.name)} added you as ${data.role === "owner" ? "an owner" : "an editor"} of <strong>${escapeHtml(clubName)}</strong>.</p><p>Sign in with this email address — we'll send you a one-time code, no password needed.</p>`,
          cta: { label: "Open your dashboard", href: `${appUrl()}/sign-in?next=/dashboard/${data.clubId}` },
        });
      } catch (error) {
        logger.warn("admin.invite_email_failed", { userId, error: error instanceof Error ? error.message : String(error) });
      }
    });

    invalidateTeam(data.clubId, userId);
    return { data: undefined, message: `${data.email} can now sign in to manage ${clubName}.` };
  });
}

async function ownerCount(clubId: string) {
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(admins).where(and(eq(admins.clubId, clubId), eq(admins.role, "owner")));
  return row?.n ?? 0;
}

const roleChangeSchema = z.object({ clubId: id, userId: id, role: adminRoleSchema });
export async function changeAdminRole(input: z.input<typeof roleChangeSchema>) {
  return runAction("changeAdminRole", roleChangeSchema, input, async (data) => {
    const access = await assertClubAccess(data.clubId, "owner");
    const [target] = await db.select().from(admins).where(and(eq(admins.clubId, data.clubId), eq(admins.userId, data.userId)));
    if (!target) throw new UserFacingError("That admin no longer exists.");
    if (target.role === "owner" && data.role !== "owner" && (await ownerCount(data.clubId)) <= 1) {
      throw new UserFacingError("A club needs at least one owner. Promote someone else first.");
    }
    await db.update(admins).set({ role: data.role }).where(and(eq(admins.clubId, data.clubId), eq(admins.userId, data.userId)));
    await audit({ actor: access.viewer, clubId: data.clubId, action: "admin.role", summary: `Changed ${target.email} to ${data.role}`, targetType: "user", targetId: data.userId });
    invalidateTeam(data.clubId, data.userId);
    return { data: undefined, message: `${target.name} is now ${data.role === "owner" ? "an owner" : "an editor"}.` };
  });
}

const adminRef = z.object({ clubId: id, userId: id });
export async function removeClubAdmin(input: z.input<typeof adminRef>) {
  return runAction("removeClubAdmin", adminRef, input, async (data) => {
    const access = await assertClubAccess(data.clubId, "owner");
    const [target] = await db.select().from(admins).where(and(eq(admins.clubId, data.clubId), eq(admins.userId, data.userId)));
    if (!target) throw new UserFacingError("That admin was already removed.");
    if (target.role === "owner" && (await ownerCount(data.clubId)) <= 1) {
      throw new UserFacingError("You can't remove the last owner of a club.");
    }
    await db.delete(admins).where(and(eq(admins.clubId, data.clubId), eq(admins.userId, data.userId)));
    await audit({ actor: access.viewer, clubId: data.clubId, action: "admin.remove", summary: `Removed ${target.email} from the team`, targetType: "user", targetId: data.userId });
    invalidateTeam(data.clubId, data.userId);
    return { data: undefined, message: `${target.name} no longer has access.` };
  });
}
