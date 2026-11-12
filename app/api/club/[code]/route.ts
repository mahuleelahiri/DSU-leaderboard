import { NextResponse } from "next/server";
import { getPublicBoard } from "@/lib/club-data";

/** Public JSON API for a club board (e.g. for embedding or a TV display). */
export async function GET(request: Request, { params }: RouteContext<"/api/club/[code]">) {
  const { code } = await params;
  const season = new URL(request.url).searchParams.get("season");
  const board = await getPublicBoard(code, season);
  if (!board) return NextResponse.json({ error: "Club not found" }, { status: 404 });
  return NextResponse.json(board, { headers: { "Cache-Control": "public, max-age=15, stale-while-revalidate=60" } });
}
