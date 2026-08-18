import { NextResponse } from "next/server";
import { COOKIE_NAME, teamCookieOptions } from "@/lib/team-auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, "", { ...teamCookieOptions(), maxAge: 0 });
  return response;
}
