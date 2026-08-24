import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { password?: string; teamSlug?: string };
    const expected = process.env.ADMIN_PASSWORD;
    if (!expected || body.password !== expected) return NextResponse.json({ ok: false, message: "Invalid admin password." }, { status: 401 });
    const teamSlug = String(body.teamSlug || "").trim();
    if (!teamSlug) return NextResponse.json({ ok: false, message: "Team slug is required." }, { status: 400 });
    const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
    if (!webhookUrl) return NextResponse.json({ ok: false, message: "Google Sheets is not configured." }, { status: 503 });

    const response = await fetch(webhookUrl, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ action: "deleteTeam", teamSlug })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok === false) return NextResponse.json({ ok: false, message: result.message || "Unable to remove the registered team." }, { status: 502 });
    return NextResponse.json({ ok: true, teamSlug, message: "Team and its registered account were removed." });
  } catch (error) {
    console.error("Admin delete team error:", error);
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Unable to remove team." }, { status: 500 });
  }
}
