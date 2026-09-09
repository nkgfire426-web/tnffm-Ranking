import { Header } from "@/components/Header";
import { TeamLogo } from "@/components/TeamLogo";
import { getUnifiedTeamData } from "@/lib/site-data";
import type { RankedTeam } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AchievementShowcasePage() {
  const teams = await getUnifiedTeamData();
  const ordered = [...teams]
    .filter((team) => team.status !== "Banned")
    .sort(
      (a, b) =>
        (b.championships - a.championships) ||
        (b.runnerUp - a.runnerUp) ||
        (b.secondRunnerUp - a.secondRunnerUp) ||
        ((b.top5Finishes ?? 0) - (a.top5Finishes ?? 0)) ||
        (a.rank - b.rank),
    );

  return <main className="min-h-screen bg-[#050507] text-white">
    <Header />
    <section className="relative overflow-hidden border-b border-gold/15">
      <div className="absolute inset-0 bg-[url('/brand/tnffm-banner.jpg')] bg-cover bg-center" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#050507]/98 via-[#050507]/90 to-[#050507]/65" />
      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <p className="font-rajdhani text-xs font-black uppercase tracking-[.28em] text-gold">TNFFM • Official Showcase</p>
        <h1 className="mt-3 max-w-5xl font-rajdhani text-4xl font-black uppercase leading-[.9] sm:text-6xl lg:text-7xl">Community Teams <span className="gold-text">Achievement Showcase</span></h1>
        <p className="mt-5 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">A public hall of achievement for TNFFM community teams, built from the current official ranking data.</p>
      </div>
    </section>
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      {ordered.length === 0 ? <div className="rounded-2xl border border-white/10 bg-white/[.025] p-10 text-center text-slate-500">No achievement records are available yet.</div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ordered.map((team) => <article key={team.slug} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[.025] p-5 transition hover:-translate-y-1 hover:border-gold/30 hover:bg-gold/[.025]"><div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent opacity-60" /><div className="flex items-center gap-4"><div className="rounded-2xl border border-white/10 bg-black/60 p-1"><TeamLogo src={team.logoUrl} name={team.teamName} size={72} /></div><div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-[.2em] text-gold">Rank #{team.rank}</p><h2 className="truncate font-rajdhani text-2xl font-black uppercase text-white group-hover:text-gold">{team.teamName}</h2><p className="text-xs text-slate-500">{team.communityPoints} official ranking points</p></div></div><div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4"><Stat label="Champions" value={team.championships} /><Stat label="Runner-Up" value={team.runnerUp} /><Stat label="3rd" value={team.secondRunnerUp} /><Stat label="Top 5" value={team.top5Finishes ?? 0} /></div>{team.description && <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-400">{team.description}</p>}</article>)}
      </div>}
    </section>
  </main>;
}

function Stat({ label, value }: { label: string; value: number }) { return <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-center"><p className="font-rajdhani text-xl font-black text-white">{value}</p><p className="mt-1 text-[8px] font-black uppercase tracking-[.14em] text-slate-500">{label}</p></div>; }
