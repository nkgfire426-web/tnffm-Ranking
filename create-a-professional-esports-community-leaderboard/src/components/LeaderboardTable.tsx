"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import Link from "next/link";
import { toPng } from "html-to-image";
import { ArrowDown, ArrowUp, Download, Search, Share2 } from "lucide-react";
import { RankedTeam, SortKey } from "@/lib/types";
import { formatDateISO } from "@/lib/format-date";
import { rankMovement } from "@/lib/rankings";
import { TeamLogo } from "./TeamLogo";

const columns: { key: SortKey; label: string }[] = [
  { key: "rank", label: "Rank" },
  { key: "teamName", label: "Team Name" },
  { key: "communityPoints", label: "Community Points" },
  { key: "championships", label: "Championships" },
  { key: "runnerUp", label: "Runner-Up" },
  { key: "secondRunnerUp", label: "2nd Runner-Up" },
  { key: "top5Finishes", label: "Top 5" },
  { key: "finalistFinishes", label: "Finalist" },
  { key: "eventsPlayed", label: "Events" },
  { key: "kills", label: "Kills" },
  { key: "killRatio", label: "Kill Ratio" },
  { key: "booyahs", label: "Booyah" },
  { key: "booyahRatio", label: "Booyah Ratio" },
  { key: "lastUpdated", label: "Last Updated" }
];

