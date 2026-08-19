"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ExternalLink, LogOut, Plus, Save, Trash2 } from "lucide-react";
import { TeamLogo } from "@/components/TeamLogo";

type Player = { name: string; uid: string };
type Team = {
  teamName: string; slug: string; logoUrl: string; description?: string; roster?: Player[];
  players?: number; status?: string; communityPoints?: number; championships?: number;
  runnerUp?: number; secondRunnerUp?: number; rank?: number; kills?: number; booyahs?: number; eventsPlayed?: number;
};

export default function TeamDashboardPage() {
  const [team, setTeam] = useState<Team | null>(null);
  const [username, setUsername] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [description, setDescription] = useState("");
  const [roster, setRoster] = useState<Player[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canEdit, setCanEdit] = useState(false);

  async function load() {
    const params = new URLSearchParams(window.location.search);
    const requestedSlug = params.get("team") || params.get("slug");

    // A logged-in team gets its private dashboard and editing controls.
    const sessionResponse = await fetch("/api/team/me", { cache: "no-store" }).catch(() => null);
    const sessionResult = await sessionResponse?.json().catch(() => ({}));
    if (sessionResponse?.ok && sessionResult?.ok && sessionResult.team) {
      setCanEdit(true);
      setTeam(sessionResult.team);
      setUsername(sessionResult.username || "");
      setLogoUrl(sessionResult.team.logoUrl || "");
      setDescription(sessionResult.team.description || "");
      setRoster(Array.isArray(sessionResult.team.roster) ? sessionResult.team.roster : []);
      setLoading(false);
      return;
    }

    // Public mode: anyone can view the dashboard. Use ?team=SLUG for a specific team.
    const publicUrl = requestedSlug ? `/api/team/public?slug=${encodeURIComponent(requestedSlug)}` : "/api/team/public";
    const publicResponse = await fetch(publicUrl, { cache: "no-store" }).catch(() => null);
    const publicResult = await publicResponse?.json().catch(() => ({}));
    if (!publicResponse?.ok || !publicResult?.ok) {
      setMessage(publicResult?.message || "Unable to load team dashboard.");
      setLoading(false);
      return;
    }

    setCanEdit(false);
    setTeam(publicResult.team);
    setLogoUrl(publicResult.team.logoUrl || "");
    setDescription(publicResult.team.description || "");
    setRoster(Array.isArray(publicResult.team.roster) ? publicResult.team.roster : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function save() {
    if (!canEdit) return;
    setSaving(true); setMessage("");
    const response = await fetch("/api/team/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ logoUrl, description, roster }) });
    const result = await response.json().catch(() => ({}));
    setSaving(false);
    setMessage(result.message || (result.ok ? "Changes saved successfully." : "Unable to save changes."));
    if (result.ok && result.team) setTeam(result.team);
  }

  async function logout() { await fetch("/api/team/auth/logout", { method: "POST" }); window.location.href = "/team-dashboard"; }
  function addPlayer() { if (canEdit) setRoster((current) => [...current, { name: "", uid: "" }]); }
  function updatePlayer(index: number, key: keyof Player, value: string) { if (canEdit) setRoster((current) => current.map((player, i) => i === index ? { ...player, [key]: value } : player)); }
  function removePlayer(index: number) { if (canEdit) setRoster((current) => current.filter((_, i) => i !== index)); }

  if (loading) return <main className="grid min-h-screen place-items-center bg-[#050507] text-slate-400">Loading team dashboard...</main>;
  if (!team) return <main className="grid min-h-screen place-items-center bg-[#050507] px-6 text-center text-slate-300"><div><h1 className="font-rajdhani text-3xl font-bold uppercase">Team Dashboard</h1><p className="mt-2 text-sm text-slate-500">{message}</p><Link href="/" className="mt-5 inline-block rounded-lg border border-white/10 px-4 py-3">Back to Rankings</Link></div></main>;

  return <main className="min-h-screen bg-[#050507] px-4 py-10 text-white sm:px-6 lg:px-8"><div className="mx-auto max-w-6xl">
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-rajdhani text-sm font-bold uppercase tracking-[0.25em] text-gold">{canEdit ? "Team Portal" : "Public Team Dashboard"}</p><h1 className="font-rajdhani text-4xl font-bold uppercase">{team.teamName}</h1>{canEdit && <p className="text-sm text-slate-500">Signed in as @{username}</p>}</div>{canEdit ? <button onClick={logout} className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-3 text-sm text-slate-300 hover:border-red-400/40 hover:text-red-300"><LogOut className="h-4 w-4" /> Logout</button> : <Link href="/team-login" className="rounded-lg border border-white/10 px-4 py-3 text-sm text-slate-300 hover:border-gold/50 hover:text-gold">Team Login</Link>}</div>

    <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4"><Stat label="Rank" value={team.rank || "—"} /><Stat label="Community Points" value={team.communityPoints || 0} /><Stat label="Championships" value={team.championships || 0} /><Stat label="Events Played" value={team.eventsPlayed || 0} /></section>

    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]"><section className="glass rounded-2xl p-6"><h2 className="font-rajdhani text-2xl font-bold uppercase">Team Profile</h2><div className="mt-5 flex items-center gap-4"><TeamLogo src={logoUrl} name={team.teamName} size={80} /><div><p className="font-semibold">{team.teamName}</p><span className="mt-1 inline-flex rounded-full border border-emerald-400/30 px-3 py-1 text-xs text-emerald-400">{team.status || "Active"}</span></div></div>
    {canEdit ? <><label className="mt-6 block text-sm text-slate-300">Team Logo URL<input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-gold/60" placeholder="Paste logo URL" /></label><label className="mt-5 block text-sm text-slate-300">Team Description<textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-gold/60" /></label><button onClick={save} disabled={saving} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gold px-4 py-3 font-bold text-black disabled:opacity-50"><Save className="h-4 w-4" />{saving ? "Saving..." : "Save Changes"}</button>{message && <p className="mt-3 flex items-center gap-2 text-sm text-emerald-400"><CheckCircle2 className="h-4 w-4" />{message}</p>}</> : <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4"><p className="text-sm leading-6 text-slate-300">{description || "No team description has been added yet."}</p></div>}</section>

    <section className="glass rounded-2xl p-6"><div className="flex items-center justify-between"><div><h2 className="font-rajdhani text-2xl font-bold uppercase">Team Roster</h2><p className="text-sm text-slate-500">{canEdit ? "Manage player names and UIDs." : "Current registered players."}</p></div>{canEdit && <button onClick={addPlayer} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 hover:border-gold/50 hover:text-gold"><Plus className="h-4 w-4" /> Add Player</button>}</div><div className="mt-5 space-y-3">{roster.map((player, index) => <div key={`${index}-${player.uid}`} className="grid gap-2 rounded-xl border border-white/10 bg-black/20 p-3 sm:grid-cols-[1fr_1fr_auto]">{canEdit ? <><input value={player.name} onChange={(e) => updatePlayer(index, "name", e.target.value)} placeholder="Player name" className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-gold/60" /><input value={player.uid} onChange={(e) => updatePlayer(index, "uid", e.target.value)} placeholder="UID" className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-gold/60" /><button onClick={() => removePlayer(index)} className="rounded-lg border border-white/10 p-2 text-slate-400 hover:border-red-400/40 hover:text-red-300" aria-label="Remove player"><Trash2 className="h-4 w-4" /></button></> : <><div className="px-2 py-1"><p className="font-semibold">{player.name || "Unnamed Player"}</p></div><div className="px-2 py-1 text-sm text-slate-400">UID: {player.uid || "—"}</div></>}</div>)}{!roster.length && <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">No players added yet.</div>}</div>{canEdit && <button onClick={save} disabled={saving} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-3 font-semibold text-slate-200 hover:border-gold/50 hover:text-gold disabled:opacity-50"><Save className="h-4 w-4" /> Save Roster</button>}</section></div>
    <div className="mt-6 flex flex-wrap gap-3 text-sm"><Link href={`/teams/${team.slug}`} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-3 text-slate-300 hover:text-white">View Public Team Profile <ExternalLink className="h-4 w-4" /></Link><Link href="/" className="rounded-lg border border-white/10 px-4 py-3 text-slate-300 hover:text-white">Back to Rankings</Link></div>
  </div></main>;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div className="glass rounded-xl p-4"><p className="text-xs uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 font-rajdhani text-2xl font-bold">{value}</p></div>;
}
