import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { Podium } from "@/components/Podium";
import { RecentUpdates } from "@/components/RecentUpdates";
import { RankingsInsights } from "@/components/RankingsInsights";
import { StatsCards } from "@/components/StatsCards";
import { getTournamentNews } from "@/lib/google-sheets";
import { getUnifiedTeamData } from "@/lib/site-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Production safety marker: this page must render only from the current main branch build.
export default async function Home() {
  const [teams, news] = await Promise.all([
    getUnifiedTeamData(),
    getTournamentNews(),
  ]);

  return (
    <main className="dashboard-inspired-site">
      <Header />
      <Hero teams={teams} news={news} />
      <StatsCards teams={teams} />
      <Podium teams={teams} />
      <RankingsInsights teams={teams} news={news} />
      <LeaderboardTable teams={teams} />
      <RecentUpdates teams={teams} />
    </main>
  );
}