export function LeaderboardTable({ teams }: { teams: RankedTeam[] }) {
  const [liveTeams, setLiveTeams] = useState<RankedTeam[]>(teams);
  const [query, setQuery] = useState("");
  const [rankFilter, setRankFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const tableRef = useRef<HTMLDivElement>(null);
  const pageSize = 10;

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setInterval> | null = null;
    const loadLatest = async () => {
      try {
        const response = await fetch("/api/teams", { cache: "no-store", headers: { Accept: "application/json" } });
        if (!response.ok) return;
        const payload = await response.json() as { teams?: RankedTeam[] };
        if (active && Array.isArray(payload.teams)) setLiveTeams(payload.teams);
      } catch {
        // Keep the last known leaderboard visible if the live refresh fails.
      }
    };
    void loadLatest();
    timer = setInterval(loadLatest, 15000);
    return () => { active = false; if (timer) clearInterval(timer); };
  }, []);

  const filtered = useMemo(() => liveTeams.filter((team) => {
    if (rankFilter === "top10") return team.rank <= 10;
    if (rankFilter === "top5") return team.rank <= 5;
    if (rankFilter === "champions") return team.championships > 0;
    return true;
  }).filter((team) => team.teamName.toLowerCase().includes(query.toLowerCase())).filter((team) => team.status !== "Banned").filter((team) => statusFilter === "all" || String(team.status || "Active").toLowerCase() === statusFilter).sort((a, b) => {
    const aValue = a[sortKey];
    const bValue = b[sortKey];
    const modifier = sortDirection === "asc" ? 1 : -1;
    if (typeof aValue === "number" && typeof bValue === "number") return (aValue - bValue) * modifier;
    return String(aValue).localeCompare(String(bValue)) * modifier;
  }), [query, rankFilter, statusFilter, sortDirection, sortKey, liveTeams]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageTeams = filtered.slice((page - 1) * pageSize, page * pageSize);

  function sortBy(key: SortKey) {
    setPage(1);
    if (sortKey === key) setSortDirection((current) => current === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDirection(key === "rank" ? "asc" : "desc"); }
  }

  async function exportPng() {
    if (!tableRef.current) return;
    const dataUrl = await toPng(tableRef.current, { backgroundColor: "#050507", pixelRatio: 2 });
    const link = document.createElement("a"); link.download = "tnffm-community-rankings.png"; link.href = dataUrl; link.click();
  }

  return <section id="leaderboard" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="font-rajdhani text-sm font-bold uppercase tracking-[0.25em] text-gold">Live Leaderboard</p><h2 className="font-rajdhani text-4xl font-bold uppercase text-white">Community Rankings</h2><p className="mt-1 text-xs text-slate-500">Updates automatically from published official event results.</p></div><div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap"><label className="relative min-w-64"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input value={query} onChange={(event) => { setPage(1); setQuery(event.target.value); }} placeholder="Search team" className="w-full rounded-lg border border-white/10 bg-black/45 py-3 pl-10 pr-4 text-sm text-white outline-none transition focus:border-gold/60" /></label><select value={rankFilter} onChange={(event) => { setPage(1); setRankFilter(event.target.value); }} className="rounded-lg border border-white/10 bg-black/45 px-4 py-3 text-sm text-white outline-none transition focus:border-gold/60"><option value="all">All ranks</option><option value="top5">Top 5</option><option value="top10">Top 10</option><option value="champions">Champions only</option></select><select value={statusFilter} onChange={(event) => { setPage(1); setStatusFilter(event.target.value); }} className="rounded-lg border border-white/10 bg-black/45 px-4 py-3 text-sm text-white outline-none transition focus:border-gold/60"><option value="all">All status</option><option value="active">Active</option><option value="inactive">Inactive</option></select><button onClick={exportPng} className="inline-flex items-center justify-center gap-2 rounded-lg bg-gold px-4 py-3 text-sm font-bold text-black transition hover:bg-yellow-300"><Download className="h-4 w-4" />Export PNG</button></div></div>
    <div ref={tableRef} className="glass overflow-hidden rounded-lg"><div className="table-scrollbar overflow-x-auto"><table className="min-w-[1900px] w-full border-collapse text-left text-sm"><thead className="sticky top-0 z-10 bg-[#111118] text-xs uppercase tracking-[0.14em] text-slate-400"><tr>{columns.slice(0, 1).map((column) => <th key={column.key} className="border-b border-white/10 px-4 py-4"><button onClick={() => sortBy(column.key)} className="inline-flex items-center gap-1 text-left transition hover:text-gold">{column.label}{sortKey === column.key && (sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}</button></th>)}<th className="border-b border-white/10 px-4 py-4">Team Logo</th>{columns.slice(1).map((column) => <th key={column.key} className="border-b border-white/10 px-4 py-4"><button onClick={() => sortBy(column.key)} className="inline-flex items-center gap-1 text-left transition hover:text-gold">{column.label}{sortKey === column.key && (sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}</button></th>)}<th className="border-b border-white/10 px-4 py-4">Status</th><th className="border-b border-white/10 px-4 py-4">Share</th></tr></thead><tbody>{pageTeams.map((team) => { const movement = rankMovement(team); const isActive = String(team.status || "Active").toLowerCase() === "active"; return <tr key={team.slug} className="border-b border-white/5 transition hover:bg-white/[0.04]"><td className="px-4 py-4"><div className="flex items-center gap-2"><span className="font-rajdhani text-2xl font-bold text-white">#{team.rank}</span>{movement !== 0 && <span className={movement > 0 ? "text-emerald-400" : "text-red-400"}>{movement > 0 ? "+" : "-"}{Math.abs(movement)}</span>}</div></td><td className="px-4 py-4"><TeamLogo src={team.logoUrl} name={team.teamName} size={44} champion={team.rank === 1} /></td><td className="px-4 py-4"><Link href={`/teams/${team.slug}`} className="block"><div className="font-semibold text-white">{team.teamName}</div><div className="text-xs text-gold">{team.badge}</div></Link></td><Cell strong>{team.communityPoints.toLocaleString()}</Cell><Cell>{team.championships}</Cell><Cell>{team.runnerUp}</Cell><Cell>{team.secondRunnerUp}</Cell><Cell>{team.top5Finishes || 0}</Cell><Cell>{team.finalistFinishes || team.grandFinals || 0}</Cell><Cell>{team.eventsPlayed || 0}</Cell><Cell>{team.kills || 0}</Cell><Cell>{Number(team.killRatio || 0).toFixed(2)}</Cell><Cell>{team.booyahs || 0}</Cell><Cell>{Number(team.booyahRatio || 0).toFixed(2)}%</Cell><Cell>{formatDateISO(team.lastUpdated)}</Cell><td className="px-4 py-4"><span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${isActive ? "border-emerald-400/30 text-emerald-400" : "border-red-400/30 text-red-400"}`}>{isActive ? "Active" : "Inactive"}</span></td><td className="px-4 py-4"><button onClick={() => navigator.share?.({ title: team.teamName, url: `${location.origin}/teams/${team.slug}` })} className="rounded-lg border border-white/10 p-2 text-slate-300 transition hover:border-gold/50 hover:text-gold" aria-label={`Share ${team.teamName}`}><Share2 className="h-4 w-4" /></button></td></tr>; })}</tbody></table></div></div>
    <div className="mt-5 flex items-center justify-between text-sm text-slate-400"><span>Showing {filtered.length ? (page - 1) * pageSize + 1 : 0}-{Math.min(page * pageSize, filtered.length)} of {filtered.length}</span><div className="flex gap-2"><button disabled={page === 1} onClick={() => setPage((current) => current - 1)} className="rounded-lg border border-white/10 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-40">Previous</button><button disabled={page === totalPages} onClick={() => setPage((current) => current + 1)} className="rounded-lg border border-white/10 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-40">Next</button></div></div>
  </section>;
}

function Cell({ children, strong = false }: { children: React.ReactNode; strong?: boolean }) { return <td className={`px-4 py-4 ${strong ? "font-rajdhani text-xl font-bold text-gold" : "text-slate-300"}`}>{children}</td>; }
