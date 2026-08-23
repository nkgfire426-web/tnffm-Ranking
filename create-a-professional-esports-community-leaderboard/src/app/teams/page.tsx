import Link from "next/link";
import { Header } from "@/components/Header";
import { getRegisteredTeams } from "@/lib/google-sheets";
import { slugify } from "@/lib/rankings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CommunityTeamsPage() {
  const teams = await getRegisteredTeams();

  return (
    <main className="min-h-screen bg-[#050507] text-white">
      <Header />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-gold/20 bg-gradient-to-br from-[#17130b] via-[#0b0b0c] to-black p-6 shadow-2xl sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-gold">TNFFM Tamil Community</p>
          <h1 className="mt-2 font-rajdhani text-4xl font-black uppercase sm:text-6xl">Registered Teams Showcase</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400 sm:text-base">
            Officially registered Tamil gaming community teams. Registration is separate from the TNFFM competitive ranking. A team can be registered here with 0 ranking points.
          </p>
          <div className="mt-5 flex flex-wrap gap-3 text-xs font-bold uppercase tracking-wider">
            <span className="rounded-full border border-gold/30 bg-gold/10 px-3 py-2 text-gold">{teams.length} Registered Teams</span>
            <Link href="/ranking" className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-slate-200 transition hover:border-gold/40 hover:text-gold">View Official Ranking →</Link>
          </div>
        </div>

        {teams.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.025] p-10 text-center text-slate-500">No registered teams yet.</div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {teams.map((team) => {
              const ranked = Number(team.communityPoints || 0) > 0 || team.rankingEligible === true;
              const slug = slugify(team.teamName);
              return (
                <Link key={slug} href={`/team-details?team=${encodeURIComponent(slug)}`} className="group rounded-2xl border border-white/10 bg-white/[0.025] p-5 transition hover:-translate-y-1 hover:border-gold/40 hover:bg-gold/[0.04]">
                  <div className="flex items-center gap-4">
                    <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-gold/20 bg-black/60 p-2">
                      {team.logoUrl ? <img src={team.logoUrl} alt={`${team.teamName} logo`} className="h-full w-full object-contain" /> : <span className="font-rajdhani text-2xl font-black text-gold">FF</span>}
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate font-rajdhani text-2xl font-bold uppercase text-white group-hover:text-gold">{team.teamName}</h2>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Tamil Community Team</p>
                    </div>
                  </div>
                  <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
                    <span className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${ranked ? "border-gold/30 bg-gold/10 text-gold" : "border-white/10 bg-white/5 text-slate-400"}`}>
                      {ranked ? "Officially Ranked" : "Registered • Unranked"}
                    </span>
                    <span className="text-xs font-bold text-slate-500">{Number(team.players || 0)} Players</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
