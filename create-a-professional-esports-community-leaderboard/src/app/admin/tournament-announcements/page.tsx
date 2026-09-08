"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, Eye, EyeOff, Lock, Plus, Save, Trash2, Trophy, Users, X } from "lucide-react";
import type { EventResult, TrackedEvent } from "@/lib/events";

type AdminEvent = TrackedEvent & { _localId: string };
type SheetPayload = { ok?: boolean; message?: string; events?: TrackedEvent[] };

const localId = () => `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const asNumber = (value: unknown) => { const n = Number(value); return Number.isFinite(n) ? Math.max(0, n) : 0; };

function wrap(event: TrackedEvent): AdminEvent {
  return { ...event, _localId: localId(), results: (event.results || []).map((result) => ({ ...result })) };
}

function blankEvent(): AdminEvent {
  return {
    _localId: localId(),
    id: `EVENT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: "",
    organizer: "",
    teams: 0,
    prize: "",
    status: "Pending",
    counted: "Grand Finals",
    date: new Date().toISOString().slice(0, 10),
    notes: "",
    matchesPlayed: 6,
    published: false,
    results: [],
  };
}

function normalizeResult(result: EventResult, matches: number): EventResult {
  const kills = asNumber(result.kills);
  const booyahs = asNumber(result.booyahs);
  const positionPoints = asNumber(result.positionPoints);
  return {
    ...result,
    teamName: String(result.teamName || "").trim(),
    rank: Math.max(1, Math.floor(asNumber(result.rank) || 1)),
    kills,
    booyahs,
    positionPoints,
    killRatio: matches > 0 ? kills / matches : 0,
    booyahRatio: matches > 0 ? (booyahs / matches) * 100 : 0,
    total: positionPoints + kills,
  };
}

