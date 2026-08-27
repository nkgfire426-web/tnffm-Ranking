"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarDays, ChevronRight, FileCheck2, Flag, Gauge, MessageSquare, Newspaper, ShieldCheck, Trophy, Users, UserCog, Handshake } from "lucide-react";

const groups = [
  { title: "Management", items: [["Overview", "/admin", Gauge], ["Teams", "/admin/teams", Users], ["Rankings", "/admin/rankings", Trophy], ["Events", "/admin/events", CalendarDays], ["Results", "/admin/results", BarChart3]] },
  { title: "Content", items: [["News", "/admin/news", Newspaper], ["Collaborators", "/admin/collaborators", Handshake]] },
  { title: "Community", items: [["Submissions", "/admin/submissions", FileCheck2], ["Feedback", "/admin/feedback", MessageSquare]] },
] as const;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const active = (href: string) => href === "/admin" ? pathname === href : pathname.startsWith(href);
  return <div className="min-h-screen bg-[#050507] text-white">
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[270px] border-r border-white/10 bg-[#09090b]/95 backdrop-blur-xl lg:block"><div className="flex h-full flex-col">
      <div className="flex h-20 items-center border-b border-white/10 px-5"><Link href="/admin" className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-gold text-black"><Flag className="h-5 w-5"/></div><div><div className="font-rajdhani text-xl font-black uppercase">TNFFM</div><div className="text-[9px] font-bold uppercase tracking-[.25em] text-slate-500">Admin Control</div></div></Link></div>
      <nav className="flex-1 overflow-y-auto px-3 py-5">{groups.map((group) => <div key={group.title} className="mb-6"><p className="px-3 pb-2 text-[9px] font-black uppercase tracking-[.24em] text-slate-600">{group.title}</p>{group.items.map(([label, href, Icon]) => <Link key={href} href={href} className={`mb-1 flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm transition ${active(href) ? "bg-gold font-bold text-black" : "text-slate-400 hover:bg-white/[.05] hover:text-white"}`}><Icon className="h-[17px] w-[17px]"/><span className="flex-1">{label}</span>{active(href) && <ChevronRight className="h-4 w-4"/>}</Link>)}</div>)}</nav>
      <div className="border-t border-white/10 p-3"><Link href="/" className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm text-slate-500 hover:bg-white/[.05] hover:text-white"><ShieldCheck className="h-4 w-4"/>Public Website</Link></div>
    </div></aside>
    <div className="lg:pl-[270px]"><div className="border-b border-white/10 bg-[#09090b]/80 px-4 py-3 backdrop-blur-xl lg:hidden"><Link href="/admin" className="font-rajdhani text-xl font-black uppercase">TNFFM <span className="text-gold">Admin</span></Link></div>{children}</div>
  </div>;
}
