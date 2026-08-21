"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock3, FileCheck2, Send, XCircle } from "lucide-react";

type Submission = {
  submissionId: string;
  tournamentName: string;
  tournamentDate: string;
  organizerName: string;
  prizePool: string;
  finalPosition: number;
  finalLeaderboard: string;
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
  const [form, setForm] = useState({ tournamentName: "", tournamentDate: "", organizerName: "", prizePool: "", finalPosition: "", finalLeaderboard: "", proofUrl: "" });

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
      if (!response.ok || !result.ok) throw new Error(result.message || "Unable to submit final leaderboard.");
      setMessage("Final tournament leaderboard submitted successfully. TNFFM will review it.");
      setForm({ tournamentName: "", tournamentDate: "", organizerName: "", prizePool: "", finalPosition: "", finalLeaderboard: "", proofUrl: "" });
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to submit final leaderboard.");
    } finally { setSending(false); }
  }

  return (
    <main className="min-h-screen bg-[#050507] px-4 py-6 text-white sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <Link href="/team-dashboard" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-gold"><ArrowLeft className="h-4 w-4" />Team Dashboard</Link>
        <header className="mt-5 rounded-2xl border border-gold/20 bg-gradient-to-br from-[#14120d] to-[#090909] p-6 shadow-2xl sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-gold">TNFFM Ranking Assessment</p>
          <h1 className="mt-2 font-rajdhani text-4xl font-bold uppercase sm:text-5xl">Submit Final Tournament Leaderboard</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">Only the official final tournament leaderboard is accepted. Submit the completed Finals / Grand Finals result for assessment. No individual matches, qualifiers or semifinals are required.</p>
        </header>

        <form onSubmit={submit} className="mt-6 rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:p-7">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tournament Name" value={form.tournamentName} onChange={(v) => setForm({ ...form, tournamentName: v })} placeholder="Example Cup 2026" required />
            <Field label="Tournament Date" type="date" value={form.tournamentDate} onChange={(v) => setForm({ ...form, tournamentDate: v })} required />
            <Field label="Organizer Name" value={form.organizerName} onChange={(v) => setForm({ ...form, organizerName: v })} placeholder="Tournament organizer" required />
            <Field label="Prize Pool" value={form.prizePool} onChange={(v) => setForm({ ...form, prizePool: v })} placeholder="₹5,000" />
            <Field label="Your Final Position" type="number" value={form.finalPosition} onChange={(v) => setForm({ ...form, finalPosition: v })} placeholder="1" required />
            <Field label="Official Result / Proof Link" value={form.proofUrl} onChange={(v) => setForm({ ...form, proofUrl: v })} placeholder="https://..." />
          </div>
          <label className="mt-4 block text-sm font-semibold text-slate-200">Final Tournament Leaderboard <span className="text-gold">*</span><span className="ml-2 text-xs font-normal text-slate-500">Paste the complete official final table</span></label>
          <textarea required minLength={10} value={form.finalLeaderboard} onChange={(e) => setForm({ ...form, finalLeaderboard: e.target.value })} placeholder={'Rank | Team | Total Points\n1 | Team A | 151\n2 | Team B | 132\n3 | Team C | 118'} className="mt-2 min-h-48 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-sm text-white outline-none transition focus:border-gold/50" />
          <div className="mt-4 rounded-xl border border-gold/15 bg-gold/5 p-4 text-xs leading-5 text-slate-400"><strong className="text-gold">Assessment:</strong> Your submission is saved to the TNFFM Google Sheet as <b className="text-slate-200">Pending</b>. TNFFM can review the final leaderboard and change the status in the spreadsheet.</div>
          {message && <div className="mt-4 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-slate-300">{message}</div>}
          <button disabled={sending} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gold px-5 py-3 font-bold text-black disabled:opacity-50 sm:w-auto"><Send className="h-4 w-4" />{sending ? "Submitting..." : "Submit Final Leaderboard"}</button>
        </form>

        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:p-7">
          <div className="flex items-center gap-2"><FileCheck2 className="h-5 w-5 text-gold" /><h2 className="font-rajdhani text-2xl font-bold uppercase">My Submissions</h2></div>
          {loading ? <p className="mt-5 text-sm text-slate-500">Loading submissions...</p> : submissions.length === 0 ? <p className="mt-5 text-sm text-slate-500">No final tournament submissions yet.</p> : <div className="mt-5 space-y-3">{submissions.map((item) => { const Icon = statusIcon[item.status] || Clock3; return <div key={item.submissionId} className="rounded-xl border border-white/10 bg-black/20 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold text-white">{item.tournamentName}</h3><p className="mt-1 text-xs text-slate-500">Final position: #{item.finalPosition} · {item.tournamentDate}</p></div><span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1 text-xs font-bold"><Icon className="h-3.5 w-3.5" />{item.status}</span></div>{item.tnffmPoints ? <p className="mt-3 text-sm text-gold">TNFFM Points: <b>{item.tnffmPoints}</b></p> : null}{item.reviewNotes ? <p className="mt-2 text-xs text-slate-400">Review: {item.reviewNotes}</p> : null}</div>; })}</div>}
        </section>
      </div>
    </main>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; required?: boolean }) {
  return <label className="block"><span className="text-sm font-semibold text-slate-200">{label}{required && <span className="text-gold"> *</span>}</span><input required={required} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-gold/50" /></label>;
}
