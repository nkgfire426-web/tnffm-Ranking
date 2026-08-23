import { NextResponse } from "next/server";
import { getRankedTeams, getTeamBySlug } from "@/lib/google-sheets";
import { slugify } from "@/lib/rankings";

export const dynamic = "force-dynamic";

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
      return NextResponse.json({ ok: false, message: "No team found." }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      team: {
        teamName: team.teamName,
        slug: slugify(team.teamName),
        logoUrl: team.logoUrl || "",
        description: team.description || "",
        mobileNumber: team.mobileNumber || "",
        roster: Array.isArray(team.roster) ? team.roster : [],
        players: team.players ?? 0,
        status: team.status || "Active",
        communityPoints: "communityPoints" in team ? team.communityPoints : 0,
        championships: team.championships ?? 0,
        runnerUp: team.runnerUp ?? 0,
        secondRunnerUp: team.secondRunnerUp ?? 0,
        top3Finishes: "top3Finishes" in team ? team.top3Finishes : 0,
        rank: "rank" in team ? team.rank : 0,
        eventsPlayed: team.eventsPlayed ?? 0,
        rankingEligible: team.rankingEligible === true || rankedTeam != null,
        registrationStatus: team.registrationStatus || "Registered"
      }
    });
  } catch (error) {
    console.error("Public team dashboard error:", error);
    return NextResponse.json({ ok: false, message: "Unable to load team dashboard." }, { status: 500 });
  }
}
