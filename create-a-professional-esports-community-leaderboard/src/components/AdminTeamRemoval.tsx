"use client";

import { useMemo, useState } from "react";
import { Search, Trash2 } from "lucide-react";
import type { RawTeam } from "@/lib/types";
import { TeamLogo } from "./TeamLogo";

export function AdminTeamRemoval({ initialTeams }: { initialTeams: RawTeam[] }) {
  const [teams, setTeams] = useState(initialTeams);
  const [password, setPassword] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return teams.filter((team) => !q || String(team.teamName || "").toLowerCase().includes(q) || String((team as any).slug || "").toLowerCase().includes(q));
  }, [teams, query]);

  async function removeTeam(team: RawTeam) {
    const slug = String((team as any).slug || "").trim();
    if (!slug) return setStatus("This team has no registered slug and cannot be removed safely.");
    if (!password) return setStatus("Enter the admin password before removing a team.");
    if (!window.confirm(`Permanently remove ${team.teamName}? This removes it from the registered Teams list.`)) return;
    setBusy(slug); setStatus(`Removing ${team.teamName}...`);
    try {
      const response = await fetch("/api/admin/delete-team", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, teamSlug: slug }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok === false) throw new Error(result.message || "Team removal failed.");
      setTeams((current) => current.filter((item) => String((item as any).slug || "") !== slug));
      setStatus(`✓ ${team.teamName} removed from the registered Teams list.`);
    } catch (error) { setStatus(error instanceof Error ? error.message : "Team removal failed."); }
    finally { setBusy(null); }
  }

  return <section className="mb-6 rounded-xl border border-red-500/20 bg-red-500/5 p-3 sm:p-4">
    <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-300">Registered Team Management</p><h2 className="font-rajdhani text-xl font-bold uppercase text-white">Remove Teams</h2><p className="mt-1 text-xs text-slate-400">Remove a registered team from the live Teams sheet without touching event history.</p></div>
      <div className="grid w-full gap-2 sm:max-w-md sm:grid-cols-2"><input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Admin password" className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-red-400/60" /><label className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search team" className="w-full rounded-lg border border-white/10 bg-black/40 py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-gold/60" /></label></div>
    </div>
    {status && <p className="mb-3 rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs text-slate-300">{status}</p>}
    <div className="max-h-64 space-y-2 overflow-y-auto pr-1">{filtered.length === 0 ? <p className="py-4 text-center text-xs text-slate-500">No registered teams match your search.</p> : filtered.map((team) => { const slug = String((team as any).slug || ""); return <div key={slug || team.teamName} className="flex items-center gap-3 rounded-lg border border-white/5 bg-black/25 p-2"><TeamLogo src={team.logoUrl} name={team.teamName} size={38} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-white">{team.teamName}</p><p className="truncate text-[10px] text-slate-500">{slug || "No slug"}</p></div><button disabled={busy === slug} onClick={() => void removeTeam(team)} className="inline-flex shrink-0 items-center gap-1 rounded-md border border-red-500/30 px-2.5 py-2 text-xs font-bold text-red-300 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" />{busy === slug ? "Removing" : "Remove"}</button></div>; })}</div>
  </section>;
}
