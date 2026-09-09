"use client";

import Link from "next/link";
import Image from "next/image";
import type React from "react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { CalendarDays, Crown, ListChecks, Megaphone, MoreVertical, Newspaper, ScrollText, Trophy, Users, X } from "lucide-react";

type NavigationItem = { href: string; icon: React.ComponentType<{ className?: string }>; label: string };

const navigation: NavigationItem[] = [
  { href: "/ranking", icon: Trophy, label: "Official Ranking" },
  { href: "/teams", icon: Users, label: "Tamil Community Teams" },
  { href: "/tracked-events", icon: CalendarDays, label: "Official Events" },
  { href: "/tournament-announcements", icon: Megaphone, label: "Tournament Announcements" },
  { href: "/news", icon: Newspaper, label: "News & Updates" },
  { href: "/collaborators", icon: Users, label: "Collaborators" },
  { href: "/team-details", icon: Crown, label: "Team Details" },
  { href: "/rank-system", icon: ListChecks, label: "Rank System" },
  { href: "/rules", icon: ScrollText, label: "Rules & Regulations" },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setMenuOpen(false); };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", onKeyDown); };
  }, [menuOpen]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/70 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:px-6 sm:py-4 lg:px-8" aria-label="Primary navigation">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button type="button" onClick={() => setMenuOpen(true)} aria-label="Open TNFFM navigation menu" aria-expanded={menuOpen} aria-controls="tnffm-navigation-drawer" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/10 bg-black/55 text-slate-200 transition hover:border-gold/50 hover:bg-gold hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold active:scale-95"><MoreVertical className="h-5 w-5" aria-hidden="true" /></button>
            <Link href="/" className="flex min-w-0 items-center gap-2 sm:gap-3" aria-label="TNFFM home"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-gold/40 bg-black/70 p-1 sm:h-11 sm:w-11"><Image src="/brand/tnffm-logo.png" alt="TNFFM Esports logo" width={40} height={40} className="h-full w-full object-contain" priority /></span><span className="hidden min-w-0 sm:block"><span className="block font-rajdhani text-xl font-bold leading-none text-white">TNFFM</span><span className="text-xs uppercase tracking-[0.22em] text-gold">Community Rankings</span></span></Link>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Link href="/ranking" className="hidden rounded-lg px-4 py-2 text-sm font-semibold text-slate-300 transition hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold sm:inline-flex">Ranking</Link>
            <Link href="/teams" className="hidden rounded-lg px-4 py-2 text-sm font-semibold text-slate-300 transition hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold md:inline-flex">Community Teams</Link>
          </div>
        </nav>
      </header>
      <div className={`fixed inset-0 z-[80] ${menuOpen ? "pointer-events-auto" : "pointer-events-none"}`} aria-hidden={!menuOpen}>
        <button type="button" aria-label="Close navigation" tabIndex={menuOpen ? 0 : -1} onClick={() => setMenuOpen(false)} className={`absolute inset-0 bg-black/70 backdrop-blur-[2px] transition-opacity duration-300 ${menuOpen ? "opacity-100" : "opacity-0"}`} />
        <aside id="tnffm-navigation-drawer" aria-label="TNFFM navigation menu" className={`absolute left-0 top-0 flex h-full w-[min(86vw,340px)] flex-col border-r border-white/10 bg-[#09090b] shadow-2xl transition-transform duration-300 ease-out ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="flex h-20 shrink-0 items-center justify-between border-b border-white/10 px-5"><Link href="/" className="flex items-center gap-3" onClick={() => setMenuOpen(false)}><span className="grid h-10 w-10 place-items-center rounded-xl bg-gold p-1"><Image src="/brand/tnffm-logo.png" alt="TNFFM" width={40} height={40} className="h-full w-full object-contain" /></span><span><span className="block font-rajdhani text-xl font-black text-white">TNFFM</span><span className="block text-[9px] font-bold uppercase tracking-[.24em] text-slate-500">Community Menu</span></span></Link><button type="button" onClick={() => setMenuOpen(false)} aria-label="Close navigation" className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 text-slate-300 transition hover:border-gold hover:bg-gold hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"><X className="h-5 w-5" aria-hidden="true" /></button></div>
          <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-5"><p className="px-3 pb-2 text-[9px] font-black uppercase tracking-[.24em] text-slate-600">TNFFM Community</p><div className="space-y-1">{navigation.map(({ href, icon: Icon, label }) => { const active = isActivePath(pathname, href); return <Link key={href} href={href} onClick={() => setMenuOpen(false)} aria-current={active ? "page" : undefined} className={`flex min-h-12 items-center gap-3 rounded-xl border px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold active:scale-[.99] ${active ? "border-gold/30 bg-gold text-black shadow-[0_0_18px_rgba(212,175,55,0.12)]" : "border-transparent text-slate-300 hover:border-white/10 hover:bg-gold hover:text-black"}`}><Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" /><span className="flex-1">{label}</span>{active && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />}</Link>; })}</div><div className="my-5 border-t border-white/10" /><Link href="/" onClick={() => setMenuOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${pathname === "/" ? "bg-gold text-black" : "text-slate-200 hover:bg-gold hover:text-black"}`}><Crown className="h-4 w-4" />Home</Link></div>
        </aside>
      </div>
    </>
  );
}
