import { Header } from "@/components/Header";
import { TeamLogo } from "@/components/TeamLogo";
import { getUnifiedTeamData } from "@/lib/site-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AchievementShowcasePage() {
  const teams = await getUnifiedTeamData();
  const ordered = [...teams]
    .filter((team) => team.status !== "Banned" && team.registrationStatus !== "Hidden")
    .sort((a, b) => (b.championships - a.championships) || (b.runnerUp - a.runnerUp) || (b.secondRunnerUp - a.secondRunnerUp) || ((b.top5Finishes ?? 0) - (a.top5Finishes ?? 0)) || a.teamName.localeCompare(b.teamName));

  return <main className="min-h-screen bg-[#050507] text-white">
    <Header />
    <section className="relative overflow-hidden border-b border-gold/15">
      <div className="absolute inset-0 bg-[url('/brand/tnffm-banner.jpg')] bg-cover bg-center" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#050507]/98 via-[#050507]/94 to-[#050507]/80" />
      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <p className="font-rajdhani text-xs font-black uppercase tracking-[.28em] text-gold">TNFFM • Official Showcase</p>
        <h1 className="mt-3 max-w-5xl font-rajdhani text-4xl font-black uppercase leading-[.92] sm:text-6xl lg:text-7xl">Community Teams <span className="gold-text">Achievement Showcase</span></h1>
        <p className="mt-5 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">A dedicated public hall of achievement for community teams. This page shows achievement records only — it does not display ranking position, ranking points, events played or other ranking details.</p>
      </div>
    </section>
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      {ordered.length === 0 ? <div className="rounded-2xl border border-white/10 bg-white/[.025] p-10 text-center text-slate-500">No achievement records are available yet.</div> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {ordered.map((team) => <article key={team.slug || team.teamName} className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[.055] to-white/[.018] p-5 shadow-2xl transition duration-300 hover:-translate-y-1 hover:border-gold/35"><div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/70 to-transparent" /><div className="flex items-center gap-4"><div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl border border-gold/20 bg-black/70"><TeamLogo src={team.logoUrl} name={team.teamName} size={72} /></div><div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-[.2em] text-gold">Community achievement record</p><h2 className="mt-1 truncate font-rajdhani text-2xl font-black uppercase text-white group-hover:text-gold">{team.teamName}</h2></div></div><div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4"><Stat label="Champions" value={team.championships} /><Stat label="Runner-Up" value={team.runnerUp} /><Stat label="3rd Place" value={team.secondRunnerUp} /><Stat label="Top 5" value={team.top5Finishes ?? 0} /></div>{team.description && <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-400">{team.description}</p>}</article>)}
      </div>}
    </section>
  </main>;
}
function Stat({ label, value }: { label: string; value: number }) { return <div className="rounded-xl border border-white/10 bg-black/35 p-3 text-center"><p className="font-rajdhani text-2xl font-black text-white">{value}</p><p className="mt-1 text-[8px] font-black uppercase tracking-[.14em] text-slate-500">{label}</p></div>; }
