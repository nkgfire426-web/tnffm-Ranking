"use client";

import Image from "next/image";
import type React from "react";
import { motion } from "framer-motion";
import { Award, BarChart3, Share2, Trophy, Users, type LucideIcon } from "lucide-react";
import type { RawTeam } from "@/lib/types";
import { formatDateISO } from "@/lib/format-date";
import { normalizeImageUrl, TeamLogo } from "./TeamLogo";
import { PlayerLogo } from "./PlayerLogo";

export function TeamProfile({ team }: { team: RawTeam & { slug?: string } }) {
  const rank = typeof (team as any).rank === "number" ? (team as any).rank : 0;
  const communityPoints = typeof (team as any).communityPoints === "number" ? (team as any).communityPoints : 0;
  const top3Finishes = typeof (team as any).top3Finishes === "number" ? (team as any).top3Finishes : 0;
  const lastUpdated = (team as any).lastUpdated || "";
  const badge = (team as any).badge || (team.rankingEligible ? "Officially Ranked" : "Registered Team");
  const eventsPlayed = team.eventsPlayed || 0;
  const finalistFinishes = team.finalistFinishes || team.grandFinals || 0;
  const slug = team.slug || team.teamName.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const bannerSrc = normalizeImageUrl(team.bannerUrl);

  const history: [string, string, LucideIcon][] = [
    ["Championship History", `${team.championships || 0} title wins across eligible TNFFM events`, Trophy],
    ["Tournament History", `${eventsPlayed} eligible events and ${top3Finishes} podium finishes`, Award]
  ];

  return (
    <div>
      <section className="relative min-h-[420px] overflow-hidden border-b border-white/10">
        <Image
          src={bannerSrc}
          alt={`${team.teamName} banner`}
          fill
          priority
          className="object-cover opacity-45"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/60 to-black/30" />
        <div className="relative mx-auto flex min-h-[420px] max-w-7xl items-end px-4 py-12 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl">
            <div className="mb-5 flex items-center gap-4">
              <TeamLogo src={team.logoUrl} name={team.teamName} size={92} champion={rank === 1} />
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-gold">
                  {rank > 0 ? `Rank #${rank}` : "Not Ranked Yet"} • {badge}
                </p>
                <h1 className="font-rajdhani text-5xl font-bold uppercase text-white sm:text-7xl">{team.teamName}</h1>
              </div>
            </div>
            <p className="text-lg text-slate-300">{team.description || "A registered Free Fire MAX community team in the TNFFM Tamil Community Showcase."}</p>
          </motion.div>
        </div>

        <div className="mx-auto mt-8 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="glass rounded-lg p-6">
            <h2 className="font-rajdhani text-2xl font-bold uppercase text-white">Roster</h2>
            <p className="mt-2 text-sm text-slate-400">Registered players and their in-game UIDs.</p>
            <div className="mt-4 grid gap-2">
              {(team.roster || []).map((p, i) => (
                <div key={i} className="flex items-center gap-3 rounded-md bg-black/30 px-3 py-3">
                  <PlayerLogo src={p.playerLogoUrl} name={p.name} size={48} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-white">{p.name}</div>
                    <div className="text-xs text-slate-400">UID: {p.uid || "Not provided"}{p.role ? ` • ${p.role}` : ""}</div>
                  </div>
                  <div className="shrink-0 text-xs text-slate-500">Player #{i + 1}</div>
                </div>
              ))}
              {!(team.roster || []).length && <div className="text-sm text-slate-400">No roster available.</div>}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-4">
          <ProfileMetric label="Community Points" value={communityPoints.toLocaleString()} icon={<BarChart3 />} />
          <ProfileMetric label="Championships" value={(team.championships || 0).toString()} icon={<Trophy />} />
          <ProfileMetric label="Top 3 Finishes" value={top3Finishes.toString()} icon={<Award />} />
          <ProfileMetric label="Registered Players" value={(team.players || 0).toString()} icon={<Users />} />
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {history.map(([title, text, Icon]) => (
            <div key={title} className="glass rounded-lg p-6">
              <Icon className="mb-4 h-7 w-7 text-gold" />
              <h2 className="font-rajdhani text-2xl font-bold uppercase text-white">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 glass rounded-lg p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-rajdhani text-3xl font-bold uppercase text-white">Performance Breakdown</h2>
            <div className="flex gap-2">
              <button onClick={() => navigator.share?.({ title: team.teamName, url: location.href })} className="inline-flex items-center gap-2 rounded-lg border border-gold/30 px-4 py-2 text-sm font-semibold text-gold transition hover:bg-gold hover:text-black"><Share2 className="h-4 w-4" />Share</button>
              <a href={`/admin?edit=${slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/5">Edit in Admin</a>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {([
              ["Runner-Up", team.runnerUp || 0],
              ["2nd Runner-Up", team.secondRunnerUp || 0],
              ["Top 5 Finishes", team.top5Finishes || 0],
              ["Finalist Finishes", finalistFinishes],
              ["Official FF MAX Finals", team.officialMatchFinalists || 0],
              ["Events Played", eventsPlayed],
              ["Top 3 Finishes", top3Finishes],
              ["Registered Players", team.players || 0],
              ["Last Updated", lastUpdated ? formatDateISO(lastUpdated) : "Not available"]
            ] satisfies [string, string | number][]).map(([label, value]) => (
              <div key={label} className="rounded-lg bg-black/35 p-4"><p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p><p className="mt-1 font-rajdhani text-2xl font-bold text-white">{value}</p></div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function ProfileMetric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return <div className="glass rounded-lg p-5"><div className="mb-4 text-gold [&_svg]:h-6 [&_svg]:w-6">{icon}</div><p className="font-rajdhani text-3xl font-bold text-white">{value}</p><p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p></div>;
}
