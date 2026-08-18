"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { LogIn, ShieldCheck, UserPlus } from "lucide-react";

const API = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_WEBHOOK_URL;

type Team = { teamName: string; slug: string };

export default function TeamLoginPage() {
  const [register, setRegister] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [teamSlug, setTeamSlug] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(API || "/api/teams", { cache: "no-store" }).then((r) => r.json()).then((data) => setTeams(Array.isArray(data.teams) ? data.teams : [])).catch(() => setTeams([]));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setMessage("");
    const endpoint = register ? "/api/team/register" : "/api/team/auth/login";
    const payload = register ? { username, password, email, teamSlug } : { username, password };
    const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json().catch(() => ({}));
    setLoading(false); setMessage(result.message || (result.ok ? "Success." : "Something went wrong."));
    if (result.ok && !register) window.location.href = "/team-dashboard";
    if (result.ok && register) { setRegister(false); setPassword(""); }
  }

  return <main className="min-h-screen bg-[#050507] px-4 py-16 text-white"><div className="mx-auto max-w-md"><div className="mb-8 text-center"><p className="font-rajdhani text-sm font-bold uppercase tracking-[0.25em] text-gold">TNFFM Team Portal</p><h1 className="mt-2 font-rajdhani text-4xl font-bold uppercase">{register ? "Create Team Account" : "Team Login"}</h1><p className="mt-3 text-sm text-slate-400">Manage your approved team profile, logo and roster.</p></div><form onSubmit={submit} className="glass space-y-5 rounded-2xl p-6">
    <label className="block text-sm text-slate-300">Username<input required minLength={4} value={username} onChange={(e) => setUsername(e.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-gold/60" placeholder="team_username" /></label>
    {register && <><label className="block text-sm text-slate-300">Team<select required value={teamSlug} onChange={(e) => setTeamSlug(e.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-gold/60"><option value="">Select your team</option>{teams.map((team) => <option key={team.slug} value={team.slug}>{team.teamName}</option>)}</select></label><label className="block text-sm text-slate-300">Email (optional)<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-gold/60" placeholder="team@example.com" /></label></>}
    <label className="block text-sm text-slate-300">Password<input required minLength={8} type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-gold/60" placeholder="At least 8 characters" /></label>
    <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-gold px-4 py-3 font-bold text-black disabled:opacity-50">{register ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}{loading ? "Please wait..." : register ? "Request Team Account" : "Login"}</button>
    {message && <p className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-300">{message}</p>}
    <button type="button" onClick={() => { setRegister(!register); setMessage(""); }} className="w-full text-sm text-gold hover:underline">{register ? "Already have an account? Login" : "Need a team account? Register"}</button>
  </form><div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-500"><ShieldCheck className="h-4 w-4" /> Team accounts require admin approval.</div><div className="mt-6 text-center"><Link href="/" className="text-sm text-slate-400 hover:text-white">← Back to TNFFM Rankings</Link></div></div></main>;
}
