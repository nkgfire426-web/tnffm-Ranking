"use client";

import React, { useMemo, useState } from "react";
import { TeamLogo } from "./TeamLogo";
import type { RankedTeam } from "@/lib/types";

type Player = { name: string; uid: string };

function normalizeRoster(value: unknown): Player[] {
  if (Array.isArray(value)) return value.map((player: any) => ({ name: String(player?.name ?? player?.Name ?? "").trim(), uid: String(player?.uid ?? player?.UID ?? player?.Uid ?? "").trim() })).filter((player) => player.name || player.uid);
  const raw = String(value ?? "").trim();
  if (!raw) return [];
  try { return normalizeRoster(JSON.parse(raw)); } catch { return []; }
}

function mergeTeam(base: RankedTeam, fresh: any): RankedTeam {
  const source = fresh?.team || fresh;
  if (!source || typeof source !== "object") return { ...base, roster: normalizeRoster(base.roster) };
  const roster = normalizeRoster(source.roster ?? base.roster);
  return { ...base, ...source, roster, players: roster.length || Number(source.players ?? base.players ?? 0) } as RankedTeam;
}

export function TeamDetailsClient({ teams }: { teams: RankedTeam[] }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<RankedTeam | null>(null);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [rosterError, setRosterError] = useState("");
  const list = useMemo(() => { const q = query.trim().toLowerCase(); return teams.filter((team) => !q || team.teamName.toLowerCase().includes(q) || String(team.description || "").toLowerCase().includes(q)); }, [teams, query]);

  async function selectTeam(team: RankedTeam) {
    setSelected({ ...team, roster: normalizeRoster(team.roster) }); setRosterError(""); setLoadingRoster(true);
    try {
      const slug = encodeURIComponent(String((team as any).slug || team.teamName).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""));
      const response = await fetch(`/api/team/public?slug=${slug}`, { cache: "no-store", headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("Unable to load the latest player details.");
      const payload = await response.json();
      if (payload?.ok && payload?.team) setSelected((current) => current ? mergeTeam(current, payload.team) : mergeTeam(team, payload.team));
    } catch (error) { setRosterError(error instanceof Error ? error.message : "Unable to load the latest player details."); }
    finally { setLoadingRoster(false); }
  }

  return <div className="mt-6 grid gap-6 lg:grid-cols-3">
    <div className="lg:col-span-1"><div className="rounded-2xl border border-white/10 bg-black/20 p-4"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search registered teams" className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-white outline-none focus:border-gold/50" /><div className="mt-4 max-h-[60vh] overflow-auto">{list.map((team) => <button key={team.teamName} onClick={() => void selectTeam(team)} className={`group mb-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${selected?.teamName === team.teamName ? "bg-gold/10 ring-1 ring-gold/30" : "hover:bg-white/5"}`}><TeamLogo src={team.logoUrl} name={team.teamName} size={48} champion={Number(team.rank) === 1} /><div className="min-w-0"><div className="truncate font-semibold text-white">{team.teamName}</div><div className="text-xs text-slate-400">{team.rank > 0 ? `TNFFM Rank #${team.rank}` : "Registered Tamil Community Team"}</div></div></button>)}{list.length === 0 && <p className="p-4 text-center text-sm text-slate-500">No registered team found.</p>}</div></div></div>
    <div className="lg:col-span-2"><div className="rounded-2xl border border-white/10 bg-black/20 p-6">{selected ? <article><div className="flex flex-col gap-5 sm:flex-row sm:items-center"><TeamLogo src={selected.logoUrl} name={selected.teamName} size={96} champion={Number(selected.rank) === 1} /><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.25em] text-gold">Tamil Community Team</p><h2 className="mt-1 font-rajdhani text-4xl font-bold uppercase text-white">{selected.teamName}</h2><p className="mt-1 text-sm text-slate-400">Registered team profile{selected.rank > 0 ? ` • TNFFM Community Rank #${selected.rank}` : ""}</p></div></div>{selected.description ? <p className="mt-6 text-sm leading-7 text-slate-300">{selected.description}</p> : null}<div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-xl border border-gold/20 bg-gold/5 p-4"><p className="text-xs uppercase tracking-wider text-slate-500">Rank</p><p className="mt-1 font-rajdhani text-2xl font-bold text-gold">{selected.rank > 0 ? `#${selected.rank}` : "—"}</p></div><div className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><p className="text-xs uppercase tracking-wider text-slate-500">Community Score</p><p className="mt-1 font-rajdhani text-2xl font-bold text-white">{Number(selected.communityPoints || 0).toLocaleString("en-IN")}</p></div><div className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><p className="text-xs uppercase tracking-wider text-slate-500">Events</p><p className="mt-1 font-rajdhani text-2xl font-bold text-white">{Number(selected.eventsPlayed || 0)}</p></div><div className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><p className="text-xs uppercase tracking-wider text-slate-500">Players</p><p className="mt-1 font-rajdhani text-2xl font-bold text-white">{normalizeRoster(selected.roster).length || Number(selected.players || 0)}</p></div></div><div className="mt-6 rounded-2xl border border-gold/15 bg-gold/5 p-4"><p className="text-sm font-bold text-white">Create your team poster</p><p className="mt-1 text-xs leading-5 text-slate-500">Team poster creation is now available as a separate tool in the 3-dot menu. Use Team Poster Studio to enter your own team information and create a custom poster.</p></div><div className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><p className="text-xs uppercase tracking-wider text-slate-500">Championships</p><p className="mt-1 font-rajdhani text-2xl font-bold text-white">{Number(selected.championships || 0)}</p></div><div className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><p className="text-xs uppercase tracking-wider text-slate-500">Runner-Up</p><p className="mt-1 font-rajdhani text-2xl font-bold text-white">{Number(selected.runnerUp || 0)}</p></div><div className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><p className="text-xs uppercase tracking-wider text-slate-500">Top 5 Finishes</p><p className="mt-1 font-rajdhani text-2xl font-bold text-white">{Number(selected.top5Finishes || 0)}</p></div></div><div className="mt-8"><div className="flex items-center justify-between gap-3"><h3 className="font-rajdhani text-2xl font-bold uppercase text-white">Team Roster</h3>{loadingRoster && <span className="text-xs text-slate-400">Loading latest players…</span>}</div>{rosterError && <p className="mt-2 text-sm text-amber-300">{rosterError}</p>}{normalizeRoster(selected.roster).length > 0 ? <div className="mt-3 grid gap-2 sm:grid-cols-2">{normalizeRoster(selected.roster).map((player, index) => <div key={`${player.uid || "player"}-${index}`} className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3"><p className="font-semibold text-white">{player.name || "Player"}</p>{player.uid ? <p className="mt-1 text-xs text-slate-500">UID: {player.uid}</p> : <p className="mt-1 text-xs text-slate-600">UID not provided</p>}</div>)}</div> : <div className="mt-3 rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-4 py-5 text-sm text-slate-500">No player details have been registered for this team yet.</div>}</div></article> : <div className="p-8 text-center text-slate-400">Select a registered team to view its community profile and ranking data.</div>}</div></div>
  </div>;
}
