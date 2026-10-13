import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const redirectTo = searchParams.get("next") ?? "/";
  const requestUrl = new URL(request.url);
  const redirectUrl = new URL(redirectTo, requestUrl.origin);

  return NextResponse.redirect(redirectUrl);
}
