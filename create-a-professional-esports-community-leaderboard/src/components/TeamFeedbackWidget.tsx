"use client";

import { FormEvent, useEffect, useState } from "react";
import { FileCheck2, MessageSquare, Send, X } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";

const TYPES = ["Bug", "Ranking", "Team Profile", "Suggestion", "Other"];

export function TeamFeedbackWidget() {
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("Suggestion");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (pathname !== "/team-dashboard") return;
    fetch("/api/team/me", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        setLoggedIn(Boolean(response.ok && result?.ok && result?.team));
      })
      .catch(() => setLoggedIn(false));
  }, [pathname]);

  if (pathname !== "/team-dashboard" || !loggedIn) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (message.trim().length < 5) { setStatus("Please enter at least 5 characters."); return; }
    setSending(true); setStatus("");
    try {
      const response = await fetch("/api/team/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, message }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) { setStatus(result.message || "Unable to send feedback."); return; }
      setStatus("Feedback sent successfully."); setMessage(""); setType("Suggestion");
    } catch { setStatus("Unable to connect. Please try again."); } finally { setSending(false); }
  }

  return (
    <>
      <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2">
        <Link href="/team-dashboard/submissions" className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold px-4 py-3 text-sm font-bold text-black shadow-2xl shadow-black/50 transition hover:bg-yellow-300"><FileCheck2 className="h-4 w-4" />Submit Final Results</Link>
        <button type="button" onClick={() => { setOpen(true); setStatus(""); }} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#0b0b0d] px-4 py-3 text-sm font-bold text-gold shadow-2xl shadow-black/50 transition hover:border-gold/40 hover:bg-gold hover:text-black"><MessageSquare className="h-4 w-4" />Send Feedback</button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-gold/20 bg-[#0a0a0c] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">TNFFM Team Support</p><h2 className="mt-1 font-rajdhani text-3xl font-bold uppercase text-white">Send Feedback</h2><p className="mt-1 text-sm text-slate-400">Tell the TNFFM team what you want improved.</p></div><button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white" aria-label="Close feedback"><X className="h-5 w-5" /></button></div>
            <form onSubmit={submit} className="mt-6 space-y-4">
              <label className="block text-sm text-slate-300">Feedback Type<select value={type} onChange={(event) => setType(event.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-gold/60">{TYPES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <label className="block text-sm text-slate-300">Message<textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={2000} rows={6} placeholder="Write your feedback, issue, or suggestion..." className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-gold/60" /><span className="mt-1 block text-right text-xs text-slate-600">{message.length}/2000</span></label>
              {status && <div className={`rounded-lg border px-4 py-3 text-sm ${status.includes("successfully") ? "border-emerald-400/20 bg-emerald-400/5 text-emerald-300" : "border-red-400/20 bg-red-400/5 text-red-300"}`}>{status}</div>}
              <button disabled={sending} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gold px-4 py-3 font-bold text-black transition hover:brightness-110 disabled:opacity-50"><Send className="h-4 w-4" />{sending ? "Sending..." : "Send Feedback"}</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
