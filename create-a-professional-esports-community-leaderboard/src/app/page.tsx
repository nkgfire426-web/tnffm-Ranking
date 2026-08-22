import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { Podium } from "@/components/Podium";
import { RecentUpdates } from "@/components/RecentUpdates";
import { RankingsInsights } from "@/components/RankingsInsights";
import { StatsCards } from "@/components/StatsCards";
import { getRankedTeams, getTournamentNews } from "@/lib/google-sheets";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const [teams, news] = await Promise.all([getRankedTeams(), getTournamentNews()]);

  return (
    <main>
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
