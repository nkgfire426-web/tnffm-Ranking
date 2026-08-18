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

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        teams: Array.isArray(payload.teams) ? payload.teams : [],
        events: [],
        collaborators: []
      })
    });

    const result = await response.json().catch(() => ({}));
    return NextResponse.json(
      { ok: response.ok && result.ok !== false, message: result.message || (response.ok ? "Google Sheet synced." : "Google Sheet sync failed.") },
      { status: response.ok && result.ok !== false ? 200 : 502 }
    );
  } catch (error) {
    console.error("Google Sheets sync error:", error);
    return NextResponse.json({ ok: false, message: "Unable to sync Google Sheet." }, { status: 500 });
  }
}
