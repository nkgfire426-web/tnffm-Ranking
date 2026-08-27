"use client";

import Link from "next/link";
import { ArrowRight, Bell, CalendarDays, FileText, Trophy, Users, ShieldCheck } from "lucide-react";

const cards = [
  { href: "/team-dashboard", title: "Team Profile", text: "Manage your team identity, roster and profile information.", icon: Users },
  { href: "/team-dashboard/rules", title: "Rules & Guidelines", text: "Review ranking policies, eligibility and submission requirements.", icon: ShieldCheck },
  { href: "/team-dashboard/submissions", title: "My Submissions", text: "Track submitted tournaments and verification status.", icon: FileText },
  { href: "/events", title: "Available Events", text: "Explore tracked tournaments and upcoming opportunities.", icon: CalendarDays },
];

export default function OverviewPage() {
  return <main className="min-h-screen bg-[#050507] px-3 py-5 text-white sm:px-6 sm:py-8"><div className="mx-auto max-w-6xl">
    <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#151518] to-[#09090b] p-6 sm:p-9"><p className="text-[11px] font-bold uppercase tracking-[.24em] text-gold">TNFFM Team Portal</p><h1 className="mt-1 font-rajdhani text-4xl font-bold uppercase sm:text-6xl">Team Overview</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Your central workspace for rankings, tournaments, submissions, performance and team management.</p><div className="mt-6 flex flex-wrap gap-3"><Link href="/team-dashboard/rules" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gold px-5 font-bold text-black">Read Rules <ArrowRight className="h-4 w-4" /></Link><Link href="/team-dashboard/submissions" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-5 font-semibold">My Submissions</Link></div></div>
    <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{cards.map(({href,title,text,icon:Icon}) => <Link href={href} key={title} className="group rounded-2xl border border-white/10 bg-white/[.025] p-5 transition hover:-translate-y-0.5 hover:border-gold/30"><Icon className="h-6 w-6 text-gold"/><h2 className="mt-5 font-rajdhani text-xl font-bold uppercase">{title}</h2><p className="mt-1 text-sm leading-6 text-slate-500">{text}</p><span className="mt-4 inline-flex items-center gap-1 text-xs font-bold uppercase text-gold">Open <ArrowRight className="h-3 w-3 transition group-hover:translate-x-1"/></span></Link>)}</div>
    <div className="mt-5 grid gap-4 md:grid-cols-3"><Stat icon={Trophy} title="My Rankings" text="View your official community ranking and results."/><Stat icon={Bell} title="Notifications" text="Stay updated with important TNFFM announcements."/><Stat icon={FileText} title="Quick Submit" text="Prepare a verified tournament submission."/></div>
  </div></main>;
}
function Stat({icon:Icon,title,text}:{icon:any;title:string;text:string}) { return <div className="rounded-2xl border border-white/10 bg-black/20 p-5"><Icon className="h-5 w-5 text-gold"/><h3 className="mt-3 font-rajdhani text-lg font-bold uppercase">{title}</h3><p className="mt-1 text-sm text-slate-500">{text}</p></div>; }
