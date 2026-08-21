"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Lock, RefreshCw } from "lucide-react";

type Feedback = {
  feedbackId: string;
  timestamp: string;
  teamName: string;
  teamSlug?: string;
  username?: string;
  type: string;
  message: string;
  status: "New" | "Reviewing" | "Resolved";
};

const STATUS = ["New", "Reviewing", "Resolved"] as const;

export default function AdminFeedbackPage() {
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [filter, setFilter] = useState<"All" | Feedback["status"]>("All");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadFeedback = useCallback(async (adminPassword = password) => {
    if (!adminPassword) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/team/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "list", password: adminPassword }),
        cache: "no-store",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) {
        setUnlocked(false);
        setError(result.message || "Unable to load feedback.");
        return;
      }
      setUnlocked(true);
      setFeedback(Array.isArray(result.feedback) ? result.feedback : []);
    } catch {
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  }, [password]);

  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem("tnffm-admin-password");
      if (saved) {
        setPassword(saved);
        loadFeedback(saved);
      }
    } catch {}
  }, [loadFeedback]);

  async function login() {
    try { window.sessionStorage.setItem("tnffm-admin-password", password); } catch {}
    await loadFeedback(password);
  }

  async function updateStatus(item: Feedback, status: Feedback["status"]) {
    const response = await fetch("/api/team/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "status", password, feedbackId: item.feedbackId, status }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) {
      setError(result.message || "Unable to update status.");
      return;
    }
    setFeedback((current) => current.map((entry) => entry.feedbackId === item.feedbackId ? { ...entry, status } : entry));
  }

  const filtered = useMemo(() => filter === "All" ? feedback : feedback.filter((item) => item.status === filter), [feedback, filter]);
  const counts = useMemo(() => ({ new: feedback.filter((item) => item.status === "New").length, reviewing: feedback.filter((item) => item.status === "Reviewing").length, resolved: feedback.filter((item) => item.status === "Resolved").length }), [feedback]);

  if (!unlocked) {
    return (
      <main className="mx-auto grid min-h-[75vh] max-w-md place-items-center px-4">
        <section className="glass w-full rounded-2xl p-6">
          <Lock className="mb-4 h-8 w-8 text-gold" />
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">TNFFM Admin</p>
          <h1 className="mt-1 font-rajdhani text-4xl font-bold uppercase text-white">Feedback Inbox</h1>
          <p className="mt-2 text-sm text-slate-400">Admin access is required to view team feedback.</p>
          <input value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") login(); }} type="password" placeholder="Admin password" className="mt-6 w-full rounded-lg border border-white/10 bg-black/45 px-4 py-3 text-white outline-none focus:border-gold/60" />
          {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
          <button onClick={login} disabled={!password || loading} className="mt-4 w-full rounded-lg bg-gold px-4 py-3 font-bold text-black disabled:opacity-50">{loading ? "Checking..." : "Open Feedback"}</button>
          <Link href="/admin" className="mt-4 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-gold"><ArrowLeft className="h-4 w-4" />Back to Admin</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-gold">TNFFM Admin</p>
          <h1 className="font-rajdhani text-4xl font-bold uppercase text-white">Team Feedback</h1>
          <p className="mt-2 text-sm text-slate-400">Review suggestions, issues, and requests submitted from team dashboards.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => loadFeedback()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-gold/30 px-4 py-3 text-sm font-bold text-gold hover:bg-gold hover:text-black disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</button>
          <Link href="/admin" className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-3 text-sm text-slate-300 hover:text-gold"><ArrowLeft className="h-4 w-4" />Admin</Link>
        </div>
      </div>

      {error && <div className="mb-5 rounded-lg border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-300">{error}</div>}

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Summary label="New" value={counts.new} />
        <Summary label="Reviewing" value={counts.reviewing} />
        <Summary label="Resolved" value={counts.resolved} />
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {(["All", ...STATUS] as const).map((item) => <button key={item} onClick={() => setFilter(item)} className={`rounded-full border px-4 py-2 text-sm font-bold ${filter === item ? "border-gold bg-gold text-black" : "border-white/10 text-slate-300 hover:border-gold/40 hover:text-gold"}`}>{item}</button>)}
      </div>

      <section className="space-y-4">
        {filtered.length === 0 ? <div className="glass rounded-2xl p-10 text-center text-slate-500">No feedback messages found.</div> : filtered.map((item) => (
          <article key={item.feedbackId} className="glass rounded-2xl p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-rajdhani text-xl font-bold uppercase text-white">{item.teamName || item.teamSlug || "Unknown Team"}</span>
                  <span className="rounded-full border border-gold/20 px-2.5 py-1 text-xs font-bold text-gold">{item.type}</span>
                  <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-slate-500">{item.feedbackId}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">@{item.username || "team"} · {item.timestamp ? new Date(item.timestamp).toLocaleString() : "Unknown time"}</p>
                <p className="mt-4 whitespace-pre-wrap rounded-xl border border-white/5 bg-black/20 p-4 text-sm leading-6 text-slate-200">{item.message}</p>
              </div>
              <label className="w-full shrink-0 text-sm text-slate-400 lg:w-44">Status<select value={item.status || "New"} onChange={(event) => updateStatus(item, event.target.value as Feedback["status"])} className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white outline-none focus:border-gold/60">{STATUS.map((status) => <option key={status}>{status}</option>)}</select></label>
            </div>
          </article>
        ))}
      </section>

      <div className="mt-8 inline-flex items-center gap-2 text-xs text-slate-500"><CheckCircle2 className="h-4 w-4 text-emerald-400" />Feedback is stored in your configured Google Sheet.</div>
    </main>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return <div className="glass rounded-xl p-4"><p className="text-xs uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 font-rajdhani text-3xl font-bold text-white">{value}</p></div>;
}
