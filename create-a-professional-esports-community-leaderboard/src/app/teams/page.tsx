import Link from "next/link";
import { Header } from "@/components/Header";
import { TeamLogo } from "@/components/TeamLogo";
import { getPublicRegisteredTeams } from "@/lib/public-sheet";
import { slugify } from "@/lib/rankings";
import type { RawTeam } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CommunityTeamsPage() {
  let teams: RawTeam[] = [];
  let loadError = "";
  try { teams = await getPublicRegisteredTeams(); } catch (error) { loadError = error instanceof Error ? error.message : "Unable to load registered teams from Google Sheets."; }

  return (
    <main className="tnffm-public-page min-h-screen bg-[#050507] text-white">
      <Header />
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="relative overflow-hidden rounded-[2rem] border border-gold/20 bg-[#0a0a0c] p-6 shadow-[0_30px_90px_rgba(0,0,0,.35)] sm:p-10">
          <div className="pointer-events-none absolute inset-0 bg-[url('/brand/tnffm-banner.jpg')] bg-cover bg-center opacity-20" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#09090b] via-[#09090b]/90 to-transparent" />
          <div className="relative"><span className="rounded-full border border-gold/25 bg-gold/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.2em] text-gold">TNFFM Community</span><h1 className="mt-4 max-w-5xl font-rajdhani text-4xl font-black uppercase leading-[.9] sm:text-6xl lg:text-7xl">Registered <span className="gold-text">Teams</span></h1><p className="mt-5 max-w-3xl text-sm leading-6 text-slate-400 sm:text-base">Discover the teams registered with the TNFFM community and open a profile to view their latest available details.</p><div className="mt-7 inline-flex items-center gap-3 rounded-xl border border-white/10 bg-black/35 px-4 py-3"><span className="font-rajdhani text-xl font-bold text-white">{teams.length}</span><span className="text-[9px] font-bold uppercase tracking-[.18em] text-slate-500">Registered teams</span></div></div>
        </div>

        {loadError ? <div className="mt-8 rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-sm text-red-200"><p className="font-bold">Unable to load live Google Sheet data.</p><p className="mt-2 text-red-200/70">{loadError}</p></div> : teams.length === 0 ? <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.025] p-10 text-center text-slate-500">No registered teams found in Google Sheets.</div> : <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{teams.map((team) => { const slug = String((team as any).slug || slugify(team.teamName)); return <Link key={String((team as any).teamId || team.teamName) + slug} href={`/teams/${encodeURIComponent(slug)}`} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] p-5 transition duration-300 hover:-translate-y-1 hover:border-gold/35 hover:bg-gold/[0.035] hover:shadow-[0_20px_50px_rgba(0,0,0,.3)]"><div className="flex items-center gap-4"><span className="shrink-0 rounded-2xl border border-white/10 bg-black/50 p-1"><TeamLogo src={team.logoUrl} name={team.teamName} size={64} /></span><div className="min-w-0"><h2 className="truncate font-rajdhani text-2xl font-bold uppercase text-white transition group-hover:text-gold">{team.teamName}</h2><p className="mt-1 text-[9px] font-black uppercase tracking-[.16em] text-slate-600">{team.status || "Active"} • Registered Team</p></div></div>{team.bannerUrl ? <div className="mt-4 overflow-hidden rounded-xl border border-white/10"><img src={team.bannerUrl} alt={`${team.teamName} banner`} className="h-24 w-full object-cover transition duration-500 group-hover:scale-[1.025]" loading="lazy" /></div> : null}<div className="mt-5 border-t border-white/10 pt-4"><div className="flex items-center justify-between text-xs"><span className="font-bold uppercase tracking-wider text-slate-500">Players</span><span className="font-bold text-slate-300">{Number(team.players || 0)}</span></div>{team.description ? <p className="mt-3 line-clamp-2 text-sm leading-5 text-slate-400">{team.description}</p> : null}</div></Link>; })}</div>}
      </section>
    </main>
  );
}
