"use client";

import Link from "next/link";
import { BarChart3, CalendarDays, Crown, Download, Megaphone, Newspaper, Trophy, Users } from "lucide-react";
import type { RankedTeam } from "@/lib/types";
import { TeamPosterStudio } from "@/components/TeamPosterStudio";

type Props = { teams: RankedTeam[] };

export function TeamCommunityHub({ teams }: Props) {
  const [topTeam, ...rest] = teams;
  const team = topTeam || rest[0];
  if (!team) return null;

  const tools = [
    { href: "/team-details", label: "Team Details", description: "View team profile, roster and public statistics.", icon: Users },
    { href: "/ranking", label: "Official Ranking", description: "Check your current TNFFM community position and score.", icon: Trophy },
    { href: "/tracked-events", label: "Official Events", description: "Explore events currently tracked by TNFFM.", icon: CalendarDays },
    { href: "/tournament-announcements", label: "Tournament Announcements", description: "See upcoming and published tournament information.", icon: Megaphone },
    { href: "/news", label: "News & Updates", description: "Keep up with community updates and tournament news.", icon: Newspaper },
    { href: "/rank-system", label: "Rank System", description: "Understand how TNFFM ranking points and placements work.", icon: BarChart3 },
  ];

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8" aria-labelledby="team-community-hub">
      <div className="overflow-hidden rounded-3xl border border-gold/20 bg-gradient-to-br from-gold/[0.07] via-black/40 to-red-950/[0.10] p-5 shadow-2xl sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.28em] text-gold"><Crown className="h-4 w-4" /> Team Community Center</div>
            <h2 id="team-community-hub" className="mt-2 font-rajdhani text-3xl font-black uppercase text-white sm:text-4xl">Everything your team needs</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Public team tools are now available directly from the main page. No team login is required to view rankings, team details, events or create posters.</p>
          </div>
          <Link href="/team-details" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-gold/30 bg-gold px-4 py-3 text-sm font-black text-black transition hover:brightness-110"><Users className="h-4 w-4" /> Open Team Details</Link>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map(({ href, label, description, icon: Icon }) => (
            <Link key={href} href={href} className="group rounded-2xl border border-white/10 bg-black/30 p-4 transition hover:-translate-y-0.5 hover:border-gold/35 hover:bg-white/[0.045]">
              <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl border border-gold/20 bg-gold/10 text-gold"><Icon className="h-5 w-5" /></span><span className="font-bold text-white group-hover:text-gold">{label}</span></div>
              <p className="mt-3 text-xs leading-5 text-slate-500">{description}</p>
            </Link>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-gold/15 bg-black/35 p-4">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.2em] text-gold"><Download className="h-4 w-4" /> Team poster studio</div>
          <p className="mt-1 text-xs text-slate-500">Select your team in Team Details to create a team poster or download its latest ranking poster.</p>
          <TeamPosterStudio team={team} />
        </div>
      </div>
    </section>
  );
}
