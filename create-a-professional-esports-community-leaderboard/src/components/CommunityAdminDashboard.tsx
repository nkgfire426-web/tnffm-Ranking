"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Lock, Plus, Save, Trash2, Upload, X } from "lucide-react";
import type { EventResult, TrackedEvent } from "@/lib/events";
import type { RawTeam } from "@/lib/types";
import { TeamLogo } from "./TeamLogo";

type Collaborator = { name: string; role: string; logoUrl: string; url: string };
type TeamForm = RawTeam & { badge?: string };
type SheetPayload = { ok?: boolean; message?: string; teams?: RawTeam[]; events?: TrackedEvent[]; collaborators?: Collaborator[] };

const emptyResult = (rank: number): EventResult => ({ teamName: "", rank, positionPoints: 0, kills: 0, booyahs: 0, killRatio: 0, booyahRatio: 0, total: 0 });

function blankTeam(): TeamForm {
  return { teamName: "New Team", logoUrl: "", bannerUrl: "", description: "", mobileNumber: "", players: 0, roster: [], status: "Active", registrationStatus: "Registered", rankingEligible: false, kills: 0, booyahs: 0, championships: 0, runnerUp: 0, secondRunnerUp: 0, grandFinals: 0, winRate: 0, killRatio: 0, booyahRatio: 0 };
}

function normalizeResult(result: EventResult, matches: number): EventResult {
  const kills = Math.max(0, Number(result.kills) || 0);
  const booyahs = Math.max(0, Number(result.booyahs) || 0);
  const positionPoints = Math.max(0, Number(result.positionPoints) || 0);
  return { ...result, rank: Math.max(1, Number(result.rank) || 1), kills, booyahs, positionPoints, killRatio: matches > 0 ? kills / matches : 0, booyahRatio: matches > 0 ? (booyahs / matches) * 100 : 0, total: positionPoints + kills };
}

