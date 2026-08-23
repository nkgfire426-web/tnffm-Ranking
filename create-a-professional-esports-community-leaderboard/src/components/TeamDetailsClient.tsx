"use client";

import React, { useMemo, useState } from "react";
import { TeamLogo } from "./TeamLogo";
import type { RawTeam } from "@/lib/types";

export function TeamDetailsClient({ teams }: { teams: RawTeam[] }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<RawTeam | null>(null);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return teams.filter((team) => {
      const name = team.teamName.toLowerCase();
      const description = String(team.description || "").toLowerCase();
      return !q || name.includes(q) || description.includes(q);
    });
  }, [teams, query]);

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-1">
        <div className="rounded-lg border border-white/8 p-4">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search registered teams" className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white outline-none focus:border-gold/50" />
          <div className="mt-4 max-h-[60vh] overflow-auto">
            {list.map((team) => (
              <button key={team.teamName} onClick={() => setSelected(team)} className="group mb-2 flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-white/5">
                <TeamLogo src={team.logoUrl} name={team.teamName} size={48} />
                <div className="min-w-0"><div className="truncate font-semibold text-white">{team.teamName}</div><div className="text-xs text-slate-400">Registered Tamil Community Team</div></div>
              </button>
            ))}
            {list.length === 0 && <p className="p-4 text-center text-sm text-slate-500">No registered team found.</p>}
          </div>
        </div>
      </div>

      <div className="lg:col-span-2">
        <div className="rounded-lg border border-white/8 bg-black/20 p-6">
          {selected ? (
            <article>
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <TeamLogo src={selected.logoUrl} name={selected.teamName} size={96} />
                <div><p className="text-xs font-bold uppercase tracking-[0.25em] text-gold">Tamil Community Team</p><h2 className="mt-1 font-rajdhani text-4xl font-bold uppercase text-white">{selected.teamName}</h2><p className="mt-1 text-sm text-slate-400">Registered team profile</p></div>
              </div>
              {selected.description ? <p className="mt-6 text-sm leading-7 text-slate-300">{selected.description}</p> : null}
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><p className="text-xs uppercase tracking-wider text-slate-500">Players</p><p className="mt-1 font-rajdhani text-2xl font-bold text-white">{Number(selected.players || selected.roster?.length || 0)}</p></div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><p className="text-xs uppercase tracking-wider text-slate-500">Community</p><p className="mt-1 font-semibold text-white">Tamil Nadu</p></div>
              </div>
              {selected.roster && selected.roster.length > 0 ? <div className="mt-6"><h3 className="font-rajdhani text-2xl font-bold uppercase text-white">Team Roster</h3><div className="mt-3 space-y-2">{selected.roster.map((player, index) => <div key={`${player.uid}-${index}`} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3"><span className="font-semibold text-white">{player.name || "Player"}</span><span className="text-xs text-slate-500">{player.uid || ""}</span></div>)}</div></div> : null}
            </article>
          ) : (
            <div className="p-8 text-center text-slate-400">Select a registered team to view its community profile.</div>
          )}
        </div>
      </div>
    </div>
  );
}
