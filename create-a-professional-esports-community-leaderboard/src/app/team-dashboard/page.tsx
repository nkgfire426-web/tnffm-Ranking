"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Download, ExternalLink, HelpCircle, KeyRound, LogOut, Plus, Save, Trash2 } from "lucide-react";
import { toBlob, toPng } from "html-to-image";
import { TeamLogo } from "@/components/TeamLogo";

type Player = { name: string; uid: string };
type Team = {
  teamName: string;
  slug: string;
  logoUrl: string;
  description?: string;
  mobileNumber?: string;
  roster?: Player[];
  players?: number;
  status?: string;
  communityPoints?: number;
  championships?: number;
  runnerUp?: number;
  secondRunnerUp?: number;
  top3Finishes?: number;
  finalistFinishes?: number;
  rank?: number;
  eventsPlayed?: number;
};

export default function TeamDashboardPage() {
  const [team, setTeam] = useState<Team | null>(null);
  const [username, setUsername] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [description, setDescription] = useState("");
  const [roster, setRoster] = useState<Player[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingPoster, setGeneratingPoster] = useState(false);
  const [showLogoGuide, setShowLogoGuide] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);

  async function load() {
    const params = new URLSearchParams(window.location.search);
    const requestedSlug = params.get("team") || params.get("slug");
    const sessionResponse = await fetch("/api/team/me", { cache: "no-store" }).catch(() => null);
    const sessionResult = await sessionResponse?.json().catch(() => ({}));

    if (sessionResponse?.ok && sessionResult?.ok && sessionResult.team) {
      const t = sessionResult.team as Team;
      setCanEdit(true); setTeam(t); setUsername(sessionResult.username || ""); setLogoUrl(t.logoUrl || ""); setMobileNumber(t.mobileNumber || ""); setDescription(t.description || ""); setRoster(Array.isArray(t.roster) ? t.roster : []); setLoading(false); return;
    }

    const url = requestedSlug ? `/api/team/public?slug=${encodeURIComponent(requestedSlug)}` : "/api/team/public";
    const response = await fetch(url, { cache: "no-store" }).catch(() => null);
    const result = await response?.json().catch(() => ({}));
    if (!response?.ok || !result?.ok) { setMessage(result?.message || "Unable to load team dashboard."); setLoading(false); return; }
    const t = result.team as Team;
    setCanEdit(false); setTeam(t); setLogoUrl(t.logoUrl || ""); setMobileNumber(t.mobileNumber || ""); setDescription(t.description || ""); setRoster(Array.isArray(t.roster) ? t.roster : []); setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function save() {
    if (!canEdit) return;
    setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/team/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ logoUrl, mobileNumber, description, roster }) });
      const result = await response.json().catch(() => ({}));
      setMessage(result.message || (result.ok ? "Changes saved successfully." : "Unable to save changes."));
      if (result.ok && result.team) setTeam(result.team);
    } catch { setMessage("Unable to connect to Google Sheets."); } finally { setSaving(false); }
  }

  async function changePassword() {
    if (!currentPassword || !newPassword) return setMessage("Enter your current and new password.");
    if (newPassword.length < 8) return setMessage("New password must be at least 8 characters.");
    if (newPassword !== confirmPassword) return setMessage("New passwords do not match.");
    setPasswordSaving(true); setMessage("");
    try {
      const response = await fetch("/api/team/auth/change-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword, newPassword }) });
      const result = await response.json().catch(() => ({}));
      setMessage(result.message || (result.ok ? "Password changed successfully." : "Unable to change password."));
      if (result.ok) { setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setShowPassword(false); }
    } catch { setMessage("Unable to change password right now."); } finally { setPasswordSaving(false); }
  }

  async function waitForImages(root: HTMLElement) {
    const images = Array.from(root.querySelectorAll("img"));
    await Promise.all(images.map((img) => new Promise<void>((resolve) => {
      if (img.complete && img.naturalWidth > 0) return resolve();
      const done = () => resolve();
      img.addEventListener("load", done, { once: true }); img.addEventListener("error", done, { once: true });
    })));
  }

  async function downloadPoster() {
    if (!team || !posterRef.current || generatingPoster) return;
    setGeneratingPoster(true); setMessage("");
    try {
      const poster = posterRef.current;
      await document.fonts?.ready;
      await waitForImages(poster);
      await new Promise((resolve) => setTimeout(resolve, 150));

      let blob = await toBlob(poster, { width: 1080, height: 1350, pixelRatio: 1, cacheBust: true, backgroundColor: "#050507", skipFonts: true });
      if (!blob) {
        const dataUrl = await toPng(poster, { width: 1080, height: 1350, pixelRatio: 1, cacheBust: true, backgroundColor: "#050507", skipFonts: true });
        blob = await (await fetch(dataUrl)).blob();
      }
      if (!blob || blob.size < 1000) throw new Error("Poster image was empty.");

      const safeName = team.teamName.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "team";
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.href = url; link.download = `${safeName}-TNFFM-Community-Rankings.png`; link.style.display = "none"; document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      setMessage("Official TNFFM team poster downloaded successfully.");
    } catch (error) {
      console.error("Team poster generation failed:", error);
      setMessage("Poster could not be generated. Your team logo is not required; try again after saving your team profile.");
    } finally { setGeneratingPoster(false); }
  }

  async function logout() { await fetch("/api/team/auth/logout", { method: "POST" }); window.location.href = "/team-dashboard"; }
  function addPlayer() { if (canEdit) setRoster((current) => [...current, { name: "", uid: "" }]); }
  function updatePlayer(index: number, key: keyof Player, value: string) { if (canEdit) setRoster((current) => current.map((player, i) => i === index ? { ...player, [key]: value } : player)); }
  function removePlayer(index: number) { if (canEdit) setRoster((current) => current.filter((_, i) => i !== index)); }

  if (loading) return <main className="grid min-h-screen place-items-center bg-[#050507] text-slate-400">Loading team dashboard...</main>;
  if (!team) return <main className="grid min-h-screen place-items-center bg-[#050507] px-6 text-center text-slate-300"><div><h1 className="font-rajdhani text-3xl font-bold uppercase">Team Dashboard</h1><p className="mt-2 text-sm text-slate-500">{message}</p><Link href="/" className="mt-5 inline-block rounded-lg border border-white/10 px-4 py-3">Back to Rankings</Link></div></main>;

  const posterLogo = team.logoUrl ? `/api/team/logo?url=${encodeURIComponent(team.logoUrl)}` : "/brand/tnffm-logo.png";
  const posterPlayers = (roster.length ? roster : [{ name: "Roster not added", uid: "" }]).slice(0, 6);

  return (
    <main className="min-h-screen bg-[#050507] px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="font-rajdhani text-sm font-bold uppercase tracking-[0.25em] text-gold">{canEdit ? "Team Portal" : "Public Team Dashboard"}</p><h1 className="font-rajdhani text-4xl font-bold uppercase">{team.teamName}</h1>{canEdit && <p className="text-sm text-slate-500">Signed in as @{username}</p>}</div>
          <div className="flex flex-wrap gap-3">{canEdit && <button onClick={downloadPoster} disabled={generatingPoster} className="inline-flex items-center justify-center gap-2 rounded-lg bg-gold px-4 py-3 text-sm font-bold text-black hover:brightness-110 disabled:opacity-50"><Download className="h-4 w-4" />{generatingPoster ? "Generating..." : "Download Team Poster"}</button>}{canEdit ? <button onClick={logout} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-3 text-sm text-slate-300 hover:text-red-300"><LogOut className="h-4 w-4" />Logout</button> : <Link href="/team-login" className="rounded-lg border border-white/10 px-4 py-3 text-sm text-slate-300 hover:text-gold">Team Login</Link>}</div>
        </div>
        <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4"><Stat label="Rank" value={team.rank || "—"} /><Stat label="Community Points" value={team.communityPoints || 0} /><Stat label="Championships" value={team.championships || 0} /><Stat label="Events Played" value={team.eventsPlayed || 0} /></section>
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <section className="glass rounded-2xl p-6"><h2 className="font-rajdhani text-2xl font-bold uppercase">Team Profile</h2><div className="mt-5 flex items-center gap-4"><TeamLogo src={logoUrl} name={team.teamName} size={80} /><div><p className="font-semibold">{team.teamName}</p><span className="mt-1 inline-flex rounded-full border border-emerald-400/30 px-3 py-1 text-xs text-emerald-400">{team.status || "Active"}</span></div></div>
          {canEdit && <><label className="mt-6 block text-sm text-slate-300">Team Logo URL<input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-gold/60" placeholder="Paste direct image URL" /></label><button type="button" onClick={() => setShowLogoGuide((value) => !value)} className="mt-3 inline-flex items-center gap-2 text-sm text-gold hover:underline"><HelpCircle className="h-4 w-4" />How to make a logo URL?</button>{showLogoGuide && <div className="mt-3 rounded-xl border border-gold/20 bg-gold/[0.05] p-4 text-sm text-slate-300"><p className="font-semibold text-white">Google Drive method</p><ol className="mt-2 list-decimal space-y-1.5 pl-5 leading-6"><li>Upload your PNG/JPG logo to Google Drive.</li><li>Share it → <b>Anyone with the link</b>.</li><li>Take the ID from <span className="text-slate-400">/file/d/FILE_ID/view</span>.</li><li>Use <span className="text-gold">https://drive.google.com/uc?export=view&id=FILE_ID</span>.</li></ol></div>}<label className="mt-5 block text-sm text-slate-300">Mobile Number<input value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} inputMode="tel" maxLength={20} className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-gold/60" placeholder="Enter team contact number" /></label><label className="mt-5 block text-sm text-slate-300">Team Description<textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-gold/60" placeholder="Write your official team description" /></label><button onClick={save} disabled={saving} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gold px-4 py-3 font-bold text-black disabled:opacity-50"><Save className="h-4 w-4" />{saving ? "Saving..." : "Save Changes"}</button></>}
          {!canEdit && <div className="mt-6 space-y-4"><div className="rounded-xl border border-white/10 bg-black/20 p-4"><p className="text-xs uppercase tracking-wider text-slate-500">Team Contact</p><p className="mt-1 text-sm">{mobileNumber || "Not provided"}</p></div><div className="rounded-xl border border-white/10 bg-black/20 p-4"><p className="text-sm leading-6 text-slate-300">{description || "No team description has been added yet."}</p></div></div>}
          {canEdit && <div className="mt-6 border-t border-white/10 pt-6"><button onClick={() => setShowPassword((value) => !value)} className="inline-flex items-center gap-2 text-sm font-semibold text-gold hover:underline"><KeyRound className="h-4 w-4" />{showPassword ? "Hide Change Password" : "Change Password"}</button>{showPassword && <div className="mt-4 space-y-3"><input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Current password" className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3" /><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password (8+ characters)" className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3" /><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3" /><button onClick={changePassword} disabled={passwordSaving} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gold/40 px-4 py-3 font-semibold text-gold disabled:opacity-50">{passwordSaving ? "Changing..." : "Change Password"}</button></div>}</div>}
          {message && <div className="mt-5 flex items-start gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-3 text-sm text-emerald-300"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{message}</div>}
          </section>
          <section className="glass rounded-2xl p-6"><div className="flex items-center justify-between"><div><h2 className="font-rajdhani text-2xl font-bold uppercase">Team Roster</h2><p className="text-sm text-slate-500">{canEdit ? "Manage player names and UIDs." : "Current registered players."}</p></div>{canEdit && <button onClick={addPlayer} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm hover:border-gold/50 hover:text-gold"><Plus className="h-4 w-4" />Add Player</button>}</div><div className="mt-5 space-y-3">{roster.map((player, index) => <div key={`${index}-${player.uid}`} className="grid gap-2 rounded-xl border border-white/10 bg-black/20 p-3 sm:grid-cols-[1fr_1fr_auto]">{canEdit ? <><input value={player.name} onChange={(e) => updatePlayer(index, "name", e.target.value)} placeholder="Player name" className="rounded-lg border border-white/10 bg-black/40 px-3 py-2" /><input value={player.uid} onChange={(e) => updatePlayer(index, "uid", e.target.value)} placeholder="UID" className="rounded-lg border border-white/10 bg-black/40 px-3 py-2" /><button onClick={() => removePlayer(index)} className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-red-300"><Trash2 className="h-4 w-4" /></button></> : <><div className="px-2 py-1 font-semibold">{player.name || "Unnamed Player"}</div><div className="px-2 py-1 text-sm text-slate-400">UID: {player.uid || "—"}</div></>}</div>)}{!roster.length && <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">No players added yet.</div>}</div>{canEdit && <button onClick={save} disabled={saving} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-3 font-semibold hover:border-gold/50 hover:text-gold"><Save className="h-4 w-4" />Save Roster</button>}</section>
        </div>
        <div className="mt-6 flex flex-wrap gap-3 text-sm"><Link href={`/teams/${team.slug}`} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-3">View Public Team Profile <ExternalLink className="h-4 w-4" /></Link><Link href="/" className="rounded-lg border border-white/10 px-4 py-3">Back to Rankings</Link></div>
      </div>

      <div className="pointer-events-none fixed left-[-20000px] top-0 z-[-1]" aria-hidden="true">
        <div ref={posterRef} style={{ width: 1080, height: 1350, background: "linear-gradient(135deg,#050507 0%,#11151d 48%,#050507 100%)", color: "#fff", fontFamily: "Arial,sans-serif", padding: 54, boxSizing: "border-box" }}>
          <div style={{ height: "100%", border: "3px solid #d4af37", padding: 36, boxSizing: "border-box", position: "relative", overflow: "hidden", background: "radial-gradient(circle at 50% 20%,rgba(212,175,55,.18),transparent 34%)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}><img src="/brand/tnffm-logo.png" crossOrigin="anonymous" style={{ width: 130, height: 62, objectFit: "contain" }} alt="TNFFM" /><div style={{ textAlign: "right" }}><div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 3, color: "#d4af37" }}>OFFICIAL</div><div style={{ fontSize: 23, fontWeight: 900, letterSpacing: 1 }}>TNFFM COMMUNITY RANKINGS</div></div></div>
            <div style={{ marginTop: 34, display: "flex", alignItems: "center", gap: 28, padding: 28, borderRadius: 20, background: "rgba(255,255,255,.045)", border: "1px solid rgba(212,175,55,.35)" }}><img src={posterLogo} crossOrigin="anonymous" onError={(event) => { event.currentTarget.src = "/brand/tnffm-logo.png"; }} style={{ width: 180, height: 180, objectFit: "contain", borderRadius: 20, background: "rgba(0,0,0,.45)", border: "2px solid rgba(212,175,55,.7)" }} alt="Team logo" /><div style={{ flex: 1 }}><div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 3, color: "#d4af37" }}>TEAM</div><div style={{ fontSize: 55, lineHeight: 1.05, fontWeight: 950, textTransform: "uppercase", marginTop: 8 }}>{team.teamName}</div><div style={{ marginTop: 15, display: "inline-block", padding: "8px 18px", borderRadius: 999, background: "#d4af37", color: "#050507", fontSize: 20, fontWeight: 900 }}>RANK #{team.rank || "—"}</div></div></div>
            <div style={{ marginTop: 26, display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>{[["COMMUNITY", team.communityPoints || 0], ["CHAMPIONS", team.championships || 0], ["RUNNER-UP", team.runnerUp || 0], ["2ND RUNNER", team.secondRunnerUp || 0], ["TOP 5", team.top3Finishes || 0]].map(([label, value]) => <div key={String(label)} style={{ padding: "14px 8px", textAlign: "center", borderRadius: 12, background: "rgba(255,255,255,.055)", border: "1px solid rgba(255,255,255,.08)" }}><div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 700, letterSpacing: 1 }}>{label}</div><div style={{ marginTop: 5, fontSize: 28, fontWeight: 900 }}>{value}</div></div>)}</div>
            <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "1.25fr .75fr", gap: 18 }}><div style={{ borderRadius: 16, padding: 22, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)" }}><div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 2, color: "#d4af37" }}>OFFICIAL ROSTER</div><div style={{ marginTop: 12 }}>{posterPlayers.map((player, index) => <div key={`${index}-${player.uid}`} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "10px 0", borderBottom: index === posterPlayers.length - 1 ? "none" : "1px solid rgba(255,255,255,.08)" }}><span style={{ fontSize: 20, fontWeight: 800 }}>{String(index + 1).padStart(2, "0")} &nbsp; {player.name || "Player"}</span><span style={{ fontSize: 16, color: "#9ca3af" }}>{player.uid ? `UID: ${player.uid}` : ""}</span></div>)}</div></div><div style={{ borderRadius: 16, padding: 22, background: "rgba(212,175,55,.06)", border: "1px solid rgba(212,175,55,.22)" }}><div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 2, color: "#d4af37" }}>EVENTS PLAYED</div><div style={{ fontSize: 52, fontWeight: 950, marginTop: 8 }}>{team.eventsPlayed || 0}</div><div style={{ marginTop: 24, fontSize: 15, color: "#9ca3af", lineHeight: 1.5 }}>Official TNFFM community ranking team profile.</div></div></div>
            <div style={{ marginTop: 20, padding: 18, borderRadius: 14, background: "rgba(255,255,255,.035)", borderLeft: "4px solid #d4af37" }}><div style={{ fontSize: 14, color: "#d4af37", fontWeight: 800, letterSpacing: 2 }}>TEAM DESCRIPTION</div><div style={{ marginTop: 7, fontSize: 17, lineHeight: 1.45, color: "#d1d5db" }}>{description || "Official team profile on TNFFM Community Rankings."}</div></div>
            <div style={{ position: "absolute", left: 36, right: 36, bottom: 25, display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(212,175,55,.35)", paddingTop: 12 }}><span style={{ fontSize: 14, fontWeight: 800, letterSpacing: 1.5 }}>TNFFM ESPORTS</span><span style={{ fontSize: 13, color: "#9ca3af" }}>{mobileNumber ? `CONTACT: ${mobileNumber}` : "OFFICIAL COMMUNITY RANKINGS"}</span></div>
          </div>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) { return <div className="glass rounded-xl p-4"><p className="text-xs uppercase tracking-wider text-slate-500">{label}</p><p className="mt-2 font-rajdhani text-3xl font-bold">{value}</p></div>; }
