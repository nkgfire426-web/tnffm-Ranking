import { Header } from "@/components/Header";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { Podium } from "@/components/Podium";
import { getUnifiedTeamData } from "@/lib/site-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RankingPage() {
  const teams = await getUnifiedTeamData();

  return (
    <main className="tnffm-public-page min-h-screen bg-[#050507] text-white">
      <Header />
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="relative overflow-hidden rounded-[2rem] border border-gold/20 bg-[#0a0a0c] p-6 shadow-[0_30px_90px_rgba(0,0,0,.35)] sm:p-10">
          <div className="pointer-events-none absolute inset-0 bg-[url('/brand/tnffm-banner.jpg')] bg-cover bg-center opacity-20" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#09090b] via-[#09090b]/90 to-[#09090b]/45" />
          <div className="relative">
            <div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-gold/25 bg-gold/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.2em] text-gold">Official leaderboard</span><span className="text-[10px] font-bold uppercase tracking-[.18em] text-slate-600">Live data</span></div>
            <h1 className="mt-4 max-w-4xl font-rajdhani text-4xl font-black uppercase leading-[.9] sm:text-6xl lg:text-7xl">Community <span className="gold-text">Ranking</span></h1>
            <p className="mt-5 max-w-3xl text-sm leading-6 text-slate-400 sm:text-base">Published ranking values come from the official Community Rankings sheet. Current team profile details come from the registered-team sheet.</p>
            <div className="mt-7 flex flex-wrap items-center gap-3"><div className="rounded-xl border border-white/10 bg-black/35 px-4 py-3"><span className="block font-rajdhani text-xl font-bold text-white">{teams.length}</span><span className="text-[9px] font-bold uppercase tracking-[.18em] text-slate-500">Teams ranked</span></div><div className="rounded-xl border border-white/10 bg-black/35 px-4 py-3"><span className="block font-rajdhani text-xl font-bold text-gold">Verified</span><span className="text-[9px] font-bold uppercase tracking-[.18em] text-slate-500">Ranking source</span></div></div>
          </div>
        </div>

        {teams.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.025] p-10 text-center"><h2 className="font-rajdhani text-3xl font-bold uppercase text-white">Ranking will appear here</h2><p className="mt-2 text-sm text-slate-500">No official ranking results have been recorded yet.</p></div>
        ) : (
          <><Podium teams={teams} /><div className="mt-8"><LeaderboardTable teams={teams} /></div></>
        )}
      </section>
    </main>
  );
}
