import { NextRequest, NextResponse } from "next/server";
import { createSession, hashPassword, COOKIE_NAME, teamCookieOptions } from "@/lib/team-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const REQUEST_TIMEOUT_MS = 10_000;

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json().catch(() => ({}));
    if (!username || !password) {
      return NextResponse.json({ ok: false, message: "Username and password are required." }, { status: 400 });
    }

    const webhook = process.env.GOOGLE_SHEETS_WEBHOOK_URL?.trim();
    if (!webhook) {
      return NextResponse.json({ ok: false, message: "Google Sheets is not configured." }, { status: 503 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(webhook, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
        cache: "no-store",
        body: JSON.stringify({
          action: "loginTeam",
          username: String(username).trim().toLowerCase(),
          passwordHash: hashPassword(String(password)),
        }),
        signal: controller.signal,
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) {
        return NextResponse.json(
          { ok: false, message: result.message || "Login failed." },
          { status: response.ok ? 401 : 502 }
        );
      }

      if (!result.username || !result.teamSlug) {
        return NextResponse.json({ ok: false, message: "Login service returned an incomplete team session." }, { status: 502 });
      }

      const res = NextResponse.json(
        { ok: true, username: result.username, teamSlug: result.teamSlug },
        { headers: { "Cache-Control": "no-store" } }
      );
      res.cookies.set(COOKIE_NAME, createSession(result.username, result.teamSlug), teamCookieOptions());
      return res;
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json({ ok: false, message: "Login service timed out. Please try again." }, { status: 504 });
    }
    console.error("Team login error:", error);
    return NextResponse.json({ ok: false, message: "Unable to complete team login." }, { status: 502 });
  }
}
