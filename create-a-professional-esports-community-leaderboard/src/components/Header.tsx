"use client";

import Link from "next/link";
import Image from "next/image";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { CalendarDays, Crown, FileCheck2, LayoutDashboard, ListChecks, LogIn, Newspaper, ScrollText, Trophy, Users, UserRound, Settings, Bell, BarChart3 } from "lucide-react";
import { TeamLogo } from "@/components/TeamLogo";

type TeamSession = { teamName?: string; logoUrl?: string } | null;

const teamMenu = [
  { href: "/team-dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/team-dashboard/profile", label: "Team Profile", icon: UserRound },
  { href: "/team-dashboard/roster", label: "Roster", icon: Users },
  { href: "/team-dashboard/rankings", label: "My Rankings", icon: Trophy },
  { href: "/team-dashboard/performance", label: "Performance", icon: BarChart3 },
  { href: "/team-dashboard/events", label: "Available Events", icon: CalendarDays },
  { href: "/team-dashboard/submissions", label: "My Submissions", icon: FileCheck2 },
  { href: "/team-dashboard/results", label: "Tournament Results", icon: Trophy },
  { href: "/team-dashboard/news", label: "News & Updates", icon: Newspaper },
  { href: "/team-dashboard/notifications", label: "Notifications", icon: Bell },
  { href: "/team-dashboard/rules", label: "Rules & Guidelines", icon: ScrollText },
  { href: "/team-dashboard/help", label: "Help / FAQ", icon: ListChecks },
  { href: "/team-dashboard/settings", label: "Settings", icon: Settings },
];

export function Header() {
  const [team, setTeam] = useState<TeamSession>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    async function loadSession() {
      try {
        const response = await fetch("/api/team/me", { credentials: "same-origin", cache: "no-store" });
        const result = await response.json().catch(() => ({}));
        if (active && result?.ok && result?.team) {
          setTeam({ teamName: result.team.teamName || result.team.name || "Team", logoUrl: result.team.logoUrl || result.team.logo || "" });
        } else if (active) setTeam(null);
      } catch { if (active) setTeam(null); }
      finally { if (active) setLoading(false); }
    }
    loadSession();
    const onFocus = () => loadSession();
    window.addEventListener("focus", onFocus);
    return () => { active = false; window.removeEventListener("focus", onFocus); };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/70 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:px-6 sm:py-4 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-2 sm:gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-gold/40 bg-black/70 p-1 sm:h-11 sm:w-11">
            <Image src="/brand/tnffm-logo.png" alt="TNFFM Esports logo" width={40} height={40} className="h-full w-full object-contain" />
          </span>
          <span className="hidden min-w-0 sm:block"><span className="block font-rajdhani text-xl font-bold leading-none text-white">TNFFM</span><span className="text-xs uppercase tracking-[0.22em] text-gold">Community Rankings</span></span>
        </Link>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Link href="/ranking" className="hidden rounded-lg px-4 py-2 text-sm font-semibold text-slate-300 transition hover:text-gold sm:inline-flex">Ranking</Link>
          <Link href="/teams" className="hidden rounded-lg px-4 py-2 text-sm font-semibold text-slate-300 transition hover:text-gold md:inline-flex">Community Teams</Link>

          {!loading && team ? (
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((value) => !value)}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                title={`${team.teamName || "Team"} Dashboard`}
                className={`group flex items-center gap-2 rounded-xl border bg-gradient-to-br from-gold/15 via-black/80 to-black/60 p-1.5 shadow-[0_0_18px_rgba(212,175,55,0.12)] transition hover:border-gold hover:shadow-[0_0_24px_rgba(212,175,55,0.25)] active:scale-95 sm:rounded-lg sm:px-2.5 ${menuOpen ? "border-gold ring-2 ring-gold/15" : "border-gold/40"}`}
              >
                <span className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-gold/70 bg-black shadow-[0_0_12px_rgba(212,175,55,0.18)] sm:h-9 sm:w-9 sm:border">
                  <TeamLogo src={team.logoUrl} name={team.teamName || "Team"} size={38} />
                  <span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-white/15 via-transparent to-transparent" />
                </span>
                <span className="hidden min-w-0 text-left sm:block"><span className="block text-[10px] uppercase tracking-wider text-slate-500">Team Dashboard</span><span className="block max-w-[130px] truncate text-sm font-semibold text-white">{team.teamName}</span></span>
              </button>

              {menuOpen && <div role="menu" className="absolute right-0 top-[calc(100%+10px)] w-[300px] overflow-hidden rounded-2xl border border-white/10 bg-[#09090b]/98 p-2 shadow-2xl shadow-black/60 backdrop-blur-xl">
                <div className="mb-2 flex items-center gap-3 rounded-xl border border-gold/15 bg-gold/[.05] p-3">
                  <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-full border border-gold/50 bg-black"><TeamLogo src={team.logoUrl} name={team.teamName || "Team"} size={42} /></div>
                  <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-[.2em] text-gold">Signed in team</p><p className="truncate font-rajdhani text-lg font-bold uppercase">{team.teamName}</p></div>
                </div>
                <div className="max-h-[65vh] overflow-y-auto pr-1">
                  <p className="px-2 pb-1 text-[9px] font-black uppercase tracking-[.2em] text-slate-600">Team Dashboard</p>
                  {teamMenu.map(({ href, label, icon: Icon }) => <MenuLink key={href} href={href} icon={<Icon className="h-4 w-4" />} label={label} onClick={() => setMenuOpen(false)} />)}
                </div>
              </div>}
            </div>
          ) : (
            <Link href="/team-login" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-gold/30 px-3 py-2 text-sm font-semibold text-gold transition hover:bg-gold hover:text-black sm:px-4"><LogIn className="h-4 w-4" /><span className="hidden xs:inline">Login</span></Link>
          )}
        </div>
      </nav>
    </header>
  );
}

function MenuLink({ href, icon, label, onClick }: { href: string; icon: React.ReactNode; label: string; onClick?: () => void }) {
  return <Link href={href} onClick={onClick} role="menuitem" className="flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-slate-300 transition hover:bg-gold hover:text-black">{icon}<span className="flex-1">{label}</span></Link>;
}
