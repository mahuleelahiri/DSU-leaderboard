import { NextResponse } from "next/server";
import { listAllEntries, listMembersWithMarks, listSeasons } from "@/lib/admin-data";
import { getClubAccess } from "@/lib/dal";
import { rankMembers } from "@/lib/ranking";

/** Escapes a CSV cell and neutralises spreadsheet formula injection. */
function cell(value: unknown) {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const toCsv = (rows: unknown[][]) => rows.map((row) => row.map(cell).join(",")).join("\r\n");

/**
 * Admin-only CSV export.
 *   ?type=standings (default) — ranked members for a season
 *   ?type=entries             — every mark entry for a season
 */
export async function GET(request: Request, { params }: RouteContext<"/api/clubs/[clubId]/export">) {
  const { clubId } = await params;
  const access = await getClubAccess(clubId);
  if (!access) return NextResponse.json({ error: "Not authorised" }, { status: 403 });

  const url = new URL(request.url);
  const type = url.searchParams.get("type") === "entries" ? "entries" : "standings";
  const seasonParam = url.searchParams.get("season");
  const clubSeasons = await listSeasons(clubId);
  const season = seasonParam ? clubSeasons.find((s) => s.id === seasonParam) : clubSeasons.find((s) => s.isCurrent);
  if (!season) return NextResponse.json({ error: "Season not found" }, { status: 404 });

  let csv: string;
  if (type === "standings") {
    const membersWithMarks = await listMembersWithMarks(clubId, season.id);
    const ranked = rankMembers(membersWithMarks.filter((m) => m.active));
    csv = toCsv([["Rank", "Name", "Domain", "Marks", "Awards", "Joined"], ...ranked.map((m) => [m.rank, m.name, m.domainName, m.marks, m.entries, m.joinedDate.toISOString().slice(0, 10)])]);
  } else {
    const entries = await listAllEntries(clubId, season.id);
    csv = toCsv([["Date", "Member", "Domain", "Marks", "Reason", "Awarded by"], ...entries.map((e) => [e.createdAt.toISOString(), e.memberName, e.domainName, e.marks, e.reason, e.givenByName])]);
  }

  const slug = `${access.club.name}-${season.name}-${type}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return new NextResponse(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
