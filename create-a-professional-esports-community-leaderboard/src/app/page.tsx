import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { Podium } from "@/components/Podium";
import { RecentUpdates } from "@/components/RecentUpdates";
import { RankingsInsights } from "@/components/RankingsInsights";
import { StatsCards } from "@/components/StatsCards";
import { TrackedEventsPreview } from "@/components/TrackedEventsPreview";
import { getTrackedEvents } from "@/lib/events";
import { getTournamentNews } from "@/lib/google-sheets";
import { getUnifiedTeamData } from "@/lib/site-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  // Every homepage ranking card uses the same unified model as the ranking
  // and team-profile pages. Published Rankings remain authoritative for rank
  // and score; Registered Teams remains authoritative for profile details.
  const [teams, news, events] = await Promise.all([
    getUnifiedTeamData(),
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
