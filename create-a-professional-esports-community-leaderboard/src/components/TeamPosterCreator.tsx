"use client";

import { useMemo, useRef, useState } from "react";
import { Download, Plus, Trash2, Upload } from "lucide-react";
import { toPng } from "html-to-image";

const W = 1080;
const H = 1350;
type Player = { name: string; uid: string; role: string };

const blankPlayer = (): Player => ({ name: "", uid: "", role: "" });
function safeName(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "tnffm-team";
}

export function TeamPosterCreator() {
  const [teamName, setTeamName] = useState("");
  const [tag, setTag] = useState("");
  const [description, setDescription] = useState("");
  const [guildName, setGuildName] = useState("");
  const [place, setPlace] = useState("");
  const [achievements, setAchievements] = useState(["", "", "", ""]);
  const [players, setPlayers] = useState<Player[]>([blankPlayer()]);
  const [logo, setLogo] = useState<string>("");
  const [downloading, setDownloading] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);

  const fileName = useMemo(() => safeName(teamName), [teamName]);
  const updatePlayer = (index: number, key: keyof Player, value: string) => {
    setPlayers(current => current.map((player, i) => i === index ? { ...player, [key]: value } : player));
  };
  const addPlayer = () => setPlayers(current => current.length < 6 ? [...current, blankPlayer()] : current);
  const removePlayer = (index: number) => setPlayers(current => current.length === 1 ? current : current.filter((_, i) => i !== index));

  async function download() {
    if (!posterRef.current || downloading) return;
    if (!teamName.trim()) { window.alert("Please enter your team name first."); return; }
    setDownloading(true);
    try {
      const dataUrl = await toPng(posterRef.current, { cacheBust: true, pixelRatio: 1, width: W, height: H });
      const link = document.createElement("a");
      link.download = `tnffm-${fileName}-team-poster.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("TNFFM team poster export failed", error);
      window.alert("Unable to prepare the poster. Please try again.");
    } finally { setDownloading(false); }
  }

  return <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,470px)_1fr]">
    <section className="rounded-3xl border border-white/10 bg-black/30 p-5 sm:p-7">
      <div className="mb-6"><p className="text-xs font-bold uppercase tracking-[0.25em] text-gold">Build your poster</p><h2 className="mt-1 font-rajdhani text-3xl font-black uppercase text-white">Team information</h2><p className="mt-2 text-sm text-slate-500">Enter your own team details. Nothing is saved to the TNFFM database.</p></div>
      <div className="space-y-4">
        <Field label="Team name" value={teamName} onChange={setTeamName} placeholder="Example: NIGHT HAWKS TN" required />
        <Field label="Team tag" value={tag} onChange={setTag} placeholder="Example: NHK" maxLength={10} />
        <Field label="Guild name" value={guildName} onChange={setGuildName} placeholder="Enter guild name" />
        <Field label="Place / Location" value={place} onChange={setPlace} placeholder="Example: Krishnagiri, Tamil Nadu" />
        <label className="block text-sm font-semibold text-slate-300">Team description<textarea value={description} onChange={e => setDescription(e.target.value.slice(0, 260))} rows={4} placeholder="Tell the community about your team..." className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-gold/50" /></label>
        <div><p className="text-sm font-semibold text-slate-300">Top 4 achievements</p><div className="mt-2 space-y-2">{achievements.map((achievement, index) => <input key={index} value={achievement} onChange={e => setAchievements(current => current.map((item, i) => i === index ? e.target.value.slice(0, 80) : item))} placeholder={`${index + 1}. Achievement`} className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-gold/50" />)}</div></div>
        <div><div className="flex items-center justify-between"><p className="text-sm font-semibold text-slate-300">Team players <span className="text-slate-500">({players.length}/6)</span></p><button type="button" onClick={addPlayer} disabled={players.length >= 6} className="inline-flex items-center gap-1 rounded-lg border border-gold/25 px-3 py-2 text-xs font-bold text-gold disabled:opacity-40"><Plus className="h-3.5 w-3.5" /> Add player</button></div><div className="mt-3 space-y-3">{players.map((player, index) => <div key={index} className="rounded-2xl border border-white/10 bg-white/[0.025] p-3"><div className="mb-2 flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-widest text-gold">Player {index + 1}</span>{players.length > 1 && <button type="button" onClick={() => removePlayer(index)} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-red-400" aria-label={`Remove player ${index + 1}`}><Trash2 className="h-4 w-4" /></button>}</div><div className="grid gap-2 sm:grid-cols-2"><input value={player.name} onChange={e => updatePlayer(index, "name", e.target.value.slice(0, 35))} placeholder="Player name" className="rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-gold/50" /><input value={player.uid} onChange={e => updatePlayer(index, "uid", e.target.value.slice(0, 25))} placeholder="Player UID" className="rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-gold/50" /><input value={player.role} onChange={e => updatePlayer(index, "role", e.target.value.slice(0, 25))} placeholder="Player role (IGL / Rusher...)" className="sm:col-span-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-gold/50" /></div></div>)}</div></div>
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-3 text-sm font-semibold text-slate-300 hover:border-gold/40"><Upload className="h-4 w-4 text-gold" /> {logo ? "Change team logo" : "Upload team logo"}<input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) setLogo(URL.createObjectURL(file)); }} /></label>
        <button type="button" onClick={() => void download()} disabled={downloading} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gold px-5 py-3.5 font-black text-black transition hover:brightness-110 disabled:opacity-60"><Download className="h-5 w-5" /> {downloading ? "Preparing PNG…" : "Download Team Poster"}</button>
        <p className="text-center text-xs text-slate-600">1080 × 1350 PNG • Instagram-ready • Up to 6 players</p>
      </div>
    </section>

    <section className="min-h-[700px] rounded-3xl border border-white/10 bg-black/30 p-4 sm:p-8"><div className="flex min-h-[650px] items-center justify-center overflow-auto"><div className="origin-center scale-[0.28] sm:scale-[0.36] md:scale-[0.43] lg:scale-[0.48]" style={{ width: W * 0.48, height: H * 0.48 }}><div ref={posterRef}><Poster teamName={teamName} tag={tag} description={description} guildName={guildName} place={place} achievements={achievements} players={players} logo={logo} /></div></div></div></section>
  </div>;
}

function Field({ label, value, onChange, placeholder, maxLength, required }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; maxLength?: number; required?: boolean }) {
  return <label className="block text-sm font-semibold text-slate-300">{label}{required && <span className="ml-1 text-gold">*</span>}<input value={value} maxLength={maxLength} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-gold/50" /></label>;
}

function Poster({ teamName, tag, description, guildName, place, achievements, players, logo }: { teamName: string; tag: string; description: string; guildName: string; place: string; achievements: string[]; players: Player[]; logo: string }) {
  const validPlayers = players.filter(p => p.name || p.uid).slice(0, 6);
  const validAchievements = achievements.filter(Boolean).slice(0, 4);
  return <div style={{ width: W, height: H, position: "relative", overflow: "hidden", background: "linear-gradient(145deg,#040404 0%,#0b0b0b 62%,#170507 100%)", color: "#fff", fontFamily: "Arial, Helvetica, sans-serif" }}>
    <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 86% 10%,rgba(212,175,55,.18),transparent 27%),radial-gradient(circle at 8% 88%,rgba(180,20,40,.16),transparent 30%)" }} />
    <div style={{ position: "absolute", left: 54, right: 54, top: 48, height: 5, background: "linear-gradient(90deg,#d4af37,transparent)" }} />
    <div style={{ position: "absolute", left: 54, top: 78, fontSize: 22, fontWeight: 900, letterSpacing: 7, color: "#d4af37" }}>TNFFM COMMUNITY</div>
    <div style={{ position: "absolute", right: 54, top: 76, fontSize: 18, fontWeight: 800, letterSpacing: 3, color: "#999" }}>ESPORTS TEAM</div>
    <div style={{ position: "absolute", left: 54, right: 54, top: 135, height: 420, border: "1px solid rgba(255,255,255,.12)", borderRadius: 30, background: "rgba(255,255,255,.035)", display: "flex", alignItems: "center", padding: 42 }}>
      <div style={{ width: 230, height: 230, flexShrink: 0, borderRadius: 34, border: "3px solid rgba(212,175,55,.7)", background: "#050505", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>{logo ? <img src={logo} alt="" style={{ width: 190, height: 190, objectFit: "contain" }} /> : <div style={{ fontSize: 68, fontWeight: 900, color: "#d4af37" }}>{(tag || teamName || "TN").slice(0, 3).toUpperCase()}</div>}</div>
      <div style={{ marginLeft: 45, minWidth: 0 }}><div style={{ fontSize: 58, lineHeight: .98, fontWeight: 900, textTransform: "uppercase", wordBreak: "break-word" }}>{teamName || "YOUR TEAM NAME"}</div>{tag && <div style={{ marginTop: 18, fontSize: 24, fontWeight: 900, letterSpacing: 6, color: "#d4af37" }}>[ {tag.toUpperCase()} ]</div>}<div style={{ marginTop: 22, fontSize: 17, color: "#888", letterSpacing: 2 }}>TAMIL NADU FREE FIRE MAX</div></div>
    </div>
    <div style={{ position: "absolute", left: 54, right: 54, top: 590, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <Info title="GUILD NAME" value={guildName || "—"} /><Info title="PLACE" value={place || "—"} />
    </div>
    <div style={{ position: "absolute", left: 54, right: 54, top: 710, display: "grid", gridTemplateColumns: "1.05fr .95fr", gap: 18 }}>
      <Box title="ABOUT THE TEAM"><div style={{ fontSize: 20, lineHeight: 1.45, color: "#c5c5c5" }}>{description || "Competitive Free Fire MAX esports team."}</div></Box>
      <Box title="TOP 4 ACHIEVEMENTS"><div style={{ display: "grid", gap: 9 }}>{(validAchievements.length ? validAchievements : ["Add your achievements in the studio"]).map((item, i) => <div key={i} style={{ display: "flex", gap: 10, fontSize: 17, color: "#ddd" }}><span style={{ color: "#d4af37", fontWeight: 900 }}>{i + 1}.</span><span>{item}</span></div>)}</div></Box>
    </div>
    <div style={{ position: "absolute", left: 54, right: 54, top: 1000 }}><div style={{ fontSize: 17, fontWeight: 900, letterSpacing: 4, color: "#d4af37" }}>TEAM PLAYERS</div><div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>{(validPlayers.length ? validPlayers : [blankPlayer()]).map((player, i) => <div key={i} style={{ minHeight: 70, padding: "12px 14px", borderRadius: 14, border: "1px solid rgba(255,255,255,.10)", background: "rgba(255,255,255,.035)" }}><div style={{ fontSize: 18, fontWeight: 900 }}>{player.name || `PLAYER ${i + 1}`}</div><div style={{ marginTop: 5, fontSize: 12, color: "#999" }}>UID: {player.uid || "—"} {player.role ? `• ${player.role}` : ""}</div></div>)}</div></div>
    <div style={{ position: "absolute", left: 54, right: 54, bottom: 45, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,.1)", display: "flex", justifyContent: "space-between", color: "#777", fontSize: 13, letterSpacing: 2 }}><span>TNFFM OFFICIAL COMMUNITY</span><span>TEAM POSTER</span></div>
  </div>;
}
function Info({ title, value }: { title: string; value: string }) { return <div style={{ padding: "18px 20px", borderRadius: 16, border: "1px solid rgba(212,175,55,.2)", background: "rgba(212,175,55,.06)" }}><div style={{ fontSize: 12, color: "#8f8f8f", letterSpacing: 3 }}>{title}</div><div style={{ marginTop: 7, fontSize: 22, fontWeight: 900 }}>{value}</div></div>; }
function Box({ title, children }: { title: string; children: React.ReactNode }) { return <div style={{ minHeight: 245, padding: 22, borderRadius: 18, border: "1px solid rgba(255,255,255,.10)", background: "rgba(255,255,255,.03)" }}><div style={{ marginBottom: 14, fontSize: 15, fontWeight: 900, letterSpacing: 3, color: "#d4af37" }}>{title}</div>{children}</div>; }
