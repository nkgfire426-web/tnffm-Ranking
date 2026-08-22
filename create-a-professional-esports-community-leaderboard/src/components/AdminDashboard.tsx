"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Lock, Plus, Save, Trash2, Upload, X } from "lucide-react";
import { calculateCommunityPoints } from "@/lib/rankings";
import type { TrackedEvent } from "@/lib/events";
import type { RawTeam } from "@/lib/types";
import { TeamLogo } from "./TeamLogo";

type Collaborator = { name: string; role: string; logoUrl: string; url: string };
type SheetPayload = { ok?: boolean; message?: string; teams?: RawTeam[]; events?: TrackedEvent[]; collaborators?: Collaborator[] };

export function AdminDashboard({ initialTeams, initialEvents, initialCollaborators }: { initialTeams: RawTeam[]; initialEvents: TrackedEvent[]; initialCollaborators?: Collaborator[] }) {
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [saveInProgress, setSaveInProgress] = useState(false);
  const [sheetRefreshing, setSheetRefreshing] = useState(false);
  const [pendingEditSlug, setPendingEditSlug] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"teams" | "events" | "collaborators">("teams");
  const [teams, setTeams] = useState<RawTeam[]>(initialTeams);
  const [events, setEvents] = useState<TrackedEvent[]>(initialEvents);
  const [collaborators, setCollaborators] = useState<Collaborator[]>(initialCollaborators || []);
  const [editingRosterIndex, setEditingRosterIndex] = useState<number | null>(null);
  const totalPreviewPoints = useMemo(() => teams.reduce((sum, team) => sum + calculateCommunityPoints(team), 0), [teams]);

  useEffect(() => {
    try {
      const edit = new URLSearchParams(window.location.search).get("edit");
      if (edit) setPendingEditSlug(edit);
    } catch {}
  }, []);

  useEffect(() => {
    if (!pendingEditSlug || !unlocked) return;
    const idx = teams.findIndex((t) => (t as any).slug === pendingEditSlug);
    if (idx >= 0) { setEditingRosterIndex(idx); setPendingEditSlug(null); }
  }, [pendingEditSlug, unlocked, teams]);

  async function refreshFromSheet(showMessage = true) {
    if (!password || sheetRefreshing) return;
    setSheetRefreshing(true);
    if (showMessage) setSaveStatus("Reading latest Google Sheets data...");
    try {
      const response = await fetch("/api/admin/sheet", { method: "GET", cache: "no-store", headers: { "x-admin-password": password, Accept: "application/json" } });
      const result = (await response.json().catch(() => ({}))) as SheetPayload;
      if (!response.ok || result.ok === false) { setSaveStatus(result.message || "Google Sheets refresh failed."); return; }
      if (Array.isArray(result.teams)) setTeams(result.teams);
      if (Array.isArray(result.events)) setEvents(result.events);
      if (Array.isArray(result.collaborators)) setCollaborators(result.collaborators);
      if (showMessage) setSaveStatus(`Google Sheets synced — ${result.teams?.length || 0} teams, ${result.events?.length || 0} tracked events loaded.`);
    } catch { setSaveStatus("Google Sheets refresh failed — server unreachable."); }
    finally { setSheetRefreshing(false); }
  }

  useEffect(() => {
    if (!unlocked) return;
    void refreshFromSheet(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked]);

  async function login() {
    try {
      const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      if (response.ok) { setUnlocked(true); setLoginError(""); setSaveStatus("Admin unlocked. Loading latest Google Sheets data..."); }
      else setLoginError("Invalid admin password.");
    } catch { setLoginError("Login failed — check server connection."); }
  }

  function update(index: number, key: keyof RawTeam, value: string) {
    setTeams((current) => current.map((team, i) => i === index ? { ...team, [key]: ["teamName", "logoUrl", "description", "bannerUrl", "status"].includes(String(key)) ? value : Number(value) } : team));
  }
  function updateEvent(index: number, key: keyof TrackedEvent, value: string) {
    setEvents((current) => current.map((event, i) => i === index ? { ...event, [key]: key === "teams" ? Number(value) : value } : event));
  }
  function addTeam() { setTeams((current) => [...current, { teamName: "New Team", logoUrl: "", kills: 0, booyahs: 0, championships: 0, runnerUp: 0, secondRunnerUp: 0, top5Finishes: 0, finalistFinishes: 0, officialMatchFinalists: 0, eventsPlayed: 0, grandFinals: 0, winRate: 0, killRatio: 0, players: 5, roster: [], status: "Active" }]); }
  function addEvent() { setEvents((current) => [...current, { name: "New Verified Event", organizer: "TNFFM Verified", teams: 24, prize: "Rs.1000", status: "Pending", counted: "Grand Finals", date: new Date().toISOString().slice(0, 10), notes: "Awaiting verification." }]); setActiveTab("events"); }
  function addCollaborator() { setCollaborators((current) => [...current, { name: "New", role: "Partner", logoUrl: "", url: "" }]); setActiveTab("collaborators"); }
  function updateCollaborator(index: number, key: keyof Collaborator, value: string) { setCollaborators((current) => current.map((c, i) => i === index ? { ...c, [key]: value } : c)); }
  function removeCollaborator(index: number) { setCollaborators((current) => current.filter((_, i) => i !== index)); }
  function openRoster(index: number) { setEditingRosterIndex(index); }
  function closeRoster() { setEditingRosterIndex(null); }
  function addRosterPlayer(index: number) { setTeams((current) => current.map((team, i) => i === index ? { ...team, roster: [...(team.roster || []), { name: "", uid: "" }] } : team)); }
  function updateRosterPlayer(teamIndex: number, playerIndex: number, key: "name" | "uid", value: string) { setTeams((current) => current.map((team, i) => i !== teamIndex ? team : { ...team, roster: (team.roster || []).map((p, pi) => pi === playerIndex ? { ...p, [key]: value } : p) })); }
  function removeRosterPlayer(teamIndex: number, playerIndex: number) { setTeams((current) => current.map((team, i) => i === teamIndex ? { ...team, roster: (team.roster || []).filter((_, pi) => pi !== playerIndex) } : team)); }
  function removeLogo(index: number) { update(index, "logoUrl", ""); }
  function exportAdminData() { const blob = new Blob([JSON.stringify({ teams, events, collaborators }, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "tnffm-admin-data.json"; link.click(); URL.revokeObjectURL(url); }
  async function syncToSheet() { setSaveStatus("Syncing dashboard changes to Google Sheets..."); try { const response = await fetch("/api/admin/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, teams }) }); setSaveStatus(response.ok ? "Dashboard data sent to Google Sheets." : "Set GOOGLE_SHEETS_WEBHOOK_URL to enable dashboard write-back."); } catch { setSaveStatus("Sync failed — server unreachable."); } }
  async function saveChanges() {
    setSaveInProgress(true); setSaveStatus("Saving changes...");
    try {
      const numericKeys = ["kills", "booyahs", "championships", "runnerUp", "secondRunnerUp", "top5Finishes", "finalistFinishes", "officialMatchFinalists", "eventsPlayed", "grandFinals", "winRate", "killRatio", "players", "previousRank", "communityPoints", "top3Finishes", "rank"];
      const normalizedTeams = teams.map((team) => { const copy: any = { ...team }; numericKeys.forEach((key) => { if (key in copy) copy[key] = typeof copy[key] === "number" ? copy[key] : Number(String(copy[key] || "").trim()) || 0; }); return copy; });
      const response = await fetch("/api/admin/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, teams: normalizedTeams, events, collaborators }) });
      const bodyText = await response.text().catch(() => "");
      setSaveStatus(response.ok ? "Changes saved to Google Sheets." : `Save failed: ${response.status} ${bodyText}`);
    } catch { setSaveStatus("Save failed — server unreachable. Your current edits are still on this page."); }
    finally { setSaveInProgress(false); }
  }

  if (!unlocked) return <section className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-4"><div className="glass w-full rounded-lg p-6"><Lock className="mb-4 h-8 w-8 text-gold" /><h1 className="font-rajdhani text-4xl font-bold uppercase text-white">Admin Login</h1><p className="mt-2 text-sm text-slate-400">Enter the admin password to manage teams, logos, rankings, and tracked events.</p><input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Admin password" className="mt-6 w-full rounded-lg border border-white/10 bg-black/45 px-4 py-3 text-white outline-none focus:border-gold/60" />{loginError && <p className="mt-3 text-sm text-red-300">{loginError}</p>}<button onClick={login} className="mt-4 w-full rounded-lg bg-gold px-4 py-3 font-bold text-black transition hover:bg-yellow-300">Unlock</button></div></section>;

  return <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="font-rajdhani text-sm font-bold uppercase tracking-[0.25em] text-gold">Admin Login</p><h1 className="font-rajdhani text-4xl font-bold uppercase text-white">Control Center</h1><p className="mt-2 text-sm text-slate-400">Manage team rankings and tracked event logs. Preview total: {totalPreviewPoints.toLocaleString()} CP.</p></div><div className="flex flex-wrap gap-3"><button onClick={addTeam} className="inline-flex items-center justify-center gap-2 rounded-lg bg-gold px-4 py-3 font-bold text-black"><Plus className="h-4 w-4" />Add Team</button><button onClick={addEvent} className="inline-flex items-center justify-center gap-2 rounded-lg border border-gold/30 px-4 py-3 font-bold text-gold"><Plus className="h-4 w-4" />Add Event</button><button disabled={saveInProgress} onClick={saveChanges} className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 font-bold text-white disabled:opacity-60"><Save className="h-4 w-4" />{saveInProgress ? "Saving..." : "Save Changes"}</button><button disabled={sheetRefreshing} onClick={() => refreshFromSheet(true)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-gold/30 px-4 py-3 font-bold text-gold disabled:opacity-60"><Upload className="h-4 w-4" />{sheetRefreshing ? "Refreshing..." : "Refresh Sheet"}</button><button onClick={syncToSheet} className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-3 font-bold text-slate-200"><Upload className="h-4 w-4" />Write Dashboard to Sheet</button><button onClick={exportAdminData} className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-3 font-bold text-slate-200"><Download className="h-4 w-4" />Export Data</button></div></div>
    {saveStatus && <div className="mb-5 rounded-lg border border-gold/25 bg-gold/10 px-4 py-3 text-sm font-semibold text-gold">{saveStatus}</div>}
    <div className="mb-5 flex gap-2 overflow-x-auto rounded-lg border border-white/10 bg-black/35 p-2">{["teams", "events", "collaborators"].map((tab) => <button key={tab} onClick={() => setActiveTab(tab as any)} className={`shrink-0 rounded-md px-4 py-2 text-sm font-bold ${activeTab === tab ? "bg-gold text-black" : "text-slate-300 hover:text-gold"}`}>{tab === "teams" ? "Team Rankings" : tab === "events" ? "Tracked Events" : "Collaborators"}</button>)}</div>
    {activeTab === "teams" && <div className="space-y-4">{teams.map((team, index) => <div key={`team-${index}`} className="glass rounded-xl p-4"><div className="flex flex-col gap-4 lg:flex-row lg:items-start"><TeamLogo src={team.logoUrl} name={team.teamName} size={64} /><div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"><Field label="Team Name" value={team.teamName} onChange={(v) => update(index, "teamName", v)} /><Field label="Logo URL" value={team.logoUrl || ""} onChange={(v) => update(index, "logoUrl", v)} /><Field label="Description" value={team.description || ""} onChange={(v) => update(index, "description", v)} /><Field label="Banner URL" value={team.bannerUrl || ""} onChange={(v) => update(index, "bannerUrl", v)} /><Field label="Kills" value={team.kills} onChange={(v) => update(index, "kills", v)} type="number" /><Field label="Booyahs" value={team.booyahs} onChange={(v) => update(index, "booyahs", v)} type="number" /><Field label="Championships" value={team.championships} onChange={(v) => update(index, "championships", v)} type="number" /><Field label="Runner Up" value={team.runnerUp} onChange={(v) => update(index, "runnerUp", v)} type="number" /><Field label="2nd Runner Up" value={team.secondRunnerUp} onChange={(v) => update(index, "secondRunnerUp", v)} type="number" /><Field label="Top 5 Finishes" value={team.top5Finishes} onChange={(v) => update(index, "top5Finishes", v)} type="number" /><Field label="Finalist Finishes" value={team.finalistFinishes} onChange={(v) => update(index, "finalistFinishes", v)} type="number" /><Field label="Events Played" value={team.eventsPlayed} onChange={(v) => update(index, "eventsPlayed", v)} type="number" /><Field label="Status" value={team.status || "Active"} onChange={(v) => update(index, "status", v)} /></div><div className="flex shrink-0 gap-2"><button onClick={() => openRoster(index)} className="rounded-lg border border-gold/30 px-3 py-2 text-sm font-bold text-gold">Roster</button><button onClick={() => removeLogo(index)} className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300">Remove Logo</button></div></div></div>)}</div>}
    {activeTab === "events" && <div className="space-y-4">{events.map((event, index) => <div key={`event-${index}`} className="glass rounded-xl p-4"><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"><Field label="Event Name" value={event.name} onChange={(v) => updateEvent(index, "name", v)} /><Field label="Organizer" value={event.organizer} onChange={(v) => updateEvent(index, "organizer", v)} /><Field label="Teams" value={event.teams} onChange={(v) => updateEvent(index, "teams", v)} type="number" /><Field label="Prize" value={event.prize} onChange={(v) => updateEvent(index, "prize", v)} /><Field label="Status" value={event.status} onChange={(v) => updateEvent(index, "status", v)} /><Field label="Counted" value={event.counted} onChange={(v) => updateEvent(index, "counted", v)} /><Field label="Date" value={event.date} onChange={(v) => updateEvent(index, "date", v)} /><Field label="Notes" value={event.notes || ""} onChange={(v) => updateEvent(index, "notes", v)} /></div></div>)}</div>}
    {activeTab === "collaborators" && <div className="space-y-4">{collaborators.map((item, index) => <div key={`collaborator-${index}`} className="glass rounded-xl p-4"><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"><Field label="Name" value={item.name} onChange={(v) => updateCollaborator(index, "name", v)} /><Field label="Role" value={item.role} onChange={(v) => updateCollaborator(index, "role", v)} /><Field label="Logo URL" value={item.logoUrl} onChange={(v) => updateCollaborator(index, "logoUrl", v)} /><Field label="URL" value={item.url} onChange={(v) => updateCollaborator(index, "url", v)} /></div><button onClick={() => removeCollaborator(index)} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-500/30 px-3 py-2 text-sm font-bold text-red-300"><Trash2 className="h-4 w-4" />Remove</button></div>)}</div>}
    {editingRosterIndex !== null && teams[editingRosterIndex] && <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4"><div className="glass max-h-[85vh] w-full max-w-2xl overflow-auto rounded-xl p-5"><div className="mb-4 flex items-center justify-between"><h2 className="font-rajdhani text-2xl font-bold text-white">{teams[editingRosterIndex].teamName} Roster</h2><button onClick={closeRoster} className="rounded-lg border border-white/10 p-2 text-slate-300"><X className="h-5 w-5" /></button></div>{(teams[editingRosterIndex].roster || []).map((player, playerIndex) => <div key={playerIndex} className="mb-3 flex gap-2"><input value={player.name} onChange={(e) => updateRosterPlayer(editingRosterIndex, playerIndex, "name", e.target.value)} placeholder="Player name" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/45 px-3 py-2 text-white" /><input value={player.uid} onChange={(e) => updateRosterPlayer(editingRosterIndex, playerIndex, "uid", e.target.value)} placeholder="UID" className="w-40 rounded-lg border border-white/10 bg-black/45 px-3 py-2 text-white" /><button onClick={() => removeRosterPlayer(editingRosterIndex, playerIndex)} className="rounded-lg border border-red-500/30 p-2 text-red-300"><Trash2 className="h-4 w-4" /></button></div>)}<button onClick={() => addRosterPlayer(editingRosterIndex)} className="mt-2 inline-flex items-center gap-2 rounded-lg bg-gold px-3 py-2 font-bold text-black"><Plus className="h-4 w-4" />Add Player</button></div></div>}
  </section>;
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string | number | null | undefined; onChange: (value: string) => void; type?: string }) {
  return <label className="block"><span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">{label}</span><input type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-white/10 bg-black/45 px-3 py-2.5 text-white outline-none transition focus:border-gold/60" /></label>;
}
