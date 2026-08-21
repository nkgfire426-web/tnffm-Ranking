"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Download, ExternalLink, HelpCircle, KeyRound, LayoutTemplate, LogOut, Maximize2, Plus, Save, Trash2 } from "lucide-react";
import { toBlob, toPng } from "html-to-image";
import { TeamLogo } from "@/components/TeamLogo";
import { TeamFeedbackWidget } from "@/components/TeamFeedbackWidget";

type Player = { name: string; uid: string };
type PosterRatio = "4:5" | "1:1" | "9:16" | "16:9";
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

const POSTER_SIZES: Record<PosterRatio, { width: number; height: number; label: string; hint: string }> = {
  "4:5": { width: 1080, height: 1350, label: "Instagram Portrait", hint: "Best for Instagram posts" },
  "1:1": { width: 1080, height: 1080, label: "Square", hint: "Best for profile sharing" },
  "9:16": { width: 1080, height: 1920, label: "Story / Status", hint: "Best for WhatsApp & Stories" },
  "16:9": { width: 1920, height: 1080, label: "Landscape", hint: "Best for screens & banners" },
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
  const [showPosterOptions, setShowPosterOptions] = useState(false);
  const [posterRatio, setPosterRatio] = useState<PosterRatio>("4:5");
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
      const size = POSTER_SIZES[posterRatio];
      await document.fonts?.ready;
      await waitForImages(poster);
      await new Promise((resolve) => setTimeout(resolve, 150));

      let blob = await toBlob(poster, { width: size.width, height: size.height, pixelRatio: 1, cacheBust: true, backgroundColor: "#050507", skipFonts: true });
      if (!blob) {
        const dataUrl = await toPng(poster, { width: size.width, height: size.height, pixelRatio: 1, cacheBust: true, backgroundColor: "#050507", skipFonts: true });
        blob = await (await fetch(dataUrl)).blob();
      }
      if (!blob || blob.size < 1000) throw new Error("Poster image was empty.");

      const safeName = team.teamName.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "team";
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.href = url; link.download = `${safeName}-TNFFM-${posterRatio.replace(":", "x")}.png`; link.style.display = "none"; document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      setMessage(`${POSTER_SIZES[posterRatio].label} poster downloaded successfully.`);
    } catch (error) {
      console.error("Team poster generation failed:", error);
      setMessage("Poster could not be generated. Try again after saving your team profile.");
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
  const posterSize = POSTER_SIZES[posterRatio];

  return (
    <main className="min-h-screen bg-[#050507] px-3 pb-28 pt-5 text-white sm:px-6 sm:py-10 lg:px-8 lg:pb-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-5 rounded-2xl border border-white/10 bg-gradient-to-br from-[#111113] to-[#080809] p-4 shadow-2xl shadow-black/20 sm:mb-8 sm:p-6">
          <div className="flex items-center gap-3 sm:gap-5">
            <div className="shrink-0 rounded-2xl border border-gold/30 bg-black/40 p-2 shadow-lg shadow-gold/5"><TeamLogo src={logoUrl} name={team.teamName} size={58} /></div>
            <div className="min-w-0 flex-1"><p className="font-rajdhani text-[11px] font-bold uppercase tracking-[0.22em] text-gold">{canEdit ? "TNFFM Team Portal" : "TNFFM Team Profile"}</p><h1 className="mt-0.5 truncate font-rajdhani text-2xl font-bold uppercase sm:text-4xl">{team.teamName}</h1>{canEdit && <p className="truncate text-xs text-slate-500 sm:text-sm">Signed in as @{username}</p>}</div>
            <div className="hidden shrink-0 items-center gap-2 sm:flex">{canEdit ? <button onClick={logout} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm text-slate-300 hover:border-red-400/30 hover:text-red-300"><LogOut className="h-4 w-4" />Logout</button> : <Link href="/team-login" className="rounded-xl border border-white/10 px-4 py-3 text-sm text-slate-300 hover:border-gold/30 hover:text-gold">Team Login</Link>}</div>
          </div>
          {canEdit && <div className="mt-4 flex gap-2 sm:hidden"><button onClick={() => setShowPosterOptions((v) => !v)} className="flex-1 rounded-xl border border-gold/30 bg-gold/10 px-3 py-3 text-xs font-bold text-gold"><LayoutTemplate className="mx-auto mb-1 h-4 w-4" />Poster</button><button onClick={save} disabled={saving} className="flex-1 rounded-xl bg-gold px-3 py-3 text-xs font-bold text-black disabled:opacity-50"><Save className="mx-auto mb-1 h-4 w-4" />{saving ? "Saving" : "Save"}</button><button onClick={logout} className="flex-1 rounded-xl border border-white/10 px-3 py-3 text-xs font-bold text-slate-300"><LogOut className="mx-auto mb-1 h-4 w-4" />Logout</button></div>}
        </header>

        <section className="mb-5 grid grid-cols-2 gap-2.5 sm:mb-6 sm:grid-cols-4 sm:gap-3"><Stat label="Rank" value={team.rank || "—"} /><Stat label="Community Points" value={team.communityPoints || 0} /><Stat label="Championships" value={team.championships || 0} /><Stat label="Events Played" value={team.eventsPlayed || 0} /></section>

        {canEdit && showPosterOptions && <section className="mb-5 rounded-2xl border border-gold/20 bg-gradient-to-br from-[#12110d] to-[#090909] p-4 sm:p-5"><div className="flex items-center gap-2"><Maximize2 className="h-4 w-4 text-gold" /><div><h2 className="font-rajdhani text-xl font-bold uppercase">Poster Size</h2><p className="text-xs text-slate-500">Choose the ratio that fits where you want to share it.</p></div></div><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{(Object.keys(POSTER_SIZES) as PosterRatio[]).map((ratio) => { const item = POSTER_SIZES[ratio]; const active = posterRatio === ratio; return <button key={ratio} type="button" onClick={() => setPosterRatio(ratio)} className={`rounded-xl border p-3 text-left transition ${active ? "border-gold bg-gold/10 text-white" : "border-white/10 bg-black/20 text-slate-300 hover:border-white/20"}`}><div className="flex items-center justify-between"><span className="font-rajdhani text-lg font-bold">{ratio}</span>{active && <span className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-black">SELECTED</span>}</div><p className="mt-1 text-[11px] text-slate-500">{item.label}</p><p className="mt-1 text-[10px] text-slate-600">{item.hint}</p></button>; })}</div><button onClick={downloadPoster} disabled={generatingPoster} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gold px-4 py-3 font-bold text-black disabled:opacity-50"><Download className="h-4 w-4" />{generatingPoster ? "Generating Poster..." : `Download ${posterRatio} Poster`}</button></section>}

        <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr] lg:gap-6">
          <section className="glass rounded-2xl p-4 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold">01</p><h2 className="font-rajdhani text-2xl font-bold uppercase">Team Profile</h2></div><span className="rounded-full border border-emerald-400/30 bg-emerald-400/5 px-2.5 py-1 text-[10px] font-bold uppercase text-emerald-400">{team.status || "Active"}</span></div><div className="mt-5 flex items-center gap-4 rounded-2xl border border-white/10 bg-black/20 p-3"><TeamLogo src={logoUrl} name={team.teamName} size={68} /><div className="min-w-0"><p className="truncate font-semibold">{team.teamName}</p><p className="mt-1 text-xs text-slate-500">{canEdit ? "Your team information" : "Official team information"}</p></div></div>
          {canEdit && <><label className="mt-5 block text-sm text-slate-300">Team Logo URL<input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-gold/60" placeholder="Paste direct image URL" /></label><button type="button" onClick={() => setShowLogoGuide((value) => !value)} className="mt-3 inline-flex min-h-10 items-center gap-2 text-sm text-gold hover:underline"><HelpCircle className="h-4 w-4" />How to make a logo URL?</button>{showLogoGuide && <div className="mt-3 rounded-xl border border-gold/20 bg-gold/[0.05] p-4 text-sm text-slate-300"><p className="font-semibold text-white">Google Drive method</p><ol className="mt-2 list-decimal space-y-1.5 pl-5 leading-6"><li>Upload your PNG/JPG logo to Google Drive.</li><li>Share it → <b>Anyone with the link</b>.</li><li>Take the ID from <span className="text-slate-400">/file/d/FILE_ID/view</span>.</li><li>Use <span className="text-gold">https://drive.google.com/uc?export=view&id=FILE_ID</span>.</li></ol></div>}<label className="mt-5 block text-sm text-slate-300">Mobile Number<input value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} inputMode="tel" maxLength={20} className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-gold/60" placeholder="Enter team contact number" /></label><label className="mt-5 block text-sm text-slate-300">Team Description<textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-gold/60" placeholder="Write your official team description" /></label><button onClick={save} disabled={saving} className="mt-5 hidden min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gold px-4 py-3 font-bold text-black disabled:opacity-50 sm:inline-flex"><Save className="h-4 w-4" />{saving ? "Saving..." : "Save Changes"}</button></>}
          {!canEdit && <div className="mt-5 space-y-3"><div className="rounded-xl border border-white/10 bg-black/20 p-4"><p className="text-[10px] uppercase tracking-wider text-slate-500">Team Contact</p><p className="mt-1 text-sm">{mobileNumber || "Not provided"}</p></div><div className="rounded-xl border border-white/10 bg-black/20 p-4"><p className="text-sm leading-6 text-slate-300">{description || "No team description has been added yet."}</p></div></div>}
          {canEdit && <div className="mt-6 border-t border-white/10 pt-5"><button onClick={() => setShowPassword((value) => !value)} className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-gold hover:underline"><KeyRound className="h-4 w-4" />{showPassword ? "Hide Change Password" : "Change Password"}</button>{showPassword && <div className="mt-4 space-y-3"><input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Current password" className="min-h-12 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3" /><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password (8+ characters)" className="min-h-12 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3" /><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" className="min-h-12 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3" /><button onClick={changePassword} disabled={passwordSaving} className="min-h-12 w-full rounded-xl border border-gold/40 px-4 py-3 font-semibold text-gold disabled:opacity-50">{passwordSaving ? "Changing..." : "Change Password"}</button></div>}</div>}
          {message && <div className="mt-5 flex items-start gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3 text-sm text-emerald-300"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{message}</div>}
          </section>

          <section className="glass rounded-2xl p-4 sm:p-6"><div className="flex items-center justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold">02</p><h2 className="font-rajdhani text-2xl font-bold uppercase">Team Roster</h2><p className="text-xs text-slate-500 sm:text-sm">{canEdit ? "Manage player names and UIDs." : "Current registered players."}</p></div>{canEdit && <button onClick={addPlayer} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm hover:border-gold/50 hover:text-gold"><Plus className="h-4 w-4" /><span className="hidden sm:inline">Add Player</span><span className="sm:hidden">Add</span></button>}</div><div className="mt-5 space-y-2.5">{roster.map((player, index) => <div key={`${index}-${player.uid}`} className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="mb-2 flex items-center justify-between"><span className="font-rajdhani text-xs font-bold uppercase tracking-wider text-gold">Player {String(index + 1).padStart(2, "0")}</span>{canEdit && <button onClick={() => removePlayer(index)} className="rounded-lg p-2 text-slate-500 hover:bg-red-400/5 hover:text-red-300"><Trash2 className="h-4 w-4" /></button>}</div>{canEdit ? <div className="grid gap-2 sm:grid-cols-2"><input value={player.name} onChange={(e) => updatePlayer(index, "name", e.target.value)} placeholder="Player name" className="min-h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm" /><input value={player.uid} onChange={(e) => updatePlayer(index, "uid", e.target.value)} placeholder="Free Fire UID" inputMode="numeric" className="min-h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm" /></div> : <div className="grid grid-cols-1 gap-1 sm:grid-cols-2"><div className="px-1 py-1 font-semibold">{player.name || "Unnamed Player"}</div><div className="px-1 py-1 text-sm text-slate-400">UID: {player.uid || "—"}</div></div>}</div>)}{!roster.length && <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">No players added yet.</div>}</div>{canEdit && <button onClick={save} disabled={saving} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 font-semibold hover:border-gold/50 hover:text-gold disabled:opacity-50"><Save className="h-4 w-4" />{saving ? "Saving..." : "Save Roster"}</button>}</section>
        </div>

        <section className="mt-5 rounded-2xl border border-gold/15 bg-gradient-to-r from-gold/[0.06] to-transparent p-4 sm:p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold">Team Poster</p><h2 className="font-rajdhani text-2xl font-bold uppercase">Create your official poster</h2><p className="text-xs text-slate-500 sm:text-sm">{POSTER_SIZES[posterRatio].label} · {posterSize.width} × {posterSize.height}px</p></div>{canEdit && <div className="flex gap-2"><button onClick={() => setShowPosterOptions((v) => !v)} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-semibold hover:border-gold/40 hover:text-gold sm:flex-none"><Maximize2 className="h-4 w-4" />Ratio</button><button onClick={downloadPoster} disabled={generatingPoster} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gold px-4 text-sm font-bold text-black disabled:opacity-50 sm:flex-none"><Download className="h-4 w-4" />{generatingPoster ? "Creating" : "Download"}</button></div>}</div></section>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap"><Link href={`/teams/${team.slug}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 text-sm hover:border-gold/30 hover:text-gold">View Public Team Profile <ExternalLink className="h-4 w-4" /></Link><Link href="/" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 px-4 text-sm">Back to Rankings</Link></div>
      </div>

      <div className="pointer-events-none fixed left-[-30000px] top-0 z-[-1] overflow-hidden" aria-hidden="true">
        <div ref={posterRef} style={{ width: posterSize.width, height: posterSize.height, background: "linear-gradient(145deg,#030304 0%,#0d0d10 48%,#050507 100%)", color: "#fff", fontFamily: "Arial,sans-serif", padding: posterRatio === "9:16" ? 42 : 54, boxSizing: "border-box" }}>
          <div style={{ height: "100%", border: "3px solid #d4af37", padding: posterRatio === "9:16" ? 30 : 36, boxSizing: "border-box", position: "relative", overflow: "hidden", background: "radial-gradient(circle at 50% 8%,rgba(212,175,55,.18),transparent 30%),linear-gradient(160deg,rgba(212,175,55,.05),transparent 45%)" }}>
            <div style={{ position: "absolute", top: 22, right: 22, width: 120, height: 120, border: "1px solid rgba(212,175,55,.18)", transform: "rotate(45deg)" }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}><img src="/brand/tnffm-logo.png" crossOrigin="anonymous" style={{ width: posterRatio === "16:9" ? 160 : 130, height: 62, objectFit: "contain" }} alt="TNFFM" /><div style={{ textAlign: "right" }}><div style={{ fontSize: 16, fontWeight: 800, letterSpacing: 3, color: "#d4af37" }}>OFFICIAL</div><div style={{ fontSize: 21, fontWeight: 900, letterSpacing: 1 }}>TNFFM COMMUNITY RANKINGS</div></div></div>
            <div style={{ marginTop: 28, display: "flex", alignItems: "center", gap: 24, padding: 24, borderRadius: 18, background: "rgba(255,255,255,.035)", border: "1px solid rgba(212,175,55,.35)" }}><img src={posterLogo} crossOrigin="anonymous" onError={(event) => { event.currentTarget.src = "/brand/tnffm-logo.png"; }} style={{ width: posterRatio === "9:16" ? 150 : 175, height: posterRatio === "9:16" ? 150 : 175, objectFit: "contain", borderRadius: 18, background: "rgba(0,0,0,.5)", border: "2px solid rgba(212,175,55,.7)" }} alt="Team logo" /><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 16, fontWeight: 800, letterSpacing: 3, color: "#d4af37" }}>TEAM</div><div style={{ fontSize: posterRatio === "16:9" ? 52 : posterRatio === "9:16" ? 42 : 50, lineHeight: 1.05, fontWeight: 950, textTransform: "uppercase", marginTop: 8, wordBreak: "break-word" }}>{team.teamName}</div><div style={{ marginTop: 13, display: "inline-block", padding: "7px 16px", borderRadius: 999, background: "#d4af37", color: "#050507", fontSize: 18, fontWeight: 900 }}>RANK #{team.rank || "—"}</div></div></div>
            <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>{[["COMMUNITY", team.communityPoints || 0], ["CHAMPIONS", team.championships || 0], ["RUNNER-UP", team.runnerUp || 0], ["2ND RUNNER", team.secondRunnerUp || 0], ["TOP 5", team.top3Finishes || 0]].map(([label, value]) => <div key={String(label)} style={{ padding: "12px 6px", textAlign: "center", borderRadius: 11, background: "rgba(255,255,255,.045)", border: "1px solid rgba(255,255,255,.08)" }}><div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700, letterSpacing: 1 }}>{label}</div><div style={{ marginTop: 5, fontSize: 26, fontWeight: 900 }}>{value}</div></div>)}</div>
            <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: posterRatio === "9:16" ? "1fr" : "1.25fr .75fr", gap: 16 }}><div style={{ borderRadius: 15, padding: 20, background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.08)" }}><div style={{ fontSize: 16, fontWeight: 900, letterSpacing: 2, color: "#d4af37" }}>OFFICIAL ROSTER</div><div style={{ marginTop: 10 }}>{posterPlayers.map((player, index) => <div key={`${index}-${player.uid}`} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderBottom: index === posterPlayers.length - 1 ? "none" : "1px solid rgba(255,255,255,.08)" }}><span style={{ fontSize: 18, fontWeight: 800 }}>{String(index + 1).padStart(2, "0")} &nbsp; {player.name || "Player"}</span><span style={{ fontSize: 14, color: "#9ca3af" }}>{player.uid ? `UID: ${player.uid}` : ""}</span></div>)}</div></div>{posterRatio !== "9:16" && <div style={{ borderRadius: 15, padding: 20, background: "rgba(212,175,55,.06)", border: "1px solid rgba(212,175,55,.22)" }}><div style={{ fontSize: 16, fontWeight: 900, letterSpacing: 2, color: "#d4af37" }}>EVENTS PLAYED</div><div style={{ fontSize: 50, fontWeight: 950, marginTop: 7 }}>{team.eventsPlayed || 0}</div><div style={{ marginTop: 22, fontSize: 14, color: "#9ca3af", lineHeight: 1.5 }}>Official TNFFM community ranking team profile.</div></div>}</div>
            <div style={{ marginTop: 17, padding: 16, borderRadius: 13, background: "rgba(255,255,255,.03)", borderLeft: "4px solid #d4af37" }}><div style={{ fontSize: 12, color: "#d4af37", fontWeight: 800, letterSpacing: 2 }}>TEAM DESCRIPTION</div><div style={{ marginTop: 6, fontSize: 15, lineHeight: 1.4, color: "#d1d5db" }}>{description || "Official team profile on TNFFM Community Rankings."}</div></div>
            <div style={{ position: "absolute", left: 30, right: 30, bottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(212,175,55,.35)", paddingTop: 10 }}><span style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1.5 }}>TNFFM ESPORTS</span><span style={{ fontSize: 12, color: "#9ca3af" }}>{mobileNumber ? `CONTACT: ${mobileNumber}` : "OFFICIAL COMMUNITY RANKINGS"}</span></div>
          </div>
        </div>
      </div>
      {canEdit && <TeamFeedbackWidget />}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) { return <div className="glass rounded-xl border border-white/5 p-3.5 sm:p-4"><p className="text-[10px] uppercase tracking-wider text-slate-500 sm:text-xs">{label}</p><p className="mt-1.5 font-rajdhani text-2xl font-bold sm:mt-2 sm:text-3xl">{value}</p></div>; }
