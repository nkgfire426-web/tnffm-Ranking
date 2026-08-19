"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, KeyRound, LogIn, UserPlus } from "lucide-react";

export default function TeamLoginPage() {
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [username, setUsername] = useState(""); const [password, setPassword] = useState(""); const [email, setEmail] = useState(""); const [teamName, setTeamName] = useState(""); const [message, setMessage] = useState(""); const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setMessage("");
    const endpoint = mode === "register" ? "/api/team/register" : "/api/team/auth/login";
    const payload = mode === "register" ? { username, password, email, teamName } : { username, password };
    try {
      const response = await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)}), result=await response.json().catch(()=>({}));
      if(result.ok){window.location.href="/team-dashboard";return;}
      setMessage(result.message||"Something went wrong.");
    } catch { setMessage("Unable to connect. Please try again."); } finally { setLoading(false); }
  }
  const isForgot=mode==="forgot", isRegister=mode==="register";

  return <main className="min-h-screen bg-[#050507] px-4 py-16 text-white"><div className="mx-auto max-w-md">
    <div className="mb-8 text-center"><p className="font-rajdhani text-sm font-bold uppercase tracking-[0.25em] text-gold">TNFFM Team Portal</p><h1 className="mt-2 font-rajdhani text-4xl font-bold uppercase">{isForgot?"Forgot Password":isRegister?"Create Team Account":"Team Login"}</h1><p className="mt-3 text-sm text-slate-400">{isForgot?"Password recovery is handled by the TNFFM admin for account security.":"Login or create your team account to manage your profile, roster and poster."}</p></div>
    {isForgot ? <div className="glass rounded-2xl p-6"><div className="flex items-start gap-4 rounded-xl border border-gold/20 bg-gold/[0.05] p-5"><KeyRound className="mt-1 h-5 w-5 shrink-0 text-gold"/><div><h2 className="font-semibold text-white">Need a password reset?</h2><p className="mt-2 text-sm leading-6 text-slate-400">For security, a forgotten password must be reset by the TNFFM administrator. If you are already logged in, use <b className="text-slate-200">Change Password</b> inside your Team Dashboard.</p></div></div><button type="button" onClick={()=>{setMode("login");setMessage("");}} className="mt-6 inline-flex w-full items-center justify-center gap-2 text-sm text-gold hover:underline"><ArrowLeft className="h-4 w-4"/>Back to Login</button></div> : <form onSubmit={submit} className="glass space-y-5 rounded-2xl p-6">
      {isRegister&&<label className="block text-sm text-slate-300">Team Name<input required minLength={2} maxLength={60} value={teamName} onChange={e=>setTeamName(e.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-gold/60" placeholder="Enter your team name" autoComplete="organization"/></label>}
      <label className="block text-sm text-slate-300">Username<input required minLength={4} maxLength={32} value={username} onChange={e=>setUsername(e.target.value.toLowerCase())} className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-gold/60" placeholder="team_username" autoComplete="username"/></label>
      {isRegister&&<label className="block text-sm text-slate-300">Email <span className="text-slate-500">(optional)</span><input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-gold/60" placeholder="team@example.com" autoComplete="email"/></label>}
      <label className="block text-sm text-slate-300">Password<input required minLength={8} type="password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-gold/60" placeholder="At least 8 characters" autoComplete={isRegister?"new-password":"current-password"}/></label>
      <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-gold px-4 py-3 font-bold text-black disabled:opacity-50">{isRegister?<UserPlus className="h-4 w-4"/>:<LogIn className="h-4 w-4"/>}{loading?"Please wait...":isRegister?"Create Team Account":"Login"}</button>
      {message&&<p className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-300">{message}</p>}
      {!isRegister&&<button type="button" onClick={()=>setMode("forgot")} className="w-full text-sm text-slate-400 hover:text-gold hover:underline">Forgot password?</button>}
      <button type="button" onClick={()=>{setMode(isRegister?"login":"register");setMessage("");}} className="w-full text-sm text-gold hover:underline">{isRegister?"Already have an account? Login":"Don't have an account? Sign Up"}</button>
    </form>}
    <div className="mt-5 text-center text-xs text-slate-500">Team accounts are available immediately after signup.</div><div className="mt-6 text-center"><Link href="/" className="text-sm text-slate-400 hover:text-white">← Back to TNFFM Rankings</Link></div>
  </div></main>;
}
