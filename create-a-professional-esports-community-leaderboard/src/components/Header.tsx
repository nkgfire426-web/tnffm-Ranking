"use client";

import Link from "next/link";
import Image from "next/image";
import type React from "react";
import { useEffect, useState } from "react";
import { CalendarDays, Crown, ListChecks, LogIn, MoreVertical, ScrollText, Trophy, Users, UserCircle2 } from "lucide-react";

type TeamSession = { teamName?: string; logoUrl?: string } | null;

export function Header() {
  const [team, setTeam] = useState<TeamSession>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    async function loadSession() {
      try {
        const response = await fetch("/api/team/me", { credentials: "same-origin", cache: "no-store" });
        const result = await response.json().catch(() => ({}));
        if (active && result?.ok && result?.team) setTeam({ teamName: result.team.teamName || result.team.name || "Team", logoUrl: result.team.logoUrl || result.team.logo || "" });
        else if (active) setTeam(null);
      } catch { if (active) setTeam(null); }
      finally { if (active) setLoading(false); }
    }
    loadSession();
    const onFocus = () => loadSession();
    window.addEventListener("focus", onFocus);
    return () => { active = false; window.removeEventListener("focus", onFocus); };
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/70 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:px-6 sm:py-4 lg:px-8">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="group relative shrink-0">
            <button className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-black/55 text-slate-200 transition hover:border-gold/40 hover:text-gold sm:h-10 sm:w-10" aria-label="Open TNFFM pages"><MoreVertical className="h-5 w-5" /></button>
            <div className="invisible absolute left-0 top-11 w-64 translate-y-2 rounded-lg border border-white/10 bg-black/95 p-2 opacity-0 shadow-glow backdrop-blur-xl transition group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
              <MenuLink href="/ranking" icon={<Trophy className="h-4 w-4" />} label="Official Ranking" />
              <MenuLink href="/teams" icon={<Users className="h-4 w-4" />} label="Tamil Community Teams" />
              <MenuLink href="/tracked-events" icon={<CalendarDays className="h-4 w-4" />} label="Official Events" />
              <MenuLink href="/collaborators" icon={<Users className="h-4 w-4" />} label="Collaborators" />
              <MenuLink href="/team-details" icon={<Crown className="h-4 w-4" />} label="Team Details" />
              <MenuLink href="/rank-system" icon={<ListChecks className="h-4 w-4" />} label="Rank System" />
              <MenuLink href="/rules" icon={<ScrollText className="h-4 w-4" />} label="Rules and Regulations" />
            </div>
          </div>
          <Link href="/" className="flex min-w-0 items-center gap-2 sm:gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-gold/40 bg-black/70 p-1 sm:h-11 sm:w-11"><Image src="/brand/tnffm-logo.png" alt="TNFFM Esports logo" width={40} height={40} className="h-full w-full object-contain" /></span>
            <span className="hidden min-w-0 sm:block"><span className="block font-rajdhani text-xl font-bold leading-none text-white">TNFFM</span><span className="text-xs uppercase tracking-[0.22em] text-gold">Community Rankings</span></span>
          </Link>
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Link href="/ranking" className="hidden rounded-lg px-4 py-2 text-sm font-semibold text-slate-300 transition hover:text-gold sm:inline-flex">Ranking</Link>
          <Link href="/teams" className="hidden rounded-lg px-4 py-2 text-sm font-semibold text-slate-300 transition hover:text-gold md:inline-flex">Community Teams</Link>
          {!loading && team ? (
            <Link href="/team-dashboard" className="group flex max-w-[58px] items-center justify-center rounded-xl border border-gold/40 bg-gradient-to-br from-gold/15 via-black/80 to-black/60 p-1.5 shadow-[0_0_18px_rgba(212,175,55,0.12)] transition duration-200 hover:border-gold hover:shadow-[0_0_24px_rgba(212,175,55,0.25)] active:scale-95 sm:max-w-[210px] sm:justify-start sm:gap-2 sm:rounded-lg sm:p-1.5 sm:px-3 sm:py-2" title={`Open ${team.teamName || "Team"} Dashboard`}>
              <span className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-gold/70 bg-black shadow-[0_0_12px_rgba(212,175,55,0.18)] ring-2 ring-gold/10 transition group-hover:ring-gold/30 sm:h-9 sm:w-9 sm:border sm:ring-0">{team.logoUrl ? <img src={team.logoUrl} alt={`${team.teamName || "Team"} logo`} className="h-full w-full object-cover" /> : <UserCircle2 className="h-6 w-6 text-gold sm:h-5 sm:w-5" />}<span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-white/15 via-transparent to-transparent" /></span>
              <span className="hidden min-w-0 text-left sm:block"><span className="block truncate text-xs text-slate-400">Team</span><span className="block truncate text-sm font-semibold text-white">{team.teamName}</span></span>
            </Link>
          ) : (
            <div className="group relative"><button className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-gold/30 px-3 py-2 text-sm font-semibold text-gold transition hover:bg-gold hover:text-black sm:px-4" aria-haspopup="menu"><LogIn className="h-4 w-4" /><span className="hidden xs:inline">Login</span></button><div className="invisible absolute right-0 top-11 w-56 translate-y-2 rounded-xl border border-white/10 bg-black/95 p-2 opacity-0 shadow-glow backdrop-blur-xl transition group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100"><MenuLink href="/team-login" icon={<LogIn className="h-4 w-4" />} label="Team Login" /></div></div>
          )}
        </div>
      </nav>
    </header>
  );
}

function MenuLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) { return <Link href={href} className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-semibold text-slate-200 transition hover:bg-gold hover:text-black">{icon}{label}</Link>; }
