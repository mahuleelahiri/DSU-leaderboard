"use server";

import { after } from "next/server";
import { updateTag } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { runAction, UserFacingError } from "@/lib/action";
import { clubTag, PLATFORM_TAG } from "@/lib/cache-tags";
import { db } from "@/lib/db";
import { admins, clubs, domains, joinRequests, members } from "@/lib/db/schema";
import { escapeHtml, sendEmail } from "@/lib/email";
import { appUrl } from "@/lib/env";
import { logger } from "@/lib/logger";
import { clientIp } from "@/lib/request-meta";
import { throttle } from "@/lib/throttle";
import { joinRequestSchema } from "@/lib/validation";

/** Anonymous visitors ask to be added to a club's board. */
export async function submitJoinRequest(input: z.input<typeof joinRequestSchema>) {
  return runAction("submitJoinRequest", joinRequestSchema, input, async (data) => {
    const ip = await clientIp();
    if (!(await throttle(`join:${ip}`, 5, 60 * 60))) {
      throw new UserFacingError("Too many requests from this network. Please try again in an hour.");
    }

    const [club] = await db
      .select({ id: clubs.id, name: clubs.name, allowJoinRequests: clubs.allowJoinRequests })
      .from(clubs)
      .where(eq(clubs.accessCode, data.code))
      .limit(1);
    if (!club) throw new UserFacingError("That club code isn't valid anymore.");
    if (!club.allowJoinRequests) throw new UserFacingError("This club isn't accepting join requests right now.");

    const [domain] = await db.select({ id: domains.id, name: domains.name }).from(domains).where(and(eq(domains.id, data.domainId), eq(domains.clubId, club.id)));
    if (!domain) throw new UserFacingError("Pick a domain from this club.");

    const normalized = data.name.toLowerCase();
    const [conflict] = await db
      .select({ source: sql<string>`'member'` })
      .from(members)
      .where(and(eq(members.clubId, club.id), eq(sql`lower(btrim(${members.name}))`, normalized)))
      .unionAll(
        db
          .select({ source: sql<string>`'request'` })
          .from(joinRequests)
          .where(and(eq(joinRequests.clubId, club.id), eq(joinRequests.status, "pending"), eq(sql`lower(btrim(${joinRequests.name}))`, normalized))),
      )
      .limit(1);
    if (conflict?.source === "member") throw new UserFacingError("Someone with this name is already on the board. Add an initial to tell you apart.");
    if (conflict?.source === "request") throw new UserFacingError("A request with this name is already waiting for review.");

    await db.insert(joinRequests).values({ clubId: club.id, domainId: domain.id, name: data.name, note: data.note });
    updateTag(clubTag(club.id));
    updateTag(PLATFORM_TAG);

    after(async () => {
      try {
        const owners = await db.select({ email: admins.email }).from(admins).where(eq(admins.clubId, club.id));
        if (owners.length === 0) return;
        await sendEmail({
          to: owners.map((o) => o.email),
          subject: `New join request for ${club.name}`,
          heading: "Someone wants to join",
          body: `<p><strong>${escapeHtml(data.name)}</strong> asked to join <strong>${escapeHtml(domain.name)}</strong> in ${escapeHtml(club.name)}.</p>${data.note ? `<p style="color:#6b7280">“${escapeHtml(data.note)}”</p>` : ""}`,
          cta: { label: "Review request", href: `${appUrl()}/dashboard/${club.id}/requests` },
        });
      } catch (error) {
        logger.warn("join_request.notify_failed", { error: error instanceof Error ? error.message : String(error) });
      }
    });

    return { data: undefined, message: `Request sent! An admin of ${club.name} will review it soon.` };
  });
}
