"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Download, Lock, Plus, Save, Trash2, Upload, X } from "lucide-react";
import { calculateCommunityPoints } from "@/lib/rankings";
import type { TrackedEvent } from "@/lib/events";
import type { RawTeam } from "@/lib/types";
import { TeamLogo } from "./TeamLogo";

export function AdminDashboard({ initialTeams, initialEvents, initialCollaborators }: { initialTeams: RawTeam[]; initialEvents: TrackedEvent[]; initialCollaborators?: any[] }) {
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [saveInProgress, setSaveInProgress] = useState(false);
  const [pendingEditSlug, setPendingEditSlug] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"teams" | "events" | "collaborators">("teams");
  const [teams, setTeams] = useState(initialTeams);
  const [events, setEvents] = useState(initialEvents);
  const [collaborators, setCollaborators] = useState<any[]>(initialCollaborators || []);
  const totalPreviewPoints = useMemo(() => teams.reduce((sum, team) => sum + calculateCommunityPoints(team), 0), [teams]);

  useEffect(() => {
    // Check URL for ?edit=slug deep link
    try {
      const params = new URLSearchParams(window.location.search);
      const edit = params.get("edit");
      if (edit) setPendingEditSlug(edit);
    } catch {}

    // Load saved teams if present (do not early-return; keep loading events too)
    try {
      const savedTeams = window.localStorage.getItem("tnffm-admin-teams");
      if (savedTeams) {
        setTeams(JSON.parse(savedTeams) as RawTeam[]);
      }
    } catch (err) {
      try {
        window.localStorage.removeItem("tnffm-admin-teams");
      } catch {}
    }

    try {
      const savedEvents = window.localStorage.getItem("tnffm-admin-events");
      if (savedEvents) {
        setEvents(JSON.parse(savedEvents) as TrackedEvent[]);
      }
    } catch (err) {
      try {
        window.localStorage.removeItem("tnffm-admin-events");
      } catch {}
    }
    try {
      const savedCollab = window.localStorage.getItem("tnffm-admin-collaborators");
      if (savedCollab) setCollaborators(JSON.parse(savedCollab));
    } catch {
      try { window.localStorage.removeItem("tnffm-admin-collaborators"); } catch {}
    }
  }, []);

  useEffect(() => {
    if (!pendingEditSlug) return;
    if (!unlocked) return; // wait until unlocked for security
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
    } catch (err) {
      setLoginError("Login failed — check server connection.");
    }
  }

  function update(index: number, key: keyof RawTeam, value: string) {
    setTeams((current) =>
      current.map((team, teamIndex) =>
        teamIndex === index
          ? {
              ...team,
              [key]: ["teamName", "logoUrl", "description", "bannerUrl", "status"].includes(String(key)) ? value : Number(value)
            }
          : team
      )
    );
  }

  function updateEvent(index: number, key: keyof TrackedEvent, value: string) {
    setEvents((current) =>
      current.map((event, eventIndex) =>
        eventIndex === index
          ? {
              ...event,
              [key]: key === "teams" ? Number(value) : value
            }
          : event
      )
    );
  }

  function addTeam() {
    setTeams((current) => [
      ...current,
      {
        teamName: "New Team",
        logoUrl: "https://api.dicebear.com/8.x/shapes/svg?seed=New-Team",
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
      }
    ]);
  }

  const [editingRosterIndex, setEditingRosterIndex] = useState<number | null>(null);

  function openRoster(index: number) {
    setEditingRosterIndex(index);
  }

  function closeRoster() {
    setEditingRosterIndex(null);
  }

  function addRosterPlayer(index: number) {
    setTeams((current) =>
      current.map((team, i) => (i === index ? { ...team, roster: [...(team.roster || []), { name: "", uid: "" }] } : team))
    );
  }

  function updateRosterPlayer(teamIndex: number, playerIndex: number, key: "name" | "uid", value: string) {
    setTeams((current) =>
      current.map((team, i) => {
        if (i !== teamIndex) return team;
        const roster = (team.roster || []).map((p, pi) => (pi === playerIndex ? { ...p, [key]: value } : p));
        return { ...team, roster };
      })
    );
  }

  function removeRosterPlayer(teamIndex: number, playerIndex: number) {
    setTeams((current) =>
      current.map((team, i) => {
        if (i !== teamIndex) return team;
        const roster = (team.roster || []).filter((_, pi) => pi !== playerIndex);
        return { ...team, roster };
      })
    );
  }

  function addEvent() {
    setEvents((current) => [
      ...current,
      {
        name: "New Verified Event",
        organizer: "TNFFM Verified",
        teams: 24,
        prize: "Rs.1000",
        status: "Pending",
        counted: "Grand Finals",
        date: new Date().toISOString().slice(0, 10),
        notes: "Awaiting verification."
      }
    ]);
    setActiveTab("events");
  }

  function addCollaborator() {
    setCollaborators((c) => [...c, { name: "New", role: "Partner", logoUrl: "", url: "" }]);
    setActiveTab("collaborators");
  }

  function updateCollaborator(index: number, key: string, value: string) {
    setCollaborators((current) => current.map((c, i) => (i === index ? { ...c, [key]: value } : c)));
  }

  function removeCollaborator(index: number) {
    setCollaborators((current) => current.filter((_, i) => i !== index));
  }

  function uploadCollaboratorLogo(index: number, file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateCollaborator(index, "logoUrl", String(reader.result || ""));
    reader.readAsDataURL(file);
  }

  function uploadLogo(index: number, file: File | null) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      update(index, "logoUrl", String(reader.result || ""));
    };
    reader.readAsDataURL(file);
  }

  function removeLogo(index: number) {
    update(index, "logoUrl", "");
  }

  function exportAdminData() {
    const blob = new Blob([JSON.stringify({ teams, events }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "tnffm-admin-data.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function syncToSheet() {
    setSaveStatus("Syncing...");
    const response = await fetch("/api/admin/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, teams })
    });
    setSaveStatus(response.ok ? "Sync request sent to Google Sheets webhook." : "Set GOOGLE_SHEETS_WEBHOOK_URL to enable dashboard write-back.");
  }

  async function saveLocally() {
    window.localStorage.setItem("tnffm-admin-teams", JSON.stringify(teams));
    window.localStorage.setItem("tnffm-admin-events", JSON.stringify(events));
    window.localStorage.setItem("tnffm-admin-collaborators", JSON.stringify(collaborators));
    setSaveInProgress(true);
    setSaveStatus("Saving changes...");
    try {
      // Normalize numeric fields before sending to server
      const numericKeys = [
        "kills",
        "booyahs",
        "championships",
        "runnerUp",
        "secondRunnerUp",
        "top5Finishes",
        "finalistFinishes",
        "officialMatchFinalists",
        "eventsPlayed",
        "grandFinals",
        "winRate",
        "killRatio",
        "players",
        "previousRank",
        "communityPoints",
        "top3Finishes",
        "rank"
      ];

      const normalizedTeams = teams.map((t) => {
        const copy: any = { ...t };
        numericKeys.forEach((k) => {
          if (k in copy) {
            const v = copy[k];
            copy[k] = typeof v === "number" ? v : Number(String(v || "").trim()) || 0;
          }
        });
        return copy;
      });

      const resp = await fetch("/api/admin/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, teams: normalizedTeams, events, collaborators }) });
      const bodyText = await resp.text().catch(() => "");
      if (resp.ok) {
        setSaveStatus("Changes saved.");
      } else {
        setSaveStatus(`Save failed: ${resp.status} ${bodyText}`);
      }
    } catch (err) {
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
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            placeholder="Admin password"
            className="mt-6 w-full rounded-lg border border-white/10 bg-black/45 px-4 py-3 text-white outline-none focus:border-gold/60"
          />
          {loginError && <p className="mt-3 text-sm text-red-300">{loginError}</p>}
          <button onClick={login} className="mt-4 w-full rounded-lg bg-gold px-4 py-3 font-bold text-black transition hover:bg-yellow-300">
            Unlock
          </button>
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
          <button onClick={addTeam} className="inline-flex items-center justify-center gap-2 rounded-lg bg-gold px-4 py-3 font-bold text-black">
            <Plus className="h-4 w-4" />
            Add Team
          </button>
          <button onClick={addEvent} className="inline-flex items-center justify-center gap-2 rounded-lg border border-gold/30 px-4 py-3 font-bold text-gold transition hover:bg-gold hover:text-black">
            <Plus className="h-4 w-4" />
            Add Event
          </button>
          <button disabled={saveInProgress} onClick={saveLocally} className={`inline-flex items-center justify-center gap-2 rounded-lg ${saveInProgress ? "bg-gray-600" : "bg-red-600"} px-4 py-3 font-bold text-white transition hover:bg-red-500 disabled:opacity-60`}>
            <Save className="h-4 w-4" />
            {saveInProgress ? "Saving..." : "Save Changes"}
          </button>
          <button onClick={syncToSheet} className="inline-flex items-center justify-center gap-2 rounded-lg border border-gold/30 px-4 py-3 font-bold text-gold">
            <Upload className="h-4 w-4" />
            Sync Sheet
          </button>
          <button onClick={exportAdminData} className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-3 font-bold text-slate-200 transition hover:border-gold/40 hover:text-gold">
            <Download className="h-4 w-4" />
            Export Data
          </button>
        </div>
      </div>

      {saveStatus && (
        <div className="mb-5 rounded-lg border border-gold/25 bg-gold/10 px-4 py-3 text-sm font-semibold text-gold">
          {saveStatus}
        </div>
      )}

      <div className="mb-5 flex gap-2 rounded-lg border border-white/10 bg-black/35 p-2">
        <button onClick={() => setActiveTab("teams")} className={`rounded-md px-4 py-2 text-sm font-bold transition ${activeTab === "teams" ? "bg-gold text-black" : "text-slate-300 hover:text-gold"}`}>
          Team Rankings
        </button>
        <button onClick={() => setActiveTab("events")} className={`rounded-md px-4 py-2 text-sm font-bold transition ${activeTab === "events" ? "bg-gold text-black" : "text-slate-300 hover:text-gold"}`}>
          Tracked Events
        </button>
        <button onClick={() => setActiveTab("collaborators")} className={`rounded-md px-4 py-2 text-sm font-bold transition ${activeTab === "collaborators" ? "bg-gold text-black" : "text-slate-300 hover:text-gold"}`}>
          Collaborators
        </button>
      </div>

      {activeTab === "teams" ? (
      <>
      <div className="glass overflow-hidden rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-[1560px] w-full text-left text-sm">
            <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.14em] text-slate-500">
              <tr>
                {["Team", "Team Logo", "Champion", "Runner-Up", "2nd Runner-Up", "Top 5", "Finalist", "Official FF MAX", "Events", "Players", "Status", "Description", "CP", "Actions"].map((heading) => (
                  <th key={heading} className="px-3 py-4">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teams.map((team, index) => (
                <tr key={`${team.teamName}-${index}`} className="border-t border-white/5">
                  <EditCell value={team.teamName} onChange={(value) => update(index, "teamName", value)} wide />
                  <td className="px-3 py-3">
                    <div className="flex min-w-56 items-center gap-3">
                      <TeamLogo src={team.logoUrl} name={team.teamName} size={48} />
                      <div className="flex gap-2">
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gold/30 px-3 py-2 text-xs font-semibold text-gold transition hover:bg-gold hover:text-black">
                          <Upload className="h-4 w-4" />
                          Upload
                          <input type="file" accept="image/*" className="hidden" onChange={(event) => uploadLogo(index, event.target.files?.[0] || null)} />
                        </label>
                        <button onClick={() => removeLogo(index)} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-red-400/50 hover:text-red-300">
                          <X className="h-4 w-4" />
                          Remove
                        </button>
                      </div>
                    </div>
                  </td>
                  {/* Kills and Booyahs removed */}
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
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openRoster(index)} className="rounded-lg border border-white/10 p-2 text-slate-200">
                        Details
                      </button>
                      <button onClick={() => setTeams((current) => current.filter((_, teamIndex) => teamIndex !== index))} className="rounded-lg border border-red-400/30 p-2 text-red-300">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    {editingRosterIndex !== null && (
        <div className="mt-4 glass rounded-lg p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Edit Roster — {teams[editingRosterIndex].teamName}</h3>
            <div className="flex gap-2">
              <button onClick={() => addRosterPlayer(editingRosterIndex)} className="rounded-lg bg-gold px-3 py-2 font-semibold text-black">Add Player</button>
              <button onClick={closeRoster} className="rounded-lg border border-white/10 px-3 py-2 text-slate-200">Close</button>
            </div>
          </div>
          <div className="grid gap-3">
            {(teams[editingRosterIndex].roster || []).map((p, pi) => (
              <div key={pi} className="flex items-center gap-3">
                <input value={p.name} onChange={(e) => updateRosterPlayer(editingRosterIndex, pi, "name", e.target.value)} placeholder="Player name" className="w-64 rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white" />
                <input value={p.uid} onChange={(e) => updateRosterPlayer(editingRosterIndex, pi, "uid", e.target.value)} placeholder="In-game UID" className="w-48 rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white" />
                <button onClick={() => removeRosterPlayer(editingRosterIndex, pi)} className="rounded-lg border border-red-400/30 p-2 text-red-300">Remove</button>
              </div>
            ))}
            {(teams[editingRosterIndex].roster || []).length === 0 && <div className="text-sm text-slate-400">No players yet. Use Add Player to create entries.</div>}
          </div>
        </div>
      )}
      </>
      ) : (
      <div className="glass overflow-hidden rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-[1180px] w-full text-left text-sm">
            <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.14em] text-slate-500">
              <tr>
                {["Event Name", "Date", "Organizer", "Teams", "Prize Pool", "Status", "Counted Result", "Notes", "Actions"].map((heading) => (
                  <th key={heading} className="px-3 py-4">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.map((event, index) => (
                <tr key={`${event.name}-${index}`} className="border-t border-white/5">
                  <EditCell value={event.name} onChange={(value) => updateEvent(index, "name", value)} wide />
                  <EditCell value={event.date} onChange={(value) => updateEvent(index, "date", value)} />
                  <EditCell value={event.organizer} onChange={(value) => updateEvent(index, "organizer", value)} wide />
                  <EditCell value={event.teams} onChange={(value) => updateEvent(index, "teams", value)} numeric />
                  <EditCell value={event.prize} onChange={(value) => updateEvent(index, "prize", value)} />
                  <EditCell value={event.status} onChange={(value) => updateEvent(index, "status", value)} />
                  <EditCell value={event.counted} onChange={(value) => updateEvent(index, "counted", value)} wide />
                  <EditCell value={event.notes || ""} onChange={(value) => updateEvent(index, "notes", value)} wide />
                  <td className="px-3 py-3">
                    <button onClick={() => setEvents((current) => current.filter((_, eventIndex) => eventIndex !== index))} className="rounded-lg border border-red-400/30 p-2 text-red-300">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {activeTab === "collaborators" && (
        <div className="glass overflow-hidden rounded-lg p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Collaborators</h3>
            <div className="flex gap-2">
              <button onClick={addCollaborator} className="rounded-lg bg-gold px-3 py-2 font-semibold text-black">Add Collaborator</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[800px] w-full text-left text-sm">
              <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  {['Name','Role','Logo URL','Link','Actions'].map((h)=> <th key={h} className="px-3 py-3">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {collaborators.map((c, i) => (
                  <tr key={`${c.name}-${i}`} className="border-t border-white/5">
                    <EditCell value={c.name || ''} onChange={(v)=> updateCollaborator(i,'name',v)} />
                    <EditCell value={c.role || ''} onChange={(v)=> updateCollaborator(i,'role',v)} />
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        {c.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={c.logoUrl} alt={c.name} className="h-10 w-10 rounded object-cover" />
                        ) : (
                          <div className="h-10 w-10 rounded bg-white/5" />
                        )}
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gold/30 px-3 py-2 text-xs font-semibold text-gold transition hover:bg-gold hover:text-black">
                          Upload
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadCollaboratorLogo(i, e.target.files?.[0] || null)} />
                        </label>
                        <button onClick={() => updateCollaborator(i, 'logoUrl', '')} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300">Remove</button>
                      </div>
                    </td>
                    <EditCell value={c.url || ''} onChange={(v)=> updateCollaborator(i,'url',v)} wide />
                    <td className="px-3 py-3">
                      <button onClick={()=> removeCollaborator(i)} className="rounded-lg border border-red-400/30 p-2 text-red-300">Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-5 glass rounded-lg p-5 text-sm text-slate-400">
        <div className="mb-2 flex items-center gap-2 font-semibold text-gold">
          <Save className="h-4 w-4" />
          Google Sheets workflow
        </div>
        Use Save Changes to update this local website. Use Sync Sheet only after configuring the Google Sheets webhook for permanent online updates.
      </div>
    </section>
  );
}

function EditCell({ value, onChange, wide = false, numeric = false }: { value: string | number; onChange: (value: string) => void; wide?: boolean; numeric?: boolean }) {
  const [inputValue, setInputValue] = useState(String(value ?? ""));

  useEffect(() => {
    setInputValue(String(value ?? ""));
  }, [value]);

  function commit() {
    onChange(inputValue);
  }

  return (
    <td className="px-3 py-3">
      <input
        type={numeric ? "text" : "text"}
        value={inputValue}
        onChange={(event) => setInputValue(event.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            (e.target as HTMLInputElement).blur();
          }
        }}
        inputMode={numeric ? "numeric" : undefined}
        className={`${wide ? "w-80" : "w-28"} rounded-md border border-white/10 bg-black/40 px-3 py-2 text-white outline-none transition focus:border-gold/60 focus:bg-black/70`}
      />
    </td>
  );
}
