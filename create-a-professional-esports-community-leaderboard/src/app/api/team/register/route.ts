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
  const teamName = String(body.teamName || "").trim();
  const email = String(body.email || "").trim();

  if (!/^[a-z0-9._-]{4,32}$/.test(username)) {
    return NextResponse.json({ ok: false, message: "Username must be 4-32 characters and use letters, numbers, dot, underscore or hyphen." }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ ok: false, message: "Password must be at least 8 characters." }, { status: 400 });
  }

  if (teamName.length < 2 || teamName.length > 60) {
    return NextResponse.json({ ok: false, message: "Team name must be between 2 and 60 characters." }, { status: 400 });
  }

  const webhook = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!webhook) {
    return NextResponse.json({ ok: false, message: "Google Sheets is not configured." }, { status: 503 });
  }

  const response = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({
      action: "registerTeam",
      username,
      passwordHash: hashPassword(password),
      teamName,
      email
    })
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok || !result.ok) {
    return NextResponse.json({ ok: false, message: result.message || "Unable to create team account." }, { status: 400 });
  }

  const slug = result.teamSlug || makeSlug(teamName);
  const res = NextResponse.json({
    ok: true,
    username,
    teamSlug: slug,
    teamName: result.teamName || teamName,
    message: "Team account created successfully."
  });

  res.cookies.set(COOKIE_NAME, createSession(username, slug), teamCookieOptions());
  return res;
}
