import { NextRequest, NextResponse } from "next/server";
import { createSession, hashPassword, COOKIE_NAME, teamCookieOptions } from "@/lib/team-auth";

function makeSlug(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50);
}

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const username = String(body.username || "").trim().toLowerCase();
  const password = String(body.password || "");
  const teamSlug = String(body.teamSlug || "").trim();
  const teamName = String(body.teamName || "").trim();
  const email = String(body.email || "").trim();
  if (password.length < 8) return NextResponse.json({ ok: false, message: "Password must be at least 8 characters." }, { status: 400 });
  if (!teamSlug && !teamName) return NextResponse.json({ ok: false, message: "Select an existing team or enter a new team name." }, { status: 400 });
  if (!process.env.TEAM_AUTH_SECRET && !process.env.ADMIN_PASSWORD) return NextResponse.json({ ok: false, message: "Team authentication is not configured on the server." }, { status: 503 });
  const webhook = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!webhook) return NextResponse.json({ ok: false, message: "Google Sheets is not configured." }, { status: 503 });
  const finalSlug = teamSlug || makeSlug(teamName);
  const response = await fetch(webhook, { method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", body: JSON.stringify({ action: "registerTeam", username, passwordHash: hashPassword(password), teamSlug: finalSlug, teamName, email }) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) return NextResponse.json({ ok: false, message: result.message || "Unable to create team account." }, { status: 400 });
  const slug = result.teamSlug || finalSlug;
  const res = NextResponse.json({ ok: true, username, teamSlug: slug, teamName: result.teamName || teamName, message: "Team account created successfully." });
  res.cookies.set(COOKIE_NAME, createSession(username, slug), teamCookieOptions());
  return res;
}
