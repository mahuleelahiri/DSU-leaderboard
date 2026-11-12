import { NextResponse } from "next/server";
import { getMemberHistory } from "@/lib/club-data";

export async function GET(_request: Request, { params }: RouteContext<"/api/club/[code]/members/[memberId]">) {
  const { code, memberId } = await params;
  const history = await getMemberHistory(code, memberId);
  if (!history) return NextResponse.json({ error: "Member not found" }, { status: 404 });
  return NextResponse.json(history, { headers: { "Cache-Control": "public, max-age=15, stale-while-revalidate=60" } });
}
