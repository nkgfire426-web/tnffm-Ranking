import { NextResponse } from "next/server";
import { getRankedTeams, getTeamBySlug } from "@/lib/google-sheets";
import { slugify } from "@/lib/rankings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const requestedSlug = url.searchParams.get("slug")?.trim() || "";
    const rankedTeams = await getRankedTeams();

    const registeredTeam = requestedSlug
      ? await getTeamBySlug(requestedSlug)
      : undefined;

    const rankedTeam = requestedSlug
      ? rankedTeams.find((item) => slugify(item.teamName) === requestedSlug || item.slug === requestedSlug)
      : rankedTeams[0];

    const team = registeredTeam || rankedTeam;

    if (!team) {
      return NextResponse.json(
        { ok: false, message: "No published team found." },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }

    const teamRecord = team as any;
    const teamId = String(teamRecord.teamId ?? teamRecord.id ?? "").trim();

    return NextResponse.json(
      {
        ok: true,
        source: "google-sheets",
        team: {
          teamId,
          teamName: team.teamName,
          slug: String(teamRecord.slug || slugify(team.teamName)),
          logoUrl: team.logoUrl || "",
          bannerUrl: teamRecord.bannerUrl || "",
          description: team.description || "",
          mobileNumber: team.mobileNumber || "",
          roster: Array.isArray(team.roster) ? team.roster : [],
          players: team.players ?? 0,
          status: team.status || "Active",
          registrationStatus: team.registrationStatus || "Registered",
          communityPoints: "communityPoints" in team ? team.communityPoints : 0,
          championships: team.championships ?? 0,
          runnerUp: team.runnerUp ?? 0,
          secondRunnerUp: team.secondRunnerUp ?? 0,
          top5Finishes: team.top5Finishes ?? 0,
          finalistFinishes: teamRecord.finalistFinishes ?? 0,
          officialMatchFinalists: teamRecord.officialMatchFinalists ?? 0,
          eventsPlayed: team.eventsPlayed ?? 0,
          grandFinals: teamRecord.grandFinals ?? 0,
          matchesPlayed: teamRecord.matchesPlayed ?? 0,
          kills: teamRecord.kills ?? 0,
          booyahs: teamRecord.booyahs ?? 0,
          positionPoints: teamRecord.positionPoints ?? 0,
          totalPoints: teamRecord.totalPoints ?? 0,
          rank: "rank" in team ? team.rank : 0,
          previousRank: teamRecord.previousRank ?? 0,
          rankingEligible: team.rankingEligible === true || rankedTeam != null,
          lastUpdated: teamRecord.lastUpdated || "",
        }
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Public team dashboard error:", error);
    return NextResponse.json(
      { ok: false, message: "Unable to load team dashboard." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
