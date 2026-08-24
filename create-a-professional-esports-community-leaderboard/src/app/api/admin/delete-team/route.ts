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

    // Use the already-deployed Apps Script save contract. This makes deletion
    // work even before the optional Apps Script hardening file is deployed.
    const readResponse = await fetch(webhookUrl, { method: "GET", cache: "no-store", headers: { Accept: "application/json" } });
    const current = await readResponse.json().catch(() => ({}));
    if (!readResponse.ok || current.ok === false) return NextResponse.json({ ok: false, message: current.message || "Unable to read current teams." }, { status: 502 });
    const teams = Array.isArray(current.teams) ? current.teams : [];
    const filtered = teams.filter((team: any) => String(team?.slug || "").trim().toLowerCase() !== teamSlug.toLowerCase());
    if (filtered.length === teams.length) return NextResponse.json({ ok: false, message: "Team was not found in the registered Teams sheet." }, { status: 404 });

    const writeResponse = await fetch(webhookUrl, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ teams: filtered })
    });
    const result = await writeResponse.json().catch(() => ({}));
    if (!writeResponse.ok || result.ok === false) return NextResponse.json({ ok: false, message: result.message || "Unable to remove the registered team." }, { status: 502 });

    return NextResponse.json({ ok: true, teamSlug, message: "Team removed from the registered Teams list." });
  } catch (error) {
    console.error("Admin delete team error:", error);
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Unable to remove team." }, { status: 500 });
  }
}
