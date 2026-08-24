import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { Podium } from "@/components/Podium";
import { RecentUpdates } from "@/components/RecentUpdates";
import { RankingsInsights } from "@/components/RankingsInsights";
import { StatsCards } from "@/components/StatsCards";
import { TrackedEventsPreview } from "@/components/TrackedEventsPreview";
import { getTrackedEvents } from "@/lib/events";
import { getRankedTeams, getTournamentNews } from "@/lib/google-sheets";

// The public homepage must always render the current published ranking.
// Do not serve a previously generated leaderboard after an admin update.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const [teams, news, events] = await Promise.all([
    getRankedTeams(),
    getTournamentNews(),
    getTrackedEvents(),
  ]);

  return (
    <main>
      <Header />
      <Hero teams={teams} news={news} />
      <StatsCards teams={teams} />
      <Podium teams={teams} />
      <RankingsInsights teams={teams} news={news} />
      <LeaderboardTable teams={teams} />
      <TrackedEventsPreview events={events} />
      <RecentUpdates teams={teams} />
    </main>
  );
}
