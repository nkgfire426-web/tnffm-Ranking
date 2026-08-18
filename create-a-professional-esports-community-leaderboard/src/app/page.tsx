import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { Podium } from "@/components/Podium";
import { RecentUpdates } from "@/components/RecentUpdates";
import { RankingsInsights } from "@/components/RankingsInsights";
import { StatsCards } from "@/components/StatsCards";
import { getRankedTeams } from "@/lib/google-sheets";

// The homepage reads live Google Sheets data and must be rendered dynamically.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const teams = await getRankedTeams();

  return (
    <main>
      <Header />
      <Hero teams={teams} />
      <StatsCards teams={teams} />
      <Podium teams={teams} />
      <RankingsInsights teams={teams} />
      <LeaderboardTable teams={teams} />
      <RecentUpdates teams={teams} />
    </main>
  );
}
