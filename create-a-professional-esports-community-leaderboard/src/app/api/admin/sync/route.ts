import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as { password?: string; teams?: unknown };
  const expected = process.env.ADMIN_PASSWORD || "admin123";

  if (payload.password !== expected) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!webhookUrl) {
    // If webhook not configured, try service account + Sheets API
    const sheetId = process.env.GOOGLE_SHEETS_ID;
    const sa = process.env.GOOGLE_SERVICE_ACCOUNT;
    const range = process.env.GOOGLE_SHEETS_RANGE || "Teams!A1:Q";

    if (sheetId && sa) {
      try {
        const teams = Array.isArray(payload.teams) ? (payload.teams as any[]) : [];
        // Lazy import to avoid adding runtime deps here
        const { teamsToSheetRows, updateGoogleSheetValues } = await import("@/lib/google-sheets");
        const rows = teamsToSheetRows(teams);
        await updateGoogleSheetValues(sheetId, range, rows, sa);
        return NextResponse.json({ ok: true });
      } catch (err) {
        return NextResponse.json({ ok: false, message: String(err) }, { status: 502 });
      }
    }

    return NextResponse.json({ ok: false, message: "GOOGLE_SHEETS_WEBHOOK_URL or service account not configured." }, { status: 501 });
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ teams: payload.teams })
  });

  return NextResponse.json({ ok: response.ok }, { status: response.ok ? 200 : 502 });
}
