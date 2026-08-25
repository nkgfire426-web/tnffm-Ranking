"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Lock, Plus, RefreshCw, Save, Trash2, Upload, X } from "lucide-react";
import type { EventResult, TrackedEvent } from "@/lib/events";
import type { RawTeam } from "@/lib/types";
import { TeamLogo } from "./TeamLogo";

type Collaborator = { name: string; role: string; logoUrl: string; url: string };
type TeamRow = RawTeam & { _id: string };
type EventRow = TrackedEvent & { _id: string };
type SheetPayload = { ok?: boolean; message?: string; teams?: RawTeam[]; events?: TrackedEvent[]; collaborators?: Collaborator[] };

const id = (prefix: string, n: number) => `${prefix}-${Date.now()}-${n}-${Math.random().toString(36).slice(2, 8)}`;

function blankTeam(_id = id("team", 0)): TeamRow {
  return { _id, teamName: "New Team", logoUrl: "", bannerUrl: "", description: "", mobileNumber: "", players: 0, roster: [], status: "Active", registrationStatus: "Registered", rankingEligible: false, kills: 0, booyahs: 0, championships: 0, runnerUp: 0, secondRunnerUp: 0, grandFinals: 0, winRate: 0, killRatio: 0, booyahRatio: 0 };
}

function wrapTeams(items: RawTeam[]) { return items.map((team, i) => ({ ...blankTeam(`team-${i}-${Math.random().toString(36).slice(2, 8)}`), ...team })); }
function wrapEvents(items: TrackedEvent[]) { return items.map((event, i) => ({ ...event, _id: `event-${i}-${Math.random().toString(36).slice(2, 8)}`, results: (event.results || []).map((r) => ({ ...r })) })); }

function cleanNumber(value: unknown, min = 0) { const n = Number(value); return Number.isFinite(n) ? Math.max(min, n) : 0; }
function normalizeResult(result: EventResult, matches: number): EventResult {
  const kills = cleanNumber(result.kills), booyahs = cleanNumber(result.booyahs), positionPoints = cleanNumber(result.positionPoints);
  return { ...result, rank: Math.max(1, cleanNumber(result.rank) || 1), kills, booyahs, positionPoints, killRatio: matches > 0 ? kills / matches : 0, booyahRatio: matches > 0 ? (booyahs / matches) * 100 : 0, total: positionPoints + kills };
}

