"use client";

import { memo, useEffect, useRef, useState } from "react";
import { Download, Lock, Plus, Save, Trash2, Upload, X } from "lucide-react";
import type { TrackedEvent } from "@/lib/events";
import type { RawTeam } from "@/lib/types";
import { TeamLogo } from "./TeamLogo";

type Collaborator = { name: string; role: string; logoUrl: string; url: string };
type TeamForm = RawTeam & { badge?: string };
type SheetPayload = { ok?: boolean; message?: string; teams?: RawTeam[]; events?: TrackedEvent[]; collaborators?: Collaborator[] };

function blankTeam(): TeamForm {
  return { teamName: "New Team", logoUrl: "", bannerUrl: "", description: "", mobileNumber: "", players: 0, roster: [], status: "Active", registrationStatus: "Registered", rankingEligible: false, kills: 0, booyahs: 0, championships: 0, runnerUp: 0, secondRunnerUp: 0, grandFinals: 0, winRate: 0, killRatio: 0 };
}

export function CommunityAdminDashboard({ initialTeams, initialEvents, initialCollaborators }: { initialTeams: RawTeam[]; initialEvents: TrackedEvent[]; initialCollaborators?: Collaborator[] }) {
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<"teams" | "events" | "collaborators">("teams");
  const [teams, setTeams] = useState<TeamForm[]>(initialTeams.map((team) => ({ ...blankTeam(), ...team })));
  const [events, setEvents] = useState<TrackedEvent[]>(initialEvents);
  const [collaborators, setCollaborators] = useState<Collaborator[]>(initialCollaborators || []);
  const [rosterIndex, setRosterIndex] = useState<number | null>(null);

  async function refresh(show = true) {
    if (!password || refreshing) return;
    setRefreshing(true);
    if (show) setStatus("Reading latest Google Sheets data...");
    try {
      const response = await fetch("/api/admin/sheet", { cache: "no-store", headers: { "x-admin-password": password, Accept: "application/json" } });
      const result = (await response.json().catch(() => ({}))) as SheetPayload;
      if (!response.ok || result.ok === false) throw new Error(result.message || "Google Sheets refresh failed.");
      if (Array.isArray(result.teams)) setTeams(result.teams.map((team) => ({ ...blankTeam(), ...team, rankingEligible: false })));
      if (Array.isArray(result.events)) setEvents(result.events);
      if (Array.isArray(result.collaborators)) setCollaborators(result.collaborators);
      if (show) setStatus(`Google Sheets synced — ${result.teams?.length || 0} teams, ${result.events?.length || 0} events, ${result.collaborators?.length || 0} collaborators.`);
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
  function updateEvent(index: number, key: keyof TrackedEvent, value: string) { setEvents((current) => current.map((event, i) => i === index ? { ...event, [key]: key === "teams" ? Number(value) : value } : event)); }
  function updateCollaborator(index: number, key: keyof Collaborator, value: string) { setCollaborators((current) => current.map((item, i) => i === index ? { ...item, [key]: value } : item)); }
  function addTeam() { setTeams((current) => [...current, blankTeam()]); setTab("teams"); }
  function addEvent() { setEvents((current) => [...current, { name: "New Event", organizer: "TNFFM", teams: 0, prize: "", status: "Pending", counted: "", date: new Date().toISOString().slice(0, 10), notes: "" }]); setTab("events"); }
  function addCollaborator() { setCollaborators((current) => [...current, { name: "New Collaborator", role: "Partner", logoUrl: "", url: "" }]); setTab("collaborators"); }
  function addPlayer(index: number) { setTeams((current) => current.map((team, i) => i === index ? { ...team, roster: [...(team.roster || []), { name: "", uid: "" }], players: (team.roster || []).length + 1 } : team)); }
  function updatePlayer(teamIndex: number, playerIndex: number, key: "name" | "uid", value: string) { setTeams((current) => current.map((team, i) => i === teamIndex ? { ...team, roster: (team.roster || []).map((player, pi) => pi === playerIndex ? { ...player, [key]: value } : player) } : team)); }
  function removePlayer(teamIndex: number, playerIndex: number) { setTeams((current) => current.map((team, i) => i === teamIndex ? { ...team, roster: (team.roster || []).filter((_, pi) => pi !== playerIndex), players: Math.max(0, (team.roster || []).length - 1) } : team)); }
  function removeCollaborator(index: number) { setCollaborators((current) => current.filter((_, i) => i !== index)); }

  async function save() {
    setSaving(true); setStatus("Saving changes...");
    try {
      const safeTeams = teams.map((team) => ({ ...team, rankingEligible: false, rank: 0, previousRank: 0, communityPoints: 0, top3Finishes: 0 }));
      const safeCollaborators = collaborators.filter((item) => item.name || item.role || item.logoUrl || item.url);
      const response = await fetch("/api/admin/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, teams: safeTeams, events, collaborators: safeCollaborators }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body.ok === false) throw new Error(body.message || `Save failed (${response.status}).`);
      setStatus("✓ Community teams, profiles, events and collaborators saved.");
      await refresh(false);
    } catch (error) { setStatus(error instanceof Error ? error.message : "Save failed."); }
    finally { setSaving(false); }
  }

  function exportData() {
    const blob = new Blob([JSON.stringify({ teams, events, collaborators }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "tnffm-community-admin.json"; link.click(); URL.revokeObjectURL(url);
  }

  if (!unlocked) return <section className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-4"><div className="glass w-full rounded-xl p-6"><Lock className="mb-4 h-8 w-8 text-gold" /><h1 className="font-rajdhani text-4xl font-bold uppercase text-white">Admin Login</h1><p className="mt-2 text-sm text-slate-400">Manage registered community teams, profiles, events and collaborators.</p><input value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void login(); }} type="password" placeholder="Admin password" className="mt-6 w-full rounded-lg border border-white/10 bg-black/45 px-4 py-3 text-white outline-none focus:border-gold/60" />{loginError && <p className="mt-3 text-sm text-red-300">{loginError}</p>}<button onClick={() => void login()} className="mt-4 w-full rounded-lg bg-gold px-4 py-3 font-bold text-black">Unlock</button></div></section>;

  return <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="font-rajdhani text-sm font-bold uppercase tracking-[0.25em] text-gold">Admin</p><h1 className="font-rajdhani text-4xl font-bold uppercase text-white">Community Control Center</h1><p className="mt-2 text-sm text-slate-400">Manage registered teams, team profiles, tracked events and collaborators. Ranking controls are intentionally not shown here.</p></div><div className="flex flex-wrap gap-3"><button onClick={addTeam} className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-3 font-bold text-black"><Plus className="h-4 w-4" />Add Team</button><button onClick={addEvent} className="inline-flex items-center gap-2 rounded-lg border border-gold/30 px-4 py-3 font-bold text-gold"><Plus className="h-4 w-4" />Add Event</button><button onClick={addCollaborator} className="inline-flex items-center gap-2 rounded-lg border border-gold/30 px-4 py-3 font-bold text-gold"><Plus className="h-4 w-4" />Add Collaborator</button><button disabled={saving} onClick={() => void save()} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-3 font-bold text-white"><Save className="h-4 w-4" />{saving ? "Saving..." : "Save Changes"}</button><button disabled={refreshing} onClick={() => void refresh(true)} className="inline-flex items-center gap-2 rounded-lg border border-gold/30 px-4 py-3 font-bold text-gold"><Upload className="h-4 w-4" />{refreshing ? "Refreshing..." : "Refresh Sheet"}</button><button onClick={exportData} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-3 font-bold text-slate-200"><Download className="h-4 w-4" />Export</button></div></div>
    {status && <div className={`mb-5 rounded-lg border px-4 py-3 text-sm font-semibold ${status.toLowerCase().includes("error") || status.toLowerCase().includes("failed") ? "border-red-500/30 bg-red-500/10 text-red-200" : "border-gold/25 bg-gold/10 text-gold"}`}>{status}</div>}
    <div className="mb-5 flex gap-2 overflow-x-auto rounded-lg border border-white/10 bg-black/35 p-2">{(["teams", "events", "collaborators"] as const).map((item) => <button key={item} onClick={() => setTab(item)} className={`shrink-0 rounded-md px-4 py-2 text-sm font-bold ${tab === item ? "bg-gold text-black" : "text-slate-300 hover:text-gold"}`}>{item === "teams" ? "Registered Teams" : item === "events" ? "Tracked Events" : "Collaborators"}</button>)}</div>

    {tab === "teams" && <div className="space-y-4">{teams.length === 0 && <div className="glass rounded-xl p-8 text-center text-slate-400">No registered teams yet.</div>}{teams.map((team, index) => <div key={`${team.teamName}-${index}`} className="glass rounded-xl p-4"><div className="flex flex-col gap-4 lg:flex-row lg:items-start"><TeamLogo src={team.logoUrl} name={team.teamName} size={72} /><div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"><Field label="Team Name" value={team.teamName} onChange={(v) => updateTeam(index, "teamName", v)} /><Field label="Logo URL" value={team.logoUrl} onChange={(v) => updateTeam(index, "logoUrl", v)} /><Field label="Banner URL" value={team.bannerUrl || ""} onChange={(v) => updateTeam(index, "bannerUrl", v)} /><Field label="Description" value={team.description || ""} onChange={(v) => updateTeam(index, "description", v)} /><Field label="Mobile Number" value={team.mobileNumber || ""} onChange={(v) => updateTeam(index, "mobileNumber", v)} /><Field label="Players" value={team.players || 0} onChange={(v) => updateTeam(index, "players", v)} type="number" /><Field label="Status" value={team.status || "Active"} onChange={(v) => updateTeam(index, "status", v)} /></div><div className="shrink-0"><button onClick={() => setRosterIndex(index)} className="rounded-lg border border-gold/30 px-3 py-2 text-sm font-bold text-gold">Roster</button></div></div></div>)}</div>}

    {tab === "events" && <div className="space-y-4">{events.map((event, index) => <div key={index} className="glass rounded-xl p-4"><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"><Field label="Event Name" value={event.name} onChange={(v) => updateEvent(index, "name", v)} /><Field label="Organizer" value={event.organizer} onChange={(v) => updateEvent(index, "organizer", v)} /><Field label="Teams" value={event.teams} onChange={(v) => updateEvent(index, "teams", v)} type="number" /><Field label="Prize" value={event.prize} onChange={(v) => updateEvent(index, "prize", v)} /><Field label="Status" value={event.status} onChange={(v) => updateEvent(index, "status", v)} /><Field label="Date" value={event.date} onChange={(v) => updateEvent(index, "date", v)} /><Field label="Notes" value={event.notes || ""} onChange={(v) => updateEvent(index, "notes", v)} /></div></div>)}</div>}

    {tab === "collaborators" && <div className="space-y-4">{collaborators.length === 0 && <div className="glass rounded-xl p-8 text-center text-slate-400">No collaborators yet.</div>}{collaborators.map((item, index) => <div key={index} className="glass rounded-xl p-4"><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"><Field label="Name" value={item.name} onChange={(v) => updateCollaborator(index, "name", v)} /><Field label="Role" value={item.role} onChange={(v) => updateCollaborator(index, "role", v)} /><Field label="Logo URL" value={item.logoUrl} onChange={(v) => updateCollaborator(index, "logoUrl", v)} /><Field label="URL" value={item.url} onChange={(v) => updateCollaborator(index, "url", v)} /></div><button onClick={() => removeCollaborator(index)} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-500/30 px-3 py-2 text-sm font-bold text-red-300"><Trash2 className="h-4 w-4" />Remove</button></div>)}</div>}

    {rosterIndex !== null && teams[rosterIndex] && <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4"><div className="glass max-h-[85vh] w-full max-w-2xl overflow-auto rounded-xl p-5"><div className="mb-4 flex items-center justify-between"><h2 className="font-rajdhani text-2xl font-bold text-white">{teams[rosterIndex].teamName} Roster</h2><button onClick={() => setRosterIndex(null)} className="rounded-lg border border-white/10 p-2 text-slate-300"><X className="h-5 w-5" /></button></div>{(teams[rosterIndex].roster || []).map((player, playerIndex) => <div key={playerIndex} className="mb-3 flex gap-2"><input value={player.name} onChange={(e) => updatePlayer(rosterIndex, playerIndex, "name", e.target.value)} placeholder="Player name" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/45 px-3 py-2 text-white" /><input value={player.uid} onChange={(e) => updatePlayer(rosterIndex, playerIndex, "uid", e.target.value)} placeholder="UID" className="w-40 rounded-lg border border-white/10 bg-black/45 px-3 py-2 text-white" /><button onClick={() => removePlayer(rosterIndex, playerIndex)} className="rounded-lg border border-red-500/30 p-2 text-red-300"><Trash2 className="h-4 w-4" /></button></div>)}<button onClick={() => addPlayer(rosterIndex)} className="mt-2 inline-flex items-center gap-2 rounded-lg bg-gold px-3 py-2 font-bold text-black"><Plus className="h-4 w-4" />Add Player</button></div></div>}
  </section>;
}

const Field = memo(function Field({ label, value, onChange, type = "text" }: { label: string; value: string | number | null | undefined; onChange: (value: string) => void; type?: string }) {
  const [localValue, setLocalValue] = useState(String(value ?? ""));
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (document.activeElement !== inputRef.current) setLocalValue(String(value ?? "")); }, [value]);
  return <label className="block"><span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">{label}</span><input ref={inputRef} type={type} value={localValue} onChange={(e) => { setLocalValue(e.target.value); onChange(e.target.value); }} className="w-full rounded-lg border border-white/10 bg-black/45 px-3 py-2.5 text-white outline-none transition focus:border-gold/60" /></label>;
});
