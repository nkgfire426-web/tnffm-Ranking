import { NextResponse } from "next/server";
import { getPublicRegisteredTeamBySlug } from "@/lib/public-sheet";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const requestedSlug = url.searchParams.get("slug")?.trim() || "";
    const team = await getPublicRegisteredTeamBySlug(requestedSlug);

    if (!team) {
      return NextResponse.json(
        { ok: false, message: "No registered team found in Google Sheets." },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }

    const record = team as any;
    return NextResponse.json(
      {
        ok: true,
        source: "google-sheets",
        team: {
          teamId: String(record.teamId ?? record.id ?? "").trim(),
          teamName: team.teamName,
          slug: String(record.slug || ""),
          logoUrl: team.logoUrl || "",
          bannerUrl: record.bannerUrl || "",
          description: team.description || "",
          mobileNumber: team.mobileNumber || "",
          roster: Array.isArray(team.roster) ? team.roster : [],
          players: team.players ?? 0,
          status: team.status || "Active",
          registrationStatus: team.registrationStatus || "Registered",
          championships: team.championships ?? 0,
          runnerUp: team.runnerUp ?? 0,
          secondRunnerUp: team.secondRunnerUp ?? 0,
          top5Finishes: record.top5Finishes ?? 0,
          finalistFinishes: record.finalistFinishes ?? 0,
          officialMatchFinalists: record.officialMatchFinalists ?? 0,
          eventsPlayed: team.eventsPlayed ?? 0,
          grandFinals: record.grandFinals ?? 0,
          matchesPlayed: record.matchesPlayed ?? 0,
          kills: record.kills ?? 0,
          booyahs: record.booyahs ?? 0,
          positionPoints: record.positionPoints ?? 0,
          totalPoints: record.totalPoints ?? 0,
          lastUpdated: record.lastUpdated || "",
        }
      },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0", Pragma: "no-cache" } }
    );
  } catch (error) {
    console.error("Public team dashboard error:", error);
    const message = error instanceof Error ? error.message : "Unable to load team dashboard.";
    return NextResponse.json(
      { ok: false, message },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }
}
