"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BarChart3, CalendarDays, CheckCircle2, ExternalLink, MessageSquare, Newspaper, Save, Trophy, Users } from "lucide-react";

type Player = { playerId?: string; name?: string; uid?: string; role?: string; playerLogoUrl?: string; status?: string };
type Team = { teamId?: string; teamName: string; slug: string; logoUrl?: string; description?: string; mobileNumber?: string; roster?: Player[]; players?: number; rank?: number; communityPoints?: number; championships?: number; runnerUp?: number; secondRunnerUp?: number; top5Finishes?: number; eventsPlayed?: number; matchesPlayed?: number; kills?: number; booyahs?: number; totalPoints?: number; positionPoints?: number; status?: string };
type Event = { id?: string; name: string; organizer?: string; teams?: number; prize?: string; status?: string; date?: string; notes?: string; matchesPlayed?: number; published?: boolean; results?: Array<{ teamName?: string; teamSlug?: string; rank?: number; positionPoints?: number; kills?: number; booyahs?: number; total?: number }> };
type News = { id?: string; title: string; description?: string; date?: string; type?: string; status?: string; imageUrl?: string; link?: string };

const card = "rounded-2xl border border-white/10 bg-white/[.025] p-5";
const input = "mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-sm text-white outline-none focus:border-yellow-400/50";