export function AdminDashboardStable({ initialTeams, initialEvents, initialCollaborators }: { initialTeams: RawTeam[]; initialEvents: TrackedEvent[]; initialCollaborators?: Collaborator[] }) {
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<"teams" | "ranking" | "events" | "collaborators">("teams");
  const [teams, setTeams] = useState<TeamRow[]>(() => wrapTeams(initialTeams));
  const [events, setEvents] = useState<EventRow[]>(() => wrapEvents(initialEvents));
  const [collaborators, setCollaborators] = useState<Collaborator[]>(initialCollaborators || []);
  const [selectedEventId, setSelectedEventId] = useState<string>(() => initialEvents[0] ? `event-0` : "");
  const [rosterId, setRosterId] = useState<string | null>(null);

  const selectedEvent = events.find((e) => e._id === selectedEventId) || null;
  const teamOptions = useMemo(() => teams.filter((t) => t.status !== "Banned").slice().sort((a, b) => a.teamName.localeCompare(b.teamName)), [teams]);

  useEffect(() => { if (!selectedEvent && events[0]) setSelectedEventId(events[0]._id); }, [events, selectedEvent]);

  async function refresh(show = true) {
    if (!password || refreshing) return;
    setRefreshing(true);
    if (show) setStatus("Reading latest Google Sheets data...");
    try {
      const response = await fetch("/api/admin/sheet", { cache: "no-store", headers: { "x-admin-password": password, Accept: "application/json" } });
      const result = (await response.json().catch(() => ({}))) as SheetPayload;
      if (!response.ok || result.ok === false) throw new Error(result.message || "Google Sheets refresh failed.");
      if (Array.isArray(result.teams)) setTeams(wrapTeams(result.teams));
      if (Array.isArray(result.events)) setEvents(wrapEvents(result.events));
      if (Array.isArray(result.collaborators)) setCollaborators(result.collaborators);
      if (show) setStatus(`Google Sheets synced — ${result.teams?.length || 0} teams, ${result.events?.length || 0} events.`);
    } catch (error) { setStatus(error instanceof Error ? error.message : "Google Sheets refresh failed."); }
    finally { setRefreshing(false); }
  }

  async function login() {
    try {
      const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body.ok === false) throw new Error(body.message || "Invalid admin password.");
      setUnlocked(true); setLoginError(""); setStatus("Admin unlocked. Loading Google Sheets...");
    } catch (error) { setLoginError(error instanceof Error ? error.message : "Login failed."); }
  }

  function updateTeam(teamId: string, key: keyof RawTeam, value: string) { setTeams((current) => current.map((team) => team._id === teamId ? { ...team, [key]: value } : team)); }
  function updateEvent(eventId: string, key: keyof TrackedEvent, value: string | boolean) { setEvents((current) => current.map((event) => event._id === eventId ? { ...event, [key]: value as never } : event)); }
  function updateResult(eventId: string, index: number, key: keyof EventResult, value: string) { setEvents((current) => current.map((event) => event._id === eventId ? { ...event, results: (event.results || []).map((r, i) => i === index ? { ...r, [key]: value } : r) } : event)); }

  function addTeam() { const next = blankTeam(); setTeams((current) => [next, ...current]); setTab("teams"); setStatus("New team added. Fill the fields and save when ready."); }
  function addEvent() { const next: EventRow = { _id: id("event", events.length), name: "New Event", organizer: "TNFFM", teams: 0, prize: "", status: "Pending", counted: "Grand Finals", date: new Date().toISOString().slice(0, 10), notes: "", matchesPlayed: 6, published: false, results: [] }; setEvents((current) => [next, ...current]); setSelectedEventId(next._id); setTab("ranking"); }
  function addResult(eventId: string, count = 1) { setEvents((current) => current.map((event) => { if (event._id !== eventId) return event; const results = [...(event.results || [])]; for (let i = 0; i < count; i++) results.push({ teamName: "", rank: results.length + 1, positionPoints: 0, kills: 0, booyahs: 0, killRatio: 0, booyahRatio: 0, total: 0 }); return { ...event, results }; })); }
  function removeResult(eventId: string, index: number) { setEvents((current) => current.map((event) => event._id !== eventId ? event : { ...event, results: (event.results || []).filter((_, i) => i !== index).map((r, i) => ({ ...r, rank: i + 1 })) })); }
  function addPlayer(teamId: string) { setTeams((current) => current.map((team) => team._id === teamId ? { ...team, roster: [...(team.roster || []), { name: "", uid: "", role: "", playerLogoUrl: "" }], players: (team.roster || []).length + 1 } : team)); }
  function updatePlayer(teamId: string, index: number, key: "name" | "uid" | "role" | "playerLogoUrl", value: string) { setTeams((current) => current.map((team) => team._id === teamId ? { ...team, roster: (team.roster || []).map((p, i) => i === index ? { ...p, [key]: value } : p) } : team)); }
  function removePlayer(teamId: string, index: number) { setTeams((current) => current.map((team) => team._id === teamId ? { ...team, roster: (team.roster || []).filter((_, i) => i !== index), players: Math.max(0, (team.roster || []).length - 1) } : team)); }
  function addCollaborator() { setCollaborators((current) => [...current, { name: "", role: "Partner", logoUrl: "", url: "" }]); }

  function validate() {
    for (const event of events) {
      if (!event.published) continue;
      const results = (event.results || []).filter((r) => String(r.teamName || "").trim());
      if (!results.length) return `${event.name || "Event"}: cannot publish without results.`;
      if (cleanNumber(event.matchesPlayed) <= 0) return `${event.name || "Event"}: Matches Played must be greater than 0.`;
      const prize = Number(String(event.prize || "").replace(/[^0-9.]/g, "")) || 0;
      const official = String(event.status || "").toLowerCase() === "official" || String(event.prize || "").toLowerCase().includes("official");
      if (!official && prize <= 1000) return `${event.name || "Event"}: prize pool must be above Rs.1000 before publishing.`;
      const names = results.map((r) => String(r.teamName).trim().toLowerCase());
      if (new Set(names).size !== names.length) return `${event.name || "Event"}: duplicate teams are not allowed.`;
      const ranks = results.map((r) => cleanNumber(r.rank));
      if (ranks.some((r) => r < 1 || r > 18)) return `${event.name || "Event"}: ranks must be between 1 and 18.`;
      if (new Set(ranks).size !== ranks.length) return `${event.name || "Event"}: duplicate ranks are not allowed.`;
    }
    return "";
  }

  async function save() {
    if (saving) return;
    const error = validate();
    if (error) { setStatus(error); return; }
    setSaving(true); setStatus("Saving to Google Sheets and verifying the write...");
    try {
      const payloadTeams = teams.map(({ _id, ...team }) => ({ ...team, players: cleanNumber(team.players), kills: cleanNumber(team.kills), booyahs: cleanNumber(team.booyahs), championships: cleanNumber(team.championships), runnerUp: cleanNumber(team.runnerUp), secondRunnerUp: cleanNumber(team.secondRunnerUp), grandFinals: cleanNumber(team.grandFinals), winRate: cleanNumber(team.winRate), killRatio: cleanNumber(team.killRatio), booyahRatio: cleanNumber(team.booyahRatio) }));
      const payloadEvents = events.map(({ _id, ...event }) => ({ ...event, teams: cleanNumber(event.teams), matchesPlayed: cleanNumber(event.matchesPlayed), results: (event.results || []).filter((r) => String(r.teamName || "").trim()).map((r) => normalizeResult({ ...r, rank: cleanNumber(r.rank), positionPoints: cleanNumber(r.positionPoints), kills: cleanNumber(r.kills), booyahs: cleanNumber(r.booyahs) }, cleanNumber(event.matchesPlayed))) }));
      const response = await fetch("/api/admin/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, teams: payloadTeams, events: payloadEvents, collaborators }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body.ok === false) throw new Error(body.message || `Save failed (${response.status}).`);
      setStatus(`✓ Saved and verified. ${body.eventResultsCount ?? 0} event results and ${body.rankingTeamCount ?? 0} community ranking teams processed.`);
      await refresh(false);
    } catch (error) { setStatus(error instanceof Error ? error.message : "Save failed."); }
    finally { setSaving(false); }
  }

  function exportData() { const blob = new Blob([JSON.stringify({ teams, events, collaborators }, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "tnffm-admin-backup.json"; a.click(); URL.revokeObjectURL(url); }

  if (!unlocked) return <section className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-4"><div className="glass w-full rounded-xl p-6"><Lock className="mb-4 h-8 w-8 text-gold" /><h1 className="font-rajdhani text-4xl font-bold uppercase text-white">Admin Login</h1><p className="mt-2 text-sm text-slate-400">Official TNFFM ranking control is available only to the admin.</p><input autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void login()} type="password" placeholder="Admin password" className="mt-6 w-full rounded-lg border border-white/10 bg-black/45 px-4 py-3 text-white outline-none focus:border-gold/60" />{loginError && <p className="mt-3 text-sm text-red-300">{loginError}</p>}<button disabled={!password} onClick={() => void login()} className="mt-4 w-full rounded-lg bg-gold px-4 py-3 font-bold text-black disabled:opacity-50">Unlock</button></div></section>;

  return <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="font-rajdhani text-sm font-bold uppercase tracking-[0.25em] text-gold">Admin</p><h1 className="font-rajdhani text-4xl font-bold uppercase text-white">Community Control Center</h1><p className="mt-2 max-w-3xl text-sm text-slate-400">Stable editing mode: text and number fields keep focus while you type. Values are normalized only when saved.</p></div><div className="flex flex-wrap gap-2"><button onClick={addTeam} className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-3 font-bold text-black"><Plus className="h-4 w-4" />Add Team</button><button onClick={addEvent} className="inline-flex items-center gap-2 rounded-lg border border-gold/30 px-4 py-3 font-bold text-gold"><Plus className="h-4 w-4" />Add Event</button><button disabled={saving} onClick={() => void save()} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-3 font-bold text-white disabled:opacity-60"><Save className="h-4 w-4" />{saving ? "Saving..." : "Save Changes"}</button><button disabled={refreshing} onClick={() => void refresh(true)} className="inline-flex items-center gap-2 rounded-lg border border-gold/30 px-4 py-3 font-bold text-gold disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />Refresh Sheet</button><button onClick={exportData} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-3 font-bold text-slate-200"><Download className="h-4 w-4" />Backup</button></div></div>
    {status && <div className={`mb-5 rounded-lg border px-4 py-3 text-sm font-semibold ${/(failed|error|must|cannot|duplicate|invalid|greater)/i.test(status) ? "border-red-500/30 bg-red-500/10 text-red-200" : "border-gold/25 bg-gold/10 text-gold"}`}>{status}</div>}
    <div className="mb-5 flex gap-2 overflow-x-auto rounded-lg border border-white/10 bg-black/35 p-2">{(["teams", "ranking", "events", "collaborators"] as const).map((item) => <button key={item} onClick={() => setTab(item)} className={`shrink-0 rounded-md px-4 py-2 text-sm font-bold ${tab === item ? "bg-gold text-black" : "text-slate-300 hover:text-gold"}`}>{item === "teams" ? "Registered Teams" : item === "ranking" ? "Official Ranking" : item === "events" ? "Tracked Events" : "Collaborators"}</button>)}</div>

    {tab === "teams" && <div className="space-y-4">{teams.length === 0 && <div className="glass rounded-xl p-8 text-center text-slate-400">No registered teams yet.</div>}{teams.map((team) => <div key={team._id} className="glass rounded-xl p-4"><div className="flex flex-col gap-4 lg:flex-row lg:items-start"><TeamLogo src={team.logoUrl} name={team.teamName} size={72} /><div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"><Field label="Team Name" value={team.teamName} onChange={(v) => updateTeam(team._id, "teamName", v)} /><Field label="Logo URL" value={team.logoUrl} onChange={(v) => updateTeam(team._id, "logoUrl", v)} /><Field label="Banner URL" value={team.bannerUrl || ""} onChange={(v) => updateTeam(team._id, "bannerUrl", v)} /><Field label="Description" value={team.description || ""} onChange={(v) => updateTeam(team._id, "description", v)} /><Field label="Mobile Number" value={team.mobileNumber || ""} onChange={(v) => updateTeam(team._id, "mobileNumber", v)} inputMode="tel" /><Field label="Players" value={team.players ?? ""} onChange={(v) => updateTeam(team._id, "players", v)} inputMode="numeric" /><Field label="Status" value={team.status || "Active"} onChange={(v) => updateTeam(team._id, "status", v)} /></div><button onClick={() => setRosterId(team._id)} className="shrink-0 rounded-lg border border-gold/30 px-3 py-2 text-sm font-bold text-gold">Roster</button></div></div>)}</div>}

    {tab === "events" && <div className="space-y-4">{events.map((event) => <div key={event._id} className="glass rounded-xl p-4"><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"><Field label="Event Name" value={event.name} onChange={(v) => updateEvent(event._id, "name", v)} /><Field label="Organizer" value={event.organizer} onChange={(v) => updateEvent(event._id, "organizer", v)} /><Field label="Teams" value={event.teams ?? ""} onChange={(v) => updateEvent(event._id, "teams", v)} inputMode="numeric" /><Field label="Prize" value={event.prize} onChange={(v) => updateEvent(event._id, "prize", v)} /><Field label="Status" value={event.status} onChange={(v) => updateEvent(event._id, "status", v)} /><Field label="Date" value={event.date} onChange={(v) => updateEvent(event._id, "date", v)} /><Field label="Notes" value={event.notes || ""} onChange={(v) => updateEvent(event._id, "notes", v)} /><Field label="Matches Played" value={event.matchesPlayed ?? ""} onChange={(v) => updateEvent(event._id, "matchesPlayed", v)} inputMode="numeric" /></div><div className="mt-3 flex flex-wrap gap-2"><button onClick={() => { setSelectedEventId(event._id); setTab("ranking"); }} className="rounded-lg bg-gold px-4 py-2 text-sm font-bold text-black">Enter Final Ranking</button><button onClick={() => updateEvent(event._id, "published", !event.published)} className={`rounded-lg border px-4 py-2 text-sm font-bold ${event.published ? "border-green-500/40 text-green-300" : "border-white/10 text-slate-300"}`}>{event.published ? "Published" : "Draft"}</button></div></div>)}</div>}

    {tab === "ranking" && <div className="space-y-5"><div className="glass rounded-xl p-4"><div className="grid grid-cols-1 gap-3 md:grid-cols-4"><Field label="Event Name" value={selectedEvent?.name || ""} onChange={(v) => selectedEvent && updateEvent(selectedEvent._id, "name", v)} /><Field label="Matches Played" value={selectedEvent?.matchesPlayed ?? ""} onChange={(v) => selectedEvent && updateEvent(selectedEvent._id, "matchesPlayed", v)} inputMode="numeric" /><Field label="Prize Pool" value={selectedEvent?.prize || ""} onChange={(v) => selectedEvent && updateEvent(selectedEvent._id, "prize", v)} /><label className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/30 px-3 py-3 text-sm text-slate-200"><input type="checkbox" checked={Boolean(selectedEvent?.published)} disabled={!selectedEvent} onChange={(e) => selectedEvent && updateEvent(selectedEvent._id, "published", e.target.checked)} className="h-4 w-4 accent-yellow-400" /><span><b>Publish official ranking</b><span className="ml-2 text-xs text-slate-500">Only published events count.</span></span></label></div><div className="mt-3 flex flex-wrap gap-2"><select value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)} className="min-w-56 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none"><option value="">Select event</option>{events.map((event) => <option key={event._id} value={event._id}>{event.name || "Untitled event"}</option>)}</select>{selectedEvent && <><button onClick={() => addResult(selectedEvent._id)} className="rounded-lg border border-gold/30 px-3 py-2 text-sm font-bold text-gold"><Plus className="mr-1 inline h-4 w-4" />Add Result</button><button onClick={() => addResult(selectedEvent._id, Math.max(0, 18 - (selectedEvent.results || []).length))} className="rounded-lg border border-gold/30 px-3 py-2 text-sm font-bold text-gold">Fill 18 Positions</button></>}</div></div>{selectedEvent && <div className="glass overflow-hidden rounded-xl"><div className="overflow-x-auto"><table className="w-full min-w-[1120px] text-left text-sm"><thead className="bg-white/[0.04] text-[11px] uppercase tracking-wider text-slate-500"><tr><th className="px-3 py-3">Rank</th><th className="px-3 py-3">Team</th><th className="px-3 py-3">Position Pts</th><th className="px-3 py-3">Kills</th><th className="px-3 py-3">Kill Ratio</th><th className="px-3 py-3">Booyah</th><th className="px-3 py-3">Booyah Ratio</th><th className="px-3 py-3">Total</th><th className="px-3 py-3">Action</th></tr></thead><tbody>{(selectedEvent.results || []).map((result, index) => { const normalized = normalizeResult(result, cleanNumber(selectedEvent.matchesPlayed)); return <tr key={`result-${index}`} className="border-t border-white/5"><td className="px-3 py-2"><TextInput value={result.rank ?? ""} onChange={(v) => updateResult(selectedEvent._id, index, "rank", v)} inputMode="numeric" /></td><td className="px-3 py-2"><select value={result.teamName || ""} onChange={(e) => updateResult(selectedEvent._id, index, "teamName", e.target.value)} className="w-64 rounded-md border border-white/10 bg-black/40 px-2 py-2 text-white"><option value="">Select team</option>{teamOptions.map((team) => <option key={team._id} value={team.teamName}>{team.teamName}</option>)}</select></td><td className="px-3 py-2"><TextInput value={result.positionPoints ?? ""} onChange={(v) => updateResult(selectedEvent._id, index, "positionPoints", v)} inputMode="numeric" /></td><td className="px-3 py-2"><TextInput value={result.kills ?? ""} onChange={(v) => updateResult(selectedEvent._id, index, "kills", v)} inputMode="numeric" /></td><td className="px-3 py-2 font-bold text-gold">{normalized.killRatio.toFixed(2)}</td><td className="px-3 py-2"><TextInput value={result.booyahs ?? ""} onChange={(v) => updateResult(selectedEvent._id, index, "booyahs", v)} inputMode="numeric" /></td><td className="px-3 py-2 font-bold text-gold">{normalized.booyahRatio.toFixed(2)}%</td><td className="px-3 py-2 text-lg font-bold text-white">{normalized.total}</td><td className="px-3 py-2"><button onClick={() => removeResult(selectedEvent._id, index)} className="rounded-md border border-red-500/30 p-2 text-red-300" title="Remove result"><Trash2 className="h-4 w-4" /></button></td></tr>; })}</tbody></table></div>{!(selectedEvent.results || []).length && <div className="p-8 text-center text-slate-400">Add results or fill 18 positions. Ratios and totals are calculated automatically.</div>}</div>}</div>}

    {tab === "collaborators" && <div className="space-y-4"><button onClick={addCollaborator} className="rounded-lg border border-gold/30 px-4 py-2 font-bold text-gold"><Plus className="mr-1 inline h-4 w-4" />Add Collaborator</button>{collaborators.map((item, index) => <div key={`collab-${index}`} className="glass rounded-xl p-4"><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"><Field label="Name" value={item.name} onChange={(v) => setCollaborators((c) => c.map((x, i) => i === index ? { ...x, name: v } : x))} /><Field label="Role" value={item.role} onChange={(v) => setCollaborators((c) => c.map((x, i) => i === index ? { ...x, role: v } : x))} /><Field label="Logo URL" value={item.logoUrl} onChange={(v) => setCollaborators((c) => c.map((x, i) => i === index ? { ...x, logoUrl: v } : x))} /><Field label="URL" value={item.url} onChange={(v) => setCollaborators((c) => c.map((x, i) => i === index ? { ...x, url: v } : x))} /></div><button onClick={() => setCollaborators((c) => c.filter((_, i) => i !== index))} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-500/30 px-3 py-2 text-sm font-bold text-red-300"><Trash2 className="h-4 w-4" />Remove</button></div>)}</div>}

    {rosterId && teams.find((t) => t._id === rosterId) && <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4"><div className="glass max-h-[85vh] w-full max-w-3xl overflow-auto rounded-xl p-5"><div className="mb-4 flex items-center justify-between"><h2 className="font-rajdhani text-2xl font-bold uppercase text-white">{teams.find((t) => t._id === rosterId)?.teamName} Roster</h2><button onClick={() => setRosterId(null)} className="rounded-md p-2 text-slate-300"><X className="h-5 w-5" /></button></div>{(teams.find((t) => t._id === rosterId)?.roster || []).map((player, index) => <div key={`player-${index}`} className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.5fr_auto]"><Field label={`Player ${index + 1}`} value={player.name} onChange={(v) => updatePlayer(rosterId, index, "name", v)} /><Field label="UID" value={player.uid} onChange={(v) => updatePlayer(rosterId, index, "uid", v)} /><Field label="Role" value={player.role || ""} onChange={(v) => updatePlayer(rosterId, index, "role", v)} /><Field label="Player Logo URL" value={player.playerLogoUrl || ""} onChange={(v) => updatePlayer(rosterId, index, "playerLogoUrl", v)} /><button onClick={() => removePlayer(rosterId, index)} className="self-end rounded-lg border border-red-500/30 p-3 text-red-300"><Trash2 className="h-4 w-4" /></button></div>)}<button onClick={() => addPlayer(rosterId)} className="mt-2 rounded-lg bg-gold px-4 py-2 font-bold text-black"><Plus className="mr-1 inline h-4 w-4" />Add Player</button></div></div>}
  </section>;
}

function TextInput({ value, onChange, inputMode = "text" }: { value: string | number; onChange: (value: string) => void; inputMode?: "text" | "numeric" | "tel" | "decimal" }) { return <input type="text" inputMode={inputMode} value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="w-24 rounded-md border border-white/10 bg-black/40 px-2 py-2 text-white outline-none focus:border-gold/60" />; }
function Field({ label, value, onChange, inputMode = "text" }: { label: string; value: string | number; onChange: (value: string) => void; inputMode?: "text" | "numeric" | "tel" | "decimal" }) { return <label className="block min-w-0"><span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span><input type="text" inputMode={inputMode} value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="w-full min-w-0 rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none transition focus:border-gold/60" /></label>; }
