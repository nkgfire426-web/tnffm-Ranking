import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as { password?: string; teams?: unknown[] };
    const expected = process.env.ADMIN_PASSWORD;

    if (!expected || payload.password !== expected) {
      return NextResponse.json({ ok: false, message: "Invalid password." }, { status: 401 });
    }

    const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
    if (!webhookUrl) {
      return NextResponse.json({ ok: false, message: "Google Sheets webhook is not configured." }, { status: 503 });
    }

    // This legacy endpoint is intentionally team-only. Sending events: [] or
    // collaborators: [] would erase those sheets, so never include them here.
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        teams: Array.isArray(payload.teams) ? payload.teams : []
      })
    });

    const result = await response.json().catch(() => ({}));
    return NextResponse.json(
      { ok: response.ok && result.ok !== false, message: result.message || (response.ok ? "Team rankings synced to Google Sheets." : "Google Sheet sync failed.") },
      { status: response.ok && result.ok !== false ? 200 : 502 }
    );
  } catch (error) {
    console.error("Google Sheets sync error:", error);
    return NextResponse.json({ ok: false, message: "Unable to sync Google Sheet." }, { status: 500 });
  }
}
