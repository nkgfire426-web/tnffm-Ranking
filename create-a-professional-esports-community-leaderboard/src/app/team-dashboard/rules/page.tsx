"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, ShieldCheck, ArrowLeft, CheckCircle2 } from "lucide-react";

const rules = [
  ["TNFFM Community Ranking Rules", "Rankings are calculated from eligible tournament results according to the official TNFFM community scoring system. Only verified results are included."],
  ["Tournament Eligibility", "Submitted events must satisfy TNFFM eligibility requirements and provide complete organizer, event and final-result information."],
  ["Prize Pool Requirements", "An event must meet the currently published minimum prize-pool requirement before it can contribute to the official ranking."],
  ["Event Submission Rules", "Submit accurate event details, team information, dates, organizer information and final standings. Duplicate or incomplete submissions may be rejected."],
  ["Result Verification Rules", "Final standings must be supported by clear proof. TNFFM may verify submitted information before adding results to rankings."],
  ["Ranking Point System", "Championship, runner-up, second runner-up and qualifying top-five/finalist finishes receive points according to the published TNFFM ranking system."],
  ["Team Eligibility", "Teams must provide valid team information and remain eligible under TNFFM community requirements."],
  ["Inactive Team Policy", "Teams that remain inactive for the applicable inactive period may be removed from active ranking consideration until they become eligible again."],
  ["Wild Card Policy", "Wild Card ranking slots are not used under the current TNFFM ranking policy."],
  ["Proof / Screenshot Requirements", "Provide readable final leaderboard screenshots or equivalent official proof showing the event, standings and relevant team result."],
  ["Disqualification Rules", "False information, manipulated proof, duplicate results, rule violations or other serious misconduct can result in rejection or disqualification."],
  ["Code of Conduct", "Teams, players and organizers are expected to communicate respectfully and avoid cheating, harassment, manipulation and behavior that damages the community."],
  ["Appeal / Dispute Process", "If a team believes a result or decision is incorrect, contact TNFFM support with the relevant event, result and supporting evidence for review."],
];

export default function RulesPage() {
  const [open, setOpen] = useState(0);
  return <main className="min-h-screen bg-[#050507] px-3 py-5 text-white sm:px-6 sm:py-8">
    <div className="mx-auto max-w-5xl">
      <Link href="/team-dashboard" className="mb-5 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-gold"><ArrowLeft className="h-4 w-4" /> Back to Team Dashboard</Link>
      <header className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#151518] to-[#09090b] p-6 sm:p-9">
        <div className="flex items-start gap-4"><div className="rounded-2xl border border-gold/25 bg-gold/10 p-3 text-gold"><ShieldCheck className="h-7 w-7" /></div><div><p className="text-[11px] font-bold uppercase tracking-[.24em] text-gold">TNFFM Team Portal</p><h1 className="mt-1 font-rajdhani text-3xl font-bold uppercase sm:text-5xl">Rules & Guidelines</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Everything teams need to know before participating, submitting tournaments and maintaining ranking eligibility.</p></div></div>
        <div className="mt-6 rounded-2xl border border-gold/15 bg-gold/[.04] p-4 text-sm text-slate-300"><b className="text-white">Last Updated:</b> TNFFM Community Ranking policy — verify the latest published requirements before submitting an event.</div>
      </header>

      <section className="mt-5 rounded-3xl border border-white/10 bg-white/[.02] p-4 sm:p-6">
        <div className="mb-4"><p className="text-[11px] font-bold uppercase tracking-[.2em] text-gold">Official Policies</p><h2 className="font-rajdhani text-2xl font-bold uppercase">Rules & Guidelines</h2></div>
        <div className="space-y-2">{rules.map(([title, body], i) => <div key={title} className="overflow-hidden rounded-2xl border border-white/10 bg-black/20"><button onClick={() => setOpen(open === i ? -1 : i)} className="flex min-h-14 w-full items-center justify-between gap-4 px-4 text-left font-semibold"><span>{title}</span><ChevronDown className={`h-5 w-5 shrink-0 text-gold transition-transform ${open === i ? "rotate-180" : ""}`} /></button>{open === i && <div className="border-t border-white/10 px-4 pb-5 pt-4 text-sm leading-6 text-slate-400">{body}</div>}</div>)}</div>
      </section>

      <section className="mt-5 rounded-3xl border border-emerald-400/15 bg-emerald-400/[.035] p-5 sm:p-6">
        <p className="text-[11px] font-bold uppercase tracking-[.2em] text-emerald-400">Before You Submit</p><h2 className="mt-1 font-rajdhani text-2xl font-bold uppercase">Submission Checklist</h2><div className="mt-4 grid gap-2 sm:grid-cols-2">{["Event meets minimum prize-pool requirement", "Final leaderboard proof attached", "Correct team name", "Correct tournament date", "Organizer information provided", "Results are final"].map(item => <div key={item} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-slate-300"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />{item}</div>)}</div><Link href="/team-dashboard/submissions" className="mt-5 inline-flex min-h-12 items-center justify-center rounded-xl bg-gold px-5 font-bold text-black hover:brightness-110">Submit Tournament</Link></section>
    </div>
  </main>;
}