export function CommunityAdminDashboard({ initialTeams, initialEvents, initialCollaborators }: { initialTeams: RawTeam[]; initialEvents: TrackedEvent[]; initialCollaborators?: Collaborator[] }) {
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<"teams" | "ranking" | "events" | "collaborators">("teams");
  const [teams, setTeams] = useState<TeamForm[]>(initialTeams.map((team) => ({ ...blankTeam(), ...team })));
  const [events, setEvents] = useState<TrackedEvent[]>(initialEvents);
  const [collaborators, setCollaborators] = useState<Collaborator[]>(initialCollaborators || []);
  const [rosterIndex, setRosterIndex] = useState<number | null>(null);
  const [rankingEventIndex, setRankingEventIndex] = useState<number | null>(initialEvents.length ? 0 : null);

  const selectedEvent = rankingEventIndex === null ? null : events[rankingEventIndex] || null;
  const teamOptions = useMemo(() => teams.filter((team) => team.status !== "Banned").sort((a, b) => a.teamName.localeCompare(b.teamName)), [teams]);

  async function refresh(show = true) {
    if (!password || refreshing) return;
    setRefreshing(true);
    if (show) setStatus("Reading latest Google Sheets data...");
    try {
      const response = await fetch("/api/admin/sheet", { cache: "no-store", headers: { "x-admin-password": password, Accept: "application/json" } });
      const result = (await response.json().catch(() => ({}))) as SheetPayload;
      if (!response.ok || result.ok === false) throw new Error(result.message || "Google Sheets refresh failed.");
      if (Array.isArray(result.teams)) setTeams(result.teams.map((team) => ({ ...blankTeam(), ...team })));
      if (Array.isArray(result.events)) {
        setEvents(result.events);
        setRankingEventIndex((current) => current !== null && current < result.events!.length ? current : result.events!.length ? 0 : null);
      }
      if (Array.isArray(result.collaborators)) setCollaborators(result.collaborators);
      if (show) setStatus(`Google Sheets synced — ${result.teams?.length || 0} teams, ${result.events?.length || 0} events.`);
    } catch (error) { setStatus(error instanceof Error ? error.message : "Google Sheets refresh failed."); }
    finally { setRefreshing(false); }
  }

  useEffect(() => { if (unlocked) void refresh(false); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [unlocked]);

  async function login() {
    try {
      const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      if (!response.ok) throw new Error("Invalid admin password.");
      setUnlocked(true); setLoginError(""); setStatus("Admin unlocked. Loading Google Sheets...");
    } catch (error) { setLoginError(error instanceof Error ? error.message : "Login failed."); }
  }

  function updateTeam(index: number, key: keyof TeamForm, value: string) {
    setTeams((current) => current.map((team, i) => i === index ? { ...team, [key]: key === "players" ? Math.max(0, Number(value) || 0) : value } : team));
  }
  function updateEvent(index: number, key: keyof TrackedEvent, value: string | boolean | number) {
    setEvents((current) => current.map((event, i) => i === index ? { ...event, [key]: key === "teams" || key === "matchesPlayed" ? Math.max(0, Number(value) || 0) : value } : event));
  }
  function updateResult(eventIndex: number, resultIndex: number, key: keyof EventResult, value: string) {
    setEvents((current) => current.map((event, ei) => {
      if (ei !== eventIndex) return event;
      const matches = Math.max(0, Number(event.matchesPlayed) || 0);
      const results = [...(event.results || [])];
      const currentResult = results[resultIndex] || emptyResult(resultIndex + 1);
      const numeric = key === "rank" || key === "positionPoints" || key === "kills" || key === "booyahs" ? Math.max(0, Number(value) || 0) : value;
      results[resultIndex] = normalizeResult({ ...currentResult, [key]: numeric }, matches);
      return { ...event, results };
    }));
  }
  function addResult(eventIndex: number) { setEvents((current) => current.map((event, i) => i === eventIndex ? { ...event, results: [...(event.results || []), emptyResult((event.results || []).length + 1)] } : event)); }
  function add18Results(eventIndex: number) { setEvents((current) => current.map((event, i) => { if (i !== eventIndex) return event; const currentResults = [...(event.results || [])]; for (let rank = currentResults.length + 1; rank <= 18; rank++) currentResults.push(emptyResult(rank)); return { ...event, results: currentResults }; })); }
  function removeResult(eventIndex: number, resultIndex: number) { setEvents((current) => current.map((event, i) => i === eventIndex ? { ...event, results: (event.results || []).filter((_, ri) => ri !== resultIndex).map((result, ri) => normalizeResult({ ...result, rank: ri + 1 }, Number(event.matchesPlayed) || 0)) } : event)); }

  function addTeam() { setTeams((current) => [...current, blankTeam()]); setTab("teams"); }
  function addEvent() {
    const event: TrackedEvent = { name: "New Event", organizer: "TNFFM", teams: 0, prize: "", status: "Pending", counted: "Grand Finals", date: new Date().toISOString().slice(0, 10), notes: "", matchesPlayed: 6, published: false, results: [] };
    setEvents((current) => [...current, event]); setRankingEventIndex(events.length); setTab("ranking");
  }
  function addCollaborator() { setCollaborators((current) => [...current, { name: "New Collaborator", role: "Partner", logoUrl: "", url: "" }]); setTab("collaborators"); }
  function addPlayer(index: number) { setTeams((current) => current.map((team, i) => i === index ? { ...team, roster: [...(team.roster || []), { name: "", uid: "" }], players: (team.roster || []).length + 1 } : team)); }
  function updatePlayer(teamIndex: number, playerIndex: number, key: "name" | "uid", value: string) { setTeams((current) => current.map((team, i) => i === teamIndex ? { ...team, roster: (team.roster || []).map((player, pi) => pi === playerIndex ? { ...player, [key]: value } : player) } : team)); }
  function removePlayer(teamIndex: number, playerIndex: number) { setTeams((current) => current.map((team, i) => i === teamIndex ? { ...team, roster: (team.roster || []).filter((_, pi) => pi !== playerIndex), players: Math.max(0, (team.roster || []).length - 1) } : team)); }
  function updateCollaborator(index: number, key: keyof Collaborator, value: string) { setCollaborators((current) => current.map((item, i) => i === index ? { ...item, [key]: value } : item)); }
  function removeCollaborator(index: number) { setCollaborators((current) => current.filter((_, i) => i !== index)); }

  function validateEvents() {
    for (const event of events) {
      if (!event.results?.length || !event.published) continue;
      const matches = Number(event.matchesPlayed) || 0;
      if (matches <= 0) return `${event.name}: enter Matches Played before publishing.`;
      const prize = Number(String(event.prize).replace(/[^0-9.]/g, "")) || 0;
      if (prize <= 1000 && !String(event.prize).toLowerCase().includes("official")) return `${event.name}: prize pool must be above Rs.1000 for ranking.`;
      const names = event.results.filter((r) => r.teamName.trim()).map((r) => r.teamName.trim().toLowerCase());
      if (new Set(names).size !== names.length) return `${event.name}: the same team cannot appear twice.`;
      if (event.results.some((r) => r.rank < 1 || r.rank > 18)) return `${event.name}: rank must be between 1 and 18.`;
    }
    return "";
  }

  async function save() {
    const validationError = validateEvents();
    if (validationError) { setStatus(validationError); return; }
    setSaving(true); setStatus("Saving ranking, teams and events...");
    try {
      const cleanedEvents = events.map((event) => ({ ...event, matchesPlayed: Math.max(0, Number(event.matchesPlayed) || 0), results: (event.results || []).filter((result) => result.teamName.trim()).map((result, index) => normalizeResult({ ...result, rank: index + 1 }, Number(event.matchesPlayed) || 0)) }));
      const response = await fetch("/api/admin/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, teams, events: cleanedEvents, collaborators: collaborators.filter((item) => item.name || item.role || item.logoUrl || item.url) }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body.ok === false) throw new Error(body.message || `Save failed (${response.status}).`);
      setEvents(cleanedEvents);
      setStatus("✓ Saved. Published results are now the official live ranking source.");
      await refresh(false);
    } catch (error) { setStatus(error instanceof Error ? error.message : "Save failed."); }
    finally { setSaving(false); }
  }

  function exportData() {
    const blob = new Blob([JSON.stringify({ teams, events, collaborators }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "tnffm-community-admin.json"; link.click(); URL.revokeObjectURL(url);
  }

  if (!unlocked) return <section className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-4"><div className="glass w-full rounded-xl p-6"><Lock className="mb-4 h-8 w-8 text-gold" /><h1 className="font-rajdhani text-4xl font-bold uppercase text-white">Admin Login</h1><p className="mt-2 text-sm text-slate-400">Official TNFFM ranking control is available only to the admin.</p><input value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void login(); }} type="password" placeholder="Admin password" className="mt-6 w-full rounded-lg border border-white/10 bg-black/45 px-4 py-3 text-white outline-none focus:border-gold/60" />{loginError && <p className="mt-3 text-sm text-red-300">{loginError}</p>}<button onClick={() => void login()} className="mt-4 w-full rounded-lg bg-gold px-4 py-3 font-bold text-black">Unlock</button></div></section>;

  return <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="font-rajdhani text-sm font-bold uppercase tracking-[0.25em] text-gold">Admin</p><h1 className="font-rajdhani text-4xl font-bold uppercase text-white">Community Control Center</h1><p className="mt-2 max-w-3xl text-sm text-slate-400">You control the official ranking. Enter final rank, position points, kills and Booyah count after each event. Ratios and totals are calculated automatically.</p></div><div className="flex flex-wrap gap-3"><button onClick={addTeam} className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-3 font-bold text-black"><Plus className="h-4 w-4" />Add Team</button><button onClick={addEvent} className="inline-flex items-center gap-2 rounded-lg border border-gold/30 px-4 py-3 font-bold text-gold"><Plus className="h-4 w-4" />Add Event</button><button disabled={saving} onClick={() => void save()} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-3 font-bold text-white"><Save className="h-4 w-4" />{saving ? "Saving..." : "Save & Publish Changes"}</button><button disabled={refreshing} onClick={() => void refresh(true)} className="inline-flex items-center gap-2 rounded-lg border border-gold/30 px-4 py-3 font-bold text-gold"><Upload className="h-4 w-4" />{refreshing ? "Refreshing..." : "Refresh Sheet"}</button><button onClick={exportData} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-3 font-bold text-slate-200"><Download className="h-4 w-4" />Export</button></div></div>
    {status && <div className={`mb-5 rounded-lg border px-4 py-3 text-sm font-semibold ${status.toLowerCase().includes("error") || status.toLowerCase().includes("failed") || status.toLowerCase().includes("must") || status.toLowerCase().includes("cannot") ? "border-red-500/30 bg-red-500/10 text-red-200" : "border-gold/25 bg-gold/10 text-gold"}`}>{status}</div>}
    <div className="mb-5 flex gap-2 overflow-x-auto rounded-lg border border-white/10 bg-black/35 p-2">{(["teams", "ranking", "events", "collaborators"] as const).map((item) => <button key={item} onClick={() => setTab(item)} className={`shrink-0 rounded-md px-4 py-2 text-sm font-bold ${tab === item ? "bg-gold text-black" : "text-slate-300 hover:text-gold"}`}>{item === "teams" ? "Registered Teams" : item === "ranking" ? "Official Ranking" : item === "events" ? "Tracked Events" : "Collaborators"}</button>)}</div>

    {tab === "ranking" && <div className="space-y-5"><div className="glass rounded-xl p-4"><div className="grid grid-cols-1 gap-3 md:grid-cols-4"><Field label="Event" value={selectedEvent?.name || ""} onChange={(value) => { if (rankingEventIndex !== null) updateEvent(rankingEventIndex, "name", value); }} /><Field label="Matches Played" value={selectedEvent?.matchesPlayed || 0} onChange={(value) => { if (rankingEventIndex !== null) updateEvent(rankingEventIndex, "matchesPlayed", value); }} type="number" /><Field label="Prize Pool" value={selectedEvent?.prize || ""} onChange={(value) => { if (rankingEventIndex !== null) updateEvent(rankingEventIndex, "prize", value); }} /><div className="flex items-end"><label className="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-black/30 px-3 py-3 text-sm text-slate-200"><input type="checkbox" checked={Boolean(selectedEvent?.published)} onChange={(e) => { if (rankingEventIndex !== null) updateEvent(rankingEventIndex, "published", e.target.checked); }} className="h-4 w-4 accent-yellow-400" /><span><b>Publish official ranking</b><span className="ml-2 text-xs text-slate-500">Only published events count.</span></span></label></div></div><div className="mt-3 flex flex-wrap items-center gap-2"><select value={rankingEventIndex ?? ""} onChange={(e) => setRankingEventIndex(e.target.value === "" ? null : Number(e.target.value))} className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none"><option value="">Select event</option>{events.map((event, index) => <option key={`${event.name}-${index}`} value={index}>{event.name || `Event ${index + 1}`}</option>)}</select>{rankingEventIndex !== null && <><button onClick={() => addResult(rankingEventIndex)} className="rounded-lg border border-gold/30 px-3 py-2 text-sm font-bold text-gold"><Plus className="mr-1 inline h-4 w-4" />Add Result</button><button onClick={() => add18Results(rankingEventIndex)} className="rounded-lg border border-gold/30 px-3 py-2 text-sm font-bold text-gold">Fill 18 Positions</button></>}</div></div>{selectedEvent && rankingEventIndex !== null && <div className="glass overflow-hidden rounded-xl"><div className="overflow-x-auto"><table className="w-full min-w-[1120px] text-left text-sm"><thead className="bg-white/[0.04] text-[11px] uppercase tracking-wider text-slate-500"><tr><th className="px-3 py-3">Rank</th><th className="px-3 py-3">Team</th><th className="px-3 py-3">Position Pts</th><th className="px-3 py-3">Kills</th><th className="px-3 py-3">Kill Ratio</th><th className="px-3 py-3">Booyah</th><th className="px-3 py-3">Booyah Ratio</th><th className="px-3 py-3">Total</th><th className="px-3 py-3">Action</th></tr></thead><tbody>{(selectedEvent.results || []).map((result, index) => { const normalized = normalizeResult(result, Number(selectedEvent.matchesPlayed) || 0); return <tr key={index} className="border-t border-white/5"><td className="px-3 py-2"><input value={result.rank} onChange={(e) => updateResult(rankingEventIndex, index, "rank", e.target.value)} type="number" min={1} max={18} className="w-16 rounded-md border border-white/10 bg-black/40 px-2 py-2 text-white" /></td><td className="px-3 py-2"><select value={result.teamName} onChange={(e) => { const team = teamOptions.find((t) => t.teamName === e.target.value); updateResult(rankingEventIndex, index, "teamName", e.target.value); if (team) setEvents((current) => current.map((event, ei) => ei === rankingEventIndex ? { ...event, results: (event.results || []).map((r, ri) => ri === index ? { ...r, teamSlug: (team as any).slug } : r) } : event)); }} className="w-64 rounded-md border border-white/10 bg-black/40 px-2 py-2 text-white"><option value="">Select team</option>{teamOptions.map((team) => <option key={team.teamName} value={team.teamName}>{team.teamName}</option>)}</select></td><td className="px-3 py-2"><input value={result.positionPoints} onChange={(e) => updateResult(rankingEventIndex, index, "positionPoints", e.target.value)} type="number" min={0} className="w-24 rounded-md border border-white/10 bg-black/40 px-2 py-2 text-white" /></td><td className="px-3 py-2"><input value={result.kills} onChange={(e) => updateResult(rankingEventIndex, index, "kills", e.target.value)} type="number" min={0} className="w-20 rounded-md border border-white/10 bg-black/40 px-2 py-2 text-white" /></td><td className="px-3 py-2 font-bold text-gold">{normalized.killRatio.toFixed(2)}</td><td className="px-3 py-2"><input value={result.booyahs} onChange={(e) => updateResult(rankingEventIndex, index, "booyahs", e.target.value)} type="number" min={0} max={Number(selectedEvent.matchesPlayed) || undefined} className="w-20 rounded-md border border-white/10 bg-black/40 px-2 py-2 text-white" /></td><td className="px-3 py-2 font-bold text-gold">{normalized.booyahRatio.toFixed(2)}%</td><td className="px-3 py-2 text-lg font-bold text-white">{normalized.total}</td><td className="px-3 py-2"><button onClick={() => removeResult(rankingEventIndex, index)} className="rounded-md border border-red-500/30 p-2 text-red-300" title="Remove result"><Trash2 className="h-4 w-4" /></button></td></tr>; })}</tbody></table></div>{!(selectedEvent.results || []).length && <div className="p-8 text-center text-slate-400">Add results or use “Fill 18 Positions”. You only type Rank, Position Points, Kills and Booyah count. Ratios and Total are automatic.</div>}</div>}<div className="rounded-xl border border-gold/20 bg-gold/5 p-4 text-sm leading-6 text-slate-300"><b className="text-gold">How this works:</b> Position Points + Kills = Total. Kill Ratio = Kills ÷ Matches Played. Booyah Ratio = Booyah Count ÷ Matches Played × 100. Only an event that you mark <b>Publish official ranking</b> is used to calculate the public Community Ranking.</div></div>}

    {tab === "teams" && <div className="space-y-4">{teams.length === 0 && <div className="glass rounded-xl p-8 text-center text-slate-400">No registered teams yet.</div>}{teams.map((team, index) => <div key={`${team.teamName}-${index}`} className="glass rounded-xl p-4"><div className="flex flex-col gap-4 lg:flex-row lg:items-start"><TeamLogo src={team.logoUrl} name={team.teamName} size={72} /><div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"><Field label="Team Name" value={team.teamName} onChange={(v) => updateTeam(index, "teamName", v)} /><Field label="Logo URL" value={team.logoUrl} onChange={(v) => updateTeam(index, "logoUrl", v)} /><Field label="Banner URL" value={team.bannerUrl || ""} onChange={(v) => updateTeam(index, "bannerUrl", v)} /><Field label="Description" value={team.description || ""} onChange={(v) => updateTeam(index, "description", v)} /><Field label="Mobile Number" value={team.mobileNumber || ""} onChange={(v) => updateTeam(index, "mobileNumber", v)} /><Field label="Players" value={team.players || 0} onChange={(v) => updateTeam(index, "players", v)} type="number" /><Field label="Status" value={team.status || "Active"} onChange={(v) => updateTeam(index, "status", v)} /></div><div className="shrink-0"><button onClick={() => setRosterIndex(index)} className="rounded-lg border border-gold/30 px-3 py-2 text-sm font-bold text-gold">Roster</button></div></div></div>)}</div>}

    {tab === "events" && <div className="space-y-4">{events.map((event, index) => <div key={index} className="glass rounded-xl p-4"><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"><Field label="Event Name" value={event.name} onChange={(v) => updateEvent(index, "name", v)} /><Field label="Organizer" value={event.organizer} onChange={(v) => updateEvent(index, "organizer", v)} /><Field label="Teams" value={event.teams} onChange={(v) => updateEvent(index, "teams", v)} type="number" /><Field label="Prize" value={event.prize} onChange={(v) => updateEvent(index, "prize", v)} /><Field label="Status" value={event.status} onChange={(v) => updateEvent(index, "status", v)} /><Field label="Date" value={event.date} onChange={(v) => updateEvent(index, "date", v)} /><Field label="Notes" value={event.notes || ""} onChange={(v) => updateEvent(index, "notes", v)} /><Field label="Matches Played" value={event.matchesPlayed || 0} onChange={(v) => updateEvent(index, "matchesPlayed", v)} type="number" /></div><button onClick={() => { setRankingEventIndex(index); setTab("ranking"); }} className="mt-3 rounded-lg bg-gold px-4 py-2 text-sm font-bold text-black">Enter Final Ranking</button></div>)}</div>}

    {tab === "collaborators" && <div className="space-y-4"><button onClick={addCollaborator} className="rounded-lg border border-gold/30 px-4 py-2 font-bold text-gold"><Plus className="mr-1 inline h-4 w-4" />Add Collaborator</button>{collaborators.length === 0 && <div className="glass rounded-xl p-8 text-center text-slate-400">No collaborators yet.</div>}{collaborators.map((item, index) => <div key={index} className="glass rounded-xl p-4"><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"><Field label="Name" value={item.name} onChange={(v) => updateCollaborator(index, "name", v)} /><Field label="Role" value={item.role} onChange={(v) => updateCollaborator(index, "role", v)} /><Field label="Logo URL" value={item.logoUrl} onChange={(v) => updateCollaborator(index, "logoUrl", v)} /><Field label="URL" value={item.url} onChange={(v) => updateCollaborator(index, "url", v)} /></div><button onClick={() => removeCollaborator(index)} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-500/30 px-3 py-2 text-sm font-bold text-red-300"><Trash2 className="h-4 w-4" />Remove</button></div>)}</div>}

    {rosterIndex !== null && teams[rosterIndex] && <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4"><div className="glass max-h-[85vh] w-full max-w-2xl overflow-auto rounded-xl p-5"><div className="mb-4 flex items-center justify-between"><h2 className="font-rajdhani text-2xl font-bold uppercase text-white">{teams[rosterIndex].teamName} Roster</h2><button onClick={() => setRosterIndex(null)} className="rounded-md p-2 text-slate-300"><X className="h-5 w-5" /></button></div>{(teams[rosterIndex].roster || []).map((player, playerIndex) => <div key={playerIndex} className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]"><Field label={`Player ${playerIndex + 1}`} value={player.name} onChange={(v) => updatePlayer(rosterIndex, playerIndex, "name", v)} /><Field label="UID" value={player.uid} onChange={(v) => updatePlayer(rosterIndex, playerIndex, "uid", v)} /><button onClick={() => removePlayer(rosterIndex, playerIndex)} className="self-end rounded-lg border border-red-500/30 p-3 text-red-300"><Trash2 className="h-4 w-4" /></button></div>)}<button onClick={() => addPlayer(rosterIndex)} className="mt-2 rounded-lg bg-gold px-4 py-2 font-bold text-black"><Plus className="mr-1 inline h-4 w-4" />Add Player</button></div></div>}
  </section>;
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string | number; onChange: (value: string) => void; type?: string }) {
  return <label className="block min-w-0"><span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span><input type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="w-full min-w-0 rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none transition focus:border-gold/60" /></label>;
}
