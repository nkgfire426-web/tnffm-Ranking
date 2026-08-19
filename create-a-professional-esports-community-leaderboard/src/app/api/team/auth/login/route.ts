import { NextRequest, NextResponse } from "next/server";
import { createSession, hashPassword, COOKIE_NAME, teamCookieOptions } from "@/lib/team-auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { username, password } = await request.json().catch(() => ({}));
  if (!username || !password) return NextResponse.json({ ok: false, message: "Username and password are required." }, { status: 400 });
  const webhook = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!webhook) return NextResponse.json({ ok: false, message: "Google Sheets is not configured." }, { status: 503 });
  const response = await fetch(webhook, { method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", body: JSON.stringify({ action: "loginTeam", username: String(username).trim().toLowerCase(), passwordHash: hashPassword(password) }) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) return NextResponse.json({ ok: false, message: result.message || "Login failed." }, { status: 401 });
  const res = NextResponse.json({ ok: true, username: result.username, teamSlug: result.teamSlug });
  res.cookies.set(COOKIE_NAME, createSession(result.username, result.teamSlug), teamCookieOptions());
  return res;
}
