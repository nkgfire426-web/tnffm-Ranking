import { NextResponse } from "next/server";
import { getRankedTeams, getTeamBySlug } from "@/lib/google-sheets";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const slug = url.searchParams.get("slug")?.trim();
    const team = slug ? await getTeamBySlug(slug) : (await getRankedTeams())[0];
    if (!team) return NextResponse.json({ ok: false, message: "No team found." }, { status: 404 });
    return NextResponse.json({ ok: true, team: {
      teamName: team.teamName, slug: team.slug, logoUrl: team.logoUrl || "", description: team.description || "",
      mobileNumber: (team as any).mobileNumber || "", roster: Array.isArray((team as any).roster) ? (team as any).roster : [],
      players: team.players ?? 0, status: team.status || "Active", communityPoints: team.communityPoints ?? 0,
      championships: team.championships ?? 0, runnerUp: (team as any).runnerUp ?? 0, secondRunnerUp: (team as any).secondRunnerUp ?? 0,
      top3Finishes: (team as any).top3Finishes ?? 0, rank: (team as any).rank ?? 0, eventsPlayed: (team as any).eventsPlayed ?? 0,
    }});
  } catch (error) {
    console.error("Public team dashboard error:", error);
    return NextResponse.json({ ok: false, message: "Unable to load team dashboard." }, { status: 500 });
  }
}
