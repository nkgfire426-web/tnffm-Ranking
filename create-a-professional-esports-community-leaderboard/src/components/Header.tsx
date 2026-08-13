import Link from "next/link";
import Image from "next/image";
import type React from "react";
import { CalendarDays, Crown, LayoutDashboard, ListChecks, MoreVertical, ScrollText } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/70 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="group relative">
            <button className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-black/55 text-slate-200 transition hover:border-gold/40 hover:text-gold" aria-label="Open TNFFM pages">
              <MoreVertical className="h-5 w-5" />
            </button>
            <div className="invisible absolute left-0 top-12 w-64 translate-y-2 rounded-lg border border-white/10 bg-black/95 p-2 opacity-0 shadow-glow backdrop-blur-xl transition group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                <MenuLink href="/tracked-events" icon={<CalendarDays className="h-4 w-4" />} label="Tracked Events" />
                <MenuLink href="/team-details" icon={<Crown className="h-4 w-4" />} label="Team Details" />
                <MenuLink href="/collaborators" icon={<Crown className="h-4 w-4" />} label="Collaborators" />
                <MenuLink href="/rank-system" icon={<ListChecks className="h-4 w-4" />} label="Rank System" />
                <MenuLink href="/rules" icon={<ScrollText className="h-4 w-4" />} label="Rules and Regulations" />
            </div>
          </div>
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-lg border border-gold/40 bg-black/70 p-1">
              <Image src="/brand/tnffm-logo.png" alt="TNFFM Esports logo" width={40} height={40} className="h-full w-full object-contain" />
            </span>
            <span>
              <span className="block font-rajdhani text-xl font-bold leading-none text-white">TNFFM</span>
              <span className="text-xs uppercase tracking-[0.22em] text-gold">Community Rankings</span>
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/#leaderboard" className="hidden rounded-lg px-4 py-2 text-sm text-slate-300 transition hover:text-gold sm:inline-flex">
            Leaderboard
          </Link>
          <Link href="/collaborators" className="hidden rounded-lg px-4 py-2 text-sm text-slate-300 transition hover:text-gold sm:inline-flex">
            Collaborators
          </Link>
          <Link href="/admin" className="inline-flex items-center gap-2 rounded-lg border border-gold/30 px-4 py-2 text-sm font-semibold text-gold transition hover:bg-gold hover:text-black">
            <LayoutDashboard className="h-4 w-4" />
            Admin Login
          </Link>
        </div>
      </nav>
    </header>
  );
}

function MenuLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-semibold text-slate-200 transition hover:bg-gold hover:text-black">
      {icon}
      {label}
    </Link>
  );
}
