"use client";

import Link from "next/link";
import Image from "next/image";
import type React from "react";
import { useEffect, useState } from "react";
import { CalendarDays, Crown, ListChecks, LogIn, Menu, Newspaper, ScrollText, Trophy, Users, X } from "lucide-react";
import { TeamLogo } from "@/components/TeamLogo";

type TeamSession = { teamName?: string; logoUrl?: string } | null;

const navigation = [
  { href: "/ranking", icon: Trophy, label: "Official Ranking" },
  { href: "/teams", icon: Users, label: "Tamil Community Teams" },
  { href: "/tracked-events", icon: CalendarDays, label: "Official Events" },
  { href: "/news", icon: Newspaper, label: "News & Updates" },
  { href: "/collaborators", icon: Users, label: "Collaborators" },
  { href: "/team-details", icon: Crown, label: "Team Details" },
  { href: "/rank-system", icon: ListChecks, label: "Rank System" },
  { href: "/rules", icon: ScrollText, label: "Rules & Regulations" },
];

export function Header() {
  const [team, setTeam] = useState<TeamSession>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadSession() {
      try {
        const response = await fetch("/api/team/me", { credentials: "same-origin", cache: "no-store" });
        const result = await response.json().catch(() => ({}));
        if (active && result?.ok && result?.team) {
          setTeam({
            teamName: result.team.teamName || result.team.name || "Team",
            logoUrl: result.team.logoUrl || result.team.logo || "",
          });
        } else if (active) {
          setTeam(null);
        }
      } catch {
        if (active) setTeam(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadSession();
    const onFocus = () => loadSession();
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/70 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:px-6 sm:py-4 lg:px-8">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open TNFFM navigation"
              aria-expanded={menuOpen}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/10 bg-black/55 text-slate-200 transition hover:border-gold/50 hover:bg-gold hover:text-black active:scale-95"
            >
              <Menu className="h-5 w-5" />
            </button>

            <Link href="/" className="flex min-w-0 items-center gap-2 sm:gap-3" onClick={() => setMenuOpen(false)}>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-gold/40 bg-black/70 p-1 sm:h-11 sm:w-11">
                <Image src="/brand/tnffm-logo.png" alt="TNFFM Esports logo" width={40} height={40} className="h-full w-full object-contain" />
              </span>
              <span className="hidden min-w-0 sm:block">
                <span className="block font-rajdhani text-xl font-bold leading-none text-white">TNFFM</span>
                <span className="text-xs uppercase tracking-[0.22em] text-gold">Community Rankings</span>
              </span>
            </Link>
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Link href="/ranking" className="hidden rounded-lg px-4 py-2 text-sm font-semibold text-slate-300 transition hover:text-gold sm:inline-flex">Ranking</Link>
            <Link href="/teams" className="hidden rounded-lg px-4 py-2 text-sm font-semibold text-slate-300 transition hover:text-gold md:inline-flex">Community Teams</Link>

            {!loading && team ? (
              <Link
                href="/team-dashboard"
                className="group flex max-w-[58px] items-center justify-center rounded-xl border border-gold/40 bg-gradient-to-br from-gold/15 via-black/80 to-black/60 p-1.5 shadow-[0_0_18px_rgba(212,175,55,0.12)] transition duration-200 hover:border-gold hover:shadow-[0_0_24px_rgba(212,175,55,0.25)] active:scale-95 sm:max-w-[210px] sm:justify-start sm:gap-2 sm:rounded-lg sm:p-1.5 sm:px-3 sm:py-2"
                title={`Open ${team.teamName || "Team"} Dashboard`}
              >
                <span className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-gold/70 bg-black shadow-[0_0_12px_rgba(212,175,55,0.18)] ring-2 ring-gold/10 transition group-hover:ring-gold/30 sm:h-9 sm:w-9 sm:border sm:ring-0">
                  <TeamLogo src={team.logoUrl} name={team.teamName || "Team"} size={38} />
                  <span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-white/15 via-transparent to-transparent" />
                </span>
                <span className="hidden min-w-0 text-left sm:block">
                  <span className="block truncate text-xs text-slate-400">Team</span>
                  <span className="block truncate text-sm font-semibold text-white">{team.teamName}</span>
                </span>
              </Link>
            ) : (
              <div className="group relative">
                <button type="button" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-gold/30 px-3 py-2 text-sm font-semibold text-gold transition hover:bg-gold hover:text-black sm:px-4" aria-haspopup="menu">
                  <LogIn className="h-4 w-4" />
                  <span className="hidden xs:inline">Login</span>
                </button>
                <div className="invisible absolute right-0 top-11 w-56 translate-y-2 rounded-xl border border-white/10 bg-black/95 p-2 opacity-0 shadow-glow backdrop-blur-xl transition group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                  <MenuLink href="/team-login" icon={<LogIn className="h-4 w-4" />} label="Team Login" />
                </div>
              </div>
            )}
          </div>
        </nav>
      </header>

      <div className={`fixed inset-0 z-[80] ${menuOpen ? "pointer-events-auto" : "pointer-events-none"}`} aria-hidden={!menuOpen}>
        <button type="button" aria-label="Close navigation" onClick={() => setMenuOpen(false)} className={`absolute inset-0 bg-black/70 backdrop-blur-[2px] transition-opacity duration-300 ${menuOpen ? "opacity-100" : "opacity-0"}`} />
        <aside className={`absolute left-0 top-0 flex h-full w-[min(86vw,340px)] flex-col border-r border-white/10 bg-[#09090b] shadow-2xl transition-transform duration-300 ease-out ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="flex h-20 shrink-0 items-center justify-between border-b border-white/10 px-5">
            <Link href="/" className="flex items-center gap-3" onClick={() => setMenuOpen(false)}>
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-gold p-1">
                <Image src="/brand/tnffm-logo.png" alt="TNFFM" width={40} height={40} className="h-full w-full object-contain" />
              </span>
              <span>
                <span className="block font-rajdhani text-xl font-black text-white">TNFFM</span>
                <span className="block text-[9px] font-bold uppercase tracking-[.24em] text-slate-500">Community Menu</span>
              </span>
            </Link>
            <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close navigation" className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 text-slate-300 transition hover:border-gold hover:bg-gold hover:text-black">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-5">
            <p className="px-3 pb-2 text-[9px] font-black uppercase tracking-[.24em] text-slate-600">TNFFM Community</p>
            <div className="space-y-1">
              {navigation.map(({ href, icon: Icon, label }) => (
                <Link key={href} href={href} onClick={() => setMenuOpen(false)} className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-slate-300 transition hover:bg-gold hover:text-black active:scale-[.99]">
                  <Icon className="h-[18px] w-[18px]" />
                  <span className="flex-1">{label}</span>
                </Link>
              ))}
            </div>

            <div className="my-5 border-t border-white/10" />
            <p className="px-3 pb-2 text-[9px] font-black uppercase tracking-[.24em] text-slate-600">Account</p>
            <MenuLink href="/team-login" icon={<LogIn className="h-4 w-4" />} label="Team Login" onClick={() => setMenuOpen(false)} />
            <MenuLink href="/" icon={<Crown className="h-4 w-4" />} label="Home" onClick={() => setMenuOpen(false)} />
          </div>

          <div className="border-t border-white/10 p-3">
            <Link href="/admin" onClick={() => setMenuOpen(false)} className="flex min-h-11 items-center gap-3 rounded-xl border border-gold/20 bg-gold/5 px-3 text-sm font-bold text-gold transition hover:bg-gold hover:text-black">
              <ShieldIcon />
              Admin Control Center
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}

function ShieldIcon() {
  return <span className="grid h-5 w-5 place-items-center rounded-full border border-current text-[10px]">✓</span>;
}

function MenuLink({ href, icon, label, onClick }: { href: string; icon: React.ReactNode; label: string; onClick?: () => void }) {
  return <Link href={href} onClick={onClick} className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-semibold text-slate-200 transition hover:bg-gold hover:text-black">{icon}{label}</Link>;
}
