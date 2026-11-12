import { NextResponse, type NextRequest } from "next/server";
import { safeRedirect } from "@/lib/safe-redirect";

/** Legacy confirmation link handler; only ever redirects within this site. */
export async function GET(request: NextRequest) {
  const target = safeRedirect(request.nextUrl.searchParams.get("next"), "/");
  return NextResponse.redirect(new URL(target, request.nextUrl.origin));
}
