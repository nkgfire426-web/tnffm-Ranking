import { NextRequest, NextResponse } from "next/server";
import { getPublicRegisteredTeams } from "@/lib/public-sheet";

export const dynamic = "force-dynamic";

async function callSheets(body: Record<string, unknown>) {
  const webhook = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!webhook) return NextResponse.json({ ok: false, message: "Google Sheets is not configured." }, { status: 503 });
  const response = await fetch(webhook, { method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", body: JSON.stringify(body) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) return NextResponse.json({ ok: false, message: result.message || "Google Sheets request failed." }, { status: 502 });
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const teamName = String(body.teamName || "").trim();
  const tournamentName = String(body.tournamentName || "").trim();
  const tournamentDate = String(body.tournamentDate || "").trim();
  const organizerName = String(body.organizerName || "").trim();
  const prizePool = String(body.prizePool || "").trim();
  const finalPosition = Number(body.finalPosition || 0);
  const teamFinalPoints = Number(body.teamFinalPoints || 0);
  const proofUrl = String(body.proofUrl || "").trim();

  if (teamName.length < 2) return NextResponse.json({ ok: false, message: "Select your registered team." }, { status: 400 });
  if (tournamentName.length < 2) return NextResponse.json({ ok: false, message: "Enter the tournament name." }, { status: 400 });
  if (!tournamentDate) return NextResponse.json({ ok: false, message: "Enter the tournament date." }, { status: 400 });
  if (!organizerName) return NextResponse.json({ ok: false, message: "Enter the organizer name." }, { status: 400 });
  if (!Number.isInteger(finalPosition) || finalPosition < 1 || finalPosition > 18) return NextResponse.json({ ok: false, message: "Final position must be a whole number from 1 to 18." }, { status: 400 });
  if (!Number.isFinite(teamFinalPoints) || teamFinalPoints < 0) return NextResponse.json({ ok: false, message: "Enter your team's final tournament points." }, { status: 400 });
  if (proofUrl && !/^https?:\/\//i.test(proofUrl)) return NextResponse.json({ ok: false, message: "Proof link must start with http:// or https://." }, { status: 400 });

  let teams;
  try { teams = await getPublicRegisteredTeams(); } catch { return NextResponse.json({ ok: false, message: "Unable to verify the registered team list right now." }, { status: 503 }); }
  const team = teams.find((item) => String(item.teamName).trim().toLowerCase() === teamName.toLowerCase() && String(item.registrationStatus || "Registered").toLowerCase() !== "hidden" && String(item.status || "Active").toLowerCase() !== "banned");
  if (!team) return NextResponse.json({ ok: false, message: "That team is not currently registered for TNFFM ranking submissions." }, { status: 400 });

  const finalLeaderboard = `Position #${finalPosition} — ${teamFinalPoints} points`;
  return callSheets({ action: "submitFinalLeaderboard", teamName: team.teamName, teamSlug: String((team as any).slug || ""), tournamentName, tournamentDate, organizerName, prizePool, finalPosition, finalLeaderboard, teamFinalPoints, proofUrl });
}
