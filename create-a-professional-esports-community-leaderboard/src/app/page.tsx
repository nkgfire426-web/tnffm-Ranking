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

function hasText(value: unknown) {
  return typeof value === "string" ? value.trim().length > 0 : value != null;
}

function hasRoster(value: unknown) {
  return Array.isArray(value) && value.length > 0;
}

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

    // Ranking fields remain authoritative: rank, community score, placement
    // counts and other published ranking values always come from the Rankings
    // sheet. Profile fields, however, must come from the current Teams/Rosters
    // data whenever that live record actually has a value. The old logic only
    // filled truly empty fields, which meant normalized defaults such as players
    // = 0 or status = Active could incorrectly hide good live Sheet details.
    const result = { ...ranked } as RankedTeam;
    const profileFields = [
      "logoUrl",
      "bannerUrl",
      "status",
      "registrationStatus",
      "description",
      "mobileNumber",
      "lastUpdated",
    ] as const;

    for (const field of profileFields) {
      const liveValue = (live as any)[field];
      if (hasText(liveValue)) (result as any)[field] = liveValue;
    }

    const liveRoster = (live as any).roster;
    if (hasRoster(liveRoster)) {
      (result as any).roster = liveRoster;
      (result as any).players = Number((live as any).players) || liveRoster.length;
    } else if (Number((live as any).players) > 0) {
      (result as any).players = Number((live as any).players);
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
