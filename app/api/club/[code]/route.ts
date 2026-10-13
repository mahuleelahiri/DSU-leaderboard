import { NextResponse } from "next/server";
import { getPublicClubByCode } from "@/lib/club-data";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const club = await getPublicClubByCode(code);

  if (!club) {
    return NextResponse.json({ error: "Club not found" }, { status: 404 });
  }

  return NextResponse.json(club);
}
