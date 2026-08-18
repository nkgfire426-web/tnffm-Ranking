"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Lock, Plus, Save, Trash2, Upload, X } from "lucide-react";
import { calculateCommunityPoints } from "@/lib/rankings";
import type { TrackedEvent } from "@/lib/events";
import type { RawTeam } from "@/lib/types";
import { TeamLogo } from "./TeamLogo";

type Collaborator = { name: string; role: string; logoUrl: string; url: string };

export function AdminDashboard({ initialTeams, initialEvents, initialCollaborators }: { initialTeams: RawTeam[]; initialEvents: TrackedEvent[]; initialCollaborators?: Collaborator[] }) {
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [saveInProgress, setSaveInProgress] = useState(false);
  const [pendingEditSlug, setPendingEditSlug] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"teams" | "events" | "collaborators">("teams");
  const [teams, setTeams] = useState<RawTeam[]>(initialTeams);
  const [events, setEvents] = useState<TrackedEvent[]>(initialEvents);
  const [collaborators, setCollaborators] = useState<Collaborator[]>(initialCollaborators || []);
  const [editingRosterIndex, setEditingRosterIndex] = useState<number | null>(null);
  const totalPreviewPoints = useMemo(() => teams.reduce((sum, team) => sum + calculateCommunityPoints(team), 0), [teams]);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const edit = params.get("edit");
      if (edit) setPendingEditSlug(edit);
    } catch {}
    try {
      const saved = window.localStorage.getItem("tnffm-admin-teams");
      if (saved) setTeams(JSON.parse(saved) as RawTeam[]);
    } catch { try { window.localStorage.removeItem("tnffm-admin-teams"); } catch {} }
    try {
      const saved = window.localStorage.getItem("tnffm-admin-events");
      if (saved) setEvents(JSON.parse(saved) as TrackedEvent[]);
    } catch { try { window.localStorage.removeItem("tnffm-admin-events"); } catch {} }
    try {
      const saved = window.localStorage.getItem("tnffm-admin-collaborators");
      if (saved) setCollaborators(JSON.parse(saved) as Collaborator[]);
    } catch { try { window.localStorage.removeItem("tnffm-admin-collaborators"); } catch {} }
  }, []);

  useEffect(() => {
    if (!pendingEditSlug || !unlocked) return;
    const idx = teams.findIndex((t) => (t as any).slug === pendingEditSlug);
    if (idx >= 0) {
      setEditingRosterIndex(idx);
      setPendingEditSlug(null);
    }
  }, [pendingEditSlug, unlocked, teams]);

  async function login() {
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      if (response.ok) {
        setUnlocked(true);
        setLoginError("");
      } else {
        setLoginError("Invalid admin password.");
      }
    } catch {
      setLoginError("Login failed — check server connection.");
    }
  }

  function update(index: number, key: keyof RawTeam, value: string) {
    setTeams((current) => current.map((team, i) => i === index ? {
      ...team,
      [key]: ["teamName", "logoUrl", "description", "bannerUrl", "status"].includes(String(key)) ? value : Number(value)
    } : team));
  }

  function updateEvent(index: number, key: keyof TrackedEvent, value: string) {
    setEvents((current) => current.map((event, i) => i === index ? { ...event, [key]: key === "teams" ? Number(value) : value } : event));
  }

  function addTeam() {
    setTeams((current) => [...current, {
      teamName: "New Team",
      logoUrl: "",
      kills: 0,
      booyahs: 0,
      championships: 0,
      runnerUp: 0,
      secondRunnerUp: 0,
      top5Finishes: 0,
      finalistFinishes: 0,
      officialMatchFinalists: 0,
      eventsPlayed: 0,
      grandFinals: 0,
      winRate: 0,
      killRatio: 0,
      players: 5,
      roster: [],
      status: "Active"
    }]);
  }

  function openRoster(index: number) { setEditingRosterIndex(index); }
  function closeRoster() { setEditingRosterIndex(null); }

  function addRosterPlayer(index: number) {
    setTeams((current) => current.map((team, i) => i === index ? { ...team, roster: [...(team.roster || []), { name: "", uid: "" }] } : team));
  }

  function updateRosterPlayer(teamIndex: number, playerIndex: number, key: "name" | "uid", value: string) {
    setTeams((current) => current.map((team, i) => {
      if (i !== teamIndex) return team;
      return { ...team, roster: (team.roster || []).map((p, pi) => pi === playerIndex ? { ...p, [key]: value } : p) };
    }));
  }

  function removeRosterPlayer(teamIndex: number, playerIndex: number) {
    setTeams((current) => current.map((team, i) => i === teamIndex ? { ...team, roster: (team.roster || []).filter((_, pi) => pi !== playerIndex) } : team));
  }

  function addEvent() {
    setEvents((current) => [...current, {
      name: "New Verified Event",
      organizer: "TNFFM Verified",
      teams: 24,
      prize: "Rs.1000",
      status: "Pending",
      counted: "Grand Finals",
      date: new Date().toISOString().slice(0, 10),
      notes: "Awaiting verification."
    }]);
    setActiveTab("events");
  }

  function addCollaborator() {
    setCollaborators((current) => [...current, { name: "New", role: "Partner", logoUrl: "", url: "" }]);
    setActiveTab("collaborators");
  }

  function updateCollaborator(index: number, key: keyof Collaborator, value: string) {
    setCollaborators((current) => current.map((c, i) => i === index ? { ...c, [key]: value } : c));
  }

  function removeCollaborator(index: number) {
    setCollaborators((current) => current.filter((_, i) => i !== index));
  }

  function removeLogo(index: number) { update(index, "logoUrl", ""); }

  function exportAdminData() {
    const blob = new Blob([JSON.stringify({ teams, events, collaborators }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "tnffm-admin-data.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function syncToSheet() {
    setSaveStatus("Syncing...");
    try {
      const response = await fetch("/api/admin/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, teams })
      });
      setSaveStatus(response.ok ? "Sync request sent to Google Sheets webhook." : "Set GOOGLE_SHEETS_WEBHOOK_URL to enable dashboard write-back.");
    } catch {
      setSaveStatus("Sync failed — server unreachable.");
    }
  }

  async function saveLocally() {
    window.localStorage.setItem("tnffm-admin-teams", JSON.stringify(teams));
    window.localStorage.setItem("tnffm-admin-events", JSON.stringify(events));
    window.localStorage.setItem("tnffm-admin-collaborators", JSON.stringify(collaborators));
    setSaveInProgress(true);
    setSaveStatus("Saving changes...");
    try {
      const numericKeys = ["kills", "booyahs", "championships", "runnerUp", "secondRunnerUp", "top5Finishes", "finalistFinishes", "officialMatchFinalists", "eventsPlayed", "grandFinals", "winRate", "killRatio", "players", "previousRank", "communityPoints", "top3Finishes", "rank"];
      const normalizedTeams = teams.map((team) => {
        const copy: any = { ...team };
        numericKeys.forEach((key) => {
          if (key in copy) copy[key] = typeof copy[key] === "number" ? copy[key] : Number(String(copy[key] || "").trim()) || 0;
        });
        return copy;
      });
      const response = await fetch("/api/admin/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, teams: normalizedTeams, events, collaborators })
      });
      const bodyText = await response.text().catch(() => "");
      setSaveStatus(response.ok ? "Changes saved." : `Save failed: ${response.status} ${bodyText}`);
    } catch {
      setSaveStatus("Save failed — server unreachable. Changes remain in browser storage.");
    } finally {
      setSaveInProgress(false);
    }
  }

  if (!unlocked) {
    return (
      <section className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-4">
        <div className="glass w-full rounded-lg p-6">
          <Lock className="mb-4 h-8 w-8 text-gold" />
          <h1 className="font-rajdhani text-4xl font-bold uppercase text-white">Admin Login</h1>
          <p className="mt-2 text-sm text-slate-400">Enter the admin password to manage teams, logos, rankings, and tracked events.</p>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Admin password" className="mt-6 w-full rounded-lg border border-white/10 bg-black/45 px-4 py-3 text-white outline-none focus:border-gold/60" />
          {loginError && <p className="mt-3 text-sm text-red-300">{loginError}</p>}
          <button onClick={login} className="mt-4 w-full rounded-lg bg-gold px-4 py-3 font-bold text-black transition hover:bg-yellow-300">Unlock</button>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-rajdhani text-sm font-bold uppercase tracking-[0.25em] text-gold">Admin Login</p>
          <h1 className="font-rajdhani text-4xl font-bold uppercase text-white">Control Center</h1>
          <p className="mt-2 text-sm text-slate-400">Manage team rankings and tracked event logs. Preview total: {totalPreviewPoints.toLocaleString()} CP.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={addTeam} className="inline-flex items-center justify-center gap-2 rounded-lg bg-gold px-4 py-3 font-bold text-black"><Plus className="h-4 w-4" />Add Team</button>
          <button onClick={addEvent} className="inline-flex items-center justify-center gap-2 rounded-lg border border-gold/30 px-4 py-3 font-bold text-gold transition hover:bg-gold hover:text-black"><Plus className="h-4 w-4" />Add Event</button>
          <button disabled={saveInProgress} onClick={saveLocally} className={`inline-flex items-center justify-center gap-2 rounded-lg ${saveInProgress ? "bg-gray-600" : "bg-red-600"} px-4 py-3 font-bold text-white transition hover:bg-red-500 disabled:opacity-60`}><Save className="h-4 w-4" />{saveInProgress ? "Saving..." : "Save Changes"}</button>
          <button onClick={syncToSheet} className="inline-flex items-center justify-center gap-2 rounded-lg border border-gold/30 px-4 py-3 font-bold text-gold"><Upload className="h-4 w-4" />Sync Sheet</button>
          <button onClick={exportAdminData} className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-3 font-bold text-slate-200 transition hover:border-gold/40 hover:text-gold"><Download className="h-4 w-4" />Export Data</button>
        </div>
      </div>

      {saveStatus && <div className="mb-5 rounded-lg border border-gold/25 bg-gold/10 px-4 py-3 text-sm font-semibold text-gold">{saveStatus}</div>}

      <div className="mb-5 flex gap-2 rounded-lg border border-white/10 bg-black/35 p-2">
        {(["teams", "events", "collaborators"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`rounded-md px-4 py-2 text-sm font-bold transition ${activeTab === tab ? "bg-gold text-black" : "text-slate-300 hover:text-gold"}`}>
            {tab === "teams" ? "Team Rankings" : tab === "events" ? "Tracked Events" : "Collaborators"}
          </button>
        ))}
      </div>

      {activeTab === "teams" && (
        <>
          <div className="glass overflow-hidden rounded-lg">
            <div className="overflow-x-auto">
              <table className="min-w-[1700px] w-full text-left text-sm">
                <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.14em] text-slate-500">
                  <tr>{["Team", "Team Logo URL", "Champion", "Runner-Up", "2nd Runner-Up", "Top 5", "Finalist", "Official FF MAX", "Events", "Players", "Status", "Description", "CP", "Actions"].map((heading) => <th key={heading} className="px-3 py-4">{heading}</th>)}</tr>
                </thead>
                <tbody>
                  {teams.map((team, index) => (
                    <tr key={`${team.teamName}-${index}`} className="border-t border-white/5">
                      <EditCell value={team.teamName} onChange={(value) => update(index, "teamName", value)} wide />
                      <td className="px-3 py-3">
                        <div className="flex min-w-[360px] items-center gap-3">
                          <TeamLogo src={team.logoUrl} name={team.teamName} size={48} />
                          <div className="flex flex-1 items-center gap-2">
                            <input value={team.logoUrl || ""} onChange={(e) => update(index, "logoUrl", e.target.value)} placeholder="Paste logo URL" className="w-64 rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white outline-none focus:border-gold/60" />
                            <button onClick={() => removeLogo(index)} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-red-400/50 hover:text-red-300"><X className="h-4 w-4" />Remove</button>
                          </div>
                        </div>
                      </td>
                      <EditCell value={team.championships} onChange={(value) => update(index, "championships", value)} numeric />
                      <EditCell value={team.runnerUp} onChange={(value) => update(index, "runnerUp", value)} numeric />
                      <EditCell value={team.secondRunnerUp} onChange={(value) => update(index, "secondRunnerUp", value)} numeric />
                      <EditCell value={team.top5Finishes || 0} onChange={(value) => update(index, "top5Finishes", value)} numeric />
                      <EditCell value={team.finalistFinishes || team.grandFinals || 0} onChange={(value) => update(index, "finalistFinishes", value)} numeric />
                      <EditCell value={team.officialMatchFinalists || 0} onChange={(value) => update(index, "officialMatchFinalists", value)} numeric />
                      <EditCell value={team.eventsPlayed || 0} onChange={(value) => update(index, "eventsPlayed", value)} numeric />
                      <EditCell value={team.players || 5} onChange={(value) => update(index, "players", value)} numeric />
                      <EditCell value={team.status || "Active"} onChange={(value) => update(index, "status", value)} />
                      <EditCell value={team.description || ""} onChange={(value) => update(index, "description", value)} wide />
                      <td className="px-3 py-3 font-rajdhani text-xl font-bold text-gold">{calculateCommunityPoints(team).toLocaleString()}</td>
                      <td className="px-3 py-3"><div className="flex items-center gap-2"><button onClick={() => openRoster(index)} className="rounded-lg border border-white/10 p-2 text-slate-200">Details</button><button onClick={() => setTeams((current) => current.filter((_, i) => i !== index))} className="rounded-lg border border-red-400/30 p-2 text-red-300"><Trash2 className="h-4 w-4" /></button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {editingRosterIndex !== null && teams[editingRosterIndex] && (
            <div className="mt-4 glass rounded-lg p-4">
              <div className="mb-3 flex items-center justify-between"><h3 className="text-lg font-semibold text-white">Edit Roster — {teams[editingRosterIndex].teamName}</h3><div className="flex gap-2"><button onClick={() => addRosterPlayer(editingRosterIndex)} className="rounded-lg bg-gold px-3 py-2 font-semibold text-black">Add Player</button><button onClick={closeRoster} className="rounded-lg border border-white/10 px-3 py-2 text-slate-200">Close</button></div></div>
              <div className="grid gap-3">
                {(teams[editingRosterIndex].roster || []).map((player, playerIndex) => (
                  <div key={playerIndex} className="flex items-center gap-3"><input value={player.name} onChange={(e) => updateRosterPlayer(editingRosterIndex, playerIndex, "name", e.target.value)} placeholder="Player name" className="w-64 rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white" /><input value={player.uid} onChange={(e) => updateRosterPlayer(editingRosterIndex, playerIndex, "uid", e.target.value)} placeholder="In-game UID" className="w-48 rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white" /><button onClick={() => removeRosterPlayer(editingRosterIndex, playerIndex)} className="rounded-lg border border-red-400/30 p-2 text-red-300">Remove</button></div>
                ))}
                {(teams[editingRosterIndex].roster || []).length === 0 && <div className="text-sm text-slate-400">No players yet. Use Add Player to create entries.</div>}
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === "events" && (
        <div className="glass overflow-hidden rounded-lg">
          <div className="overflow-x-auto"><table className="min-w-[1180px] w-full text-left text-sm"><thead className="bg-white/[0.04] text-xs uppercase tracking-[0.14em] text-slate-500"><tr>{["Event Name", "Date", "Organizer", "Teams", "Prize Pool", "Status", "Counted Result", "Notes", "Actions"].map((heading) => <th key={heading} className="px-3 py-4">{heading}</th>)}</tr></thead>
            <tbody>{events.map((event, index) => <tr key={`${event.name}-${index}`} className="border-t border-white/5"><EditCell value={event.name} onChange={(value) => updateEvent(index, "name", value)} wide /><EditCell value={event.date} onChange={(value) => updateEvent(index, "date", value)} /><EditCell value={event.organizer} onChange={(value) => updateEvent(index, "organizer", value)} wide /><EditCell value={event.teams} onChange={(value) => updateEvent(index, "teams", value)} numeric /><EditCell value={event.prize} onChange={(value) => updateEvent(index, "prize", value)} /><EditCell value={event.status} onChange={(value) => updateEvent(index, "status", value)} /><EditCell value={event.counted} onChange={(value) => updateEvent(index, "counted", value)} wide /><EditCell value={event.notes || ""} onChange={(value) => updateEvent(index, "notes", value)} wide /><td className="px-3 py-3"><button onClick={() => setEvents((current) => current.filter((_, i) => i !== index))} className="rounded-lg border border-red-400/30 p-2 text-red-300"><Trash2 className="h-4 w-4" /></button></td></tr>)}</tbody>
          </table></div>
        </div>
      )}

      {activeTab === "collaborators" && (
        <div className="glass overflow-hidden rounded-lg p-4">
          <div className="mb-3 flex items-center justify-between"><h3 className="text-lg font-semibold text-white">Collaborators</h3><button onClick={addCollaborator} className="rounded-lg bg-gold px-3 py-2 font-semibold text-black">Add Collaborator</button></div>
          <div className="overflow-x-auto"><table className="min-w-[900px] w-full text-left text-sm"><thead className="bg-white/[0.04] text-xs uppercase tracking-[0.14em] text-slate-500"><tr>{["Name", "Role", "Logo URL", "Link", "Actions"].map((heading) => <th key={heading} className="px-3 py-3">{heading}</th>)}</tr></thead>
            <tbody>{collaborators.map((collaborator, index) => <tr key={`${collaborator.name}-${index}`} className="border-t border-white/5"><EditCell value={collaborator.name} onChange={(value) => updateCollaborator(index, "name", value)} /><EditCell value={collaborator.role} onChange={(value) => updateCollaborator(index, "role", value)} /><td className="px-3 py-3"><div className="flex items-center gap-3">{collaborator.logoUrl ? <img src={collaborator.logoUrl} alt={collaborator.name} className="h-10 w-10 rounded object-cover" /> : <div className="h-10 w-10 rounded bg-white/5" />}<input value={collaborator.logoUrl || ""} onChange={(e) => updateCollaborator(index, "logoUrl", e.target.value)} placeholder="Paste logo URL" className="w-72 rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white outline-none focus:border-gold/60" /><button onClick={() => updateCollaborator(index, "logoUrl", "")} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300">Remove</button></div></td><EditCell value={collaborator.url || ""} onChange={(value) => updateCollaborator(index, "url", value)} wide /><td className="px-3 py-3"><button onClick={() => removeCollaborator(index)} className="rounded-lg border border-red-400/30 p-2 text-red-300">Remove</button></td></tr>)}</tbody>
          </table></div>
        </div>
      )}

      <div className="mt-5 glass rounded-lg p-5 text-sm text-slate-400"><div className="mb-2 flex items-center gap-2 font-semibold text-gold"><Save className="h-4 w-4" />Google Sheets workflow</div>Use Save Changes to update this local website. Paste public image URLs into the Team Logo URL or Collaborator Logo URL fields, then Save Changes to write them to Google Sheets.</div>
    </section>
  );
}

function EditCell({ value, onChange, wide = false, numeric = false }: { value: string | number; onChange: (value: string) => void; wide?: boolean; numeric?: boolean }) {
  const [inputValue, setInputValue] = useState(String(value ?? ""));
  useEffect(() => { setInputValue(String(value ?? "")); }, [value]);
  return <td className="px-3 py-3"><input type="text" value={inputValue} onChange={(event) => setInputValue(event.target.value)} onBlur={() => onChange(inputValue)} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} inputMode={numeric ? "numeric" : undefined} className={`${wide ? "w-80" : "w-28"} rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white outline-none transition focus:border-gold/60 focus:bg-black/70`} /></td>;
}
