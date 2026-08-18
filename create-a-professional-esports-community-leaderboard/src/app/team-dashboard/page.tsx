"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ExternalLink, LogOut, Plus, Save, Trash2 } from "lucide-react";
import { TeamLogo } from "@/components/TeamLogo";

type Player = { name: string; uid: string };
type Team = { teamName: string; slug: string; logoUrl: string; description?: string; roster?: Player[]; players?: number; status?: string; communityPoints?: number; championships?: number };

export default function TeamDashboardPage() {
  const [team, setTeam] = useState<Team | null>(null);
  const [username, setUsername] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [description, setDescription] = useState("");
  const [roster, setRoster] = useState<Player[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    const response = await fetch("/api/team/me", { cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) { window.location.href = "/team-login"; return; }
    setTeam(result.team); setUsername(result.username); setLogoUrl(result.team.logoUrl || ""); setDescription(result.team.description || ""); setRoster(Array.isArray(result.team.roster) ? result.team.roster : []); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true); setMessage("");
    const response = await fetch("/api/team/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ logoUrl, description, roster }) });
    const result = await response.json().catch(() => ({}));
    setSaving(false); setMessage(result.message || (result.ok ? "Changes saved successfully." : "Unable to save changes."));
    if (result.ok && result.team) setTeam(result.team);
  }

  async function logout() { await fetch("/api/team/auth/logout", { method: "POST" }); window.location.href = "/team-login"; }
  function addPlayer() { setRoster((current) => [...current, { name: "", uid: "" }]); }
  function updatePlayer(index: number, key: keyof Player, value: string) { setRoster((current) => current.map((player, i) => i === index ? { ...player, [key]: value } : player)); }
  function removePlayer(index: number) { setRoster((current) => current.filter((_, i) => i !== index)); }

  if (loading) return <main className="grid min-h-screen place-items-center bg-[#050507] text-slate-400">Loading team dashboard...</main>;

  return <main className="min-h-screen bg-[#050507] px-4 py-10 text-white sm:px-6 lg:px-8"><div className="mx-auto max-w-6xl"><div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-rajdhani text-sm font-bold uppercase tracking-[0.25em] text-gold">Team Portal</p><h1 className="font-rajdhani text-4xl font-bold uppercase">{team?.teamName}</h1><p className="text-sm text-slate-500">Signed in as @{username}</p></div><button onClick={logout} className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-3 text-sm text-slate-300 hover:border-red-400/40 hover:text-red-300"><LogOut className="h-4 w-4" /> Logout</button></div>

<div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]"><section className="glass rounded-2xl p-6"><h2 className="font-rajdhani text-2xl font-bold uppercase">Team Profile</h2><div className="mt-5 flex items-center gap-4"><TeamLogo src={logoUrl} name={team?.teamName || "Team"} size={80} /><div><p className="font-semibold">{team?.teamName}</p><span className="mt-1 inline-flex rounded-full border border-emerald-400/30 px-3 py-1 text-xs text-emerald-400">{team?.status || "Active"}</span></div></div>
<label className="mt-6 block text-sm text-slate-300">Team Logo URL<input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-gold/60" placeholder="Paste Google Drive sharing link here" /></label>
<div className="mt-4 rounded-xl border border-gold/20 bg-gold/[0.04] p-4"><h3 className="font-semibold text-gold">How to upload and add your logo</h3><ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-300"><li>Upload your logo image to <b>Google Drive</b>.</li><li>Right-click the logo → <b>Share</b>.</li><li>Under General access, choose <b>Anyone with the link</b>.</li><li>Set permission to <b>Viewer</b>.</li><li>Click <b>Copy link</b>.</li><li>Paste the complete Google Drive link into <b>Team Logo URL</b> above.</li><li>Click <b>Save Changes</b>. The website converts the Drive link only when displaying the image; your saved URL stays unchanged.</li></ol><p className="mt-3 text-xs text-slate-500">Example: https://drive.google.com/file/d/FILE_ID/view?usp=sharing</p></div>
<label className="mt-5 block text-sm text-slate-300">Team Description<textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-gold/60" /></label>
<button onClick={save} disabled={saving} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gold px-4 py-3 font-bold text-black disabled:opacity-50"><Save className="h-4 w-4" />{saving ? "Saving..." : "Save Changes"}</button>{message && <p className="mt-3 flex items-center gap-2 text-sm text-emerald-400"><CheckCircle2 className="h-4 w-4" />{message}</p>}</section>

<section className="glass rounded-2xl p-6"><div className="flex items-center justify-between"><div><h2 className="font-rajdhani text-2xl font-bold uppercase">Team Roster</h2><p className="text-sm text-slate-500">Manage player names and UIDs.</p></div><button onClick={addPlayer} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 hover:border-gold/50 hover:text-gold"><Plus className="h-4 w-4" /> Add Player</button></div><div className="mt-5 space-y-3">{roster.map((player, index) => <div key={`${index}-${player.uid}`} className="grid gap-2 rounded-xl border border-white/10 bg-black/20 p-3 sm:grid-cols-[1fr_1fr_auto]"><input value={player.name} onChange={(e) => updatePlayer(index, "name", e.target.value)} placeholder="Player name" className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-gold/60" /><input value={player.uid} onChange={(e) => updatePlayer(index, "uid", e.target.value)} placeholder="UID" className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-gold/60" /><button onClick={() => removePlayer(index)} className="rounded-lg border border-white/10 p-2 text-slate-400 hover:border-red-400/40 hover:text-red-300" aria-label="Remove player"><Trash2 className="h-4 w-4" /></button></div>)}{!roster.length && <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">No players added yet.</div>}</div><button onClick={save} disabled={saving} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-3 font-semibold text-slate-200 hover:border-gold/50 hover:text-gold disabled:opacity-50"><Save className="h-4 w-4" /> Save Roster</button></section></div>
<div className="mt-6 flex flex-wrap gap-3 text-sm"><Link href={`/teams/${team?.slug}`} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-3 text-slate-300 hover:text-white">View Public Team Profile <ExternalLink className="h-4 w-4" /></Link><Link href="/" className="rounded-lg border border-white/10 px-4 py-3 text-slate-300 hover:text-white">Back to Rankings</Link></div></div></main>;
}
