"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, KeyRound, Loader2, LogIn, UserPlus } from "lucide-react";

export default function TeamLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [email, setEmail] = useState("");
  const [teamName, setTeamName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setMessage("");

    const endpoint = mode === "register"
      ? "/api/team/register"
      : mode === "forgot"
        ? "/api/team/auth/forgot-password"
        : "/api/team/auth/login";

    const payload = mode === "register"
      ? { username, password, email, teamName }
      : mode === "forgot"
        ? { username, email, newPassword }
        : { username, password };

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      const result = await response.json().catch(() => ({}));

      if (result.ok) {
        if (mode === "forgot") {
          setMode("login");
          setPassword("");
          setNewPassword("");
          setMessage("Password reset successfully. You can now login.");
        } else {
          router.replace("/team-dashboard");
          router.refresh();
          return;
        }
      } else {
        setMessage(result.message || "Something went wrong. Please try again.");
      }
    } catch (error) {
      setMessage(error instanceof DOMException && error.name === "AbortError"
        ? "The server is taking too long to respond. Please try again."
        : "Unable to connect. Please check your connection and try again.");
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
    }
  }

  const isForgot = mode === "forgot";
  const isRegister = mode === "register";

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050507] px-4 py-8 text-white sm:py-16">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 text-center sm:mb-8">
          <p className="font-rajdhani text-xs font-bold uppercase tracking-[0.2em] text-gold sm:text-sm sm:tracking-[0.25em]">TNFFM Team Portal</p>
          <h1 className="mt-2 font-rajdhani text-3xl font-bold uppercase leading-tight sm:text-4xl">
            {isForgot ? "Forgot Password" : isRegister ? "Create Team Account" : "Team Login"}
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-400">
            {isForgot
              ? "Enter the username, registered email and a new password."
              : isRegister
                ? "Create your team account and manage your profile, logo and roster."
                : "Login to manage your team profile, roster and poster."}
          </p>
        </div>

        <form onSubmit={submit} className="glass space-y-4 rounded-2xl p-4 sm:space-y-5 sm:p-6">
          {isRegister && (
            <label className="block text-sm text-slate-300">
              Team Name
              <input required minLength={2} maxLength={60} value={teamName} onChange={(e) => setTeamName(e.target.value)} className="mt-2 min-h-12 w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-gold/60" placeholder="Enter your team name" />
            </label>
          )}

          <label className="block text-sm text-slate-300">
            Username
            <input required minLength={4} maxLength={32} value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} className="mt-2 min-h-12 w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-gold/60" placeholder="team_username" autoComplete="username" />
          </label>

          {(isRegister || isForgot) && (
            <label className="block text-sm text-slate-300">
              Email {isRegister ? <span className="text-slate-500">(optional)</span> : <span className="text-slate-500">(must match your account)</span>}
              <input required={isForgot} type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 min-h-12 w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-gold/60" placeholder="team@example.com" autoComplete="email" />
            </label>
          )}

          {!isForgot && (
            <label className="block text-sm text-slate-300">
              Password
              <input required minLength={8} type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 min-h-12 w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-gold/60" placeholder="At least 8 characters" autoComplete={isRegister ? "new-password" : "current-password"} />
            </label>
          )}

          {isForgot && (
            <label className="block text-sm text-slate-300">
              New Password
              <input required minLength={8} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mt-2 min-h-12 w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-gold/60" placeholder="At least 8 characters" autoComplete="new-password" />
            </label>
          )}

          <button disabled={loading} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-gold px-4 py-3 font-bold text-black transition-opacity disabled:cursor-wait disabled:opacity-60">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : isForgot ? <KeyRound className="h-4 w-4" /> : isRegister ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
            {loading ? "Processing..." : isForgot ? "Reset Password" : isRegister ? "Create Team Account" : "Login"}
          </button>

          {message && <p role="status" className="break-words rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm leading-5 text-slate-300">{message}</p>}

          {!isRegister && !isForgot && (
            <button type="button" disabled={loading} onClick={() => { setMode("forgot"); setMessage(""); }} className="min-h-10 w-full text-sm text-slate-400 hover:text-gold hover:underline">Forgot password?</button>
          )}

          {isForgot && (
            <button type="button" disabled={loading} onClick={() => { setMode("login"); setMessage(""); }} className="inline-flex min-h-10 w-full items-center justify-center gap-2 text-sm text-gold hover:underline"><ArrowLeft className="h-4 w-4" />Back to Login</button>
          )}

          {!isForgot && (
            <button type="button" disabled={loading} onClick={() => { setMode(isRegister ? "login" : "register"); setMessage(""); }} className="min-h-10 w-full text-sm text-gold hover:underline">{isRegister ? "Already have an account? Login" : "Don't have an account? Sign Up"}</button>
          )}
        </form>

        <div className="mt-5 text-center text-xs text-slate-500">Team accounts are available immediately after signup.</div>
        <div className="mt-5 text-center"><Link href="/" className="text-sm text-slate-400 hover:text-white">← Back to TNFFM Rankings</Link></div>
      </div>
    </main>
  );
}
