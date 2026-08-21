"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock3, FileCheck2, ExternalLink, Send, XCircle } from "lucide-react";

type Submission = {
  submissionId: string;
  tournamentName: string;
  tournamentDate: string;
  organizerName: string;
  prizePool: string;
  finalPosition: number;
  teamFinalPoints?: number;
  proofUrl: string;
  status: string;
  tnffmPoints?: number;
  reviewNotes?: string;
  createdAt?: string;
};

const statusIcon: Record<string, typeof Clock3> = {
  Pending: Clock3,
  Approved: CheckCircle2,
  Rejected: XCircle,
};

export default function TeamSubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ tournamentName: "", tournamentDate: "", organizerName: "", prizePool: "", finalPosition: "", teamFinalPoints: "", proofUrl: "" });

  async function load() {
    setLoading(true);
    const response = await fetch("/api/team/submissions", { cache: "no-store" }).catch(() => null);
    const result = await response?.json().catch(() => ({}));
    if (!response?.ok || !result?.ok) {
      setMessage(result?.message || "Please login as a team first.");
      setLoading(false);
      return;
    }
    setSubmissions(Array.isArray(result.submissions) ? result.submissions : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSending(true); setMessage("");
    try {
      const response = await fetch("/api/team/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.message || "Unable to submit final tournament result.");
      setMessage("Final tournament result submitted successfully. TNFFM will review it.");
      setForm({ tournamentName: "", tournamentDate: "", organizerName: "", prizePool: "", finalPosition: "", teamFinalPoints: "", proofUrl: "" });
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to submit final tournament result.");
    } finally { setSending(false); }
  }

  return (
    <main className="min-h-screen bg-[#050507] px-4 py-6 text-white sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <Link href="/team-dashboard" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-gold"><ArrowLeft className="h-4 w-4" />Team Dashboard</Link>
        <header className="mt-5 rounded-2xl border border-gold/20 bg-gradient-to-br from-[#14120d] to-[#090909] p-6 shadow-2xl sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-gold">TNFFM Ranking Assessment</p>
          <h1 className="mt-2 font-rajdhani text-4xl font-bold uppercase sm:text-5xl">Submit Final Tournament Result</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">Submit only your team&apos;s official Finals / Grand Finals result. Enter your team&apos;s final position and final tournament points. Maximum accepted position is <b className="text-white">18th</b>.</p>
        </header>

        <form onSubmit={submit} className="mt-6 rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:p-7">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tournament Name" value={form.tournamentName} onChange={(v) => setForm({ ...form, tournamentName: v })} placeholder="Example Cup 2026" required />
            <Field label="Tournament Date" type="date" value={form.tournamentDate} onChange={(v) => setForm({ ...form, tournamentDate: v })} required />
            <Field label="Organizer Name" value={form.organizerName} onChange={(v) => setForm({ ...form, organizerName: v })} placeholder="Tournament organizer" required />
            <Field label="Prize Pool" value={form.prizePool} onChange={(v) => setForm({ ...form, prizePool: v })} placeholder="₹5,000" />
            <Field label="Your Final Position" type="number" min="1" max="18" value={form.finalPosition} onChange={(v) => setForm({ ...form, finalPosition: v })} placeholder="1–18" required />
            <Field label="Your Team Final Points" type="number" min="0" step="1" value={form.teamFinalPoints} onChange={(v) => setForm({ ...form, teamFinalPoints: v })} placeholder="151" required />
          </div>

          <label className="mt-4 block text-sm font-semibold text-slate-200">Official Result / Proof Link <span className="ml-1 text-xs font-normal text-slate-500">Recommended</span></label>
          <input value={form.proofUrl} onChange={(e) => setForm({ ...form, proofUrl: e.target.value })} placeholder="https://drive.google.com/..." className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-gold/50" />

          <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-4 text-xs leading-5 text-slate-400">
            <p className="font-bold text-gold">How to submit Google Drive proof</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>Upload the official final result screenshot/PDF to Google Drive.</li>
              <li>Right-click the file → <b className="text-slate-200">Share</b>.</li>
              <li>Under General access, choose <b className="text-slate-200">Anyone with the link</b> → <b className="text-slate-200">Viewer</b>.</li>
              <li>Click <b className="text-slate-200">Copy link</b> and paste that link above.</li>
            </ol>
            <p className="mt-2 text-slate-500">Example: https://drive.google.com/file/d/FILE_ID/view</p>
          </div>

          <div className="mt-4 rounded-xl border border-gold/15 bg-gold/5 p-4 text-xs leading-5 text-slate-400"><strong className="text-gold">Assessment points:</strong> TNFFM awards assessment points from your final position: <b className="text-slate-200">1st 100 · 2nd 70 · 3rd 50 · 4th–5th 25 · 6th–18th 15</b>. Your entered team final tournament points are stored with the submission for verification.</div>
          {message && <div className="mt-4 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-slate-300">{message}</div>}
          <button disabled={sending} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gold px-5 py-3 font-bold text-black disabled:opacity-50 sm:w-auto"><Send className="h-4 w-4" />{sending ? "Submitting..." : "Submit Final Result"}</button>
        </form>

        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:p-7">
          <div className="flex items-center gap-2"><FileCheck2 className="h-5 w-5 text-gold" /><h2 className="font-rajdhani text-2xl font-bold uppercase">My Submissions</h2></div>
          {loading ? <p className="mt-5 text-sm text-slate-500">Loading submissions...</p> : submissions.length === 0 ? <p className="mt-5 text-sm text-slate-500">No final tournament submissions yet.</p> : <div className="mt-5 space-y-3">{submissions.map((item) => { const Icon = statusIcon[item.status] || Clock3; return <div key={item.submissionId} className="rounded-xl border border-white/10 bg-black/20 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold text-white">{item.tournamentName}</h3><p className="mt-1 text-xs text-slate-500">Position: #{item.finalPosition} · Team points: {item.teamFinalPoints ?? "—"} · {item.tournamentDate}</p></div><span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1 text-xs font-bold"><Icon className="h-3.5 w-3.5" />{item.status}</span></div>{item.proofUrl ? <a href={item.proofUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs text-gold hover:underline">Open proof <ExternalLink className="h-3 w-3" /></a> : null}{item.tnffmPoints ? <p className="mt-3 text-sm text-gold">TNFFM Assessment Points: <b>{item.tnffmPoints}</b></p> : null}{item.reviewNotes ? <p className="mt-2 text-xs text-slate-400">Review: {item.reviewNotes}</p> : null}</div>; })}</div>}
        </section>
      </div>
    </main>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", required = false, min, max, step }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; required?: boolean; min?: string; max?: string; step?: string }) {
  return <label className="block"><span className="text-sm font-semibold text-slate-200">{label}{required && <span className="text-gold"> *</span>}</span><input required={required} min={min} max={max} step={step} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-gold/50" /></label>;
}
