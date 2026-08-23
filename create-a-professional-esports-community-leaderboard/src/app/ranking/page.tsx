import { Header } from "@/components/Header";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { Podium } from "@/components/Podium";
import { getRankedTeams } from "@/lib/google-sheets";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RankingPage() {
  const teams = await getRankedTeams();

  return (
    <main className="min-h-screen bg-[#050507] text-white">
      <Header />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-gold/20 bg-gradient-to-br from-[#17130b] via-[#0b0b0c] to-black p-6 shadow-2xl sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-gold">TNFFM Official Ranking</p>
          <h1 className="mt-2 font-rajdhani text-4xl font-black uppercase sm:text-6xl">Community Ranking</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400 sm:text-base">
            Only results recognized through official TNFFM collaborator events contribute to the competitive ranking. Team registration and the community showcase are separate from ranking points.
          </p>
        </div>

        {teams.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.025] p-10 text-center">
            <h2 className="font-rajdhani text-3xl font-bold uppercase text-white">Ranking will appear here</h2>
            <p className="mt-2 text-sm text-slate-500">No official ranking results have been recorded yet.</p>
          </div>
        ) : (
          <>
            <Podium teams={teams} />
            <div className="mt-8">
              <LeaderboardTable teams={teams} />
            </div>
          </>
        )}
      </section>
    </main>
  );
}