export default function TeamDashboardSection({ section }: { section: string }) {
  const [team, setTeam] = useState<Team | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [news, setNews] = useState<News[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({ logoUrl: "", mobileNumber: "", description: "" });
  const [roster, setRoster] = useState<Player[]>([]);
  const [feedbackType, setFeedbackType] = useState("Suggestion");
  const [feedback, setFeedback] = useState("");

  async function load() {
    setLoading(true);
    setMessage("");
    const me = await fetch("/api/team/me", { cache: "no-store" }).catch(() => null);
    const meData = await me?.json().catch(() => ({}));
    if (me?.ok && meData?.ok && meData.team) {
      const t = meData.team as Team;
      setTeam(t);
      setProfile({ logoUrl: t.logoUrl || "", mobileNumber: t.mobileNumber || "", description: t.description || "" });
      setRoster(Array.isArray(t.roster) ? t.roster : []);
    } else if (section !== "news" && section !== "events") {
      setMessage(meData?.message || "Please log in as a team to use this page.");
    }
    if (["events", "results"].includes(section)) {
      const r = await fetch("/api/tracked-events", { cache: "no-store" }).catch(() => null);
      const d = await r?.json().catch(() => ({}));
      setEvents(Array.isArray(d?.events) ? d.events : []);
    }
    if (section === "news") {
      const r = await fetch("/api/team/news", { cache: "no-store" }).catch(() => null);
      const d = await r?.json().catch(() => ({}));
      setNews(Array.isArray(d?.news) ? d.news : []);
    }
    if (section === "submissions" || section === "results") {
      const r = await fetch("/api/team/submissions", { cache: "no-store" }).catch(() => null);
      const d = await r?.json().catch(() => ({}));
      setSubmissions(Array.isArray(d?.submissions) ? d.submissions : []);
    }
    setLoading(false);
  }
  useEffect(() => { load(); }, [section]);

  async function saveProfile() {
    setSaving(true); setMessage("");
    try {
      const r = await fetch("/api/team/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...profile, roster }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) throw new Error(d.message || "Unable to save team profile.");
      setTeam((t) => t ? { ...t, ...profile, roster } : t);
      setMessage("Team profile saved successfully.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Unable to save team profile."); }
    finally { setSaving(false); }
  }

  async function sendFeedback() {
    if (feedback.trim().length < 5) { setMessage("Please enter at least 5 characters."); return; }
    setSaving(true); setMessage("");
    try {
      const r = await fetch("/api/team/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: feedbackType, message: feedback }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) throw new Error(d.message || "Unable to send feedback.");
      setFeedback(""); setMessage("Feedback sent successfully.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Unable to send feedback."); }
    finally { setSaving(false); }
  }

  const myResults = useMemo(() => {
    if (!team) return [];
    const slug = team.slug.toLowerCase();
    return events.flatMap((event) => (event.results || []).filter((r) => String(r.teamSlug || "").toLowerCase() === slug || String(r.teamName || "").toLowerCase() === team.teamName.toLowerCase()).map((r) => ({ ...r, event })));
  }, [events, team]);

  if (loading) return <main className="min-h-screen bg-[#050507] px-4 py-10 text-slate-400"><div className="mx-auto max-w-6xl">Loading Team Portal...</div></main>;

  const titles: Record<string, [string, string]> = {
    news: ["News & Updates", "Official TNFFM announcements, tournament updates and community news."],
    profile: ["Team Profile", "Manage the public information shown on your TNFFM team profile."],
    roster: ["Team Roster", "Keep your player names, UIDs, roles and player logos accurate."],
    rankings: ["My Ranking", "Your current official TNFFM community ranking and achievements."],
    performance: ["Performance", "Track your team's competitive statistics and progress."],
    events: ["Available Events", "Official published tournaments currently available to the community."],
    results: ["Tournament Results", "Your team's published tournament results and submitted records."],
    feedback: ["Feedback / Contact", "Send a message to the TNFFM administration team."],
    notifications: ["Notifications", "Important updates for your team and TNFFM participation."],
  };
  const [title, subtitle] = titles[section] || ["Team Dashboard", "TNFFM Team Portal"];

  return <main className="min-h-screen bg-[#050507] px-3 pb-24 pt-6 text-white sm:px-6 sm:py-10">
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 rounded-2xl border border-yellow-400/20 bg-gradient-to-br from-[#111113] to-[#080809] p-5 sm:p-7">
        <p className="text-[10px] font-black uppercase tracking-[.25em] text-yellow-400">TNFFM TEAM PORTAL</p>
        <h1 className="mt-2 font-rajdhani text-3xl font-black uppercase sm:text-5xl">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{subtitle}</p>
        {team && <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-400"><span className="rounded-full border border-white/10 px-3 py-1.5">{team.teamName}</span><span className="rounded-full border border-white/10 px-3 py-1.5">{team.status || "Active"}</span></div>}
      </div>

      {message && <div className="mb-5 rounded-xl border border-yellow-400/20 bg-yellow-400/[.05] p-4 text-sm text-slate-300">{message}</div>}

      {section === "news" && <div className="grid gap-4 md:grid-cols-2">{news.length ? news.map((n) => <article key={n.id || n.title} className={card}>{n.imageUrl && <img src={n.imageUrl} alt="" className="mb-4 h-40 w-full rounded-xl object-cover" />}<div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-yellow-400"><Newspaper className="h-3.5 w-3.5"/>{n.type || "Update"} · {n.date || ""}</div><h2 className="mt-2 font-rajdhani text-2xl font-bold uppercase">{n.title}</h2><p className="mt-2 text-sm leading-6 text-slate-400">{n.description || "Official TNFFM update."}</p>{n.link && <a className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-yellow-400" href={n.link} target="_blank" rel="noreferrer">Open update <ExternalLink className="h-4 w-4"/></a>}</article>) : <div className={`${card} md:col-span-2 text-center text-slate-500`}>No published news updates are available right now.</div>}</div>}

      {section === "profile" && team && <section className={card}><div className="grid gap-5 md:grid-cols-2"><label className="text-sm text-slate-300">Team Logo URL<input className={input} value={profile.logoUrl} onChange={(e) => setProfile({ ...profile, logoUrl: e.target.value })} placeholder="Direct public image URL"/></label><label className="text-sm text-slate-300">Mobile Number<input className={input} value={profile.mobileNumber} onChange={(e) => setProfile({ ...profile, mobileNumber: e.target.value })} inputMode="tel"/></label><label className="text-sm text-slate-300 md:col-span-2">Team Description<textarea className="mt-2 min-h-32 w-full rounded-xl border border-white/10 bg-black/40 p-4 text-sm outline-none focus:border-yellow-400/50" value={profile.description} onChange={(e) => setProfile({ ...profile, description: e.target.value })}/></label></div><button onClick={saveProfile} disabled={saving} className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-xl bg-yellow-400 px-5 font-bold text-black"><Save className="h-4 w-4"/>{saving ? "Saving..." : "Save Profile"}</button></section>}

      {section === "roster" && team && <section className={card}><div className="space-y-3">{roster.map((p, i) => <div key={i} className="grid gap-3 rounded-xl border border-white/10 bg-black/20 p-4 md:grid-cols-[1fr_1fr_1fr_auto]"><input className={input.replace("mt-2 ", "")} value={p.name || ""} onChange={(e) => setRoster((r) => r.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder="Player name"/><input className={input.replace("mt-2 ", "")} value={p.uid || ""} onChange={(e) => setRoster((r) => r.map((x, j) => j === i ? { ...x, uid: e.target.value } : x))} placeholder="UID"/><input className={input.replace("mt-2 ", "")} value={p.role || ""} onChange={(e) => setRoster((r) => r.map((x, j) => j === i ? { ...x, role: e.target.value } : x))} placeholder="Role"/><button onClick={() => setRoster((r) => r.filter((_, j) => j !== i))} className="rounded-xl border border-red-400/20 px-4 text-sm text-red-300">Remove</button></div>)}</div><div className="mt-4 flex flex-wrap gap-2"><button onClick={() => setRoster((r) => [...r, { name: "", uid: "", role: "Player", playerLogoUrl: "" }])} className="rounded-xl border border-white/10 px-4 py-3 text-sm">+ Add Player</button><button onClick={saveProfile} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-5 py-3 text-sm font-bold text-black"><Save className="h-4 w-4"/>{saving ? "Saving..." : "Save Roster"}</button></div></section>}

      {section === "rankings" && team && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Stat icon={<Trophy/>} label="Official Rank" value={team.rank ? `#${team.rank}` : "—"}/><Stat label="Community Points" value={team.communityPoints ?? 0}/><Stat label="Championships" value={team.championships ?? 0}/><Stat label="Events Played" value={team.eventsPlayed ?? 0}/><div className={`${card} sm:col-span-2 lg:col-span-4`}><h2 className="font-rajdhani text-2xl font-bold uppercase">Achievements</h2><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"><Mini label="Runner-Up" value={team.runnerUp}/><Mini label="2nd Runner-Up" value={team.secondRunnerUp}/><Mini label="Top 5" value={team.top5Finishes}/><Mini label="Roster" value={team.players}/></div></div></div>}

      {section === "performance" && team && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Stat icon={<BarChart3/>} label="Matches" value={team.matchesPlayed ?? 0}/><Stat label="Kills" value={team.kills ?? 0}/><Stat label="Booyahs" value={team.booyahs ?? 0}/><Stat label="Total Points" value={team.totalPoints ?? 0}/><div className={`${card} sm:col-span-2 lg:col-span-4`}><h2 className="font-rajdhani text-2xl font-bold uppercase">Performance Snapshot</h2><p className="mt-2 text-sm text-slate-400">Statistics shown here are read from the official TNFFM ranking data. They update when the official ranking source is updated.</p></div></div>}

      {section === "events" && <div className="grid gap-4 md:grid-cols-2">{events.length ? events.map((e) => <article key={e.id || e.name} className={card}><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-wider text-yellow-400">{e.status || "Published"}</p><h2 className="mt-1 font-rajdhani text-2xl font-bold uppercase">{e.name}</h2></div><CalendarDays className="h-5 w-5 text-slate-500"/></div><div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-400"><span>Organizer: {e.organizer || "—"}</span><span>Date: {e.date || "—"}</span><span>Teams: {e.teams ?? 0}</span><span>Prize: {e.prize || "—"}</span></div>{e.notes && <p className="mt-4 text-sm text-slate-400">{e.notes}</p>}</article>) : <div className={`${card} md:col-span-2 text-center text-slate-500`}>No published events are available right now.</div>}</div>}

      {section === "results" && <div className="space-y-4">{myResults.map((r, i) => <article key={`${r.event.name}-${i}`} className={card}><div className="flex items-center justify-between gap-4"><div><p className="text-[10px] uppercase tracking-wider text-yellow-400">{r.event.name}</p><h2 className="font-rajdhani text-xl font-bold uppercase">Position #{r.rank}</h2></div><Trophy className="h-5 w-5 text-yellow-400"/></div><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"><Mini label="Kills" value={r.kills}/><Mini label="Booyahs" value={r.booyahs}/><Mini label="Position Pts" value={r.positionPoints}/><Mini label="Total" value={r.total}/></div></article>)}{submissions.map((s, i) => <article key={s.submissionId || i} className={card}><div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400"/><b>{s.tournamentName || "Submitted Tournament"}</b><span className="ml-auto text-xs text-slate-500">{s.status || "Pending"}</span></div><p className="mt-2 text-sm text-slate-400">Position #{s.finalPosition || "—"} · {s.finalLeaderboard || ""}</p></article>)}{!myResults.length && !submissions.length && <div className={`${card} text-center text-slate-500`}>No tournament results are available for this team yet.</div>}</div>}

      {section === "feedback" && <section className={card}><div className="grid gap-5 md:grid-cols-2"><label className="text-sm text-slate-300">Feedback Type<select className={input} value={feedbackType} onChange={(e) => setFeedbackType(e.target.value)}><option>Suggestion</option><option>Bug</option><option>Ranking</option><option>Team Profile</option><option>Other</option></select></label><div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-slate-400"><MessageSquare className="mb-2 h-5 w-5 text-yellow-400"/>Your message will be sent to the TNFFM administration team.</div><label className="text-sm text-slate-300 md:col-span-2">Message<textarea className="mt-2 min-h-40 w-full rounded-xl border border-white/10 bg-black/40 p-4 text-sm outline-none focus:border-yellow-400/50" maxLength={2000} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Tell TNFFM what needs attention..."/></label></div><button onClick={sendFeedback} disabled={saving} className="mt-5 rounded-xl bg-yellow-400 px-5 py-3 font-bold text-black">{saving ? "Sending..." : "Send Feedback"}</button></section>}

      {section === "notifications" && <section className={card}><div className="flex items-center gap-3"><Users className="h-5 w-5 text-yellow-400"/><div><h2 className="font-rajdhani text-2xl font-bold uppercase">Stay Updated</h2><p className="mt-1 text-sm text-slate-400">Check News & Updates and Available Events regularly for official TNFFM announcements. Team-specific notification history will appear here when published by the administration.</p></div></div><div className="mt-5 flex flex-wrap gap-2"><Link href="/team-dashboard/news" className="rounded-xl border border-white/10 px-4 py-3 text-sm">News & Updates</Link><Link href="/team-dashboard/events" className="rounded-xl bg-yellow-400 px-4 py-3 text-sm font-bold text-black">Available Events</Link></div></section>}

      {section !== "news" && section !== "profile" && section !== "roster" && section !== "rankings" && section !== "performance" && section !== "events" && section !== "results" && section !== "feedback" && section !== "notifications" && <div className={card}>Team Dashboard</div>}
    </div>
  </main>;
}

function Stat({ label, value, icon }: { label: string; value: string | number; icon?: React.ReactNode }) { return <div className={card}><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">{icon && <span className="h-4 w-4 text-yellow-400">{icon}</span>}{label}</div><div className="mt-2 font-rajdhani text-3xl font-black">{value}</div></div>; }
function Mini({ label, value }: { label: string; value?: string | number }) { return <div className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div><div className="mt-1 font-rajdhani text-xl font-bold">{value ?? 0}</div></div>; }
