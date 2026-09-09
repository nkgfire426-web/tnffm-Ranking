import Link from "next/link";
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

export default async function Home() {
  const [teams, news] = await Promise.all([getUnifiedTeamData(), getTournamentNews()]);
  return <main className="dashboard-inspired-site"><Header /><Hero teams={teams} news={news} /><section className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8"><div className="relative overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-r from-[#151208] via-[#0d0d0f] to-[#09090b] p-5 shadow-xl sm:p-7"><div className="absolute right-0 top-0 h-full w-1/3 bg-[radial-gradient(circle_at_center,rgba(255,210,31,.10),transparent_65%)]" /><div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.24em] text-gold">Ranking submissions open</p><h2 className="mt-2 font-rajdhani text-3xl font-black uppercase text-white sm:text-4xl">Need your team in the ranking?</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Registered community teams can submit completed tournament Finals / Grand Finals results with official proof for TNFFM assessment.</p></div><Link href="/submit-results" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gold px-5 py-3.5 font-bold text-black transition hover:-translate-y-0.5 hover:bg-yellow-300">Submit Team Results</Link></div></div></section><StatsCards teams={teams} /><Podium teams={teams} /><RankingsInsights teams={teams} news={news} /><LeaderboardTable teams={teams} /><RecentUpdates teams={teams} /></main>;
}
