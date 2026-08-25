import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { Podium } from "@/components/Podium";
import { RecentUpdates } from "@/components/RecentUpdates";
import { RankingsInsights } from "@/components/RankingsInsights";
import { StatsCards } from "@/components/StatsCards";
import { TrackedEventsPreview } from "@/components/TrackedEventsPreview";
import { getTrackedEvents } from "@/lib/events";
import { getRankedTeams, getRegisteredTeams, getTournamentNews } from "@/lib/google-sheets";
import type { RankedTeam, RawTeam } from "@/lib/types";

// The public homepage must always render the current published ranking.
// Do not serve a previously generated leaderboard after an admin update.
export const dynamic = "force-dynamic";
export const revalidate = 0;

function mergeLiveTeamDetails(rankedTeams: RankedTeam[], registeredTeams: RawTeam[]): RankedTeam[] {
  const byId = new Map<string, RawTeam>();
  const byName = new Map<string, RawTeam>();

  for (const team of registeredTeams) {
    const id = String((team as any).teamId ?? (team as any).id ?? "").trim();
    const name = String(team.teamName ?? "").trim().toLowerCase();
    if (id) byId.set(id, team);
    if (name) byName.set(name, team);
  }

  return rankedTeams.map((ranked) => {
    const id = String((ranked as any).teamId ?? (ranked as any).id ?? "").trim();
    const name = String(ranked.teamName ?? "").trim().toLowerCase();
    const live = (id && byId.get(id)) || byName.get(name);
    if (!live) return ranked;

    // Published ranking values stay authoritative for rank/score fields.
    // Team profile fields come from the live Teams data so an incomplete
    // ranking row cannot hide a valid logo/banner/roster/description.
    const result = { ...live, ...ranked } as RankedTeam;
    const profileFields = [
      "logoUrl",
      "bannerUrl",
      "roster",
      "players",
      "status",
      "registrationStatus",
      "description",
      "mobileNumber",
      "lastUpdated",
    ] as const;

    for (const field of profileFields) {
      const rankedValue = (ranked as any)[field];
      const liveValue = (live as any)[field];
      const rankedEmpty =
        rankedValue == null ||
        (typeof rankedValue === "string" && rankedValue.trim() === "") ||
        (Array.isArray(rankedValue) && rankedValue.length === 0);
      if (rankedEmpty && liveValue != null) (result as any)[field] = liveValue;
    }

    return result;
  });
}

export default async function Home() {
  const [teams, registeredTeams, news, events] = await Promise.all([
    getRankedTeams(),
    getRegisteredTeams(),
    getTournamentNews(),
    getTrackedEvents(),
  ]);

  const hydratedTeams = mergeLiveTeamDetails(teams, registeredTeams);

  return (
    <main>
      <Header />
      <Hero teams={hydratedTeams} news={news} />
      <StatsCards teams={hydratedTeams} />
      <Podium teams={hydratedTeams} />
      <RankingsInsights teams={hydratedTeams} news={news} />
      <LeaderboardTable teams={hydratedTeams} />
      <TrackedEventsPreview events={events} />
      <RecentUpdates teams={hydratedTeams} />
    </main>
  );
}
