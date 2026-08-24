import { NextRequest, NextResponse } from "next/server";
import { getTeamSession } from "@/lib/team-auth";

export const dynamic = "force-dynamic";

function cleanRoster(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((player: any) => ({
    name: String(player?.name ?? "").trim(),
    uid: String(player?.uid ?? "").trim(),
    playerLogoUrl: String(player?.playerLogoUrl ?? player?.PlayerLogoURL ?? player?.playerLogo ?? "").trim(),
  })).filter((player) => player.name || player.uid || player.playerLogoUrl);
}

export async function POST(request: NextRequest) {
  const session = await getTeamSession();
  if (!session) return NextResponse.json({ ok: false, message: "Not logged in." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const webhook = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!webhook) return NextResponse.json({ ok: false, message: "Google Sheets is not configured." }, { status: 503 });

  const roster = cleanRoster(body.roster);

  // Use the generic locked save operation so the roster is written as JSON
  // without the older profile action stripping playerLogoUrl.
  const readResponse = await fetch(webhook, {
    method: "GET",
    cache: "no-store",
    headers: { Accept: "application/json", "Cache-Control": "no-cache, no-store, max-age=0" },
  });
  const current = await readResponse.json().catch(() => ({}));
  if (!readResponse.ok || !current?.ok || !Array.isArray(current.teams)) {
    return NextResponse.json({ ok: false, message: "Unable to read the current Google Sheets team data before saving." }, { status: 502 });
  }

  const teams = current.teams.map((team: any) => {
    if (String(team?.slug ?? "") !== String(session.teamSlug)) return team;
    return {
      ...team,
      logoUrl: typeof body.logoUrl === "string" ? body.logoUrl.trim() : String(team.logoUrl ?? ""),
      description: typeof body.description === "string" ? body.description.trim() : String(team.description ?? ""),
      mobileNumber: typeof body.mobileNumber === "string" ? body.mobileNumber.trim() : String(team.mobileNumber ?? ""),
      roster,
      players: roster.length,
      lastUpdated: new Date().toISOString(),
    };
  });

  const response = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ action: "save", teams }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) return NextResponse.json({ ok: false, message: result.message || "Unable to save team profile." }, { status: 502 });

  const savedTeam = teams.find((team: any) => String(team?.slug ?? "") === String(session.teamSlug));
  return NextResponse.json({ ok: true, team: savedTeam, message: "Team profile and player logos saved successfully." });
}