export default function AdminTournamentAnnouncementsPage() {
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [editing, setEditing] = useState<AdminEvent | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return events;
    return events.filter((event) => [event.name, event.organizer, event.status, event.date].some((value) => String(value || "").toLowerCase().includes(q)));
  }, [events, query]);

  async function load(showStatus = true) {
    if (!password) return;
    setBusy(true);
    if (showStatus) setStatus("Loading tournament announcements from Google Sheets...");
    try {
      const response = await fetch("/api/admin/sheet", { cache: "no-store", headers: { "x-admin-password": password, Accept: "application/json" } });
      const result = (await response.json().catch(() => ({}))) as SheetPayload;
      if (!response.ok || result.ok === false) throw new Error(result.message || "Unable to load announcements.");
      setEvents(Array.isArray(result.events) ? result.events.map(wrap) : []);
      if (showStatus) setStatus("✓ Announcements loaded from the live Google Sheet.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to connect to Google Sheets.");
    } finally {
      setBusy(false);
    }
  }

  async function login() {
    if (!password || busy) return;
    setBusy(true);
    setStatus("");
    try {
      const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok === false) throw new Error(result.message || "Invalid admin password.");
      setUnlocked(true);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Admin login failed.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { if (unlocked) void load(); }, [unlocked]);

  function validateEvent(event: AdminEvent) {
    if (!event.name.trim()) return "Tournament name is required.";
    if (!event.organizer.trim()) return `${event.name}: organizer is required.`;
    if (!event.date.trim()) return `${event.name}: date is required.`;
    if (event.published) {
      if (asNumber(event.matchesPlayed) <= 0) return `${event.name}: Matches Played must be greater than 0.`;
      const prize = Number(String(event.prize || "").replace(/[^0-9.]/g, "")) || 0;
      if (prize <= 1000 && event.status.toLowerCase() !== "official") return `${event.name}: prize pool must be above Rs.1000 before publishing.`;
      const results = (event.results || []).filter((result) => String(result.teamName || "").trim());
      if (!results.length) return `${event.name}: add at least one result before publishing.`;
      const names = results.map((result) => result.teamName.trim().toLowerCase());
      if (new Set(names).size !== names.length) return `${event.name}: duplicate teams are not allowed.`;
      const ranks = results.map((result) => Math.floor(asNumber(result.rank)));
      if (ranks.some((rank) => rank < 1 || rank > 18) || new Set(ranks).size !== ranks.length) return `${event.name}: ranks must be unique and between 1 and 18.`;
    }
    return "";
  }

  function updateEditing(key: keyof TrackedEvent, value: string | boolean) {
    setEditing((current) => current ? { ...current, [key]: value as never } : current);
  }

  function addResult() {
    setEditing((current) => current ? { ...current, results: [...(current.results || []), { teamName: "", rank: (current.results?.length || 0) + 1, positionPoints: 0, kills: 0, booyahs: 0, killRatio: 0, booyahRatio: 0, total: 0 }] } : current);
  }

  function updateResult(index: number, key: keyof EventResult, value: string) {
    setEditing((current) => current ? { ...current, results: (current.results || []).map((result, i) => i === index ? { ...result, [key]: value } : result) } : current);
  }

  function removeResult(index: number) {
    setEditing((current) => current ? { ...current, results: (current.results || []).filter((_, i) => i !== index).map((result, i) => ({ ...result, rank: i + 1 })) } : current);
  }

  function saveEditor() {
    if (!editing) return;
    const error = validateEvent(editing);
    if (error) { setStatus(error); return; }
    const clean: AdminEvent = {
      ...editing,
      teams: asNumber(editing.teams),
      matchesPlayed: asNumber(editing.matchesPlayed),
      results: (editing.results || []).filter((result) => String(result.teamName || "").trim()).map((result) => normalizeResult(result, asNumber(editing.matchesPlayed))),
    };
    setEvents((current) => current.some((event) => event._localId === clean._localId) ? current.map((event) => event._localId === clean._localId ? clean : event) : [clean, ...current]);
    setEditing(null);
    setStatus("Changes are ready. Click Save to Google Sheet to make them live.");
  }

  function removeEvent(local: string) {
    if (!confirm("Delete this tournament announcement? Save to Google Sheet afterwards to permanently remove it.")) return;
    setEvents((current) => current.filter((event) => event._localId !== local));
    setStatus("Announcement removed from the editor. Save to Google Sheet to permanently delete it.");
  }

  async function togglePublish(local: string) {
    const next = events.map((event) => event._localId === local ? { ...event, published: !event.published } : event);
    const target = next.find((event) => event._localId === local);
    if (!target) return;
    const error = target.published ? validateEvent(target) : "";
    if (error) { setStatus(error); return; }
    await saveEvents(next, target.published ? "Publishing announcement..." : "Unpublishing announcement...");
  }

  async function saveEvents(nextEvents = events, message = "Saving announcements to Google Sheets...") {
    if (!password || busy) return;
    setBusy(true);
    setStatus(message);
    try {
      const payload = nextEvents.map(({ _localId, ...event }) => ({
        ...event,
        teams: asNumber(event.teams),
        matchesPlayed: asNumber(event.matchesPlayed),
        results: (event.results || []).filter((result) => String(result.teamName || "").trim()).map((result) => normalizeResult(result, asNumber(event.matchesPlayed))),
      }));
      const response = await fetch("/api/admin/save", { method: "POST", cache: "no-store", headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" }, body: JSON.stringify({ password, events: payload }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok === false || result.verified === false || result.readBackVerified === false) throw new Error(result.message || "Google Sheets did not verify the announcement change.");
      await load(false);
      setStatus("✓ Tournament announcements saved and verified in Google Sheets.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Announcement save failed.");
    } finally {
      setBusy(false);
    }
  }

  if (!unlocked) return (
    <main className="min-h-screen bg-black px-4 py-10">
      <div className="mx-auto grid min-h-[70vh] max-w-md place-items-center">
        <div className="glass w-full rounded-2xl border border-gold/15 p-7 shadow-2xl">
          <Lock className="mb-4 h-8 w-8 text-gold" />
          <p className="text-xs font-black uppercase tracking-[0.25em] text-gold">TNFFM Admin</p>
          <h1 className="mt-1 font-rajdhani text-4xl font-black uppercase text-white">Tournament Announcements</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">Add, edit, publish and remove tournament announcements stored in the connected Google Sheet.</p>
          <input value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void login(); }} type="password" autoComplete="current-password" placeholder="Admin password" className="mt-6 min-h-12 w-full rounded-xl border border-white/10 bg-black/45 px-4 text-white outline-none focus:border-gold/60" />
          {status && <p className="mt-3 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-300">{status}</p>}
          <button disabled={busy || !password} onClick={() => void login()} className="mt-4 min-h-12 w-full rounded-xl bg-gold px-4 py-3 font-black text-black disabled:opacity-50">{busy ? "Unlocking..." : "Unlock"}</button>
          <Link href="/admin" className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-slate-300 hover:border-gold/30 hover:text-gold">Back to Admin Dashboard</Link>
        </div>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-black px-3 py-5 text-white sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <div className="sticky top-2 z-30 mb-6 rounded-2xl border border-white/10 bg-[#09090b]/95 p-3 shadow-2xl backdrop-blur-xl sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Link href="/admin" className="inline-flex min-h-9 items-center gap-2 text-xs font-bold text-gold hover:text-white"><ArrowLeft className="h-4 w-4" /> Admin Dashboard</Link>
              <h1 className="mt-1 font-rajdhani text-3xl font-black uppercase sm:text-4xl">Tournament Announcements</h1>
              <p className="mt-1 text-xs text-slate-500">Google Sheets is the source of truth. Add/edit locally, then save and verify.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <button disabled={busy} onClick={() => setEditing(blankEvent())} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gold px-4 py-3 text-sm font-black text-black disabled:opacity-50"><Plus className="h-4 w-4" /> Add</button>
              <button disabled={busy || !events.length} onClick={() => void saveEvents()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50"><Save className="h-4 w-4" /> Save</button>
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tournament, organizer or date..." className="min-h-11 flex-1 rounded-xl border border-white/10 bg-black/40 px-4 text-sm text-white outline-none focus:border-gold/50" />
            {status && <div className="rounded-xl border border-gold/20 bg-gold/10 px-3 py-2 text-xs font-semibold leading-5 text-gold sm:max-w-xl">{status}</div>}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.length === 0 && <div className="lg:col-span-2 rounded-2xl border border-dashed border-white/10 bg-black/30 p-12 text-center text-slate-500">No tournament announcements found. Click Add to create one.</div>}
          {filtered.map((event) => (
            <article key={event._localId} className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 shadow-xl shadow-black/20">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0"><div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-wider"><span className="rounded-full border border-gold/30 bg-gold/10 px-2 py-1 text-gold">{event.status || "Pending"}</span><span className={event.published ? "text-emerald-300" : "text-slate-500"}>{event.published ? "Published" : "Draft"}</span></div><h2 className="mt-2 break-words font-rajdhani text-2xl font-black uppercase text-white">{event.name || "Untitled Tournament"}</h2></div>
                <Trophy className="h-7 w-7 shrink-0 text-gold" />
              </div>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-400">{event.notes || "No announcement description yet."}</p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs"><div className="rounded-xl border border-white/5 bg-black/30 p-3"><CalendarDays className="h-4 w-4 text-gold" /><p className="mt-1 text-slate-300">{event.date || "TBA"}</p></div><div className="rounded-xl border border-white/5 bg-black/30 p-3"><Users className="h-4 w-4 text-gold" /><p className="mt-1 text-slate-300">{event.teams || 0} teams</p></div></div>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4"><button disabled={busy} onClick={() => setEditing(event)} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-slate-200 hover:border-gold/30 hover:text-gold disabled:opacity-50">Edit</button><button disabled={busy} onClick={() => void togglePublish(event._localId)} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-slate-200 hover:border-gold/30 hover:text-gold disabled:opacity-50">{event.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}{event.published ? "Unpublish" : "Publish"}</button><button disabled={busy} onClick={() => removeEvent(event._localId)} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-red-400/20 px-3 py-2 text-red-300 hover:bg-red-400/10 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button></div>
            </article>
          ))}
        </div>
      </div>

      {editing && <div className="fixed inset-0 z-50 bg-black/85 p-3 backdrop-blur-sm sm:p-6"><div className="mx-auto flex h-[calc(100dvh-1.5rem)] max-h-[920px] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-gold/20 bg-[#09090b] shadow-2xl sm:h-[calc(100dvh-3rem)]"><div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-gold">Announcement Editor</p><h2 className="font-rajdhani text-2xl font-black uppercase text-white">{events.some((event) => event._localId === editing._localId) ? "Edit Tournament" : "Add Tournament"}</h2></div><button onClick={() => setEditing(null)} className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"><X className="h-5 w-5" /></button></div><div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6"><div className="grid gap-4 md:grid-cols-2"><label className="text-sm text-slate-300 md:col-span-2">Tournament Name<input autoFocus value={editing.name} onChange={(event) => updateEditing("name", event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-white outline-none focus:border-gold/50" placeholder="Tournament name" /></label><label className="text-sm text-slate-300">Organizer<input value={editing.organizer} onChange={(event) => updateEditing("organizer", event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-white outline-none focus:border-gold/50" placeholder="Organizer" /></label><label className="text-sm text-slate-300">Date<input type="date" value={editing.date} onChange={(event) => updateEditing("date", event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-white outline-none focus:border-gold/50" /></label><label className="text-sm text-slate-300">Prize Pool<input value={editing.prize} onChange={(event) => updateEditing("prize", event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-white outline-none focus:border-gold/50" placeholder="₹2,000" /></label><label className="text-sm text-slate-300">Teams<input type="number" min="0" value={editing.teams} onChange={(event) => updateEditing("teams", event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-white outline-none focus:border-gold/50" /></label><label className="text-sm text-slate-300">Matches Played<input type="number" min="0" value={editing.matchesPlayed || 0} onChange={(event) => updateEditing("matchesPlayed", event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-white outline-none focus:border-gold/50" /></label><label className="text-sm text-slate-300">Status<select value={editing.status} onChange={(event) => updateEditing("status", event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-white outline-none focus:border-gold/50"><option>Pending</option><option>Official</option><option>Verified</option><option>Rejected</option></select></label><label className="text-sm text-slate-300">Counted<select value={editing.counted} onChange={(event) => updateEditing("counted", event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-white outline-none focus:border-gold/50"><option>Grand Finals</option><option>Finals</option><option>Qualifiers</option></select></label><label className="text-sm text-slate-300 md:col-span-2">Announcement / Description<textarea rows={5} value={editing.notes || ""} onChange={(event) => updateEditing("notes", event.target.value)} className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-gold/50" placeholder="Write the tournament announcement..." /></label><label className="flex min-h-12 items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-4 text-sm font-bold text-slate-200 md:col-span-2"><input type="checkbox" checked={Boolean(editing.published)} onChange={(event) => updateEditing("published", event.target.checked)} className="h-5 w-5 accent-yellow-500" /> Publish this announcement on the public page</label></div>

<div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-black uppercase text-white">Tournament Results</p><p className="mt-1 text-xs text-slate-500">Add final positions for published tournaments.</p></div><button onClick={addResult} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-gold/30 bg-gold/10 px-3 py-2 text-xs font-black text-gold"><Plus className="h-4 w-4" /> Add Result</button></div><div className="mt-4 space-y-2">{(editing.results || []).map((result, index) => <div key={`${index}-${result.teamName}`} className="grid gap-2 rounded-xl border border-white/5 bg-black/30 p-3 sm:grid-cols-[1.6fr_.6fr_.7fr_.7fr_auto]"><input value={result.teamName} onChange={(event) => updateResult(index, "teamName", event.target.value)} placeholder="Team name" className="min-h-10 rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white" /><input type="number" min="1" max="18" value={result.rank} onChange={(event) => updateResult(index, "rank", event.target.value)} placeholder="Rank" className="min-h-10 rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white" /><input type="number" min="0" value={result.kills} onChange={(event) => updateResult(index, "kills", event.target.value)} placeholder="Kills" className="min-h-10 rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white" /><input type="number" min="0" value={result.positionPoints} onChange={(event) => updateResult(index, "positionPoints", event.target.value)} placeholder="Position" className="min-h-10 rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white" /><button onClick={() => removeResult(index)} className="grid min-h-10 place-items-center rounded-lg border border-red-400/20 text-red-300 hover:bg-red-400/10"><Trash2 className="h-4 w-4" /></button></div>)}</div></div></div><div className="flex shrink-0 gap-2 border-t border-white/10 bg-[#09090b]/95 p-3 backdrop-blur-xl sm:justify-end sm:px-6"><button onClick={() => setEditing(null)} className="min-h-11 flex-1 rounded-xl border border-white/10 px-5 py-3 font-bold text-slate-300 hover:bg-white/5 sm:flex-none">Cancel</button><button onClick={saveEditor} className="min-h-11 flex-1 rounded-xl bg-gold px-5 py-3 font-black text-black sm:flex-none">Save Changes</button></div></div></div>}
    </main>
  );
}
