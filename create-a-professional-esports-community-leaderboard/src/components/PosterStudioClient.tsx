"use client";

import { useMemo, useState } from "react";
import { Download, Palette, Search, Trophy } from "lucide-react";
import type { RankedTeam } from "@/lib/types";
import { TeamPosterStudio } from "@/components/TeamPosterStudio";
import { TeamLogo } from "@/components/TeamLogo";

export function PosterStudioClient({ teams }: { teams: RankedTeam[] }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<RankedTeam | null>(null);
  const results = useMemo(() => { const q = query.trim().toLowerCase(); return teams.filter(t => !q || t.teamName.toLowerCase().includes(q)).slice(0, 12); }, [teams, query]);
  return <div className="mt-7 grid gap-6 lg:grid-cols-[360px_1fr]">
    <section className="rounded-3xl border border-white/10 bg-black/25 p-4">
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3"><Search className="h-4 w-4 text-slate-500" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search your team" className="min-h-12 w-full bg-transparent text-white outline-none" aria-label="Search team" /></div>
      <div className="mt-4 space-y-2">{results.map(team => <button key={team.teamName} type="button" onClick={() => setSelected(team)} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${selected?.teamName === team.teamName ? "border-gold/40 bg-gold/10" : "border-transparent hover:border-white/10 hover:bg-white/[0.04]"}`}><TeamLogo src={team.logoUrl} name={team.teamName} size={44} champion={Number(team.rank) === 1} /><span className="min-w-0 flex-1"><span className="block truncate font-bold text-white">{team.teamName}</span><span className="text-xs text-slate-500">{Number(team.rank) > 0 ? `Rank #${team.rank}` : "Community Team"}</span></span></button>)}{results.length === 0 && <p className="p-6 text-center text-sm text-slate-500">No team found.</p>}</div>
    </section>
    <section className="rounded-3xl border border-white/10 bg-black/25 p-5 sm:p-7">{selected ? <><div className="flex items-center gap-4"><TeamLogo src={selected.logoUrl} name={selected.teamName} size={76} champion={Number(selected.rank) === 1} /><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Selected Team</p><h2 className="font-rajdhani text-3xl font-black uppercase text-white">{selected.teamName}</h2><p className="text-sm text-slate-400">Rank #{selected.rank || "—"} • Score {Number(selected.communityPoints || 0).toLocaleString("en-IN")}</p></div></div><TeamPosterStudio team={selected} /></> : <div className="flex min-h-[360px] flex-col items-center justify-center text-center"><Palette className="h-12 w-12 text-gold/70" /><h2 className="mt-4 font-rajdhani text-3xl font-bold uppercase text-white">Choose your team</h2><p className="mt-2 max-w-md text-sm leading-6 text-slate-500">Search and select your registered team to unlock team poster creation and official ranking poster download.</p></div>}</section>
  </div>;
}
