import { NextRequest, NextResponse } from "next/server";
import { getTeamSession } from "@/lib/team-auth";

export const dynamic = "force-dynamic";

function cleanRoster(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((player: any) => ({ name: String(player?.name ?? "").trim(), uid: String(player?.uid ?? "").trim(), playerLogoUrl: String(player?.playerLogoUrl ?? player?.PlayerLogoURL ?? player?.playerLogo ?? "").trim() })).filter((player) => player.name || player.uid || player.playerLogoUrl);
}
function rosterKey(value: unknown) { return JSON.stringify(cleanRoster(value)); }

export async function POST(request: NextRequest) {
  const session = await getTeamSession();
  if (!session) return NextResponse.json({ ok: false, message: "Not logged in." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const webhook = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!webhook) return NextResponse.json({ ok: false, message: "Google Sheets is not configured." }, { status: 503 });
  const roster = cleanRoster(body.roster);

  const readResponse = await fetch(webhook, { method: "GET", cache: "no-store", headers: { Accept: "application/json", "Cache-Control": "no-cache, no-store, max-age=0" } });
  const current = await readResponse.json().catch(() => ({}));
  if (!readResponse.ok || !current?.ok || !Array.isArray(current.teams)) return NextResponse.json({ ok: false, message: "Unable to read the current Google Sheets team data before saving." }, { status: 502 });

  const teams = current.teams.map((team: any) => String(team?.slug ?? "") === String(session.teamSlug) ? { ...team, logoUrl: typeof body.logoUrl === "string" ? body.logoUrl.trim() : String(team.logoUrl ?? ""), description: typeof body.description === "string" ? body.description.trim() : String(team.description ?? ""), mobileNumber: typeof body.mobileNumber === "string" ? body.mobileNumber.trim() : String(team.mobileNumber ?? ""), roster, players: roster.length, lastUpdated: new Date().toISOString() } : team);
  const savedTeam = teams.find((team: any) => String(team?.slug ?? "") === String(session.teamSlug));
  if (!savedTeam) return NextResponse.json({ ok: false, message: "Your team could not be found in Google Sheets." }, { status: 404 });

  const response = await fetch(webhook, { method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", body: JSON.stringify({ action: "save", teams }) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) return NextResponse.json({ ok: false, message: result.message || "Unable to save team profile." }, { status: 502 });

  // Read the saved team back from Sheets and verify the fields that this
  // endpoint owns. This prevents a false success if Apps Script accepted the
  // request but did not persist the player logo URLs.
  const verifyResponse = await fetch(webhook, { method: "GET", cache: "no-store", headers: { Accept: "application/json", "Cache-Control": "no-cache, no-store, max-age=0" } });
  const verifyPayload = await verifyResponse.json().catch(() => ({}));
  const verifiedTeam = Array.isArray(verifyPayload?.teams) ? verifyPayload.teams.find((team: any) => String(team?.slug ?? "") === String(session.teamSlug)) : null;
  if (!verifyResponse.ok || !verifiedTeam) return NextResponse.json({ ok: false, message: "Team was written, but Google Sheets read-back could not verify the team." }, { status: 502 });

  const expectedLogo = String(savedTeam.logoUrl ?? "").trim();
  const actualLogo = String(verifiedTeam.logoUrl ?? "").trim();
  const expectedDescription = String(savedTeam.description ?? "").trim();
  const actualDescription = String(verifiedTeam.description ?? "").trim();
  const expectedMobile = String(savedTeam.mobileNumber ?? "").trim();
  const actualMobile = String(verifiedTeam.mobileNumber ?? "").trim();
  if (expectedLogo !== actualLogo || expectedDescription !== actualDescription || expectedMobile !== actualMobile || rosterKey(savedTeam.roster) !== rosterKey(verifiedTeam.roster)) {
    return NextResponse.json({ ok: false, message: "Team was written, but Google Sheets read-back did not match the saved profile. Please retry." }, { status: 502 });
  }

  return NextResponse.json({ ok: true, verified: true, team: { ...verifiedTeam, roster: cleanRoster(verifiedTeam.roster) }, message: "Team profile and player logos saved and verified successfully." });
}
