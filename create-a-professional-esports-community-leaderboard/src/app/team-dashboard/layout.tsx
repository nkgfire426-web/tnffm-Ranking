"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, BookOpen, BarChart3, CalendarDays, ChevronRight, CircleHelp, FileCheck2, Flag, Gauge, LogOut, MessageSquare, Newspaper, Settings, ShieldCheck, Trophy, UserRound, Users, X, Menu } from "lucide-react";
import { useState } from "react";

const groups = [
  { title: "Main", items: [
    ["Overview", "/team-dashboard", Gauge], ["Notifications", "/team-dashboard/notifications", Bell], ["News & Updates", "/team-dashboard/news", Newspaper],
  ]},
  { title: "Team", items: [
    ["Team Profile", "/team-dashboard/profile", UserRound], ["Roster", "/team-dashboard/roster", Users], ["My Rankings", "/team-dashboard/rankings", Trophy], ["Performance", "/team-dashboard/performance", BarChart3],
  ]},
  { title: "Tournaments", items: [
    ["Available Events", "/team-dashboard/events", CalendarDays], ["My Submissions", "/team-dashboard/submissions", FileCheck2], ["Tournament Results", "/team-dashboard/results", Trophy], ["Rules & Guidelines", "/team-dashboard/rules", BookOpen],
  ]},
  { title: "Support", items: [
    ["Feedback / Contact", "/team-dashboard/feedback", MessageSquare], ["Help / FAQ", "/team-dashboard/help", CircleHelp],
  ]},
  { title: "Account", items: [
    ["Settings", "/team-dashboard/settings", Settings], ["Change Password", "/team-dashboard/password", ShieldCheck],
  ]},
] as const;

export default function TeamDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) => href === "/team-dashboard" ? pathname === href : pathname.startsWith(href);
  return <div className="min-h-screen bg-[#050507] text-white">
    <aside className={`fixed inset-y-0 left-0 z-50 w-[270px] border-r border-white/10 bg-[#09090b]/95 backdrop-blur-xl transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="flex h-full flex-col">
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-5">
          <Link href="/team-dashboard" className="flex items-center gap-3" onClick={() => setOpen(false)}><div className="grid h-10 w-10 place-items-center rounded-xl bg-gold text-black"><Flag className="h-5 w-5"/></div><div><div className="font-rajdhani text-xl font-black uppercase tracking-wide">TNFFM</div><div className="text-[9px] font-bold uppercase tracking-[.25em] text-slate-500">Team Portal</div></div></Link>
          <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close navigation"><X className="h-5 w-5"/></button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {groups.map((group) => <div key={group.title} className="mb-5"><p className="px-3 pb-2 text-[9px] font-black uppercase tracking-[.24em] text-slate-600">{group.title}</p>{group.items.map(([label, href, Icon]) => <Link key={href} href={href} onClick={() => setOpen(false)} className={`group mb-1 flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm transition ${active(href) ? "bg-gold font-bold text-black shadow-lg shadow-gold/10" : "text-slate-400 hover:bg-white/[.05] hover:text-white"}`}><Icon className="h-[17px] w-[17px] shrink-0"/><span className="flex-1">{label}</span>{active(href) && <ChevronRight className="h-4 w-4"/>}</Link>)}</div>)}
        </nav>
        <div className="border-t border-white/10 p-3"><Link href="/" className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm text-slate-500 hover:bg-white/[.05] hover:text-white"><LogOut className="h-4 w-4"/>Exit Team Portal</Link></div>
      </div>
    </aside>
    {open && <button className="fixed inset-0 z-40 bg-black/70 lg:hidden" onClick={() => setOpen(false)} aria-label="Close navigation overlay"/>}
    <div className="lg:pl-[270px]">
      <div className="sticky top-0 z-30 flex h-16 items-center border-b border-white/10 bg-[#050507]/85 px-4 backdrop-blur-xl lg:hidden"><button onClick={() => setOpen(true)} className="mr-3 rounded-lg border border-white/10 p-2" aria-label="Open navigation"><Menu className="h-5 w-5"/></button><div className="font-rajdhani text-lg font-black uppercase">TNFFM <span className="text-gold">Team Dashboard</span></div></div>
      <div className="min-h-[calc(100vh-4rem)]">{children}</div>
    </div>
  </div>;
}
