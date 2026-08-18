import { NextResponse } from "next/server";
import { getTeamSession } from "@/lib/team-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getTeamSession();
  if (!session) return NextResponse.json({ ok: false, message: "Not logged in." }, { status: 401 });
  const webhook = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!webhook) return NextResponse.json({ ok: false, message: "Google Sheets is not configured." }, { status: 503 });
  const response = await fetch(webhook, { cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  const team = Array.isArray(data.teams) ? data.teams.find((item: { slug?: string }) => item.slug === session.teamSlug) : null;
  if (!team) return NextResponse.json({ ok: false, message: "Team profile not found." }, { status: 404 });
  return NextResponse.json({ ok: true, username: session.username, team });
}
