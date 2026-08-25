"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Download, Lock, Plus, Save, Trash2, Upload, X, Search, SlidersHorizontal } from "lucide-react";
import { calculateCommunityPoints, getEventsPlayed } from "@/lib/rankings";
import type { TrackedEvent } from "@/lib/events";
import type { RawTeam } from "@/lib/types";
import { TeamLogo } from "./TeamLogo";

type Collaborator = { name: string; role: string; logoUrl: string; url: string };
type SheetPayload = { ok?: boolean; message?: string; teams?: RawTeam[]; events?: TrackedEvent[]; collaborators?: Collaborator[] };

const STRING_TEAM_FIELDS = new Set(["teamName", "badge", "logoUrl", "description", "bannerUrl", "status"]);
const NUMBER_TEAM_FIELDS = ["kills", "booyahs", "championships", "runnerUp", "secondRunnerUp", "top5Finishes", "finalistFinishes", "officialMatchFinalists", "eventsPlayed", "grandFinals", "winRate", "killRatio", "players", "previousRank", "communityPoints", "top3Finishes", "rank"];

export function AdminDashboard({ initialTeams, initialEvents, initialCollaborators }: { initialTeams: RawTeam[]; initialEvents: TrackedEvent[]; initialCollaborators?: Collaborator[] }) {
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [saveInProgress, setSaveInProgress] = useState(false);
  const [sheetRefreshing, setSheetRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"teams" | "events" | "collaborators">("teams");
  const [teams, setTeams] = useState<RawTeam[]>(() => initialTeams.map((team) => ({ ...team, eventsPlayed: getEventsPlayed(team) })));
  const [events, setEvents] = useState<TrackedEvent[]>(initialEvents);
  const [collaborators, setCollaborators] = useState<Collaborator[]>(initialCollaborators || []);
  const [editingRosterIndex, setEditingRosterIndex] = useState<number | null>(null);
  const [teamSearch, setTeamSearch] = useState("");
  const [teamStatusFilter, setTeamStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [dirty, setDirty] = useState(false);
  const totalPreviewPoints = useMemo(() => teams.reduce((sum, team) => sum + calculateCommunityPoints(team), 0), [teams]);

  const filteredTeams = useMemo(() => {
    const query = teamSearch.trim().toLowerCase();
    return teams.map((team, index) => ({ team, index })).filter(({ team }) => {
      const matchesSearch = !query || [team.teamName, (team as any).teamId, (team as any).id, ...(team.roster || []).map((p: any) => p?.name)].some((v) => String(v || "").toLowerCase().includes(query));
      const status = String(team.status || "Active").toLowerCase();
      const matchesStatus = teamStatusFilter === "all" || (teamStatusFilter === "active" ? status === "active" : status !== "active");
      return matchesSearch && matchesStatus;
    });
  }, [teams, teamSearch, teamStatusFilter]);

  async function refreshFromSheet(showMessage = true) {
    if (!password || sheetRefreshing) return;
    setSheetRefreshing(true);
    if (showMessage) setSaveStatus("Reading latest Google Sheets data...");
    try {
      const response = await fetch("/api/admin/sheet", { method: "GET", cache: "no-store", headers: { "x-admin-password": password, Accept: "application/json" } });
      const result = (await response.json().catch(() => ({}))) as SheetPayload;
      if (!response.ok || result.ok === false) throw new Error(result.message || "Google Sheets refresh failed.");
      if (Array.isArray(result.teams)) setTeams(result.teams.map((team) => ({ ...team, eventsPlayed: getEventsPlayed(team) })));
      if (Array.isArray(result.events)) setEvents(result.events);
      if (Array.isArray(result.collaborators)) setCollaborators(result.collaborators.map((c) => ({ name: String(c.name || ""), role: String(c.role || ""), logoUrl: String(c.logoUrl || ""), url: String(c.url || "") })));
      setDirty(false);
      if (showMessage) setSaveStatus(`Google Sheets synced — ${result.teams?.length || 0} teams, ${result.events?.length || 0} events, ${result.collaborators?.length || 0} collaborators.`);
    } catch (error) { setSaveStatus(error instanceof Error ? error.message : "Google Sheets refresh failed."); }
    finally { setSheetRefreshing(false); }
  }

  useEffect(() => { if (unlocked) void refreshFromSheet(false); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [unlocked]);
  useEffect(() => { const handler = (event: BeforeUnloadEvent) => { if (dirty && !saveInProgress) { event.preventDefault(); event.returnValue = ""; } }; window.addEventListener("beforeunload", handler); return () => window.removeEventListener("beforeunload", handler); }, [dirty, saveInProgress]);

  async function login() {
    try {
      const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      if (!response.ok) throw new Error("Invalid admin password.");
      setUnlocked(true); setLoginError(""); setSaveStatus("Admin unlocked. Loading latest Google Sheets data...");
    } catch (error) { setLoginError(error instanceof Error ? error.message : "Login failed."); }
  }

  function updateTeam(index: number, key: keyof RawTeam | "badge", value: string) { setDirty(true); setTeams((current) => current.map((team, i) => i === index ? ({ ...team, [key]: STRING_TEAM_FIELDS.has(String(key)) ? value : Number(value) } as RawTeam) : team)); }
  function updateEvent(index: number, key: keyof TrackedEvent, value: string) { setDirty(true); setEvents((current) => current.map((event, i) => i === index ? { ...event, [key]: key === "teams" ? Number(value) : value } : event)); }
  function updateCollaborator(index: number, key: keyof Collaborator, value: string) { setDirty(true); setCollaborators((current) => current.map((item, i) => i === index ? { ...item, [key]: value } : item)); }
  function addTeam() { setDirty(true); setTeams((current) => [...current, { teamName: "New Team", badge: "", logoUrl: "", kills: 0, booyahs: 0, championships: 0, runnerUp: 0, secondRunnerUp: 0, top5Finishes: 0, finalistFinishes: 0, officialMatchFinalists: 0, eventsPlayed: 0, grandFinals: 0, winRate: 0, killRatio: 0, players: 5, roster: [], status: "Active" } as RawTeam]); setActiveTab("teams"); setTeamSearch("New Team"); }
  function addEvent() { setDirty(true); setEvents((current) => [...current, { name: "New Verified Event", organizer: "TNFFM Verified", teams: 24, prize: "Rs.1000", status: "Pending", counted: "Grand Finals", date: new Date().toISOString().slice(0, 10), notes: "Awaiting verification." }]); setActiveTab("events"); }
  function addCollaborator() { setDirty(true); setCollaborators((current) => [...current, { name: "New Collaborator", role: "Partner", logoUrl: "", url: "" }]); setActiveTab("collaborators"); setSaveStatus("New collaborator added. Fill the fields and press Save Changes."); }
  function removeCollaborator(index: number) { if (!window.confirm("Remove this collaborator? This change will be applied only after Save Changes.")) return; setDirty(true); setCollaborators((current) => current.filter((_, i) => i !== index)); }
  function addRosterPlayer(index: number) { setDirty(true); setTeams((current) => current.map((team, i) => i === index ? { ...team, roster: [...(team.roster || []), { name: "", uid: "" }] } : team)); }
  function updateRosterPlayer(teamIndex: number, playerIndex: number, key: "name" | "uid", value: string) { setDirty(true); setTeams((current) => current.map((team, i) => i === teamIndex ? { ...team, roster: (team.roster || []).map((player, pi) => pi === playerIndex ? { ...player, [key]: value } : player) } : team)); }
  function removeRosterPlayer(teamIndex: number, playerIndex: number) { setDirty(true); setTeams((current) => current.map((team, i) => i === teamIndex ? { ...team, roster: (team.roster || []).filter((_, pi) => pi !== playerIndex) } : team)); }
  function exportAdminData() { const blob = new Blob([JSON.stringify({ teams, events, collaborators }, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "tnffm-admin-data.json"; link.click(); URL.revokeObjectURL(url); }

  async function saveChanges() {
    if (saveInProgress) return;
    const names = teams.map((t) => String(t.teamName || "").trim().toLowerCase()).filter(Boolean);
    const duplicate = names.find((name, i) => names.indexOf(name) !== i);
    if (duplicate && !window.confirm(`Duplicate team name detected: "${duplicate}". Save anyway?`)) return;
    setSaveInProgress(true); setSaveStatus("Saving changes to Google Sheets...");
    try {
      const normalizedTeams = teams.map((team) => {
        const copy: any = { ...team };
        NUMBER_TEAM_FIELDS.forEach((key) => { if (key in copy) copy[key] = Number.isFinite(Number(copy[key])) ? Number(copy[key]) : 0; });
        const suppliedEvents = Number(copy.eventsPlayed);
        copy.eventsPlayed = Number.isFinite(suppliedEvents) && suppliedEvents >= 0 ? suppliedEvents : getEventsPlayed(copy);
        copy.officialMatchFinalists = Math.max(0, Number(copy.officialMatchFinalists) || 0);
        copy.badge = String(copy.badge || "").trim();
        copy.teamName = String(copy.teamName || "").trim();
        return copy;
      });
      const normalizedCollaborators = collaborators.map((item) => ({ name: String(item.name || "").trim(), role: String(item.role || "").trim(), logoUrl: String(item.logoUrl || "").trim(), url: String(item.url || "").trim() })).filter((item) => item.name || item.role || item.logoUrl || item.url);
      const response = await fetch("/api/admin/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, teams: normalizedTeams, events, collaborators: normalizedCollaborators }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body.ok === false) throw new Error(body.message || `Save failed (${response.status}).`);
      setSaveStatus("✓ Saved to Google Sheets. Verifying latest data...");
      await refreshFromSheet(false);
      setDirty(false);
      setSaveStatus("✓ Saved and verified successfully. Google Sheets is the source of truth.");
    } catch (error) { setSaveStatus(error instanceof Error ? error.message : "Save failed. Your edits are still on this page."); }
    finally { setSaveInProgress(false); }
  }

  if (!unlocked) return <section className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-4"><div className="glass w-full rounded-lg p-6"><Lock className="mb-4 h-8 w-8 text-gold" /><h1 className="font-rajdhani text-4xl font-bold uppercase text-white">Admin Login</h1><p className="mt-2 text-sm text-slate-400">Enter the admin password to manage teams, badges, logos, rankings, events and collaborators.</p><input value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void login(); }} type="password" placeholder="Admin password" className="mt-6 w-full rounded-lg border border-white/10 bg-black/45 px-4 py-3 text-white outline-none focus:border-gold/60" />{loginError && <p className="mt-3 text-sm text-red-300">{loginError}</p>}<button onClick={() => void login()} className="mt-4 w-full rounded-lg bg-gold px-4 py-3 font-bold text-black transition hover:bg-yellow-300">Unlock</button></div></section>;

  return <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="font-rajdhani text-sm font-bold uppercase tracking-[0.25em] text-gold">Admin Login</p><h1 className="font-rajdhani text-4xl font-bold uppercase text-white">Control Center</h1><p className="mt-2 text-sm text-slate-400">Manage teams, badges, logos, rankings, tracked events and collaborators. Preview total: {totalPreviewPoints.toLocaleString()} CP.</p></div><div className="flex flex-wrap gap-3"><button onClick={addTeam} className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-3 font-bold text-black"><Plus className="h-4 w-4" />Add Team</button><button onClick={addEvent} className="inline-flex items-center gap-2 rounded-lg border border-gold/30 px-4 py-3 font-bold text-gold"><Plus className="h-4 w-4" />Add Event</button><button onClick={addCollaborator} className="inline-flex items-center gap-2 rounded-lg border border-gold/30 px-4 py-3 font-bold text-gold"><Plus className="h-4 w-4" />Add Collaborator</button><button disabled={saveInProgress} onClick={() => void saveChanges()} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-3 font-bold text-white disabled:opacity-60"><Save className="h-4 w-4" />{saveInProgress ? "Saving..." : dirty ? "Save Changes •" : "Save Changes"}</button><button disabled={sheetRefreshing} onClick={() => void refreshFromSheet(true)} className="inline-flex items-center gap-2 rounded-lg border border-gold/30 px-4 py-3 font-bold text-gold disabled:opacity-60"><Upload className="h-4 w-4" />{sheetRefreshing ? "Refreshing..." : "Refresh Sheet"}</button><button onClick={exportAdminData} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-3 font-bold text-slate-200"><Download className="h-4 w-4" />Export</button></div></div>
    {saveStatus && <div className="mb-5 rounded-lg border border-gold/25 bg-gold/10 px-4 py-3 text-sm font-semibold text-gold">{saveStatus}</div>}
    <div className="mb-5 flex gap-2 overflow-x-auto rounded-lg border border-white/10 bg-black/35 p-2">{(["teams", "events", "collaborators"] as const).map((tab) => <button key={tab} onClick={() => setActiveTab(tab)} className={`shrink-0 rounded-md px-4 py-2 text-sm font-bold ${activeTab === tab ? "bg-gold text-black" : "text-slate-300 hover:text-gold"}`}>{tab === "teams" ? "Team Rankings" : tab === "events" ? "Tracked Events" : "Collaborators"}</button>)}</div>

    {activeTab === "teams" && <div className="space-y-4">
      <div className="glass rounded-xl p-3 sm:p-4"><div className="flex flex-col gap-3 md:flex-row"><div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input value={teamSearch} onChange={(e) => setTeamSearch(e.target.value)} placeholder="Search team, Team ID, or player..." className="w-full rounded-lg border border-white/10 bg-black/45 py-3 pl-10 pr-10 text-white outline-none focus:border-gold/60" />{teamSearch && <button onClick={() => setTeamSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-white"><X className="h-4 w-4" /></button>}</div><div className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-gold" /><select value={teamStatusFilter} onChange={(e) => setTeamStatusFilter(e.target.value as typeof teamStatusFilter)} className="rounded-lg border border-white/10 bg-black/45 px-3 py-3 text-sm font-semibold text-white outline-none"><option value="all">All Teams</option><option value="active">Active</option><option value="inactive">Inactive / Other</option></select></div></div><div className="mt-3 text-xs font-semibold text-slate-500">Showing {filteredTeams.length} of {teams.length} teams</div></div>
      {filteredTeams.map(({ team, index }) => <div key={`team-${index}`} className="glass rounded-xl p-4"><div className="flex flex-col gap-4 lg:flex-row lg:items-start"><TeamLogo src={team.logoUrl} name={team.teamName} size={64} /><div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"><Field label="Team Name" value={team.teamName} onChange={(v) => updateTeam(index, "teamName", v)} /><Field label="Team Badge" value={(team as any).badge || ""} onChange={(v) => updateTeam(index, "badge", v)} /><Field label="Logo URL" value={team.logoUrl || ""} onChange={(v) => updateTeam(index, "logoUrl", v)} /><Field label="Description" value={team.description || ""} onChange={(v) => updateTeam(index, "description", v)} /><Field label="Banner URL" value={team.bannerUrl || ""} onChange={(v) => updateTeam(index, "bannerUrl", v)} /><Field label="Kills" value={team.kills} onChange={(v) => updateTeam(index, "kills", v)} type="number" /><Field label="Booyahs" value={team.booyahs} onChange={(v) => updateTeam(index, "booyahs", v)} type="number" /><Field label="Championships" value={team.championships} onChange={(v) => updateTeam(index, "championships", v)} type="number" /><Field label="Runner Up" value={team.runnerUp} onChange={(v) => updateTeam(index, "runnerUp", v)} type="number" /><Field label="2nd Runner Up" value={team.secondRunnerUp} onChange={(v) => updateTeam(index, "secondRunnerUp", v)} type="number" /><Field label="Top 5 Finishes" value={team.top5Finishes} onChange={(v) => updateTeam(index, "top5Finishes", v)} type="number" /><Field label="Finalist Finishes" value={team.finalistFinishes} onChange={(v) => updateTeam(index, "finalistFinishes", v)} type="number" /><Field label="Official Match Count" value={team.officialMatchFinalists || 0} onChange={(v) => updateTeam(index, "officialMatchFinalists", v)} type="number" /><Field label="Events Played" value={team.eventsPlayed ?? getEventsPlayed(team)} onChange={(v) => updateTeam(index, "eventsPlayed", v)} type="number" /><Field label="Status" value={team.status || "Active"} onChange={(v) => updateTeam(index, "status", v)} /></div><div className="flex shrink-0 gap-2"><button onClick={() => setEditingRosterIndex(index)} className="rounded-lg border border-gold/30 px-3 py-2 text-sm font-bold text-gold">Roster</button><button onClick={() => { if (window.confirm(`Remove logo from ${team.teamName || "this team"}? The default logo will be used publicly.`)) updateTeam(index, "logoUrl", ""); }} className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300">Remove Logo</button></div></div></div>)}
      {filteredTeams.length === 0 && <div className="glass rounded-xl p-10 text-center"><Search className="mx-auto mb-3 h-8 w-8 text-slate-500" /><p className="font-semibold text-white">No teams found</p><p className="mt-1 text-sm text-slate-500">Try another search or clear the filters.</p></div>}
    </div>}

    {activeTab === "events" && <div className="space-y-4"><div className="flex justify-end"><button onClick={addEvent} className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2 font-bold text-black"><Plus className="h-4 w-4" />Add Event</button></div>{events.map((event, index) => <div key={`event-${index}`} className="glass rounded-xl p-4"><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"><Field label="Event Name" value={event.name} onChange={(v) => updateEvent(index, "name", v)} /><Field label="Organizer" value={event.organizer} onChange={(v) => updateEvent(index, "organizer", v)} /><Field label="Teams" value={event.teams} onChange={(v) => updateEvent(index, "teams", v)} type="number" /><Field label="Prize" value={event.prize} onChange={(v) => updateEvent(index, "prize", v)} /><Field label="Status" value={event.status} onChange={(v) => updateEvent(index, "status", v)} /><Field label="Counted" value={event.counted} onChange={(v) => updateEvent(index, "counted", v)} /><Field label="Date" value={event.date} onChange={(v) => updateEvent(index, "date", v)} /><Field label="Notes" value={event.notes || ""} onChange={(v) => updateEvent(index, "notes", v)} /></div></div>)}</div>}

    {activeTab === "collaborators" && <div className="space-y-4"><div className="flex justify-end"><button onClick={addCollaborator} className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2 font-bold text-black"><Plus className="h-4 w-4" />Add Collaborator</button></div>{collaborators.length === 0 && <div className="glass rounded-xl p-8 text-center text-slate-400">No collaborators yet. Click <span className="text-gold">Add Collaborator</span> to create one.</div>}{collaborators.map((item, index) => <div key={`collaborator-${index}`} className="glass rounded-xl p-4"><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"><Field label="Name" value={item.name} onChange={(v) => updateCollaborator(index, "name", v)} /><Field label="Role" value={item.role} onChange={(v) => updateCollaborator(index, "role", v)} /><Field label="Logo URL" value={item.logoUrl} onChange={(v) => updateCollaborator(index, "logoUrl", v)} /><Field label="URL" value={item.url} onChange={(v) => updateCollaborator(index, "url", v)} /></div><button onClick={() => removeCollaborator(index)} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-500/30 px-3 py-2 text-sm font-bold text-red-300"><Trash2 className="h-4 w-4" />Remove</button></div>)}</div>}

    {editingRosterIndex !== null && teams[editingRosterIndex] && <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4"><div className="glass max-h-[85vh] w-full max-w-2xl overflow-auto rounded-xl p-5"><div className="mb-4 flex items-center justify-between"><h2 className="font-rajdhani text-2xl font-bold text-white">{teams[editingRosterIndex].teamName} Roster</h2><button onClick={() => setEditingRosterIndex(null)} className="rounded-lg border border-white/10 p-2 text-slate-300"><X className="h-5 w-5" /></button></div>{(teams[editingRosterIndex].roster || []).map((player, playerIndex) => <div key={playerIndex} className="mb-3 flex gap-2"><input value={player.name} onChange={(e) => updateRosterPlayer(editingRosterIndex, playerIndex, "name", e.target.value)} placeholder="Player name" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/45 px-3 py-2 text-white" /><input value={player.uid} onChange={(e) => updateRosterPlayer(editingRosterIndex, playerIndex, "uid", e.target.value)} placeholder="UID" className="w-40 rounded-lg border border-white/10 bg-black/45 px-3 py-2 text-white" /><button onClick={() => removeRosterPlayer(editingRosterIndex, playerIndex)} className="rounded-lg border border-red-500/30 p-2 text-red-300"><Trash2 className="h-4 w-4" /></button></div>)}<button onClick={() => addRosterPlayer(editingRosterIndex)} className="mt-2 inline-flex items-center gap-2 rounded-lg bg-gold px-3 py-2 font-bold text-black"><Plus className="h-4 w-4" />Add Player</button></div></div>}
  </section>;
}

const Field = memo(function Field({ label, value, onChange, type = "text" }: { label: string; value: string | number | null | undefined; onChange: (value: string) => void; type?: string }) {
  const [localValue, setLocalValue] = useState(String(value ?? ""));
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (document.activeElement !== inputRef.current) setLocalValue(String(value ?? "")); }, [value]);
  return <label className="block"><span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">{label}</span><input ref={inputRef} type={type} value={localValue} onChange={(e) => { setLocalValue(e.target.value); onChange(e.target.value); }} className="w-full rounded-lg border border-white/10 bg-black/45 px-3 py-2.5 text-white outline-none transition focus:border-gold/60" /></label>;
});
