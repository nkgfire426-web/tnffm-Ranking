import { NextRequest, NextResponse } from "next/server";
import { getTeamSession } from "@/lib/team-auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = await getTeamSession();
  if (!session) return NextResponse.json({ ok: false, message: "Not logged in." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const webhook = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!webhook) return NextResponse.json({ ok: false, message: "Google Sheets is not configured." }, { status: 503 });
  const response = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({
      action: "updateTeamProfile",
      username: session.username,
      teamSlug: session.teamSlug,
      logoUrl: body.logoUrl,
      description: body.description,
      roster: Array.isArray(body.roster) ? body.roster : [],
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) return NextResponse.json({ ok: false, message: result.message || "Unable to save team profile." }, { status: 502 });
  return NextResponse.json(result);
}
