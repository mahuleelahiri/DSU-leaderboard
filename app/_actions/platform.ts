"use server";

import { after } from "next/server";
import { refresh, updateTag } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { generateAccessCode } from "@/lib/access-code";
import { runAction, UserFacingError } from "@/lib/action";
import { audit } from "@/lib/audit";
import { accessTag, clubTag, PLATFORM_TAG, viewerTag } from "@/lib/cache-tags";
import { db, isUniqueViolation, type Tx } from "@/lib/db";
import { admins, clubs, domains, seasons, superAdmins, user } from "@/lib/db/schema";
import { assertSuperAdmin } from "@/lib/dal";
import { escapeHtml, sendEmail } from "@/lib/email";
import { appUrl } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createClubSchema, DOMAIN_TEMPLATES, email, id, personName } from "@/lib/validation";

async function findOrCreateUser(tx: Tx, address: string, name: string) {
  const [existing] = await tx.select({ id: user.id }).from(user).where(eq(sql`lower(${user.email})`, address)).limit(1);
  if (existing) return existing.id;
  const [created] = await tx.insert(user).values({ email: address, name, emailVerified: false }).returning({ id: user.id });
  return created.id;
}

export async function createClub(input: z.input<typeof createClubSchema>) {
  return runAction("createClub", createClubSchema, input, async (data) => {
    const viewer = await assertSuperAdmin();
    const ownerEmail = data.ownerEmail || null;
    const ownerName = data.ownerName?.trim() || ownerEmail?.split("@")[0] || "Owner";

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = generateAccessCode();
      try {
        const club = await db.transaction(async (tx) => {
          const [created] = await tx
            .insert(clubs)
            .values({ name: data.name, description: data.description, accessCode: code })
            .returning({ id: clubs.id, name: clubs.name, accessCode: clubs.accessCode });
          await tx.insert(domains).values(DOMAIN_TEMPLATES[data.template].map((name) => ({ clubId: created.id, name })));
          const start = new Date();
          const end = new Date(start);
          end.setMonth(end.getMonth() + 6);
          await tx.insert(seasons).values({ clubId: created.id, name: `Season ${start.getFullYear()}`, startDate: start, endDate: end, isCurrent: true });
          let ownerId: string | null = null;
          if (ownerEmail) {
            ownerId = await findOrCreateUser(tx, ownerEmail, ownerName);
            await tx.insert(admins).values({ clubId: created.id, userId: ownerId, email: ownerEmail, name: ownerName, role: "owner" });
          }
          await audit({ actor: viewer, clubId: created.id, action: "club.create", summary: `Created club ${created.name}${ownerEmail ? ` with owner ${ownerEmail}` : ""}` }, tx);
          return { ...created, ownerId };
        });

        if (ownerEmail) {
          after(async () => {
            try {
              await sendEmail({
                to: ownerEmail,
                subject: `You're the owner of ${club.name} on Clubhouse`,
                heading: `${club.name} is ready`,
                body: `<p>You've been made the owner of <strong>${escapeHtml(club.name)}</strong>. Add members, award marks and share the board with access code <strong>${club.accessCode}</strong>.</p>`,
                cta: { label: "Open your dashboard", href: `${appUrl()}/sign-in?next=/dashboard/${club.id}` },
              });
            } catch (error) {
              logger.warn("club.owner_email_failed", { error: error instanceof Error ? error.message : String(error) });
            }
          });
        }
        updateTag(PLATFORM_TAG);
        if (club.ownerId) updateTag(viewerTag(club.ownerId));
        refresh();
        return { data: { id: club.id, name: club.name, accessCode: club.accessCode }, message: `${club.name} created with code ${club.accessCode}.` };
      } catch (error) {
        if (!isUniqueViolation(error, "clubs_access_code_unique")) throw error;
      }
    }
    throw new UserFacingError("Couldn't allocate a unique access code. Please try again.");
  });
}

const deleteClubSchema = z.object({ clubId: id, confirmName: z.string() });
export async function deleteClub(input: z.input<typeof deleteClubSchema>) {
  return runAction("deleteClub", deleteClubSchema, input, async (data) => {
    const viewer = await assertSuperAdmin();
    const [club] = await db.select({ name: clubs.name }).from(clubs).where(eq(clubs.id, data.clubId));
    if (!club) throw new UserFacingError("That club no longer exists.");
    if (club.name.trim() !== data.confirmName.trim()) throw new UserFacingError("Type the club name exactly to confirm.");
    // Mark entries/members reference each other with RESTRICT, so delete leaf rows first.
    await db.transaction(async (tx) => {
      await tx.execute(sql`delete from mark_entries where club_id = ${data.clubId}`);
      await tx.execute(sql`delete from join_requests where club_id = ${data.clubId}`);
      await tx.execute(sql`delete from members where club_id = ${data.clubId}`);
      await tx.delete(clubs).where(eq(clubs.id, data.clubId));
      await audit({ actor: viewer, action: "club.delete", summary: `Deleted club ${club.name}`, targetType: "club", targetId: data.clubId }, tx);
    });
    updateTag(clubTag(data.clubId));
    updateTag(accessTag(data.clubId));
    updateTag(PLATFORM_TAG);
    refresh();
    return { data: undefined, message: `${club.name} was deleted.` };
  });
}

const superAdminSchema = z.object({ email, name: personName.optional() });
export async function addSuperAdmin(input: z.input<typeof superAdminSchema>) {
  return runAction("addSuperAdmin", superAdminSchema, input, async (data) => {
    const viewer = await assertSuperAdmin();
    const uid = await db.transaction(async (tx) => {
      const uid = await findOrCreateUser(tx, data.email, data.name ?? data.email.split("@")[0]);
      const inserted = await tx.insert(superAdmins).values({ userId: uid }).onConflictDoNothing().returning();
      if (inserted.length === 0) throw new UserFacingError(`${data.email} is already a platform admin.`);
      await audit({ actor: viewer, action: "platform.admin_add", summary: `Granted platform admin to ${data.email}`, targetType: "user", targetId: uid }, tx);
      return uid;
    });
    updateTag(viewerTag(uid));
    updateTag(PLATFORM_TAG);
    refresh();
    return { data: undefined, message: `${data.email} is now a platform admin.` };
  });
}

const userRef = z.object({ userId: id });
export async function removeSuperAdmin(input: z.input<typeof userRef>) {
  return runAction("removeSuperAdmin", userRef, input, async (data) => {
    const viewer = await assertSuperAdmin();
    if (data.userId === viewer.id) throw new UserFacingError("You can't remove your own platform access.");
    const [target] = await db.select({ email: user.email }).from(user).where(eq(user.id, data.userId));
    await db.delete(superAdmins).where(eq(superAdmins.userId, data.userId));
    await audit({ actor: viewer, action: "platform.admin_remove", summary: `Revoked platform admin from ${target?.email ?? data.userId}`, targetType: "user", targetId: data.userId });
    updateTag(viewerTag(data.userId));
    updateTag(PLATFORM_TAG);
    refresh();
    return { data: undefined, message: "Platform access revoked." };
  });
}
