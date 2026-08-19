"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Download, ExternalLink, LogOut, Plus, Save, Trash2 } from "lucide-react";
import { toPng } from "html-to-image";
import { TeamLogo } from "@/components/TeamLogo";

type Player = { name: string; uid: string };
type Team = {
  teamName: string; slug: string; logoUrl: string; description?: string; roster?: Player[];
  players?: number; status?: string; communityPoints?: number; championships?: number;
  runnerUp?: number; secondRunnerUp?: number; top3Finishes?: number; finalistFinishes?: number;
  rank?: number; eventsPlayed?: number;
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
  const [generatingPoster, setGeneratingPoster] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);

  async function load() {
    const params = new URLSearchParams(window.location.search);
    const requestedSlug = params.get("team") || params.get("slug");

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

  async function downloadPoster() {
    if (!team || !posterRef.current || generatingPoster) return;
    setGeneratingPoster(true);
    setMessage("");
    try {
      const node = posterRef.current;
      await document.fonts?.ready;
      const dataUrl = await toPng(node, {
        width: 1080,
        height: 1350,
        pixelRatio: 1,
        cacheBust: true,
        backgroundColor: "#07080b",
      });
      const link = document.createElement("a");
      link.download = `${team.teamName.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "team"}-TNFFM-Community-Rankings.png`;
      link.href = dataUrl;
      link.click();
      setMessage("Official TNFFM team poster generated successfully.");
    } catch (error) {
      console.error("Poster generation failed", error);
      setMessage("Unable to generate the poster. Please try again.");
    } finally {
      setGeneratingPoster(false);
    }
  }

  async function logout() { await fetch("/api/team/auth/logout", { method: "POST" }); window.location.href = "/team-dashboard"; }
  function addPlayer() { if (canEdit) setRoster((current) => [...current, { name: "", uid: "" }]); }
  function updatePlayer(index: number, key: keyof Player, value: string) { if (canEdit) setRoster((current) => current.map((player, i) => i === index ? { ...player, [key]: value } : player)); }
  function removePlayer(index: number) { if (canEdit) setRoster((current) => current.filter((_, i) => i !== index)); }

  if (loading) return <main className="grid min-h-screen place-items-center bg-[#050507] text-slate-400">Loading team dashboard...</main>;
  if (!team) return <main className="grid min-h-screen place-items-center bg-[#050507] px-6 text-center text-slate-300"><div><h1 className="font-rajdhani text-3xl font-bold uppercase">Team Dashboard</h1><p className="mt-2 text-sm text-slate-500">{message}</p><Link href="/" className="mt-5 inline-block rounded-lg border border-white/10 px-4 py-3">Back to Rankings</Link></div></main>;

  return <main className="min-h-screen bg-[#050507] px-4 py-10 text-white sm:px-6 lg:px-8"><div className="mx-auto max-w-6xl">
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-rajdhani text-sm font-bold uppercase tracking-[0.25em] text-gold">{canEdit ? "Team Portal" : "Public Team Dashboard"}</p><h1 className="font-rajdhani text-4xl font-bold uppercase">{team.teamName}</h1>{canEdit && <p className="text-sm text-slate-500">Signed in as @{username}</p>}</div><div className="flex flex-wrap gap-3">{canEdit && <button onClick={downloadPoster} disabled={generatingPoster} className="inline-flex items-center justify-center gap-2 rounded-lg bg-gold px-4 py-3 text-sm font-bold text-black hover:brightness-110 disabled:opacity-50"><Download className="h-4 w-4" />{generatingPoster ? "Generating..." : "Download Team Poster"}</button>}{canEdit ? <button onClick={logout} className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-3 text-sm text-slate-300 hover:border-red-400/40 hover:text-red-300"><LogOut className="h-4 w-4" /> Logout</button> : <Link href="/team-login" className="rounded-lg border border-white/10 px-4 py-3 text-sm text-slate-300 hover:border-gold/50 hover:text-gold">Team Login</Link>}</div></div>

    <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4"><Stat label="Rank" value={team.rank || "—"} /><Stat label="Community Points" value={team.communityPoints || 0} /><Stat label="Championships" value={team.championships || 0} /><Stat label="Events Played" value={team.eventsPlayed || 0} /></section>

    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]"><section className="glass rounded-2xl p-6"><h2 className="font-rajdhani text-2xl font-bold uppercase">Team Profile</h2><div className="mt-5 flex items-center gap-4"><TeamLogo src={logoUrl} name={team.teamName} size={80} /><div><p className="font-semibold">{team.teamName}</p><span className="mt-1 inline-flex rounded-full border border-emerald-400/30 px-3 py-1 text-xs text-emerald-400">{team.status || "Active"}</span></div></div>
    {canEdit ? <><label className="mt-6 block text-sm text-slate-300">Team Logo URL<input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-gold/60" placeholder="Paste logo URL" /></label><label className="mt-5 block text-sm text-slate-300">Team Description<textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-gold/60" /></label><button onClick={save} disabled={saving} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gold px-4 py-3 font-bold text-black disabled:opacity-50"><Save className="h-4 w-4" />{saving ? "Saving..." : "Save Changes"}</button>{message && <p className="mt-3 flex items-center gap-2 text-sm text-emerald-400"><CheckCircle2 className="h-4 w-4" />{message}</p>}</> : <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4"><p className="text-sm leading-6 text-slate-300">{description || "No team description has been added yet."}</p></div>}</section>

    <section className="glass rounded-2xl p-6"><div className="flex items-center justify-between"><div><h2 className="font-rajdhani text-2xl font-bold uppercase">Team Roster</h2><p className="text-sm text-slate-500">{canEdit ? "Manage player names and UIDs." : "Current registered players."}</p></div>{canEdit && <button onClick={addPlayer} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 hover:border-gold/50 hover:text-gold"><Plus className="h-4 w-4" /> Add Player</button>}</div><div className="mt-5 space-y-3">{roster.map((player, index) => <div key={`${index}-${player.uid}`} className="grid gap-2 rounded-xl border border-white/10 bg-black/20 p-3 sm:grid-cols-[1fr_1fr_auto]">{canEdit ? <><input value={player.name} onChange={(e) => updatePlayer(index, "name", e.target.value)} placeholder="Player name" className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-gold/60" /><input value={player.uid} onChange={(e) => updatePlayer(index, "uid", e.target.value)} placeholder="UID" className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-gold/60" /><button onClick={() => removePlayer(index)} className="rounded-lg border border-white/10 p-2 text-slate-400 hover:border-red-400/40 hover:text-red-300" aria-label="Remove player"><Trash2 className="h-4 w-4" /></button></> : <><div className="px-2 py-1"><p className="font-semibold">{player.name || "Unnamed Player"}</p></div><div className="px-2 py-1 text-sm text-slate-400">UID: {player.uid || "—"}</div></>}</div>)}{!roster.length && <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">No players added yet.</div>}</div>{canEdit && <button onClick={save} disabled={saving} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-3 font-semibold text-slate-200 hover:border-gold/50 hover:text-gold disabled:opacity-50"><Save className="h-4 w-4" /> Save Roster</button>}</section></div>
    <div className="mt-6 flex flex-wrap gap-3 text-sm"><Link href={`/teams/${team.slug}`} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-3 text-slate-300 hover:text-white">View Public Team Profile <ExternalLink className="h-4 w-4" /></Link><Link href="/" className="rounded-lg border border-white/10 px-4 py-3 text-slate-300 hover:text-white">Back to Rankings</Link></div>
  </div>

  {/* 1080x1350 Instagram poster. Kept off-screen so the dashboard remains unchanged. */}
  <div className="pointer-events-none fixed -left-[12000px] top-0" aria-hidden="true">
    <div ref={posterRef} style={{ width: 1080, height: 1350, background: "linear-gradient(145deg,#07080b 0%,#11141a 55%,#07080b 100%)", color: "white", fontFamily: "Arial, sans-serif", padding: 64, boxSizing: "border-box" }}>
      <div style={{ height: "100%", border: "2px solid rgba(255,255,255,.14)", padding: 42, boxSizing: "border-box", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -180, right: -180, width: 520, height: 520, borderRadius: "50%", background: "rgba(212,175,55,.10)" }} />
        <div style={{ position: "absolute", bottom: -220, left: -220, width: 600, height: 600, borderRadius: "50%", background: "rgba(255,255,255,.035)" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,.15)", paddingBottom: 28 }}>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: 3 }}>TNFFM</div>
          <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: 2, color: "#d4af37" }}>OFFICIAL COMMUNITY RANKINGS</div>
        </div>
        <div style={{ textAlign: "center", marginTop: 42 }}>
          <div style={{ width: 170, height: 170, margin: "0 auto", borderRadius: 28, border: "2px solid rgba(212,175,55,.45)", display: "grid", placeItems: "center", background: "rgba(0,0,0,.35)", overflow: "hidden" }}>
            {logoUrl ? <img src={logoUrl} crossOrigin="anonymous" alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <div style={{ fontSize: 44, fontWeight: 900 }}>{team.teamName.slice(0, 2).toUpperCase()}</div>}
          </div>
          <div style={{ marginTop: 28, fontSize: 54, fontWeight: 900, textTransform: "uppercase", letterSpacing: 2 }}>{team.teamName}</div>
          <div style={{ marginTop: 12, fontSize: 25, color: "#d4af37", fontWeight: 800 }}>RANK #{team.rank || "—"}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginTop: 42 }}>
          {[
            ["COMMUNITY SCORE", team.communityPoints || 0],
            ["CHAMPIONSHIPS", team.championships || 0],
            ["EVENTS PLAYED", team.eventsPlayed || 0],
            ["RUNNER-UP", team.runnerUp || 0],
            ["2ND RUNNER-UP", team.secondRunnerUp || 0],
            ["TOP 5 FINISHES", team.top3Finishes || 0],
          ].map(([label, value]) => <div key={String(label)} style={{ padding: "18px 16px", border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.035)", borderRadius: 12, textAlign: "center" }}><div style={{ fontSize: 14, color: "#8f98a8", letterSpacing: 1 }}>{label}</div><div style={{ marginTop: 8, fontSize: 31, fontWeight: 900 }}>{value}</div></div>)}
        </div>
        <div style={{ marginTop: 34 }}>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 2, color: "#d4af37", marginBottom: 14 }}>ROSTER</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {(roster.length ? roster : [{ name: "No players added", uid: "—" }]).map((player, index) => <div key={`${player.uid}-${index}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 16px", borderRadius: 10, background: "rgba(255,255,255,.045)", border: "1px solid rgba(255,255,255,.09)" }}><span style={{ fontWeight: 700, fontSize: 18 }}>{player.name || "Unnamed Player"}</span><span style={{ color: "#9ba3b2", fontSize: 14 }}>UID: {player.uid || "—"}</span></div>)}
          </div>
        </div>
        <div style={{ marginTop: 30, padding: "20px 22px", borderLeft: "3px solid #d4af37", background: "rgba(255,255,255,.035)" }}>
          <div style={{ fontSize: 13, color: "#8f98a8", letterSpacing: 1, marginBottom: 8 }}>TEAM DESCRIPTION</div>
          <div style={{ fontSize: 18, lineHeight: 1.45 }}>{description || "Official TNFFM community ranking team profile."}</div>
        </div>
        <div style={{ position: "absolute", left: 42, right: 42, bottom: 28, display: "flex", justifyContent: "space-between", color: "#737b89", fontSize: 13, letterSpacing: 1 }}><span>OFFICIAL TNFFM COMMUNITY RANKINGS</span><span>TNFFM</span></div>
      </div>
    </div>
  </div>
  </main>;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div className="glass rounded-xl p-4"><p className="text-xs uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 font-rajdhani text-2xl font-bold">{value}</p></div>;
}
