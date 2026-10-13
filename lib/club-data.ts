import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import type { PublicClub } from "@/lib/club";
import { clubs, domains, markEntries, members, seasons } from "@/lib/db/schema";

export async function getPublicClubByCode(code: string): Promise<PublicClub | null> {
  const normalized = String(code ?? "").trim().toUpperCase();

  if (!/^[A-HJ-NP-Z2-9]{6}$/.test(normalized)) {
    return null;
  }

  const [club] = await db.select().from(clubs).where(eq(clubs.accessCode, normalized));

  if (!club) {
    return null;
  }

  const clubDomains = await db.select().from(domains).where(eq(domains.clubId, club.id));
  const currentSeasonRows = await db
    .select()
    .from(seasons)
    .where(and(eq(seasons.clubId, club.id), eq(seasons.isCurrent, true)))
    .limit(1);

  const currentSeason = currentSeasonRows[0] ?? null;
  const clubMembers = await db.select().from(members).where(eq(members.clubId, club.id));

  const marksByMember = new Map<string, number>();

  if (currentSeason) {
    const entries = await db
      .select()
      .from(markEntries)
      .where(and(eq(markEntries.clubId, club.id), eq(markEntries.seasonId, currentSeason.id)));

    for (const entry of entries) {
      marksByMember.set(entry.memberId, (marksByMember.get(entry.memberId) ?? 0) + entry.marks);
    }
  }

  const domainsWithMembers = clubDomains.map((domain) => {
    const domainMembers = clubMembers
      .filter((member) => member.domainId === domain.id && member.active)
      .map((member) => ({
        id: member.id,
        name: member.name,
        photo_url: member.photoUrl,
        marks: marksByMember.get(member.id) ?? 0,
        rank: 0,
      }))
      .sort((a, b) => b.marks - a.marks || a.name.localeCompare(b.name))
      .map((member, index) => ({ ...member, rank: index + 1 }));

    return {
      id: domain.id,
      name: domain.name,
      member_count: domainMembers.length,
      members: domainMembers,
    };
  });

  return {
    id: club.id,
    name: club.name,
    season_name: currentSeason?.name ?? null,
    domains: domainsWithMembers,
  };
}
